const explanationCache = new Map();
let explanationTimer;
let explanationTooltip;

function getTooltip() {
  if (explanationTooltip) return explanationTooltip;
  explanationTooltip = document.createElement('div');
  explanationTooltip.className = 'critique-explainer-tooltip';
  document.body.appendChild(explanationTooltip);
  return explanationTooltip;
}

function hideTooltip() {
  clearTimeout(explanationTimer);
  if (explanationTooltip) explanationTooltip.hidden = true;
}

function explainTarget(target) {
  const line = target.closest('td.blob-code, td[data-line-number], .blob-code');
  const code = line?.innerText?.trim();
  if (!code || code.length < 8 || code.length > 800) return;
  const tooltip = getTooltip();
  const rect = line.getBoundingClientRect();
  tooltip.style.top = `${Math.max(8, rect.bottom + window.scrollY + 6)}px`;
  tooltip.style.left = `${Math.min(window.innerWidth - 340, Math.max(8, rect.left + window.scrollX))}px`;
  tooltip.hidden = false;
  tooltip.textContent = 'Explaining code…';

  explanationTimer = setTimeout(async () => {
    try {
      let explanation = explanationCache.get(code);
      if (!explanation) {
        const result = await window.__critiqueGitHub.requestCritique('/explain', { code, language: 'code' });
        explanation = result.explanation || 'No explanation returned.';
        explanationCache.set(code, explanation);
      }
      if (!tooltip.hidden) tooltip.textContent = explanation;
    } catch (error) {
      if (!tooltip.hidden) tooltip.textContent = error instanceof Error ? error.message : 'Could not explain this code.';
    }
  }, 650);
}

document.addEventListener('mouseover', (event) => explainTarget(event.target));
document.addEventListener('mouseout', (event) => {
  if (event.target.closest?.('td.blob-code, td[data-line-number], .blob-code')) hideTooltip();
});
