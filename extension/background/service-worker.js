const seenGitHubTabs = new Set();

function isGitHubUrl(url = '') {
  return /^https:\/\/(?:.+\.)?github\.com\//i.test(url);
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Critique] Extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'CRITIQUE_PING') {
    sendResponse({ ok: true, tabId: sender.tab?.id ?? null });
    return false;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab?.url || !isGitHubUrl(tab.url)) {
    return;
  }

  const signature = `${tabId}:${tab.url}`;
  if (seenGitHubTabs.has(signature)) {
    return;
  }

  seenGitHubTabs.add(signature);
  console.log('[Critique] GitHub page detected:', tab.url);
});