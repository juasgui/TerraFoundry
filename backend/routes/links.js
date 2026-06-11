// Foundry parallel: Relation management — typed links between objects
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET all links (with optional filters)
router.get('/', (req, res) => {
  const db = getDB();
  const { from_id, to_id, link_type_id, limit = 100 } = req.query;
  let where = []; let params = [];

  if (from_id)      { where.push('l.from_object_id = ?'); params.push(from_id); }
  if (to_id)        { where.push('l.to_object_id = ?');   params.push(to_id); }
  if (link_type_id) { where.push('l.link_type_id = ?');   params.push(link_type_id); }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const links = db.prepare(`
    SELECT l.*, lt.label as link_label, lt.color as link_color,
      fo.name as from_name, fo.status as from_status, fot.label as from_type, fot.icon as from_icon,
      to2.name as to_name, to2.status as to_status, tot.label as to_type, tot.icon as to_icon
    FROM links l
    JOIN link_types lt ON lt.id = l.link_type_id
    JOIN objects fo  ON fo.id  = l.from_object_id
    JOIN object_types fot ON fot.id = fo.type_id
    JOIN objects to2 ON to2.id = l.to_object_id
    JOIN object_types tot ON tot.id = to2.type_id
    ${whereSQL}
    ORDER BY l.created_at DESC LIMIT ?
  `).all(...params, Number(limit));

  links.forEach(l => { try { l.metadata = JSON.parse(l.metadata); } catch {} });
  res.json(links);
});

// POST create link
router.post('/', (req, res) => {
  const db = getDB();
  const { link_type_id, from_object_id, to_object_id, metadata = {} } = req.body;

  if (!link_type_id || !from_object_id || !to_object_id)
    return res.status(400).json({ error: 'link_type_id, from_object_id, to_object_id required' });

  // Validate objects exist
  const fromObj = db.prepare('SELECT id, name FROM objects WHERE id = ?').get(from_object_id);
  const toObj   = db.prepare('SELECT id, name FROM objects WHERE id = ?').get(to_object_id);
  const lt      = db.prepare('SELECT * FROM link_types WHERE id = ?').get(link_type_id);

  if (!fromObj) return res.status(400).json({ error: `from_object_id "${from_object_id}" not found` });
  if (!toObj)   return res.status(400).json({ error: `to_object_id "${to_object_id}" not found` });
  if (!lt)      return res.status(400).json({ error: `link_type_id "${link_type_id}" not found` });

  const id = `lnk-${uuidv4().split('-')[0]}`;
  db.prepare('INSERT INTO links (id,link_type_id,from_object_id,to_object_id,metadata) VALUES (?,?,?,?,?)')
    .run(id, link_type_id, from_object_id, to_object_id, JSON.stringify(metadata));

  // Log event on both objects
  const evId = `ev-${uuidv4().split('-')[0]}`;
  db.prepare(`INSERT INTO events (id,object_id,event_type,title,user_name) VALUES (?,?,?,?,?)`)
    .run(evId, from_object_id, 'link_created', `Linked to "${toObj.name}" via ${lt.label}`, 'System');

  res.status(201).json({ id, link_type_id, from_object_id, to_object_id });
});

// DELETE link
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET link graph for an object (for visualisation)
router.get('/graph/:objectId', (req, res) => {
  const db = getDB();
  const depth = Math.min(parseInt(req.query.depth) || 1, 2);

  const centerObj = db.prepare(`
    SELECT o.id, o.name, o.status, o.severity, ot.label as type_label, ot.icon, ot.color
    FROM objects o JOIN object_types ot ON ot.id = o.type_id WHERE o.id = ?
  `).get(req.params.objectId);

  if (!centerObj) return res.status(404).json({ error: 'Object not found' });

  const visited = new Set([req.params.objectId]);
  const nodes = [centerObj];
  const edges = [];

  function fetchNeighbours(objId) {
    const outLinks = db.prepare(`
      SELECT l.id, l.link_type_id, lt.label as link_label, lt.color as link_color,
        o2.id as obj_id, o2.name, o2.status, o2.severity, ot2.label as type_label, ot2.icon, ot2.color
      FROM links l
      JOIN link_types lt ON lt.id = l.link_type_id
      JOIN objects o2 ON o2.id = l.to_object_id
      JOIN object_types ot2 ON ot2.id = o2.type_id
      WHERE l.from_object_id = ?
    `).all(objId);

    const inLinks = db.prepare(`
      SELECT l.id, l.link_type_id, lt.inverse_label as link_label, lt.color as link_color,
        o2.id as obj_id, o2.name, o2.status, o2.severity, ot2.label as type_label, ot2.icon, ot2.color
      FROM links l
      JOIN link_types lt ON lt.id = l.link_type_id
      JOIN objects o2 ON o2.id = l.from_object_id
      JOIN object_types ot2 ON ot2.id = o2.type_id
      WHERE l.to_object_id = ?
    `).all(objId);

    [...outLinks, ...inLinks].forEach(link => {
      if (!visited.has(link.obj_id)) {
        visited.add(link.obj_id);
        nodes.push({ id: link.obj_id, name: link.name, status: link.status, severity: link.severity, type_label: link.type_label, icon: link.icon, color: link.color });
      }
      edges.push({ id: link.id, from: objId, to: link.obj_id, label: link.link_label, color: link.link_color });
    });

    return [...outLinks, ...inLinks].map(l => l.obj_id);
  }

  const firstNeighbours = fetchNeighbours(req.params.objectId);
  if (depth === 2) firstNeighbours.forEach(nId => fetchNeighbours(nId));

  res.json({ center: req.params.objectId, nodes, edges });
});

module.exports = router;
