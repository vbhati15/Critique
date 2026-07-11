const STORAGE_KEY = 'critiqueBackendUrl';
const EXTENSION_ID = 'critique-extension';
let panelMounted = false;
let currentReview = null;
let highlightedNodes = [];

function isGitHubHost() {
  return location.hostname === 'github.com' || location.hostname.endsWith('.github.com');
}

function isPullRequestPage() {
  return /\/pull\/\d+/.test(location.pathname);
}

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => resolve(result[key]));
  });
}

function createElement(tag, className, textContent) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (typeof textContent === 'string') {
    element.textContent = textContent;
  }
  return element;
}

function addStyles() {
  if (document.getElementById(`${EXTENSION_ID}-styles`)) {
    return;
  }

  const style = document.createElement('style');
  style.id = `${EXTENSION_ID}-styles`;
  style.textContent = `
    .critique-toolbar {
      position: fixed;
      top: 88px;
      right: 24px;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 16px;
      background: rgba(17, 24, 39, 0.92);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(12px);
      color: #fff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .critique-toolbar__label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #93c5fd;
    }

    .critique-toolbar__button {
      border: 0;
      border-radius: 12px;
      padding: 10px 14px;
      background: linear-gradient(135deg, #60a5fa, #2563eb);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .critique-toolbar__button:hover {
      filter: brightness(1.04);
    }

    .critique-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: min(460px, 100vw);
      height: 100vh;
      z-index: 2147483647;
      display: none;
      flex-direction: column;
      background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
      color: #e5e7eb;
      border-left: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: -24px 0 60px rgba(0, 0, 0, 0.32);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .critique-panel--open {
      display: flex;
      animation: critique-slide-in 180ms ease-out;
    }

    @keyframes critique-slide-in {
      from {
        transform: translateX(20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .critique-panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 18px 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      background: radial-gradient(circle at top right, rgba(96, 165, 250, 0.18), transparent 28%);
    }

    .critique-panel__eyebrow {
      margin-bottom: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #93c5fd;
    }

    .critique-panel__title {
      margin: 0;
      font-size: 20px;
      line-height: 1.15;
    }

    .critique-panel__subtitle {
      margin: 8px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: #cbd5e1;
    }

    .critique-panel__close {
      border: 0;
      border-radius: 10px;
      width: 34px;
      height: 34px;
      background: rgba(148, 163, 184, 0.14);
      color: #fff;
      cursor: pointer;
    }

    .critique-panel__body {
      padding: 16px 18px 24px;
      overflow: auto;
      display: grid;
      gap: 14px;
      flex: 1;
    }

    .critique-card {
      padding: 14px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.72);
    }

    .critique-score {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .critique-score__value {
      width: 60px;
      height: 60px;
      display: grid;
      place-items: center;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(37, 99, 235, 0.34));
      color: #fff;
      font-size: 24px;
      font-weight: 800;
    }

    .critique-score__label {
      margin: 0 0 4px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #93c5fd;
    }

    .critique-score__summary {
      margin: 0;
      color: #e5e7eb;
      line-height: 1.5;
    }

    .critique-section__title {
      margin: 0 0 10px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #93c5fd;
    }

    .critique-issues,
    .critique-positives {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .critique-issue {
      padding: 12px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(148, 163, 184, 0.12);
    }

    .critique-issue__top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .critique-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .critique-badge--bug { background: rgba(239, 68, 68, 0.16); color: #fca5a5; }
    .critique-badge--warning { background: rgba(245, 158, 11, 0.16); color: #fcd34d; }
    .critique-badge--suggestion { background: rgba(96, 165, 250, 0.14); color: #bfdbfe; }
    .critique-badge--good { background: rgba(34, 197, 94, 0.16); color: #86efac; }

    .critique-issue__title,
    .critique-positive {
      margin: 0;
      line-height: 1.5;
    }

    .critique-issue__description,
    .critique-issue__fix {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.55;
    }

    .critique-line-highlight,
    tr.critique-line-highlight td,
    td.critique-line-highlight {
      background: rgba(245, 158, 11, 0.16) !important;
      box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.28);
    }

    .critique-loading {
      display: grid;
      place-items: center;
      min-height: 160px;
      color: #cbd5e1;
    }

    .critique-spinner {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      border: 3px solid rgba(148, 163, 184, 0.22);
      border-top-color: #60a5fa;
      animation: critique-spin 700ms linear infinite;
      margin-bottom: 12px;
    }

    @keyframes critique-spin {
      to { transform: rotate(360deg); }
    }

    .critique-empty {
      color: #cbd5e1;
    }
  `;

  document.head.appendChild(style);
}

function ensureGitHubLogging() {
  if (!isGitHubHost()) {
    return;
  }

  if (!window.__critiqueGitHubLogged) {
    window.__critiqueGitHubLogged = true;
    console.log('[Critique] GitHub detected:', location.href);
  }
}

function ensureToolbar() {
  if (!isGitHubHost() || !isPullRequestPage()) {
    return;
  }

  let toolbar = document.getElementById(`${EXTENSION_ID}-toolbar`);
  if (toolbar) {
    return;
  }

  toolbar = createElement('div', 'critique-toolbar');
  toolbar.id = `${EXTENSION_ID}-toolbar`;

  const label = createElement('span', 'critique-toolbar__label', 'Critique');
  const button = createElement('button', 'critique-toolbar__button', 'AI Review');
  button.type = 'button';
  button.addEventListener('click', () => openReviewPanel());

  toolbar.append(label, button);
  document.body.appendChild(toolbar);
}

function ensurePanel() {
  if (panelMounted) {
    return document.getElementById(`${EXTENSION_ID}-panel`);
  }

  const panel = createElement('aside', 'critique-panel');
  panel.id = `${EXTENSION_ID}-panel`;

  const header = createElement('header', 'critique-panel__header');
  const headingWrap = createElement('div');
  const eyebrow = createElement('div', 'critique-panel__eyebrow', 'GitHub PR Review');
  const title = createElement('h2', 'critique-panel__title', 'AI Review');
  const subtitle = createElement('p', 'critique-panel__subtitle', 'Generating a review from the pull request diff and highlighting risky lines in place.');
  headingWrap.append(eyebrow, title, subtitle);

  const closeButton = createElement('button', 'critique-panel__close', '×');
  closeButton.type = 'button';
  closeButton.addEventListener('click', hideReviewPanel);

  header.append(headingWrap, closeButton);

  const body = createElement('div', 'critique-panel__body');
  body.id = `${EXTENSION_ID}-panel-body`;

  panel.append(header, body);
  document.body.appendChild(panel);
  panelMounted = true;
  return panel;
}

function showReviewPanel() {
  const panel = ensurePanel();
  panel.classList.add('critique-panel--open');
}

function hideReviewPanel() {
  const panel = document.getElementById(`${EXTENSION_ID}-panel`);
  if (panel) {
    panel.classList.remove('critique-panel--open');
  }
}

function setPanelContent(node) {
  const body = document.getElementById(`${EXTENSION_ID}-panel-body`);
  if (!body) {
    return;
  }

  body.replaceChildren(node);
}

function renderLoadingState(message = 'Analyzing the pull request...') {
  const wrapper = createElement('div', 'critique-loading');
  const spinner = createElement('div', 'critique-spinner');
  const label = createElement('div', 'critique-empty', message);
  wrapper.append(spinner, label);
  setPanelContent(wrapper);
}

function severityLabel(severity = '') {
  const value = severity.toLowerCase();
  if (value === 'bug') return 'Bug';
  if (value === 'warning') return 'Warning';
  if (value === 'good') return 'Good';
  return 'Suggestion';
}

function severityClass(severity = '') {
  const value = severity.toLowerCase();
  if (value === 'bug') return 'critique-badge--bug';
  if (value === 'warning') return 'critique-badge--warning';
  if (value === 'good') return 'critique-badge--good';
  return 'critique-badge--suggestion';
}

function clearHighlights() {
  for (const node of highlightedNodes) {
    node.classList.remove('critique-line-highlight');
  }
  highlightedNodes = [];
}

function highlightLine(lineNumber) {
  const targets = document.querySelectorAll(
    `[data-line-number="${lineNumber}"] , tr[data-line-number="${lineNumber}"]`
  );

  targets.forEach((target) => {
    target.classList.add('critique-line-highlight');
    const row = target.closest('tr');
    if (row) {
      row.classList.add('critique-line-highlight');
      highlightedNodes.push(row);
    }
    highlightedNodes.push(target);
  });
}

function renderReview(review) {
  clearHighlights();
  currentReview = review;

  const root = createElement('div');

  const scoreCard = createElement('section', 'critique-card');
  const scoreWrap = createElement('div', 'critique-score');
  const scoreValue = createElement('div', 'critique-score__value', review.score == null ? '—' : String(review.score));
  const scoreCopy = createElement('div');
  const scoreLabel = createElement('p', 'critique-score__label', 'Overall score');
  const scoreSummary = createElement('p', 'critique-score__summary', review.summary || 'No summary returned.');
  scoreCopy.append(scoreLabel, scoreSummary);
  scoreWrap.append(scoreValue, scoreCopy);
  scoreCard.append(scoreWrap);

  root.append(scoreCard);

  if (Array.isArray(review.positives) && review.positives.length) {
    const positivesCard = createElement('section', 'critique-card');
    const title = createElement('h3', 'critique-section__title', 'What looks good');
    const list = createElement('ul', 'critique-positives');

    review.positives.forEach((positive) => {
      const item = createElement('li', 'critique-positive', `• ${positive}`);
      list.appendChild(item);
    });

    positivesCard.append(title, list);
    root.append(positivesCard);
  }

  const issuesCard = createElement('section', 'critique-card');
  const issuesTitle = createElement('h3', 'critique-section__title', 'Issues');
  const issuesList = createElement('div', 'critique-issues');

  if (Array.isArray(review.issues) && review.issues.length) {
    review.issues.forEach((issue) => {
      const item = createElement('article', 'critique-issue');
      const top = createElement('div', 'critique-issue__top');
      const badge = createElement('span', `critique-badge ${severityClass(issue.severity)}`, severityLabel(issue.severity));
      top.append(badge);

      if (issue.line != null && Number.isFinite(Number(issue.line))) {
        const lineTag = createElement('span', 'critique-badge', `Line ${issue.line}`);
        top.append(lineTag);
        highlightLine(Number(issue.line));
      }

      const issueTitle = createElement('h4', 'critique-issue__title', issue.title || 'Untitled issue');
      const description = createElement('p', 'critique-issue__description', issue.description || '');
      item.append(top, issueTitle, description);

      if (issue.fix) {
        const fix = createElement('p', 'critique-issue__fix', `Fix: ${issue.fix}`);
        item.appendChild(fix);
      }

      issuesList.appendChild(item);
    });
  } else {
    const empty = createElement('p', 'critique-empty', 'No issues returned for this PR.');
    issuesList.appendChild(empty);
  }

  issuesCard.append(issuesTitle, issuesList);
  root.append(issuesCard);

  setPanelContent(root);
}

function renderError(message) {
  const root = createElement('div', 'critique-card');
  const title = createElement('h3', 'critique-section__title', 'Review unavailable');
  const text = createElement('p', 'critique-empty', message);
  root.append(title, text);
  setPanelContent(root);
}

async function getBackendUrl() {
  const stored = await storageGet(STORAGE_KEY);
  return typeof stored === 'string' ? stored.trim().replace(/\/+$/, '') : '';
}

async function fetchPullRequestDiff() {
  const diffUrl = new URL(`${location.pathname}.diff`, location.origin);
  const response = await fetch(diffUrl.toString(), {
    credentials: 'include',
    headers: {
      Accept: 'text/plain, text/x-diff, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch diff (${response.status})`);
  }

  return await response.text();
}

function buildReviewInputFromDiff(diffText) {
  const lines = diffText.split('\n');
  const output = [];
  let currentFile = 'unknown';
  let newLineNumber = 0;
  let oldLineNumber = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      output.push(line);
      continue;
    }

    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).trim() || currentFile;
      output.push(`File: ${currentFile}`);
      continue;
    }

    if (line.startsWith('--- a/')) {
      continue;
    }

    if (line.startsWith('@@ ')) {
      const match = line.match(/\+([0-9]+)(?:,([0-9]+))?/);
      const oldMatch = line.match(/-([0-9]+)(?:,([0-9]+))?/);
      newLineNumber = match ? Number(match[1]) - 1 : 0;
      oldLineNumber = oldMatch ? Number(oldMatch[1]) - 1 : 0;
      output.push(line);
      continue;
    }

    if (line.startsWith('+')) {
      newLineNumber += 1;
      output.push(`${currentFile}:${newLineNumber} | ${line}`);
      continue;
    }

    if (line.startsWith('-')) {
      oldLineNumber += 1;
      output.push(`${currentFile}:old-${oldLineNumber} | ${line}`);
      continue;
    }

    if (line.startsWith(' ')) {
      newLineNumber += 1;
      oldLineNumber += 1;
      output.push(`${currentFile}:${newLineNumber} | ${line}`);
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

async function generateReview() {
  showReviewPanel();
  renderLoadingState();

  try {
    const backendUrl = await getBackendUrl();
    if (!backendUrl) {
      throw new Error('Set a backend URL in the extension popup first.');
    }

    const diffText = await fetchPullRequestDiff();
    const reviewInput = buildReviewInputFromDiff(diffText).slice(0, 50000);
    const payload = {
      code: reviewInput,
      language: 'diff',
      filename: location.pathname,
      context: 'This is a GitHub pull request diff. Use the new-file line numbers from the diff hunks when reporting line numbers.',
    };

    const response = await fetch(`${backendUrl}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Review request failed');
    }

    const review = result.review || result;
    renderReview(review);
  } catch (error) {
    renderError(error instanceof Error ? error.message : 'Unknown review error');
  }
}

function openReviewPanel() {
  showReviewPanel();
  generateReview();
}

function shouldRun() {
  return isGitHubHost();
}

function bootstrap() {
  if (!shouldRun()) {
    return;
  }

  ensureGitHubLogging();
  addStyles();
  ensureToolbar();
  ensurePanel();
}

const observer = new MutationObserver(() => {
  ensureGitHubLogging();
  if (isPullRequestPage()) {
    ensureToolbar();
    ensurePanel();
  }
});

bootstrap();
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('popstate', bootstrap);
window.addEventListener('hashchange', bootstrap);
window.addEventListener('turbo:load', bootstrap);
window.addEventListener('pjax:end', bootstrap);