import { Router } from 'express';
import { explainCode, rateCommitMessage } from '../services/claude.js';

const router = Router();

// POST /explain
// Body: { code, language? }
router.post('/', async (req, res) => {
  const { code, language = 'code' } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' });
  }

  try {
    const explanation = await explainCode({ code, language });
    res.json({ success: true, explanation });
  } catch (err) {
    console.error('[Critique] Explain error:', err.message);
    res.status(500).json({ error: 'Explanation failed', details: err.message });
  }
});

// POST /explain/commit
// Body: { message }
router.post('/commit', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const rating = await rateCommitMessage({ message });
    res.json({ success: true, rating });
  } catch (err) {
    console.error('[Critique] Commit rating error:', err.message);
    res.status(500).json({ error: 'Rating failed', details: err.message });
  }
});

export default router;
