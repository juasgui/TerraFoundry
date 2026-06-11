// Geospatial Intelligence — Leaflet layer data from ontology objects
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');

// GET all geo-tagged objects for map rendering
router.get('/objects', (req, res) => {
  const db = getDB();
  const { type_id, status, severity } = req.query;
  let where = ['o.geo_lat IS NOT NULL'];
  let params = [];

  if (type_id)  { where.push('o.type_id = ?');   params.push(type_id); }
  if (status)   { where.push('o.status = ?');     params.push(status); }
  if (severity) { where.push('o.severity = ?');   params.push(severity); }

  const objects = db.prepare(`
    SELECT o.id, o.name, o.status, o.severity, o.geo_lat, o.geo_lng, o.geo_polygon, o.properties,
      ot.id as type_id, ot.label as type_label, ot.icon as type_icon, ot.color as type_color
    FROM objects o JOIN object_types ot ON ot.id = o.type_id
    WHERE ${where.join(' AND ')}
    ORDER BY ot.name, o.name
  `).all(...params);

  objects.forEach(o => {
    try { o.properties = JSON.parse(o.properties); } catch {}
    if (o.geo_polygon) { try { o.geo_polygon = JSON.parse(o.geo_polygon); } catch {} }
  });

  res.json(objects);
});

// GET flood zones (area polygons with severity)
router.get('/flood-zones', (req, res) => {
  const db = getDB();

  const zones = db.prepare(`
    SELECT o.id, o.name, o.severity, o.geo_lat, o.geo_lng, o.geo_polygon,
      json_extract(o.properties,'$.affected_people') as affected,
      json_extract(o.properties,'$.vulnerability_idx') as risk
    FROM objects o
    WHERE o.type_id='ot-area' AND o.geo_polygon IS NOT NULL
    ORDER BY o.severity
  `).all();

  zones.forEach(z => { if (z.geo_polygon) { try { z.geo_polygon = JSON.parse(z.geo_polygon); } catch {} } });
  res.json(zones);
});

// GET infrastructure layer
router.get('/infrastructure', (req, res) => {
  const db = getDB();
  const infra = db.prepare(`
    SELECT o.id, o.name, o.status, o.severity, o.geo_lat, o.geo_lng,
      json_extract(o.properties,'$.infra_type') as infra_type,
      json_extract(o.properties,'$.condition') as condition,
      json_extract(o.properties,'$.capacity_info') as capacity_info
    FROM objects o WHERE o.type_id='ot-infra' AND o.geo_lat IS NOT NULL
    ORDER BY o.severity
  `).all();
  res.json(infra);
});

// GET heatmap data (population vulnerability)
router.get('/heatmap', (req, res) => {
  const db = getDB();
  const points = db.prepare(`
    SELECT geo_lat as lat, geo_lng as lng,
      CAST(json_extract(properties,'$.vulnerability_idx') AS REAL) as intensity,
      name, json_extract(properties,'$.affected_people') as affected
    FROM objects
    WHERE type_id='ot-area' AND geo_lat IS NOT NULL
      AND json_extract(properties,'$.vulnerability_idx') IS NOT NULL
  `).all();

  // Normalize intensity 0-1
  const maxIntensity = Math.max(...points.map(p => p.intensity || 0));
  points.forEach(p => { p.intensity_norm = maxIntensity > 0 ? (p.intensity / maxIntensity) : 0; });

  res.json(points);
});

// GET supply route lines
router.get('/supply-routes', (req, res) => {
  const db = getDB();

  // Hard-coded Mozambique supply routes with status (derived from infra objects)
  const routes = [
    {
      id: 'rt-001', name: 'Beira Corridor (N6)', status: 'BLOCKED',
      coordinates: [[-19.83,34.84],[-19.2,34.9],[-18.1,34.5],[-16.5,33.2],[-16.16,33.59]],
      blocked_at: 'Km 214 — Buzi Bridge', cargo: ['Food Aid','Medical','NFI'], tonnage_pending: 4200,
    },
    {
      id: 'rt-002', name: 'Nacala Corridor (Rail)', status: 'ACTIVE',
      coordinates: [[-14.54,40.67],[-15.0,39.2],[-15.8,37.5],[-16.16,33.59]],
      blocked_at: null, cargo: ['Food Aid','Medical'], tonnage_pending: 1800,
    },
    {
      id: 'rt-003', name: 'Limpopo Corridor (EN1)', status: 'PARTIAL',
      coordinates: [[-25.96,32.58],[-25.0,33.0],[-24.5,33.2],[-23.86,35.34]],
      blocked_at: 'Km 189 — single lane low tide only', cargo: ['Food Aid','Health Kits'], tonnage_pending: 980,
    },
    {
      id: 'rt-004', name: 'Beira-Quelimane Air Bridge', status: 'ACTIVE',
      coordinates: [[-19.80,34.91],[-17.88,36.87]],
      blocked_at: null, cargo: ['Critical Medical','Vaccines'], tonnage_pending: 45, type: 'air',
    },
  ];

  res.json(routes);
});

// GET active weather event tracks/impacts
router.get('/weather-events', (req, res) => {
  const db = getDB();

  const events = db.prepare(`
    SELECT o.id, o.name, o.status, o.severity, o.geo_lat, o.geo_lng,
      json_extract(o.properties,'$.event_type') as event_type,
      json_extract(o.properties,'$.wind_speed_kmh') as wind_speed,
      json_extract(o.properties,'$.rainfall_mm') as rainfall,
      json_extract(o.properties,'$.forecast_track') as forecast_track
    FROM objects o WHERE o.type_id='ot-weather' AND o.status='active'
  `).all();

  res.json(events);
});

// GET summary of all layers (counts by type)
router.get('/layers', (req, res) => {
  const db = getDB();
  const layers = db.prepare(`
    SELECT ot.id as type_id, ot.label, ot.icon, ot.color,
      COUNT(o.id) as total,
      SUM(CASE WHEN o.geo_lat IS NOT NULL THEN 1 ELSE 0 END) as mapped
    FROM object_types ot LEFT JOIN objects o ON o.type_id = ot.id
    GROUP BY ot.id ORDER BY mapped DESC
  `).all();
  res.json(layers);
});

module.exports = router;
