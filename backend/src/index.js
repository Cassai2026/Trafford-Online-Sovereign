require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/nodes',     require('./routes/nodes'));
app.use('/api/deeds',     require('./routes/deeds'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/swaps',     require('./routes/service-swap'));
app.use('/api/governance',require('./routes/governance'));
app.use('/api/safety',    require('./routes/safety'));
app.use('/api/reworks',   require('./routes/reworks'));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'trafford-sovereign-hub' }));

// ── 404 fallthrough ──────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ─────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () =>
    console.info(`[Hub] Trafford Sovereign Hub listening on port ${PORT}`)
  );
}

module.exports = app; // exported for testing
