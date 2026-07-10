import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import reviewRouter from './routes/review.js';
import summarizeRouter from './routes/summarize.js';
import explainRouter from './routes/explain.js';
import { generalLimiter, aiLimiter } from './middleware/rateLimit.js';

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

// Simple request logger + optional API-key auth for tunneled requests
// Skip auth for health checks so monitoring/tunnels can verify connectivity
app.use((req, res, next) => {
  if (req.path === '/health' && req.method === 'GET') {
    console.log('[Critique] Health check (no auth)');
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const providedKey = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.key;
  console.log(`[Critique] Incoming ${req.method} ${req.path} - Authorization present: ${!!authHeader}`);

  if (process.env.CRITIQUE_BACKEND_KEY) {
    if (!providedKey || providedKey !== process.env.CRITIQUE_BACKEND_KEY) {
      console.warn('[Critique] Unauthorized request - invalid or missing CRITIQUE_BACKEND_KEY');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  next();
});

// ── Routes ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Critique Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('/review', aiLimiter);
app.use('/review', reviewRouter);
app.use('/summarize', aiLimiter);
app.use('/summarize', summarizeRouter);
app.use('/explain', aiLimiter);
app.use('/explain', explainRouter);

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
