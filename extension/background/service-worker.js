const seenGitHubTabs = new Set();

function isGitHubUrl(url = '') {
  return /^https:\/\/(?:.+\.)?github\.com\//i.test(url);
}

function isPullRequestDiffUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && (parsed.hostname === 'github.com' || parsed.hostname.endsWith('.github.com'))
      && /\/pull\/\d+\.diff$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Critique] Extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'CRITIQUE_PING') {
    sendResponse({ ok: true, tabId: sender.tab?.id ?? null });
    return false;
  }

  if (message?.type === 'CRITIQUE_FETCH_PR_DIFF') {
    if (!isPullRequestDiffUrl(message.url)) {
      sendResponse({ ok: false, error: 'Invalid GitHub pull request diff URL.' });
      return false;
    }

    fetch(message.url, {
      headers: { Accept: 'text/plain, text/x-diff, */*' },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch diff (${response.status})`);
        }
        sendResponse({ ok: true, diff: await response.text() });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Failed to fetch diff.' });
      });

    return true;
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
