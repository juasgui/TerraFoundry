// Asset & Resource Management — catalog, status workflow, mission assignment
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET all resources/assets with mission assignments
router.get('/', (req, res) => {
  const db = getDB();
  const { status, resource_type } = req.query;
  let where = [`o.type_id='ot-resource'`]; let params = [];

  if (status)        { where.push('o.status = ?'); params.push(status); }
  if (resource_type) { where.push(`json_extract(o.properties,'$.resource_type') = ?`); params.push(resource_type); }

  const assets = db.prepare(`
    SELECT o.id, o.name, o.status, o.geo_lat, o.geo_lng, o.properties,
      (SELECT m.name FROM links l JOIN objects m ON m.id = l.to_object_id
       WHERE l.from_object_id = o.id AND l.link_type_id = 'lt-assigned' LIMIT 1) as mission_name,
      (SELECT l.to_object_id FROM links l
       WHERE l.from_object_id = o.id AND l.link_type_id = 'lt-assigned' LIMIT 1) as mission_id,
      (SELECT org.name FROM links l JOIN objects org ON org.id = l.from_object_id
       WHERE l.to_object_id = o.id AND l.link_type_id = 'lt-deploys' LIMIT 1) as deployed_by
    FROM objects o WHERE ${where.join(' AND ')}
    ORDER BY o.status, o.name
  `).all(...params);

  assets.forEach(a => { try { a.properties = JSON.parse(a.properties); } catch {} });
  res.json(assets);
});

// GET asset detail
router.get('/:id', (req, res) => {
  const db = getDB();
  const asset = db.prepare(`
    SELECT o.*, ot.label as type_label, ot.icon as type_icon
    FROM objects o JOIN object_types ot ON ot.id = o.type_id
    WHERE o.id = ? AND o.type_id = 'ot-resource'
  `).get(req.params.id);

  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  try { asset.properties = JSON.parse(asset.properties); } catch {}

  asset.mission = db.prepare(`
    SELECT o.id, o.name, o.status FROM links l
    JOIN objects o ON o.id = l.to_object_id
    WHERE l.from_object_id = ? AND l.link_type_id = 'lt-assigned'
  `).get(req.params.id);

  asset.timeline = db.prepare('SELECT * FROM events WHERE object_id = ? ORDER BY created_at DESC LIMIT 10').all(req.params.id);

  res.json(asset);
});

// PATCH update asset status (workflow: available → deployed → in_transit → returned)
router.patch('/:id/status', (req, res) => {
  const db = getDB();
  const { status, location, notes } = req.body;
  const allowed = ['available','deployed','in_transit','returned','maintenance'];

  if (!allowed.includes(status))
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });

  const asset = db.prepare('SELECT * FROM objects WHERE id = ? AND type_id = ?').get(req.params.id, 'ot-resource');
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  db.prepare(`UPDATE objects SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);

  if (location) {
    const props = JSON.parse(asset.properties || '{}');
    props.location = location;
    db.prepare(`UPDATE objects SET properties=? WHERE id=?`).run(JSON.stringify(props), req.params.id);
  }

  db.prepare(`INSERT INTO events (id,object_id,event_type,title,description,user_name) VALUES (?,?,?,?,?,?)`)
    .run(`ev-${uuidv4().split('-')[0]}`, req.params.id, 'status_change',
      `Status → ${status}`, notes || `Updated to ${status}`, req.body.operator || 'Operator');

  res.json({ success: true, status });
});

// POST assign asset to mission
router.post('/:id/assign', (req, res) => {
  const db = getDB();
  const { mission_id, operator } = req.body;

  if (!mission_id) return res.status(400).json({ error: 'mission_id required' });

  const mission = db.prepare(`SELECT id, name FROM objects WHERE id = ? AND type_id='ot-mission'`).get(mission_id);
  if (!mission) return res.status(404).json({ error: 'Mission not found' });

  // Remove existing assignment
  db.prepare(`DELETE FROM links WHERE from_object_id=? AND link_type_id='lt-assigned'`).run(req.params.id);

  // Create new assignment
  const id = `lnk-${uuidv4().split('-')[0]}`;
  db.prepare(`INSERT INTO links (id,link_type_id,from_object_id,to_object_id) VALUES (?,?,?,?)`)
    .run(id, 'lt-assigned', req.params.id, mission_id);

  db.prepare(`UPDATE objects SET status='deployed', updated_at=datetime('now') WHERE id=?`).run(req.params.id);

  db.prepare(`INSERT INTO events (id,object_id,event_type,title,user_name) VALUES (?,?,?,?,?)`)
    .run(`ev-${uuidv4().split('-')[0]}`, req.params.id, 'status_change',
      `Assigned to mission: ${mission.name}`, operator || 'Operator');

  res.json({ success: true, link_id: id });
});

// POST unassign from mission
router.post('/:id/unassign', (req, res) => {
  const db = getDB();
  db.prepare(`DELETE FROM links WHERE from_object_id=? AND link_type_id='lt-assigned'`).run(req.params.id);
  db.prepare(`UPDATE objects SET status='available', updated_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// GET asset status summary
router.get('/summary/status', (req, res) => {
  const db = getDB();
  const summary = db.prepare(`
    SELECT status, COUNT(*) as count,
      json_extract(properties,'$.resource_type') as resource_type
    FROM objects WHERE type_id='ot-resource'
    GROUP BY status, resource_type ORDER BY count DESC
  `).all();
  res.json(summary);
});

module.exports = router;
