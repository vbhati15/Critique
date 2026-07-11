function isGitHubHost() {
  return location.hostname === 'github.com' || location.hostname.endsWith('.github.com');
}

function isPullRequestPage() {
  return /\/pull\/\d+/.test(location.pathname);
}

if (isGitHubHost() && !window.__critiqueGitHubLogged) {
  window.__critiqueGitHubLogged = true;
  console.log('[Critique] GitHub detected:', location.href);
}

window.__critiquePageInfo = {
  isGitHubHost,
  isPullRequestPage,
};