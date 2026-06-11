// Foundry parallel: Object Explorer — search, filter, CRUD, 360° view
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET objects — search, filter, paginate
router.get('/', (req, res) => {
  const db = getDB();
  const { q, type_id, status, severity, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (q) {
    where.push(`(o.name LIKE ? OR o.properties LIKE ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }
  if (type_id) { where.push('o.type_id = ?'); params.push(type_id); }
  if (status)  { where.push('o.status = ?');  params.push(status); }
  if (severity){ where.push('o.severity = ?');params.push(severity); }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM objects o ${whereSQL}`).get(...params).c;
  const objects = db.prepare(`
    SELECT o.*, ot.label as type_label, ot.icon as type_icon, ot.color as type_color,
      (SELECT COUNT(*) FROM links l WHERE l.from_object_id = o.id OR l.to_object_id = o.id) as link_count
    FROM objects o
    JOIN object_types ot ON ot.id = o.type_id
    ${whereSQL}
    ORDER BY o.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  objects.forEach(o => { try { o.properties = JSON.parse(o.properties); } catch { o.properties = {}; } });

  res.json({ total, page: Number(page), limit: Number(limit), objects });
});

// GET single object with full 360° context
router.get('/:id', (req, res) => {
  const db = getDB();
  const obj = db.prepare(`
    SELECT o.*, ot.label as type_label, ot.icon as type_icon, ot.color as type_color
    FROM objects o JOIN object_types ot ON ot.id = o.type_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!obj) return res.status(404).json({ error: 'Object not found' });

  try { obj.properties = JSON.parse(obj.properties); } catch { obj.properties = {}; }
  if (obj.geo_polygon) { try { obj.geo_polygon = JSON.parse(obj.geo_polygon); } catch {} }

  // Property definitions for this type
  obj.property_definitions = db.prepare('SELECT * FROM property_definitions WHERE object_type_id = ?').all(obj.type_id);

  // All outgoing links
  obj.links_out = db.prepare(`
    SELECT l.id as link_id, l.metadata, l.created_at as linked_at,
      lt.label as link_label, lt.color as link_color,
      o2.id as target_id, o2.name as target_name, o2.status as target_status, o2.severity as target_severity,
      ot2.label as target_type_label, ot2.icon as target_type_icon, ot2.color as target_type_color
    FROM links l
    JOIN link_types lt ON lt.id = l.link_type_id
    JOIN objects o2 ON o2.id = l.to_object_id
    JOIN object_types ot2 ON ot2.id = o2.type_id
    WHERE l.from_object_id = ?
    ORDER BY lt.label
  `).all(req.params.id);

  // All incoming links
  obj.links_in = db.prepare(`
    SELECT l.id as link_id, l.metadata, l.created_at as linked_at,
      lt.inverse_label as link_label, lt.color as link_color,
      o2.id as source_id, o2.name as source_name, o2.status as source_status, o2.severity as source_severity,
      ot2.label as source_type_label, ot2.icon as source_type_icon, ot2.color as source_type_color
    FROM links l
    JOIN link_types lt ON lt.id = l.link_type_id
    JOIN objects o2 ON o2.id = l.from_object_id
    JOIN object_types ot2 ON ot2.id = o2.type_id
    WHERE l.to_object_id = ?
    ORDER BY lt.label
  `).all(req.params.id);

  obj.links_out.forEach(l => { try { l.metadata = JSON.parse(l.metadata); } catch {} });
  obj.links_in.forEach(l => { try { l.metadata = JSON.parse(l.metadata); } catch {} });

  // Timeline events
  obj.timeline = db.prepare(`
    SELECT * FROM events WHERE object_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.params.id);

  // Comments
  obj.comments = db.prepare(`
    SELECT * FROM comments WHERE object_id = ? ORDER BY created_at DESC
  `).all(req.params.id);

  // Related alerts
  obj.alerts = db.prepare('SELECT * FROM alerts WHERE object_id = ? ORDER BY created_at DESC').all(req.params.id);

  res.json(obj);
});

// POST create object
router.post('/', (req, res) => {
  const db = getDB();
  const { type_id, name, status = 'active', severity, geo_lat, geo_lng, geo_polygon, properties = {} } = req.body;
  if (!type_id || !name) return res.status(400).json({ error: 'type_id and name required' });

  const type = db.prepare('SELECT id FROM object_types WHERE id = ?').get(type_id);
  if (!type) return res.status(400).json({ error: `Unknown type_id: ${type_id}` });

  const id = req.body.id || `obj-${uuidv4().split('-')[0]}`;
  db.prepare(`INSERT INTO objects (id,type_id,name,status,severity,geo_lat,geo_lng,geo_polygon,properties) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, type_id, name, status, severity || null, geo_lat || null, geo_lng || null,
      geo_polygon ? JSON.stringify(geo_polygon) : null, JSON.stringify(properties));

  db.prepare(`INSERT INTO events (id,object_id,event_type,title,user_name) VALUES (?,?,?,?,?)`)
    .run(`ev-${uuidv4().split('-')[0]}`, id, 'created', `Object "${name}" created`, 'System');

  res.status(201).json({ id });
});

// PUT update object
router.put('/:id', (req, res) => {
  const db = getDB();
  const { name, status, severity, geo_lat, geo_lng, geo_polygon, properties } = req.body;
  const obj = db.prepare('SELECT * FROM objects WHERE id = ?').get(req.params.id);
  if (!obj) return res.status(404).json({ error: 'Object not found' });

  const prevStatus = obj.status;

  db.prepare(`UPDATE objects SET
    name=COALESCE(?,name), status=COALESCE(?,status), severity=COALESCE(?,severity),
    geo_lat=COALESCE(?,geo_lat), geo_lng=COALESCE(?,geo_lng),
    geo_polygon=COALESCE(?,geo_polygon),
    properties=COALESCE(?,properties), updated_at=datetime('now')
    WHERE id=?`).run(
    name, status, severity, geo_lat, geo_lng,
    geo_polygon ? JSON.stringify(geo_polygon) : null,
    properties ? JSON.stringify(properties) : null,
    req.params.id
  );

  if (status && status !== prevStatus) {
    db.prepare(`INSERT INTO events (id,object_id,event_type,title,description,user_name) VALUES (?,?,?,?,?,?)`)
      .run(`ev-${uuidv4().split('-')[0]}`, req.params.id, 'status_change',
        `Status changed to ${status}`, `Previous: ${prevStatus}`, 'Operator');
  }

  res.json({ success: true });
});

// DELETE object
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM objects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST add comment to object
router.post('/:id/comments', (req, res) => {
  const db = getDB();
  const { user_name, content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const id = `cmt-${uuidv4().split('-')[0]}`;
  db.prepare('INSERT INTO comments (id,object_id,user_name,content) VALUES (?,?,?,?)')
    .run(id, req.params.id, user_name || 'Analyst', content);

  db.prepare(`INSERT INTO events (id,object_id,event_type,title,description,user_name) VALUES (?,?,?,?,?,?)`)
    .run(`ev-${uuidv4().split('-')[0]}`, req.params.id, 'comment', 'New comment added', content.substring(0, 100), user_name || 'Analyst');

  res.status(201).json({ id });
});

// GET objects for a specific type (quick lookup)
router.get('/by-type/:typeId', (req, res) => {
  const db = getDB();
  const objects = db.prepare(`
    SELECT id, name, status, severity, geo_lat, geo_lng, properties
    FROM objects WHERE type_id = ? ORDER BY name
  `).all(req.params.typeId);
  objects.forEach(o => { try { o.properties = JSON.parse(o.properties); } catch {} });
  res.json(objects);
});

module.exports = router;
