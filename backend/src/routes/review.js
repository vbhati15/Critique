import { Router } from 'express';
import { reviewCode } from '../services/claude.js';

const router = Router();

// Detect language from filename
function detectLanguage(filename = '', fallback = 'javascript') {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
    c: 'c',
    java: 'java',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    cs: 'csharp',
    swift: 'swift',
    kt: 'kotlin',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml', yml: 'yaml',
    sh: 'bash',
  };
  return map[ext] || fallback;
}

// Files to skip reviewing
const SKIP_PATTERNS = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.min.js',
  '.min.css',
  'dist/',
  'build/',
  'node_modules/',
  '.map',
];

function shouldSkip(filename = '') {
  return SKIP_PATTERNS.some((p) => filename.includes(p));
}

// POST /review
// Body: { code, language?, filename?, context? }
router.post('/', async (req, res) => {
  const { code, language, filename, context } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required and must be a string' });
  }

  if (code.trim().length < 10) {
    return res.status(400).json({ error: 'Code is too short to review' });
  }

  if (code.length > 50000) {
    return res.status(400).json({ error: 'Code exceeds maximum length (50,000 chars)' });
  }

  if (filename && shouldSkip(filename)) {
    return res.json({
      skipped: true,
      reason: `File "${filename}" is excluded from review (generated/lock file)`,
    });
  }

  const detectedLanguage = language || detectLanguage(filename);

  try {
    const result = await reviewCode({
      code,
      language: detectedLanguage,
      filename,
      context,
    });

    res.json(result);
  } catch (err) {
    console.error('[Critique] Review error:', err.message);
    res.status(500).json({ error: 'Review failed', details: err.message });
  }
});

export default router;
