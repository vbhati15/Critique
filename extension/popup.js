const STORAGE_KEY = 'critiqueBackendUrl';

const form = document.getElementById('settingsForm');
const input = document.getElementById('backendUrl');
const status = document.getElementById('status');

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
  const savedUrl = await storageGet(STORAGE_KEY);
  input.value = savedUrl || 'http://localhost:3001';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const backendUrl = normalizeBackendUrl(input.value);
  if (!isValidUrl(backendUrl)) {
    setStatus('Enter a valid http:// or https:// URL.', true);
    return;
  }

  await storageSet({ [STORAGE_KEY]: backendUrl });
  setStatus('Saved to Chrome storage.');
});

loadSettings().catch(() => setStatus('Could not load settings.', true));