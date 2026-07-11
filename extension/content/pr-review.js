const STORAGE_KEY = 'critiqueBackendUrl';
const EXTENSION_ID = 'critique-extension';

let panelMounted = false;
let currentReview = null;
let highlightedNodes = [];
let sidebarLoaded = false;

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

async function ensureSidebar() {
  if (panelMounted || sidebarLoaded) {
    return document.getElementById(`${EXTENSION_ID}-panel`);
  }

  const response = await fetch(chrome.runtime.getURL('sidebar/sidebar.html'));
  const html = await response.text();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();

  const panel = wrapper.firstElementChild;
  if (!panel) {
    throw new Error('Sidebar template missing');
  }

  document.body.appendChild(panel);
  panelMounted = true;
  sidebarLoaded = true;

  const closeButton = document.getElementById(`${EXTENSION_ID}-close`);
  if (closeButton) {
    closeButton.addEventListener('click', hideReviewPanel);
  }

  return panel;
}

function showReviewPanel() {
  const panel = document.getElementById(`${EXTENSION_ID}-panel`);
  if (panel) {
    panel.classList.add('critique-panel--open');
  }
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

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'CRITIQUE_FETCH_PR_DIFF', url: diffUrl.toString() },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!result?.ok) {
          reject(new Error(result?.error || 'Failed to fetch diff.'));
          return;
        }

        resolve(result.diff);
      }
    );
  });
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
  await ensureSidebar();
  showReviewPanel();
  renderLoadingState();

  try {
    const backendUrl = await getBackendUrl();
    if (!backendUrl) {
      throw new Error('Set a backend URL in the extension popup first.');
    }

    let diffText;
    try {
      diffText = await fetchPullRequestDiff();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      throw new Error(`Could not fetch the GitHub PR diff: ${message}`);
    }
    const reviewInput = buildReviewInputFromDiff(diffText).slice(0, 50000);
    const payload = {
      code: reviewInput,
      language: 'diff',
      filename: location.pathname,
      context: 'This is a GitHub pull request diff. Use the new-file line numbers from the diff hunks when reporting line numbers.',
    };

    let response;
    try {
      response = await fetch(`${backendUrl}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      throw new Error(`Could not reach the backend at ${backendUrl}: ${message}`);
    }

    const result = await response.json();
    if (!response.ok) {
      const detail = typeof result.details === 'string' && result.details.trim()
        ? `: ${result.details.trim()}`
        : '';
      throw new Error(`${result.error || 'Review request failed'}${detail}`);
    }

    const review = result.review || result;
    renderReview(review);
  } catch (error) {
    renderError(error instanceof Error ? error.message : 'Unknown review error');
  }
}

async function openReviewPanel() {
  await ensureSidebar();
  showReviewPanel();
  generateReview();
}

function bootstrap() {
  if (!isGitHubHost()) {
    return;
  }

  ensureToolbar();
  if (isPullRequestPage()) {
    ensureSidebar().catch((error) => console.error('[Critique] Sidebar init failed:', error));
  }
}

const observer = new MutationObserver(() => {
  if (isPullRequestPage()) {
    ensureToolbar();
  }
});

bootstrap();
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('popstate', bootstrap);
window.addEventListener('hashchange', bootstrap);
window.addEventListener('turbo:load', bootstrap);
window.addEventListener('pjax:end', bootstrap);

window.__critiqueSidebar = {
  renderReview,
  renderLoadingState,
  renderError,
  showReviewPanel,
  hideReviewPanel,
};
