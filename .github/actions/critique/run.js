const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

(async function main() {
  try {
    const BACKEND_URL = process.env.BACKEND_URL;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const EVENT_PATH = process.env.GITHUB_EVENT_PATH;
    const REPO = process.env.GITHUB_REPOSITORY;

    if (!BACKEND_URL) throw new Error('BACKEND_URL is required');
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
    if (!EVENT_PATH) throw new Error('GITHUB_EVENT_PATH is required');
    if (!REPO) throw new Error('GITHUB_REPOSITORY is required');

    const event = JSON.parse(fs.readFileSync(EVENT_PATH, 'utf8'));
    const pr = event.pull_request;
    if (!pr) throw new Error('This action must run on a pull_request event');

    const [owner, repo] = REPO.split('/');
    const pull_number = pr.number;

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    // gather changed files
    const files = [];
    for await (const resp of octokit.paginate.iterator(octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number,
      per_page: 100,
    })) {
      files.push(...resp.data);
    }

    const SKIP_PATTERNS = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.min.js',
      '.min.css',
      'dist/',
      'build/',
      'node_modules/',
      '.map',
    ];

    function shouldSkip(filename) {
      return SKIP_PATTERNS.some((p) => filename.includes(p));
    }

    const comments = [];
    const summaryItems = [];

    for (const file of files) {
      const filename = file.filename;
      if (shouldSkip(filename)) {
        console.log('Skipping generated/lock file:', filename);
        continue;
      }
      if (file.status === 'removed') {
        console.log('Skipping removed file:', filename);
        continue;
      }

      // read file content at head ref
      let code = '';
      try {
        const content = await octokit.repos.getContent({ owner, repo, path: filename, ref: pr.head.ref });
        if (Array.isArray(content.data)) {
          console.log('Skipping directory:', filename);
          continue;
        }
        code = Buffer.from(content.data.content, 'base64').toString('utf8');
      } catch (err) {
        console.log('Could not read file content, skipping:', filename, err.message);
        continue;
      }

      // call backend review endpoint
      let reviewResp;
      try {
        const resp = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, filename }),
        });
        reviewResp = await resp.json();
      } catch (err) {
        console.log('Review request failed for', filename, err.message);
        continue;
      }

      const review = (reviewResp && reviewResp.review) || reviewResp;
      if (!review || !review.issues) {
        console.log('No structured issues returned for', filename);
        continue;
      }

      const patch = file.patch || '';
      const lineToPosition = buildLineToPositionMap(patch);

      for (const issue of review.issues) {
        const ln = issue.line;
        const severity = (issue.severity || 'suggestion').toLowerCase();
        const emoji = severity === 'bug' ? '🐛' : severity === 'warning' ? '⚠️' : severity === 'good' ? '✅' : '💡';
        const body = `${emoji} **${issue.title || severity}**\n\n${issue.description || ''}${issue.fix ? `\n\n**Fix:** ${issue.fix}` : ''}`;

        if (typeof ln === 'number' && ln > 0) {
          const pos = lineToPosition[ln];
          if (pos) {
            comments.push({ path: filename, position: pos, body });
            continue;
          }
        }

        // fallback to summary if no line mapping
        summaryItems.push({ file: filename, title: issue.title || severity, description: issue.description || '', severity });
      }
    }

    // Post inline review comments if present
    if (comments.length) {
      // GitHub limits createReview comments per API request; send in one review if reasonable
      try {
        await octokit.pulls.createReview({ owner, repo, pull_number, body: 'Automated AI review — inline comments below.', event: 'COMMENT', comments });
        console.log('Posted inline review with', comments.length, 'comments');
      } catch (err) {
        console.error('Failed to post inline review:', err);
      }
    }

    // Post top-level summary
    const summaryLines = [];
    summaryLines.push('## 🤖 AI Review Summary');
    if (summaryItems.length === 0 && comments.length === 0) {
      summaryLines.push('- No issues found by automated review. ✅');
    } else {
      const grouped = groupBySeverity(summaryItems);
      for (const sev of ['bug', 'warning', 'suggestion', 'good']) {
        const items = grouped[sev] || [];
        if (!items.length) continue;
        const emoji = sev === 'bug' ? '🐛' : sev === 'warning' ? '⚠️' : sev === 'good' ? '✅' : '💡';
        summaryLines.push(`\n**${emoji} ${capitalize(sev)}s (${items.length})**`);
        for (const it of items.slice(0, 20)) {
          summaryLines.push(`- **${it.file}** — ${it.title}: ${it.description}`);
        }
      }
    }

    try {
      await octokit.issues.createComment({ owner, repo, issue_number: pull_number, body: summaryLines.join('\n') });
      console.log('Posted summary comment');
    } catch (err) {
      console.error('Failed to post summary comment:', err);
    }

    // Helpers
    function buildLineToPositionMap(patch) {
      const map = {};
      if (!patch) return map;
      const lines = patch.split('\n');
      let newLine = null;
      let position = 0;
      for (const l of lines) {
        if (l.startsWith('@@')) {
          const m = l.match(/\+(\d+)(?:,(\d+))?/);
          newLine = m ? parseInt(m[1], 10) : 1;
          continue;
        }
        if (l.startsWith('\\')) continue; // \ No newline at end of file
        position += 1;
        const prefix = l[0];
        if (prefix === '+') {
          map[newLine] = position;
          newLine += 1;
        } else if (prefix === '-') {
          // removed line -> does not advance new file line
        } else {
          map[newLine] = position;
          newLine += 1;
        }
      }
      return map;
    }

    function groupBySeverity(items) {
      return items.reduce((acc, it) => {
        const s = (it.severity || 'suggestion').toLowerCase();
        (acc[s] = acc[s] || []).push(it);
        return acc;
      }, {});
    }

    function capitalize(s) { return s && s[0].toUpperCase() + s.slice(1); }

  } catch (err) {
    console.error('Fatal action error:', err);
    process.exit(1);
  }
})();
