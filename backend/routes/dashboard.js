// Control Center — aggregated metrics, alerts, timeline, charts
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');

// GET key metrics for the COP dashboard
router.get('/metrics', (req, res) => {
  const db = getDB();

  const areas = db.prepare(`SELECT properties FROM objects WHERE type_id='ot-area' AND status != 'resolved'`).all();
  let totalAffected = 0, totalDisplaced = 0;
  areas.forEach(a => {
    try {
      const p = JSON.parse(a.properties);
      totalAffected  += p.affected_people || 0;
      totalDisplaced += p.displaced || 0;
    } catch {}
  });

  const activeHazards = db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-weather' AND status IN ('active','critical')`).get().c;
  const deployedResources = db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-resource' AND status IN ('deployed','active')`).get().c;
  const criticalAlerts = db.prepare(`SELECT COUNT(*) as c FROM alerts WHERE severity='CRITICAL' AND acknowledged=0`).get().c;

  const choleraCases = db.prepare(`SELECT SUM(CAST(json_extract(properties,'$.cases') AS INTEGER)) as s FROM objects WHERE type_id='ot-health' AND properties LIKE '%cholera%'`).get().s || 0;

  // Vulnerability index (avg across provinces)
  const vulnRows = db.prepare(`SELECT json_extract(properties,'$.vulnerability_idx') as v FROM objects WHERE type_id='ot-area'`).all();
  const vulnAvg = vulnRows.length ? (vulnRows.reduce((s,r) => s + (r.v||0), 0) / vulnRows.length).toFixed(1) : 0;

  const activeMissions = db.prepare(`SELECT COUNT(*) as c FROM missions WHERE status='active'`).get().c;
  const totalObjects = db.prepare(`SELECT COUNT(*) as c FROM objects`).get().c;
  const totalLinks = db.prepare(`SELECT COUNT(*) as c FROM links`).get().c;

  res.json({
    totalAffected,
    totalDisplaced,
    activeHazards,
    deployedResources,
    criticalAlerts,
    choleraCases,
    riskIndex: parseFloat(vulnAvg),
    activeMissions,
    totalObjects,
    totalLinks,
    provincesAffected: areas.length,
    lastUpdated: new Date().toISOString(),
  });
});

// GET active alerts
router.get('/alerts', (req, res) => {
  const db = getDB();
  const { acknowledged = 'false', limit = 20 } = req.query;

  let alerts = db.prepare(`
    SELECT a.*, o.name as object_name, ot.label as object_type, ot.icon as object_icon, ot.color as object_color
    FROM alerts a
    LEFT JOIN objects o ON o.id = a.object_id
    LEFT JOIN object_types ot ON ot.id = o.type_id
    WHERE a.acknowledged = ?
    ORDER BY
      CASE a.severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
      a.created_at DESC
    LIMIT ?
  `).all(acknowledged === 'true' ? 1 : 0, Number(limit));

  res.json(alerts);
});

// POST acknowledge alert
router.post('/alerts/:id/acknowledge', (req, res) => {
  const db = getDB();
  db.prepare(`UPDATE alerts SET acknowledged=1, acknowledged_by=? WHERE id=?`)
    .run(req.body.user || 'Operator', req.params.id);
  res.json({ success: true });
});

// GET incident timeline (recent events across all objects)
router.get('/timeline', (req, res) => {
  const db = getDB();
  const { limit = 30 } = req.query;

  const events = db.prepare(`
    SELECT e.*, o.name as object_name, ot.label as object_type, ot.icon as object_icon, ot.color as object_color
    FROM events e
    LEFT JOIN objects o ON o.id = e.object_id
    LEFT JOIN object_types ot ON ot.id = o.type_id
    ORDER BY e.created_at DESC LIMIT ?
  `).all(Number(limit));

  res.json(events);
});

// GET chart data
router.get('/charts', (req, res) => {
  const db = getDB();

  // Affected people by province
  const byProvince = db.prepare(`
    SELECT o.name, json_extract(o.properties,'$.affected_people') as affected,
      json_extract(o.properties,'$.displaced') as displaced,
      json_extract(o.properties,'$.vulnerability_idx') as risk,
      o.severity
    FROM objects o WHERE o.type_id='ot-area' AND o.geo_lat IS NOT NULL
    ORDER BY affected DESC LIMIT 10
  `).all();

  // Objects by type
  const byType = db.prepare(`
    SELECT ot.label, ot.color, ot.icon, COUNT(o.id) as count
    FROM object_types ot LEFT JOIN objects o ON o.type_id = ot.id
    GROUP BY ot.id ORDER BY count DESC
  `).all();

  // Resources by status
  const resourceStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM objects WHERE type_id='ot-resource' GROUP BY status
  `).all();

  // Health risk cases
  const healthCases = db.prepare(`
    SELECT o.name,
      CAST(json_extract(o.properties,'$.cases') AS INTEGER) as cases,
      CAST(json_extract(o.properties,'$.deaths') AS INTEGER) as deaths,
      o.severity
    FROM objects o WHERE o.type_id='ot-health' ORDER BY cases DESC
  `).all();

  // Affected trend (mock monthly — derive from severity scores)
  const affectedTrend = [
    { month:'Jan 2026', affected:890000,  displaced:95000 },
    { month:'Feb 2026', affected:1100000, displaced:140000 },
    { month:'Mar 2026', affected:1450000, displaced:198000 },
    { month:'Apr 2026', affected:1820000, displaced:235000 },
    { month:'May 2026', affected:2100000, displaced:280000 },
    { month:'Jun 2026', affected:2360000, displaced:312000 },
  ];

  res.json({ byProvince, byType, resourceStatus, healthCases, affectedTrend });
});

// GET province situation matrix
router.get('/province-matrix', (req, res) => {
  const db = getDB();

  const provinces = db.prepare(`
    SELECT o.id, o.name, o.status, o.severity, o.geo_lat, o.geo_lng,
      json_extract(o.properties,'$.affected_people') as affected,
      json_extract(o.properties,'$.displaced') as displaced,
      json_extract(o.properties,'$.vulnerability_idx') as risk_index,
      json_extract(o.properties,'$.admin_level') as admin_level
    FROM objects o WHERE o.type_id='ot-area' AND json_extract(o.properties,'$.admin_level')='Province'
    ORDER BY affected DESC
  `).all();

  res.json(provinces);
});

module.exports = router;
