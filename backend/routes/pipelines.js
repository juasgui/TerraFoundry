// Data Integration — pipeline simulation, ingestion, lineage
// Foundry parallel: Code Repositories + Data Lineage in Foundry
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const DATA_SOURCES = [
  { id: 'src-inam',      name: 'INAM Meteorological Feed',         type: 'api',       icon: '🌤',  description: 'Instituto Nacional de Meteorologia — SYNOP, TEMP, radar, seasonal forecast', refresh_interval: '15min', target_types: ['WeatherEvent'] },
  { id: 'src-ingd',      name: 'INGD Situation Reports',           type: 'api',       icon: '🏛',  description: 'Instituto Nacional de Gestão e Redução do Risco de Desastres', refresh_interval: '1h', target_types: ['AffectedArea','Mission','Resource'] },
  { id: 'src-wfp-less',  name: 'WFP LESS Tracker',                 type: 'api',       icon: '🚛',  description: 'Logistics Execution Support System — supply chain, warehouse, dispatch', refresh_interval: '30min', target_types: ['SupplyChainItem','Resource'] },
  { id: 'src-dhis2',     name: 'DHIS2 Health Surveillance',        type: 'api',       icon: '🏥',  description: 'Ministry of Health DHIS2 — IDSR, disease surveillance, malnutrition SMART', refresh_interval: '6h', target_types: ['HealthRisk'] },
  { id: 'src-sentinel',  name: 'Sentinel-2 SAR (ESA Copernicus)',   type: 'satellite', icon: '🛰',  description: 'Synthetic aperture radar flood extent mapping, damage assessment', refresh_interval: '6h', target_types: ['AffectedArea','WeatherEvent'] },
  { id: 'src-chirps',    name: 'CHIRPS Rainfall Data',              type: 'satellite', icon: '🌧',  description: 'Climate Hazards Group InfraRed Precipitation with Station data', refresh_interval: '24h', target_types: ['WeatherEvent'] },
  { id: 'src-hdx',       name: 'HDX Open Data',                    type: 'api',       icon: '📊',  description: 'Humanitarian Data Exchange — population estimates, admin boundaries, 3W', refresh_interval: '24h', target_types: ['AffectedArea','Organization'] },
  { id: 'src-csv-upload',name: 'CSV/JSON File Upload',              type: 'file',      icon: '📁',  description: 'Manual upload of field reports, assessment data, resource lists', refresh_interval: 'on-demand', target_types: ['*'] },
];

// GET all data sources
router.get('/sources', (req, res) => {
  const db = getDB();

  // Enrich with latest run stats
  const sources = DATA_SOURCES.map(src => {
    const lastRun = db.prepare(`SELECT * FROM pipeline_runs WHERE source=? ORDER BY created_at DESC LIMIT 1`).get(src.name);
    return { ...src, last_run: lastRun || null };
  });

  res.json(sources);
});

// GET all pipeline runs
router.get('/runs', (req, res) => {
  const db = getDB();
  const runs = db.prepare(`SELECT * FROM pipeline_runs ORDER BY created_at DESC LIMIT 50`).all();
  runs.forEach(r => { try { r.metadata = JSON.parse(r.metadata); } catch {} });
  res.json(runs);
});

// POST trigger a pipeline ingestion (simulation)
router.post('/ingest', (req, res) => {
  const db = getDB();
  const { source_id, source_type = 'api', simulate_delay = false } = req.body;

  const sourceDef = DATA_SOURCES.find(s => s.id === source_id) || { name: source_id || 'Manual', type: source_type };

  const runId = `run-${uuidv4().split('-')[0]}`;
  const startedAt = new Date().toISOString();

  // Simulate different ingestion results per source
  const profiles = {
    'src-inam':      { records: Math.floor(Math.random()*500)+1800, objects: Math.floor(Math.random()*3)+6,  links: Math.floor(Math.random()*5)+8,  failed: 0 },
    'src-ingd':      { records: Math.floor(Math.random()*200)+600,  objects: Math.floor(Math.random()*4)+8,  links: Math.floor(Math.random()*6)+12, failed: Math.floor(Math.random()*2) },
    'src-wfp-less':  { records: Math.floor(Math.random()*100)+280,  objects: Math.floor(Math.random()*2)+3,  links: Math.floor(Math.random()*3)+5,  failed: 0 },
    'src-dhis2':     { records: Math.floor(Math.random()*300)+900,  objects: Math.floor(Math.random()*2)+4,  links: Math.floor(Math.random()*3)+6,  failed: Math.floor(Math.random()*3) },
    'src-sentinel':  { records: Math.floor(Math.random()*1000)+4000,objects: Math.floor(Math.random()*3)+3,  links: Math.floor(Math.random()*4)+5,  failed: 0 },
    'src-chirps':    { records: Math.floor(Math.random()*200)+800,  objects: Math.floor(Math.random()*2)+2,  links: Math.floor(Math.random()*2)+3,  failed: 0 },
    'src-hdx':       { records: Math.floor(Math.random()*500)+2000, objects: Math.floor(Math.random()*5)+10, links: Math.floor(Math.random()*8)+15, failed: 0 },
  };

  const profile = profiles[source_id] || { records: Math.floor(Math.random()*200)+100, objects: Math.floor(Math.random()*5)+2, links: Math.floor(Math.random()*5)+2, failed: 0 };
  const completedAt = new Date(Date.now() + Math.floor(Math.random()*8000)+500).toISOString();

  const newObjects = generateIngestedObjects(source_id, profile.objects, db);

  db.prepare(`INSERT INTO pipeline_runs (id,source,source_type,status,records_ingested,records_failed,objects_created,links_created,started_at,completed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(runId, sourceDef.name, sourceDef.type, 'completed', profile.records, profile.failed, newObjects.length, profile.links, startedAt, completedAt);

  // Add event to timeline
  db.prepare(`INSERT INTO events (id,event_type,title,description,user_name) VALUES (?,?,?,?,?)`)
    .run(`ev-${uuidv4().split('-')[0]}`, 'ingestion',
      `Pipeline ingestion complete: ${sourceDef.name}`,
      `${profile.records} records processed. ${newObjects.length} objects created/updated. ${profile.links} links created.`,
      'Pipeline Engine');

  res.json({
    run_id: runId,
    source: sourceDef.name,
    status: 'completed',
    records_ingested: profile.records,
    records_failed: profile.failed,
    objects_created: newObjects.length,
    links_created: profile.links,
    new_objects: newObjects,
    started_at: startedAt,
    completed_at: completedAt,
    message: `${profile.records} records fused into Terra Ontology. ${newObjects.length} objects updated/created, ${profile.links} new relationships.`,
  });
});

// POST CSV upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const runId = `run-${uuidv4().split('-')[0]}`;
  const records = Math.floor(Math.random() * 80) + 20;
  const db = getDB();

  db.prepare(`INSERT INTO pipeline_runs (id,source,source_type,status,records_ingested,objects_created,links_created,started_at,completed_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(runId, req.file.originalname, 'file', 'completed', records, Math.floor(records*0.8), Math.floor(records*0.4),
      new Date().toISOString(), new Date(Date.now()+2000).toISOString());

  res.json({ run_id: runId, filename: req.file.originalname, records_ingested: records, status: 'completed' });
});

// GET data lineage for an object (which pipelines contributed to it)
router.get('/lineage/:objectId', (req, res) => {
  const db = getDB();
  const obj = db.prepare('SELECT id, name, type_id, created_at FROM objects WHERE id = ?').get(req.params.objectId);
  if (!obj) return res.status(404).json({ error: 'Object not found' });

  // Find runs near object creation time (simulated lineage)
  const runs = db.prepare(`SELECT * FROM pipeline_runs WHERE status='completed' AND created_at <= ? ORDER BY created_at DESC LIMIT 5`).all(obj.created_at || new Date().toISOString());

  res.json({
    object: obj,
    contributing_runs: runs,
    lineage_note: `Object "${obj.name}" was created/updated by ${runs.length} pipeline run(s). Full audit trail available in pipeline logs.`,
  });
});

// Helper: generate plausible new objects from ingestion
function generateIngestedObjects(sourceId, count, db) {
  const newObjects = [];
  const names = {
    'src-sentinel': ['Updated Flood Extent — Tete Basin','New Inundation Zone — Buzi Valley','Damage Assessment Patch — Sofala'],
    'src-dhis2':    ['Cholera Cases Update — Nhamatanda','Malnutrition Screening — Guijá','Health Facility Status — Chokwé'],
    'src-inam':     ['Rainfall Anomaly — Zambezi Catchment','Updated Wind Field — TC Watch','Sea Surface Temperature Alert'],
    'src-ingd':     ['Displacement Camp Update — Tete','Infrastructure Damage Report','Community Needs Assessment'],
    'src-wfp-less': ['Supply Shipment Arrival — Beira','Pipeline Gap Alert — Gaza','Warehouse Inventory Update'],
  };
  const options = names[sourceId] || ['Ingested Record','Data Update','New Assessment'];
  const picked = options.slice(0, Math.min(count, options.length));
  picked.forEach(name => {
    const id = `obj-${uuidv4().split('-')[0]}`;
    newObjects.push({ id, name, action: 'upserted' });
  });
  return newObjects;
}

module.exports = router;
