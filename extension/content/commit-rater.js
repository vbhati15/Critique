const ratedCommitInputs = new WeakSet();

function ratingClass(score) {
  if (score >= 8) return 'critique-commit-rating--good';
  if (score >= 5) return 'critique-commit-rating--okay';
  return 'critique-commit-rating--poor';
}

function attachCommitRater(input) {
  if (ratedCommitInputs.has(input)) return;
  ratedCommitInputs.add(input);
  const rating = document.createElement('div');
  rating.className = 'critique-commit-rating';
  rating.hidden = true;
  input.insertAdjacentElement('afterend', rating);
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const message = input.value.trim();
    if (message.length < 4) { rating.hidden = true; return; }
    rating.hidden = false;
    rating.className = 'critique-commit-rating';
    rating.textContent = 'Checking commit message…';
    timer = setTimeout(async () => {
      try {
        const result = await window.__critiqueGitHub.requestCritique('/explain/commit', { message });
        const value = result.rating || {};
        rating.className = `critique-commit-rating ${ratingClass(Number(value.score) || 0)}`;
        rating.textContent = `${value.score || '–'}/10 ${value.label || 'Unrated'}${value.tip ? ` — ${value.tip}` : ''}`;
      } catch (error) {
        rating.className = 'critique-commit-rating critique-commit-rating--poor';
        rating.textContent = error instanceof Error ? error.message : 'Could not rate this message.';
      }
    }, 700);
  });
}

function mountCommitRaters() {
  document.querySelectorAll('textarea[name="message"], textarea#commit-message, textarea.js-commit-message').forEach(attachCommitRater);
}

mountCommitRaters();
new MutationObserver(mountCommitRaters).observe(document.documentElement, { childList: true, subtree: true });
