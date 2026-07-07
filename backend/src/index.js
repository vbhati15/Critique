import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import reviewRouter from './routes/review.js';
import summarizeRouter from './routes/summarize.js';
import explainRouter from './routes/explain.js';
import { generalLimiter, aiLimiter } from './middleware/rateLimit.js';
console.log('KEY:', process.env.OPENROUTER_API_KEY?.slice(0, 15));
const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://github.com',
    'https://*.github.com',
    // Add your deployed frontend URL here later
  ],
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

// ── Routes ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Critique Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('/review', aiLimiter, reviewRouter);
app.use('/summarize', aiLimiter, summarizeRouter);
app.use('/explain', aiLimiter, explainRouter);

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('[Critique] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║         Critique Backend v1.0         ║
╠══════════════════════════════════════╣
║  Server  →  http://localhost:${PORT}    ║
║  Health  →  /health                  ║
║  Review  →  POST /review             ║
║  Explain →  POST /explain            ║
║  Summarize → POST /summarize         ║
╚══════════════════════════════════════╝
  `);
});
