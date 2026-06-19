const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/database');
const { seedIfEmpty } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Bootstrap DB ─────────────────────────────────────────────────────────────
initDB();
seedIfEmpty();

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/ontology',    require('./routes/ontology'));
app.use('/api/objects',     require('./routes/objects'));
app.use('/api/links',       require('./routes/links'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/map',         require('./routes/map'));
app.use('/api/assets',      require('./routes/assets'));
app.use('/api/missions',    require('./routes/missions'));
app.use('/api/pipelines',   require('./routes/pipelines'));
app.use('/api/ai',          require('./routes/ai'));
app.use('/api/workshop',      require('./routes/workshop'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/intelligence',  require('./routes/intelligence'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'operational', platform: 'Terra v3', ts: new Date().toISOString() });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Terra]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  TERRA v3 — National Climate Intelligence System ║');
  console.log(`║  API: http://localhost:${PORT}                      ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
});
