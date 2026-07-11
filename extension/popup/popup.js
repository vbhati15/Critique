const STORAGE_KEY = 'critiqueBackendUrl';
const SETTINGS_KEY = 'critiqueSettings';

const form = document.getElementById('settingsForm');
const input = document.getElementById('backendUrl');
const status = document.getElementById('status');
const summarizerEnabled = document.getElementById('summarizerEnabled');
const commitRaterEnabled = document.getElementById('commitRaterEnabled');
const explainerEnabled = document.getElementById('explainerEnabled');
const reviewDepth = document.getElementById('reviewDepth');
const defaults = { summarizerEnabled: true, commitRaterEnabled: true, explainerEnabled: true, reviewDepth: 'standard' };

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#fca5a5' : '#cbd5e1';
}

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => resolve(result[key]));
  });
}

function storageSet(items) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(items, resolve);
  });
}

function normalizeBackendUrl(value) {
  return value.trim().replace(/\/+$/, '');
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function loadSettings() {
  const [savedUrl, savedSettings] = await Promise.all([storageGet(STORAGE_KEY), storageGet(SETTINGS_KEY)]);
  const settings = { ...defaults, ...(savedSettings || {}) };
  input.value = savedUrl || 'http://localhost:3001';
  summarizerEnabled.checked = settings.summarizerEnabled;
  commitRaterEnabled.checked = settings.commitRaterEnabled;
  explainerEnabled.checked = settings.explainerEnabled;
  reviewDepth.value = settings.reviewDepth;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const backendUrl = normalizeBackendUrl(input.value);
  if (!isValidUrl(backendUrl)) {
    setStatus('Enter a valid http:// or https:// URL.', true);
    return;
  }

  await storageSet({
    [STORAGE_KEY]: backendUrl,
    [SETTINGS_KEY]: {
      summarizerEnabled: summarizerEnabled.checked,
      commitRaterEnabled: commitRaterEnabled.checked,
      explainerEnabled: explainerEnabled.checked,
      reviewDepth: reviewDepth.value,
    },
  });
  setStatus('Saved to Chrome storage.');
});

loadSettings().catch(() => setStatus('Could not load settings.', true));
