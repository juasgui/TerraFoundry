// Foundry parallel: Ontology Storage Layer
// All entities live in a single property-graph schema.
// Objects + Links = the entire knowledge graph.

// Uses Node.js built-in node:sqlite (Node 22.5+) — no native compilation needed.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'terra.db');
let db;

function getDB() {
  if (!db) db = new DatabaseSync(DB_PATH);
  return db;
}

function initDB() {
  const db = getDB();

  // Performance: WAL mode + busy timeout
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    -- ── Object Type Registry (Foundry: Property Type definitions) ──────────────
    CREATE TABLE IF NOT EXISTS object_types (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      label       TEXT NOT NULL,
      icon        TEXT DEFAULT '●',
      color       TEXT DEFAULT '#00d4ff',
      description TEXT,
      category    TEXT DEFAULT 'core',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- ── Property Definitions per Object Type ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS property_definitions (
      id             TEXT PRIMARY KEY,
      object_type_id TEXT NOT NULL,
      name           TEXT NOT NULL,
      label          TEXT NOT NULL,
      type           TEXT DEFAULT 'string',   -- string|number|date|boolean|enum|geo
      required       INTEGER DEFAULT 0,
      enum_values    TEXT,                    -- JSON array if type=enum
      unit           TEXT,
      FOREIGN KEY (object_type_id) REFERENCES object_types(id) ON DELETE CASCADE
    );

    -- ── Link Type Registry (Foundry: Relation Type definitions) ──────────────
    CREATE TABLE IF NOT EXISTS link_types (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL UNIQUE,
      label          TEXT NOT NULL,
      inverse_label  TEXT,
      from_type_id   TEXT,
      to_type_id     TEXT,
      color          TEXT DEFAULT '#4a5568',
      description    TEXT,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    -- ── Objects (Foundry: Object instances in the graph) ─────────────────────
    CREATE TABLE IF NOT EXISTS objects (
      id             TEXT PRIMARY KEY,
      type_id        TEXT NOT NULL,
      name           TEXT NOT NULL,
      status         TEXT DEFAULT 'active',   -- active|inactive|critical|resolved
      severity       TEXT,                    -- CRITICAL|HIGH|MEDIUM|LOW
      geo_lat        REAL,
      geo_lng        REAL,
      geo_polygon    TEXT,                    -- JSON [[lat,lng],...]
      properties     TEXT DEFAULT '{}',       -- JSON property bag
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (type_id) REFERENCES object_types(id)
    );

    CREATE INDEX IF NOT EXISTS idx_objects_type ON objects(type_id);
    CREATE INDEX IF NOT EXISTS idx_objects_status ON objects(status);
    CREATE INDEX IF NOT EXISTS idx_objects_name ON objects(name);

    -- ── Links (Foundry: Relation instances) ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS links (
      id             TEXT PRIMARY KEY,
      link_type_id   TEXT NOT NULL,
      from_object_id TEXT NOT NULL,
      to_object_id   TEXT NOT NULL,
      metadata       TEXT DEFAULT '{}',
      created_at     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (link_type_id)   REFERENCES link_types(id),
      FOREIGN KEY (from_object_id) REFERENCES objects(id) ON DELETE CASCADE,
      FOREIGN KEY (to_object_id)   REFERENCES objects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_object_id);
    CREATE INDEX IF NOT EXISTS idx_links_to   ON links(to_object_id);

    -- ── Events / Timeline (Foundry: Action log per object) ───────────────────
    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      object_id   TEXT,
      event_type  TEXT NOT NULL,  -- status_change|alert|comment|link_created|ingestion
      title       TEXT NOT NULL,
      description TEXT,
      metadata    TEXT DEFAULT '{}',
      user_name   TEXT DEFAULT 'System',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_object ON events(object_id);

    -- ── Alerts ───────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS alerts (
      id              TEXT PRIMARY KEY,
      severity        TEXT NOT NULL,
      title           TEXT NOT NULL,
      description     TEXT,
      object_id       TEXT,
      acknowledged    INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    -- ── Missions (Foundry: Workflow/Action Plans) ─────────────────────────────
    CREATE TABLE IF NOT EXISTS missions (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      status           TEXT DEFAULT 'planning',
      description      TEXT,
      lead_org_id      TEXT,
      weather_event_id TEXT,
      start_date       TEXT,
      end_date         TEXT,
      priority         TEXT DEFAULT 'HIGH',
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now'))
    );

    -- ── Pipeline Runs (Foundry: Data Lineage) ────────────────────────────────
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id               TEXT PRIMARY KEY,
      source           TEXT NOT NULL,
      source_type      TEXT DEFAULT 'api',   -- api|csv|satellite|manual
      status           TEXT DEFAULT 'pending',
      records_ingested INTEGER DEFAULT 0,
      records_failed   INTEGER DEFAULT 0,
      objects_created  INTEGER DEFAULT 0,
      links_created    INTEGER DEFAULT 0,
      metadata         TEXT DEFAULT '{}',
      started_at       TEXT,
      completed_at     TEXT,
      created_at       TEXT DEFAULT (datetime('now'))
    );

    -- ── Comments (Foundry: Collaboration on objects) ──────────────────────────
    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY,
      object_id   TEXT NOT NULL,
      user_name   TEXT NOT NULL,
      content     TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- ── Workshop Layouts (Foundry: Workshop app configs) ─────────────────────
    CREATE TABLE IF NOT EXISTS workshop_layouts (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      template    TEXT DEFAULT 'blank',
      widgets     TEXT DEFAULT '[]',
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // Bilingual columns — added incrementally; SQLite doesn't support IF NOT EXISTS on ALTER TABLE
  const bilingualMigrations = [
    `ALTER TABLE alerts ADD COLUMN title_pt TEXT`,
    `ALTER TABLE alerts ADD COLUMN description_pt TEXT`,
    `ALTER TABLE events ADD COLUMN title_pt TEXT`,
    `ALTER TABLE events ADD COLUMN description_pt TEXT`,
    `ALTER TABLE missions ADD COLUMN name_pt TEXT`,
    `ALTER TABLE missions ADD COLUMN description_pt TEXT`,
  ];
  bilingualMigrations.forEach(sql => { try { db.exec(sql); } catch {} });

  console.log('[DB] Schema initialised at', DB_PATH);
  return db;
}

module.exports = { getDB, initDB };
