const CRITIQUE_STORAGE_KEY = 'critiqueBackendUrl';
const CRITIQUE_SETTINGS_KEY = 'critiqueSettings';
const DEFAULT_SETTINGS = { summarizerEnabled: true, commitRaterEnabled: true, explainerEnabled: true, reviewDepth: 'standard' };

function isGitHubHost() {
  return location.hostname === 'github.com' || location.hostname.endsWith('.github.com');
}

function isPullRequestPage() {
  return /\/pull\/\d+/.test(location.pathname);
}

function isRepositoryRoot() {
  return /^\/[^/]+\/[^/]+\/?$/.test(location.pathname);
}

function getBackendUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([CRITIQUE_STORAGE_KEY], (result) => {
      resolve(typeof result[CRITIQUE_STORAGE_KEY] === 'string'
        ? result[CRITIQUE_STORAGE_KEY].trim().replace(/\/+$/, '')
        : '');
    });
  });
}

async function requestCritique(path, payload) {
  const backendUrl = await getBackendUrl();
  if (!backendUrl) throw new Error('Set a backend URL in the Critique popup first.');

  const response = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) throw new Error('AI service is busy. Try again in a moment.');
    if (response.status >= 500) throw new Error('Critique server is unreachable. Check your backend URL.');
    throw new Error(result.details || result.error || 'Critique request failed.');
  }
  return result;
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([CRITIQUE_SETTINGS_KEY], (result) => resolve({ ...DEFAULT_SETTINGS, ...(result[CRITIQUE_SETTINGS_KEY] || {}) }));
  });
}

if (isGitHubHost() && !window.__critiqueGitHubLogged) {
  window.__critiqueGitHubLogged = true;
  console.log('[Critique] GitHub detected:', location.href);
}

window.__critiqueGitHub = { isGitHubHost, isPullRequestPage, isRepositoryRoot, requestCritique, getSettings };
