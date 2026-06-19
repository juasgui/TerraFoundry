// Foundry parallel: Ontology Manager — browse/edit Object Types & Link Types
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const TYPE_LABELS_PT = {
  'Weather Event': 'Evento Meteorológico',
  'Affected Area': 'Área Afectada',
  'Resource / Asset': 'Recurso / Activo',
  'Organization': 'Organização',
  'Health Risk': 'Risco de Saúde',
  'Supply Chain Item': 'Item de Cadeia de Abastecimento',
  'Mission': 'Missão',
  'Health Facility': 'Unidade de Saúde',
  'River / Waterway': 'Rio / Via Navegável',
  'Infrastructure': 'Infraestrutura',
  'Power Station': 'Central Elétrica',
  'Telecom / Network': 'Telecom / Rede',
  'Water Facility': 'Instalação Hídrica',
  'Crop / Agri Zone': 'Zona Agrícola',
  'Person at Risk': 'Pessoa em Risco',
  'Shelter / IDP Site': 'Abrigo / Campo de Deslocados',
};

const LINK_LABELS_PT = {
  'Impacts On': 'Impacta Em',
  'Threatens': 'Ameaça',
  'Has Health Risk': 'Tem Risco de Saúde',
  'Located In': 'Localizado Em',
  'Deploys': 'Implanta',
  'Responds To': 'Responde A',
  'Participates In': 'Participa Em',
  'Supplies': 'Abastece',
  'Monitors': 'Monitoriza',
  'Assigned To': 'Atribuído A',
  'Operates In': 'Opera Em',
  'Exacerbates': 'Agrava',
};

function translateType(label, isPT) {
  return isPT ? (TYPE_LABELS_PT[label] || label) : label;
}

function translateLink(label, isPT) {
  return isPT ? (LINK_LABELS_PT[label] || label) : label;
}

// GET all object types with property counts
router.get('/types', (req, res) => {
  const db = getDB();
  const isPT = (req.headers['x-lang'] || 'en') === 'pt';
  const types = db.prepare(`
    SELECT ot.*,
      (SELECT COUNT(*) FROM objects o WHERE o.type_id = ot.id) as object_count,
      (SELECT COUNT(*) FROM property_definitions pd WHERE pd.object_type_id = ot.id) as property_count
    FROM object_types ot ORDER BY ot.category, ot.label
  `).all();
  if (isPT) types.forEach(t => { t.label = translateType(t.label, true); });
  res.json(types);
});

// GET single object type with full property definitions
router.get('/types/:id', (req, res) => {
  const db = getDB();
  const isPT = (req.headers['x-lang'] || 'en') === 'pt';
  const type = db.prepare('SELECT * FROM object_types WHERE id = ?').get(req.params.id);
  if (!type) return res.status(404).json({ error: 'Object type not found' });

  if (isPT) type.label = translateType(type.label, true);

  type.properties = db.prepare('SELECT * FROM property_definitions WHERE object_type_id = ? ORDER BY name').all(req.params.id);
  type.object_count = db.prepare('SELECT COUNT(*) as c FROM objects WHERE type_id = ?').get(req.params.id).c;

  // Link types involving this object type
  type.link_types_from = db.prepare('SELECT * FROM link_types WHERE from_type_id = ?').all(req.params.id);
  type.link_types_to   = db.prepare('SELECT * FROM link_types WHERE to_type_id = ?').all(req.params.id);
  if (isPT) {
    type.link_types_from.forEach(l => { l.label = translateLink(l.label, true); });
    type.link_types_to.forEach(l => { l.label = translateLink(l.label, true); });
  }

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
  const isPT = (req.headers['x-lang'] || 'en') === 'pt';
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
  if (isPT) {
    linkTypes.forEach(lt => {
      lt.label = translateLink(lt.label, true);
      if (lt.from_type_label) lt.from_type_label = translateType(lt.from_type_label, true);
      if (lt.to_type_label) lt.to_type_label = translateType(lt.to_type_label, true);
    });
  }
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
  const isPT = (req.headers['x-lang'] || 'en') === 'pt';
  const nodes = db.prepare('SELECT id, label, icon, color, category FROM object_types').all();
  const edges = db.prepare(`
    SELECT lt.id, lt.label, lt.from_type_id as source, lt.to_type_id as target, lt.color,
      ft.label as from_label, tt.label as to_label
    FROM link_types lt
    LEFT JOIN object_types ft ON lt.from_type_id = ft.id
    LEFT JOIN object_types tt ON lt.to_type_id = tt.id
    WHERE lt.from_type_id IS NOT NULL AND lt.to_type_id IS NOT NULL
  `).all();
  if (isPT) {
    nodes.forEach(n => { n.label = translateType(n.label, true); });
    edges.forEach(e => {
      e.label = translateLink(e.label, true);
      if (e.from_label) e.from_label = translateType(e.from_label, true);
      if (e.to_label) e.to_label = translateType(e.to_label, true);
    });
  }
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
