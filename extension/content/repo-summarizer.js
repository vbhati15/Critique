const repoSummaryId = 'critique-repo-summary';

function readmeText() {
  return document.querySelector('#readme article, #readme .markdown-body, article.markdown-body')?.innerText?.trim() || '';
}

function repoName() {
  const [, owner, repo] = location.pathname.split('/');
  return owner && repo ? `${owner}/${repo}` : 'this repository';
}

function renderSummaryCard(container, text, error = false) {
  container.replaceChildren();
  const content = document.createElement('div');
  content.className = `critique-summary-card${error ? ' critique-summary-card--error' : ''}`;
  const lines = text.split('\n').map((line) => line.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
  if (error) {
    content.textContent = text;
  } else {
    const list = document.createElement('ul');
    (lines.length ? lines : [text]).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      list.appendChild(item);
    });
    content.appendChild(list);
  }
  container.appendChild(content);
}

function mountRepoSummarizer() {
  if (!window.__critiqueGitHub?.isRepositoryRoot() || document.getElementById(repoSummaryId)) return;
  const readme = readmeText();
  if (readme.length < 20) return;

  const anchor = document.querySelector('h1') || document.querySelector('[data-testid="repository-header"]');
  if (!anchor) return;
  const wrap = document.createElement('div');
  wrap.id = repoSummaryId;
  wrap.className = 'critique-repo-summary';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'critique-action-button';
  button.textContent = 'Summarize with AI';
  const output = document.createElement('div');

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Summarizing…';
    renderSummaryCard(output, 'Generating a three-bullet README summary…');
    try {
      const result = await window.__critiqueGitHub.requestCritique('/summarize', { readme: readmeText(), repoName: repoName() });
      renderSummaryCard(output, result.summary || 'No summary returned.');
    } catch (error) {
      renderSummaryCard(output, error instanceof Error ? error.message : 'Could not summarize this README.', true);
    } finally {
      button.disabled = false;
      button.textContent = 'Summarize with AI';
    }
  });
  wrap.append(button, output);
  anchor.insertAdjacentElement('afterend', wrap);
}

mountRepoSummarizer();
document.addEventListener('turbo:load', mountRepoSummarizer);
