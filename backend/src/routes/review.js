import { createHash } from 'node:crypto';
import { Router } from 'express';
import { reviewCode } from '../services/claude.js';
import { getCached, setCached } from '../services/cache.js';

const router = Router();
const MAX_CHUNK_CHARS = 16000;

function detectLanguage(filename = '', fallback = 'javascript') {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', h: 'cpp', c: 'c', java: 'java', go: 'go',
    rs: 'rust', rb: 'ruby', php: 'php', cs: 'csharp', swift: 'swift', kt: 'kotlin', sql: 'sql', sh: 'bash',
  };
  return map[ext] || fallback;
}

function shouldSkip(filename = '') {
  return ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.min.js', '.min.css', 'dist/', 'build/', 'node_modules/', '.map']
    .some((pattern) => filename.includes(pattern));
}

function splitLargeInput(code) {
  if (code.length <= MAX_CHUNK_CHARS) return [code];
  const diffSections = code.split(/(?=diff --git )/).filter(Boolean);
  const sections = diffSections.length > 1
    ? diffSections
    : code.split(/(?=File: )/).filter(Boolean);
  const chunks = [];
  for (const section of sections.length ? sections : [code]) {
    if (section.length <= MAX_CHUNK_CHARS) { chunks.push(section); continue; }
    let buffer = '';
    for (const line of section.split('\n')) {
      if (buffer.length + line.length + 1 > MAX_CHUNK_CHARS && buffer) { chunks.push(buffer); buffer = ''; }
      buffer += `${line}\n`;
    }
    if (buffer) chunks.push(buffer);
  }
  return chunks;
}

function filenameForChunk(chunk, fallback) {
  return chunk.match(/(?:\+\+\+ b\/|File: )([^\s]+)/)?.[1] || fallback;
}

function mergeReviews(reviews) {
  const valid = reviews.map((result) => result.review || result);
  const scores = valid.map((review) => Number(review.score)).filter(Number.isFinite);
  return {
    success: true,
    review: {
      score: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      summary: valid.map((review) => review.summary).filter(Boolean).join(' '),
      positives: [...new Set(valid.flatMap((review) => review.positives || []))].slice(0, 8),
      issues: valid.flatMap((review) => review.issues || []).slice(0, 30),
    },
  };
}

router.post('/', async (req, res) => {
  const { code, language, filename = '', context } = req.body;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'code is required and must be a string' });
  if (code.trim().length < 10) return res.status(400).json({ error: 'Code is too short to review' });
  if (code.length > 200000) return res.status(400).json({ error: 'Code exceeds maximum length (200,000 chars)' });
  if (filename && shouldSkip(filename)) return res.json({ skipped: true, reason: `File "${filename}" is excluded from review.` });

  const chunks = splitLargeInput(code);
  try {
    const reviews = [];
    for (const chunk of chunks) {
      const chunkFilename = filenameForChunk(chunk, filename);
      if (shouldSkip(chunkFilename)) continue;
      const chunkLanguage = language && language !== 'diff' ? language : detectLanguage(chunkFilename, 'diff');
      const key = createHash('sha256').update(`${chunkLanguage}\0${chunkFilename}\0${context || ''}\0${chunk}`).digest('hex');
      const cached = getCached(key);
      if (cached) { reviews.push(cached); continue; }
      const result = await reviewCode({
        code: chunk,
        language: chunkLanguage,
        filename: chunkFilename,
        context: `${context || ''}${chunks.length > 1 ? ` This is chunk ${reviews.length + 1} of ${chunks.length}; review only this chunk.` : ''}`,
      });
      reviews.push(setCached(key, result));
    }
    if (!reviews.length) return res.json({ skipped: true, reason: 'All changed files are excluded from review.' });
    res.json(mergeReviews(reviews));
  } catch (err) {
    console.error('[Critique] Review error:', err.message);
    res.status(500).json({ error: 'Review failed', details: err.message });
  }
});

export default router;
