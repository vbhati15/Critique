const CRITIQUE_STORAGE_KEY = 'critiqueBackendUrl';

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
  const result = await response.json();
  if (!response.ok) throw new Error(result.details || result.error || 'Critique request failed.');
  return result;
}

if (isGitHubHost() && !window.__critiqueGitHubLogged) {
  window.__critiqueGitHubLogged = true;
  console.log('[Critique] GitHub detected:', location.href);
}

window.__critiqueGitHub = { isGitHubHost, isPullRequestPage, isRepositoryRoot, requestCritique };
