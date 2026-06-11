// Workshop — configurable dashboard layouts (Foundry: Workshop low-code apps)
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET all layouts
router.get('/', (req, res) => {
  const db = getDB();
  const layouts = db.prepare('SELECT * FROM workshop_layouts ORDER BY updated_at DESC').all();
  layouts.forEach(l => { try { l.widgets = JSON.parse(l.widgets); } catch { l.widgets = []; } });
  res.json(layouts);
});

// GET single layout
router.get('/:id', (req, res) => {
  const db = getDB();
  const layout = db.prepare('SELECT * FROM workshop_layouts WHERE id = ?').get(req.params.id);
  if (!layout) return res.status(404).json({ error: 'Layout not found' });
  try { layout.widgets = JSON.parse(layout.widgets); } catch { layout.widgets = []; }
  res.json(layout);
});

// POST create layout
router.post('/', (req, res) => {
  const db = getDB();
  const { name, description, template = 'blank', widgets = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = `ws-${uuidv4().split('-')[0]}`;
  db.prepare('INSERT INTO workshop_layouts (id,name,description,template,widgets) VALUES (?,?,?,?,?)')
    .run(id, name, description, template, JSON.stringify(widgets));
  res.status(201).json({ id });
});

// PUT update layout (save widget config)
router.put('/:id', (req, res) => {
  const db = getDB();
  const { name, description, widgets } = req.body;
  db.prepare(`UPDATE workshop_layouts SET
    name=COALESCE(?,name), description=COALESCE(?,description),
    widgets=COALESCE(?,widgets), updated_at=datetime('now') WHERE id=?`)
    .run(name, description, widgets ? JSON.stringify(widgets) : null, req.params.id);
  res.json({ success: true });
});

// DELETE layout
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM workshop_layouts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET available widget types (catalogue)
router.get('/meta/widget-types', (req, res) => {
  res.json([
    { type: 'metric',   label: 'KPI Metric',        icon: '📊', description: 'Single number with trend', configFields: ['title','query','unit','color'] },
    { type: 'map',      label: 'Map View',           icon: '🗺', description: 'Leaflet map with layers',  configFields: ['title','defaultLayers'] },
    { type: 'chart',    label: 'Chart',              icon: '📈', description: 'Bar, line, pie, area',     configFields: ['title','chartType','query'] },
    { type: 'table',    label: 'Object Table',       icon: '📋', description: 'Filterable object list',  configFields: ['title','type_id','columns'] },
    { type: 'alerts',   label: 'Alerts Panel',       icon: '🔔', description: 'Live alert cards',        configFields: ['title','maxItems','severity'] },
    { type: 'timeline', label: 'Event Timeline',     icon: '⏱', description: 'Chronological event feed',configFields: ['title','maxItems'] },
    { type: 'text',     label: 'Rich Text',          icon: '📝', description: 'Static or dynamic text',  configFields: ['title','content'] },
    { type: 'search',   label: 'Search',             icon: '🔍', description: 'Object search widget',    configFields: ['title','placeholder'] },
  ]);
});

module.exports = router;
