// Mission management — response operations, resource assignment, status
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET all missions
router.get('/', (req, res) => {
  const db = getDB();
  const { status } = req.query;
  let where = status ? `WHERE m.status = ?` : '';

  const missions = db.prepare(`
    SELECT m.*,
      o_we.name as weather_event_name,
      o_org.name as lead_org_name,
      (SELECT COUNT(*) FROM links l WHERE l.to_object_id = m.id AND l.link_type_id='lt-assigned') as resource_count,
      (SELECT COUNT(*) FROM links l JOIN objects o ON o.id=l.from_object_id
       WHERE l.to_object_id = m.id AND l.link_type_id='lt-participates') as org_count
    FROM missions m
    LEFT JOIN objects o_we  ON o_we.id  = m.weather_event_id
    LEFT JOIN objects o_org ON o_org.id = m.lead_org_id
    ${where}
    ORDER BY CASE m.status WHEN 'active' THEN 0 WHEN 'planning' THEN 1 ELSE 2 END, m.created_at DESC
  `).all(...(status ? [status] : []));

  res.json(missions);
});

// GET mission detail with full resource + org list
router.get('/:id', (req, res) => {
  const db = getDB();
  const mission = db.prepare(`
    SELECT m.*, o_we.name as weather_event_name, o_org.name as lead_org_name
    FROM missions m
    LEFT JOIN objects o_we  ON o_we.id  = m.weather_event_id
    LEFT JOIN objects o_org ON o_org.id = m.lead_org_id
    WHERE m.id = ?
  `).get(req.params.id);

  if (!mission) return res.status(404).json({ error: 'Mission not found' });

  // Deployed resources
  mission.resources = db.prepare(`
    SELECT o.id, o.name, o.status, o.properties,
      json_extract(o.properties,'$.resource_type') as resource_type,
      json_extract(o.properties,'$.location') as location
    FROM links l JOIN objects o ON o.id = l.from_object_id
    WHERE l.to_object_id = ? AND l.link_type_id = 'lt-assigned'
  `).all(req.params.id);
  mission.resources.forEach(r => { try { r.properties = JSON.parse(r.properties); } catch {} });

  // Participating organizations
  mission.organizations = db.prepare(`
    SELECT o.id, o.name, o.properties,
      json_extract(o.properties,'$.org_type') as org_type
    FROM links l JOIN objects o ON o.id = l.from_object_id
    WHERE l.to_object_id = ? AND l.link_type_id = 'lt-participates'
  `).all(req.params.id);
  mission.organizations.forEach(o => { try { o.properties = JSON.parse(o.properties); } catch {} });

  // Supply chain items linked
  mission.supply_items = db.prepare(`
    SELECT sc.id, sc.name, sc.properties FROM links l
    JOIN objects sc ON sc.id = l.from_object_id
    WHERE l.to_object_id = ? AND sc.type_id = 'ot-supply'
  `).all(req.params.id);
  mission.supply_items.forEach(s => { try { s.properties = JSON.parse(s.properties); } catch {} });

  // Timeline
  mission.timeline = db.prepare(`
    SELECT * FROM events WHERE object_id = ? ORDER BY created_at DESC LIMIT 15
  `).all(req.params.id);

  res.json(mission);
});

// POST create mission
router.post('/', (req, res) => {
  const db = getDB();
  const { name, description, lead_org_id, weather_event_id, start_date, priority = 'HIGH' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = `mis-${uuidv4().split('-')[0]}`;
  db.prepare(`INSERT INTO missions (id,name,status,description,lead_org_id,weather_event_id,start_date,priority) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, name, 'planning', description, lead_org_id, weather_event_id, start_date, priority);

  // Also create as object so it appears in the ontology graph
  db.prepare(`INSERT OR IGNORE INTO objects (id,type_id,name,status,properties) VALUES (?,?,?,?,?)`)
    .run(id, 'ot-mission', name, 'planning', JSON.stringify({ start_date, lead_org: lead_org_id, priority }));

  res.status(201).json({ id });
});

// PATCH mission status
router.patch('/:id/status', (req, res) => {
  const db = getDB();
  const { status } = req.body;
  const allowed = ['planning','active','suspended','completed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `Must be: ${allowed.join(',')}` });

  db.prepare(`UPDATE missions SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);
  db.prepare(`UPDATE objects SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);

  db.prepare(`INSERT INTO events (id,object_id,event_type,title,user_name) VALUES (?,?,?,?,?)`)
    .run(`ev-${uuidv4().split('-')[0]}`, req.params.id, 'status_change', `Mission status → ${status}`, req.body.operator || 'Operator');

  res.json({ success: true });
});

module.exports = router;
