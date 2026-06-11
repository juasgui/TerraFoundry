// Foundry parallel: Ontology Manager — browse/edit Object Types & Link Types
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET all object types with property counts
router.get('/types', (req, res) => {
  const db = getDB();
  const types = db.prepare(`
    SELECT ot.*,
      (SELECT COUNT(*) FROM objects o WHERE o.type_id = ot.id) as object_count,
      (SELECT COUNT(*) FROM property_definitions pd WHERE pd.object_type_id = ot.id) as property_count
    FROM object_types ot ORDER BY ot.category, ot.label
  `).all();
  res.json(types);
});

// GET single object type with full property definitions
router.get('/types/:id', (req, res) => {
  const db = getDB();
  const type = db.prepare('SELECT * FROM object_types WHERE id = ?').get(req.params.id);
  if (!type) return res.status(404).json({ error: 'Object type not found' });

  type.properties = db.prepare('SELECT * FROM property_definitions WHERE object_type_id = ? ORDER BY name').all(req.params.id);
  type.object_count = db.prepare('SELECT COUNT(*) as c FROM objects WHERE type_id = ?').get(req.params.id).c;

  // Link types involving this object type
  type.link_types_from = db.prepare('SELECT * FROM link_types WHERE from_type_id = ?').all(req.params.id);
  type.link_types_to   = db.prepare('SELECT * FROM link_types WHERE to_type_id = ?').all(req.params.id);

  res.json(type);
});

// POST create object type
router.post('/types', (req, res) => {
  const db = getDB();
  const { name, label, icon = '●', color = '#00d4ff', description = '', category = 'core' } = req.body;
  if (!name || !label) return res.status(400).json({ error: 'name and label required' });

  const id = 'ot-' + uuidv4().split('-')[0];
  db.prepare('INSERT INTO object_types (id,name,label,icon,color,description,category) VALUES (?,?,?,?,?,?,?)').run(id, name, label, icon, color, description, category);
  res.status(201).json({ id, name, label, icon, color, description, category });
});

// PUT update object type
router.put('/types/:id', (req, res) => {
  const db = getDB();
  const { label, icon, color, description, category } = req.body;
  db.prepare('UPDATE object_types SET label=COALESCE(?,label), icon=COALESCE(?,icon), color=COALESCE(?,color), description=COALESCE(?,description), category=COALESCE(?,category) WHERE id=?')
    .run(label, icon, color, description, category, req.params.id);
  res.json({ success: true });
});

// POST add property definition to object type
router.post('/types/:id/properties', (req, res) => {
  const db = getDB();
  const { name, label, type = 'string', required = false, enum_values, unit } = req.body;
  if (!name || !label) return res.status(400).json({ error: 'name and label required' });

  const id = 'pd-' + uuidv4().split('-')[0];
  db.prepare('INSERT INTO property_definitions (id,object_type_id,name,label,type,required,enum_values,unit) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.params.id, name, label, type, required ? 1 : 0, enum_values ? JSON.stringify(enum_values) : null, unit || null);
  res.status(201).json({ id, object_type_id: req.params.id, name, label, type, required, enum_values, unit });
});

// DELETE property definition
router.delete('/types/:typeId/properties/:propId', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM property_definitions WHERE id = ? AND object_type_id = ?').run(req.params.propId, req.params.typeId);
  res.json({ success: true });
});

// GET all link types
router.get('/link-types', (req, res) => {
  const db = getDB();
  const linkTypes = db.prepare(`
    SELECT lt.*,
      ft.label as from_type_label, ft.icon as from_type_icon, ft.color as from_type_color,
      tt.label as to_type_label, tt.icon as to_type_icon, tt.color as to_type_color,
      (SELECT COUNT(*) FROM links l WHERE l.link_type_id = lt.id) as link_count
    FROM link_types lt
    LEFT JOIN object_types ft ON lt.from_type_id = ft.id
    LEFT JOIN object_types tt ON lt.to_type_id = tt.id
    ORDER BY lt.label
  `).all();
  res.json(linkTypes);
});

// POST create link type
router.post('/link-types', (req, res) => {
  const db = getDB();
  const { name, label, inverse_label, from_type_id, to_type_id, color = '#4a5568', description } = req.body;
  if (!name || !label) return res.status(400).json({ error: 'name and label required' });

  const id = 'lt-' + uuidv4().split('-')[0];
  db.prepare('INSERT INTO link_types (id,name,label,inverse_label,from_type_id,to_type_id,color,description) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, name, label, inverse_label, from_type_id, to_type_id, color, description);
  res.status(201).json({ id, name, label, inverse_label, from_type_id, to_type_id, color, description });
});

// GET ontology graph (for visualisation)
router.get('/graph', (req, res) => {
  const db = getDB();
  const nodes = db.prepare('SELECT id, label, icon, color, category FROM object_types').all();
  const edges = db.prepare(`
    SELECT lt.id, lt.label, lt.from_type_id as source, lt.to_type_id as target, lt.color,
      ft.label as from_label, tt.label as to_label
    FROM link_types lt
    LEFT JOIN object_types ft ON lt.from_type_id = ft.id
    LEFT JOIN object_types tt ON lt.to_type_id = tt.id
    WHERE lt.from_type_id IS NOT NULL AND lt.to_type_id IS NOT NULL
  `).all();
  res.json({ nodes, edges });
});

// GET ontology stats summary
router.get('/stats', (req, res) => {
  const db = getDB();
  const typeStats = db.prepare(`
    SELECT ot.id, ot.label, ot.icon, ot.color, COUNT(o.id) as count
    FROM object_types ot LEFT JOIN objects o ON o.type_id = ot.id
    GROUP BY ot.id ORDER BY count DESC
  `).all();
  const totalLinks = db.prepare('SELECT COUNT(*) as c FROM links').get().c;
  const totalObjects = db.prepare('SELECT COUNT(*) as c FROM objects').get().c;
  res.json({ typeStats, totalLinks, totalObjects });
});

module.exports = router;
