function getSidebarState() {
  return window.__critiqueSidebar || null;
}

window.addEventListener('click', (event) => {
  const closeButton = event.target instanceof Element ? event.target.closest('#critique-extension-close') : null;
  if (closeButton) {
    getSidebarState()?.hideReviewPanel?.();
  }
});