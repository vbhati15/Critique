import { Router } from 'express';
import { summarizeRepo } from '../services/claude.js';

const router = Router();

// POST /summarize
// Body: { readme, repoName }
router.post('/', async (req, res) => {
  const { readme, repoName } = req.body;

  if (!readme || typeof readme !== 'string') {
    return res.status(400).json({ error: 'readme is required' });
  }

  try {
    const summary = await summarizeRepo({ readme, repoName: repoName || 'Unknown' });
    res.json({ success: true, summary });
  } catch (err) {
    console.error('[Critique] Summarize error:', err.message);
    res.status(500).json({ error: 'Summarization failed', details: err.message });
  }
});

export default router;
