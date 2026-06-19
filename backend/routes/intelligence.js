// Terra Intelligence Engine — root cause, impact chains, vulnerability, historical
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');

// ── Forward link types (event → downstream effects) ───────────────────────────
const FORWARD_LINKS = [
  'lt-impacts', 'lt-threatens', 'lt-exacerbates',
  'lt-health', 'lt-disrupted-by', 'lt-feeds-into',
  'lt-powered-by', 'lt-flows-through', 'lt-contains',
];

// ── Backward link types (outcome ← upstream causes) ───────────────────────────
const BACKWARD_LINKS = [
  'lt-impacts', 'lt-threatens', 'lt-exacerbates',
  'lt-disrupted-by', 'lt-health',
];

function getObjFull(db, id) {
  const row = db.prepare(`
    SELECT o.*, ot.label as type_label, ot.icon as type_icon, ot.color as type_color,
      json_extract(o.properties,'$.affected_people') as affected_people,
      json_extract(o.properties,'$.beds') as beds,
      json_extract(o.properties,'$.capacity') as capacity,
      json_extract(o.properties,'$.occupancy') as occupancy,
      json_extract(o.properties,'$.event_type') as event_type
    FROM objects o JOIN object_types ot ON ot.id = o.type_id WHERE o.id = ?
  `).get(id);
  if (!row) return null;
  try { row.properties = JSON.parse(row.properties || '{}'); } catch {}
  return row;
}

function severityWeight(s) {
  return s === 'CRITICAL' ? 4 : s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1;
}

// ── GET /impact-chain/:objectId — forward traversal ──────────────────────────
router.get('/impact-chain/:objectId', (req, res) => {
  const db = getDB();
  const { objectId } = req.params;
  const maxDepth = Math.min(parseInt(req.query.depth || '4'), 6);

  const root = getObjFull(db, objectId);
  if (!root) return res.status(404).json({ error: 'Object not found' });

  const visited = new Set([objectId]);
  const stages = [{ stage: 1, label: 'Trigger', role: 'trigger', nodes: [formatNode(root, null)] }];
  let currentLevel = [objectId];

  const STAGE_LABELS = ['', 'Trigger', 'Direct Impact', 'Secondary Effects', 'Cascading Consequences', 'Tertiary Effects', 'System-Wide Effects'];
  const STAGE_ROLES  = ['', 'trigger', 'impact',         'secondary',          'cascading',               'tertiary',          'systemic'];

  for (let depth = 1; depth <= maxDepth; depth++) {
    const nextLevel = [];
    const stageNodes = [];

    for (const nodeId of currentLevel) {
      const placeholders = FORWARD_LINKS.map(() => '?').join(',');
      const outgoing = db.prepare(`
        SELECT l.link_type_id, l.to_object_id, l.metadata,
               lt.label as link_label, lt.color as link_color,
               o.id, o.name, o.type_id, o.status, o.severity,
               ot.label as type_label, ot.icon as type_icon, ot.color as type_color,
               json_extract(o.properties,'$.affected_people') as affected_people,
               json_extract(o.properties,'$.beds') as beds,
               json_extract(o.properties,'$.capacity') as capacity,
               json_extract(o.properties,'$.occupancy') as occupancy
        FROM links l
        JOIN link_types lt ON lt.id = l.link_type_id
        JOIN objects o ON o.id = l.to_object_id
        JOIN object_types ot ON ot.id = o.type_id
        WHERE l.from_object_id = ? AND l.link_type_id IN (${placeholders})
      `).all(nodeId, ...FORWARD_LINKS);

      outgoing.forEach(link => {
        if (!visited.has(link.to_object_id)) {
          visited.add(link.to_object_id);
          nextLevel.push(link.to_object_id);
          stageNodes.push(formatNode(link, link.link_label));
        }
      });
    }

    if (stageNodes.length === 0) break;
    stages.push({
      stage: depth + 1,
      label: STAGE_LABELS[depth + 1] || `Stage ${depth + 1}`,
      role: STAGE_ROLES[depth + 1] || 'effect',
      nodes: stageNodes,
    });
    currentLevel = nextLevel;
  }

  // Compute summary totals
  const totalAffected = stages.slice(1).flatMap(s => s.nodes)
    .reduce((sum, n) => sum + (parseInt(n.affected_people) || 0), 0);
  const criticalCount = stages.slice(1).flatMap(s => s.nodes)
    .filter(n => n.severity === 'CRITICAL').length;
  const infraAtRisk = stages.slice(1).flatMap(s => s.nodes)
    .filter(n => ['ot-infra','ot-facility','ot-water','ot-power','ot-telecom'].includes(n.type_id)).length;

  // Build narrative chain (natural language)
  const narrative = buildNarrative(root, stages);

  res.json({
    root: formatNode(root, null),
    stages,
    totalObjects: visited.size - 1,
    totalAffected,
    criticalCount,
    infraAtRisk,
    narrative,
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /root-cause/:objectId — backward traversal ───────────────────────────
router.get('/root-cause/:objectId', (req, res) => {
  const db = getDB();
  const { objectId } = req.params;

  const outcome = getObjFull(db, objectId);
  if (!outcome) return res.status(404).json({ error: 'Object not found' });

  const visited = new Set([objectId]);
  const levels = [{ level: 0, label: 'Observed Outcome', nodes: [formatNode(outcome, null)] }];
  let currentLevel = [objectId];

  for (let depth = 1; depth <= 4; depth++) {
    const nextLevel = [];
    const levelNodes = [];

    for (const nodeId of currentLevel) {
      const placeholders = BACKWARD_LINKS.map(() => '?').join(',');
      // Incoming links = objects that point TO this node
      const incoming = db.prepare(`
        SELECT l.link_type_id, l.from_object_id, l.metadata,
               lt.label as link_label, lt.color as link_color,
               o.id, o.name, o.type_id, o.status, o.severity,
               ot.label as type_label, ot.icon as type_icon, ot.color as type_color,
               json_extract(o.properties,'$.affected_people') as affected_people,
               json_extract(o.properties,'$.event_type') as event_type
        FROM links l
        JOIN link_types lt ON lt.id = l.link_type_id
        JOIN objects o ON o.id = l.from_object_id
        JOIN object_types ot ON ot.id = o.type_id
        WHERE l.to_object_id = ? AND l.link_type_id IN (${placeholders})
      `).all(nodeId, ...BACKWARD_LINKS);

      incoming.forEach(link => {
        if (!visited.has(link.from_object_id)) {
          visited.add(link.from_object_id);
          nextLevel.push(link.from_object_id);
          levelNodes.push(formatNode(link, `← ${link.link_label}`));
        }
      });
    }

    if (levelNodes.length === 0) break;
    const LEVEL_LABELS = ['', 'Direct Cause', 'Contributing Factor', 'Root Cause', 'Systemic Driver'];
    levels.push({
      level: depth,
      label: LEVEL_LABELS[depth] || `Level ${depth}`,
      nodes: levelNodes,
    });
    currentLevel = nextLevel;
  }

  // The deepest level is the most likely root cause
  const rootCauses = levels.length > 1 ? levels[levels.length - 1].nodes : [];

  res.json({
    outcome: formatNode(outcome, null),
    levels: levels.reverse(), // Show from root → outcome
    rootCauses,
    totalFactors: visited.size - 1,
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /vulnerability — province vulnerability matrix ────────────────────────
router.get('/vulnerability', (req, res) => {
  const db = getDB();

  const provinces = db.prepare(`
    SELECT o.id, o.name, o.status, o.severity,
      json_extract(o.properties,'$.vulnerability_idx') as vuln_idx,
      json_extract(o.properties,'$.affected_people') as affected_people,
      json_extract(o.properties,'$.displaced') as displaced,
      json_extract(o.properties,'$.population') as population
    FROM objects o
    WHERE o.type_id = 'ot-area'
      AND (json_extract(o.properties,'$.admin_level') = 'Province'
           OR json_extract(o.properties,'$.admin_level') = 'City')
    ORDER BY CAST(json_extract(o.properties,'$.vulnerability_idx') AS REAL) DESC
  `).all();

  const assessed = provinces.map(p => {
    // Count active hazards directly impacting this area
    const activeHazards = db.prepare(`
      SELECT COUNT(*) as c FROM links l
      JOIN objects o ON o.id = l.from_object_id
      WHERE l.to_object_id = ? AND l.link_type_id = 'lt-impacts'
        AND o.type_id = 'ot-weather' AND o.status IN ('active','critical')
    `).get(p.id)?.c || 0;

    // Count health facilities serving this area
    const healthFacilities = db.prepare(`
      SELECT COUNT(*) as c FROM links l WHERE l.to_object_id = ? AND l.link_type_id = 'lt-located-in'
        AND l.from_object_id IN (SELECT id FROM objects WHERE type_id = 'ot-facility')
    `).get(p.id)?.c || 0;

    // Count active health risks
    const healthRisks = db.prepare(`
      SELECT COUNT(*) as c FROM links l WHERE l.from_object_id = ? AND l.link_type_id = 'lt-health'
    `).get(p.id)?.c || 0;

    // Count infra at risk in/near this area
    const infraAtRisk = db.prepare(`
      SELECT COUNT(*) as c FROM links l
      JOIN objects o ON o.id = l.to_object_id
      WHERE l.to_object_id IN (
        SELECT from_object_id FROM links WHERE to_object_id = ? AND link_type_id IN ('lt-threatens','lt-disrupted-by')
      )
    `).get(p.id)?.c || 0;

    // Count shelters
    const shelters = db.prepare(`
      SELECT COALESCE(SUM(json_extract(o.properties,'$.capacity')),0) as cap,
             COALESCE(SUM(json_extract(o.properties,'$.occupancy')),0) as occ
      FROM links l JOIN objects o ON o.id = l.from_object_id
      WHERE l.to_object_id = ? AND l.link_type_id = 'lt-located-in'
        AND o.type_id = 'ot-shelter'
    `).get(p.id) || { cap: 0, occ: 0 };

    const shelterUtil = shelters.cap > 0 ? Math.round((shelters.occ / shelters.cap) * 100) : 0;

    const vulnBase = parseFloat(p.vuln_idx) || 5;
    const exposureScore = Math.min(10, (
      vulnBase * 0.35 +
      activeHazards * 1.5 +
      healthRisks * 0.8 +
      (shelterUtil > 100 ? 1.5 : 0) +
      (infraAtRisk > 0 ? 0.7 : 0)
    )).toFixed(1);

    const riskLevel = exposureScore >= 8.5 ? 'CRITICAL'
                    : exposureScore >= 7.0 ? 'HIGH'
                    : exposureScore >= 5.0 ? 'MEDIUM'
                    : 'LOW';

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      severity: p.severity,
      vulnerability_idx: vulnBase,
      affected_people: parseInt(p.affected_people) || 0,
      displaced: parseInt(p.displaced) || 0,
      population: parseInt(p.population) || 0,
      active_hazards: activeHazards,
      health_facilities: healthFacilities,
      health_risks: healthRisks,
      infra_at_risk: infraAtRisk,
      shelter_capacity: parseInt(shelters.cap) || 0,
      shelter_occupancy: parseInt(shelters.occ) || 0,
      shelter_utilisation_pct: shelterUtil,
      exposure_score: parseFloat(exposureScore),
      risk_level: riskLevel,
    };
  });

  // Sort by exposure score descending
  assessed.sort((a, b) => b.exposure_score - a.exposure_score);

  res.json({
    provinces: assessed,
    summary: {
      critical: assessed.filter(p => p.risk_level === 'CRITICAL').length,
      high:     assessed.filter(p => p.risk_level === 'HIGH').length,
      medium:   assessed.filter(p => p.risk_level === 'MEDIUM').length,
      low:      assessed.filter(p => p.risk_level === 'LOW').length,
      totalAffected: assessed.reduce((s, p) => s + p.affected_people, 0),
    },
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /historical — historical event comparison ────────────────────────────
router.get('/historical', (req, res) => {
  const db = getDB();

  const events = db.prepare(`
    SELECT o.id, o.name, o.status, o.severity,
      json_extract(o.properties,'$.event_type') as event_type,
      json_extract(o.properties,'$.wind_speed_kmh') as wind_speed_kmh,
      json_extract(o.properties,'$.rainfall_mm') as rainfall_mm,
      json_extract(o.properties,'$.landfall_date') as landfall_date,
      json_extract(o.properties,'$.estimated_deaths') as estimated_deaths,
      json_extract(o.properties,'$.total_affected') as total_affected,
      json_extract(o.properties,'$.economic_loss_usd') as economic_loss_usd,
      json_extract(o.properties,'$.category') as category,
      json_extract(o.properties,'$.source') as source
    FROM objects o WHERE o.type_id = 'ot-weather'
    ORDER BY o.status ASC, COALESCE(json_extract(o.properties,'$.landfall_date'), o.created_at) DESC
  `).all();

  const enriched = events.map(ev => {
    // Provinces directly impacted
    const impactedAreas = db.prepare(`
      SELECT o.name, o.severity FROM links l JOIN objects o ON o.id = l.to_object_id
      WHERE l.from_object_id = ? AND l.link_type_id = 'lt-impacts' AND o.type_id = 'ot-area'
    `).all(ev.id);

    // Infra threatened
    const infraThreats = db.prepare(`
      SELECT COUNT(*) as c FROM links WHERE from_object_id = ? AND link_type_id IN ('lt-threatens','lt-disrupted-by')
    `).get(ev.id)?.c || 0;

    // Response missions
    const missions = db.prepare(`
      SELECT m.name, m.status FROM links l JOIN missions m ON m.id = l.from_object_id
      WHERE l.to_object_id = ? AND l.link_type_id = 'lt-responds'
    `).all(ev.id);

    const year = ev.landfall_date ? new Date(ev.landfall_date).getFullYear()
               : ev.name.match(/\d{4}/)?.[0] || '?';

    return {
      id: ev.id,
      name: ev.name,
      year: parseInt(year),
      status: ev.status,
      severity: ev.severity,
      event_type: ev.event_type || 'Unknown',
      wind_speed_kmh: ev.wind_speed_kmh ? parseInt(ev.wind_speed_kmh) : null,
      rainfall_mm: ev.rainfall_mm ? parseInt(ev.rainfall_mm) : null,
      landfall_date: ev.landfall_date,
      category: ev.category || null,
      estimated_deaths: ev.estimated_deaths ? parseInt(ev.estimated_deaths) : null,
      total_affected: ev.total_affected ? parseInt(ev.total_affected) : null,
      economic_loss_usd: ev.economic_loss_usd ? parseInt(ev.economic_loss_usd) : null,
      impacted_areas: impactedAreas,
      infra_threatened: infraThreats,
      response_missions: missions.length,
      missions_list: missions,
    };
  });

  res.json({
    events: enriched,
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /compare?a=:id&b=:id — side-by-side scenario comparison ───────────────
router.get('/compare', (req, res) => {
  const db = getDB();
  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: 'Two object IDs required: ?a=X&b=Y' });

  function getProfile(id) {
    const obj = getObjFull(db, id);
    if (!obj) return null;

    const directImpacts = db.prepare(`
      SELECT o.id, o.name, o.type_id, o.severity, ot.icon as type_icon,
             json_extract(o.properties,'$.affected_people') as affected_people
      FROM links l JOIN objects o ON o.id = l.to_object_id JOIN object_types ot ON ot.id = o.type_id
      WHERE l.from_object_id = ? AND l.link_type_id IN ('lt-impacts','lt-threatens','lt-exacerbates')
    `).all(id);

    const totalAffected = directImpacts.reduce((s, i) => s + (parseInt(i.affected_people) || 0), 0);
    const infraCount = directImpacts.filter(i => ['ot-infra','ot-facility','ot-water','ot-power'].includes(i.type_id)).length;
    const areaCount  = directImpacts.filter(i => i.type_id === 'ot-area').length;

    let props = {};
    try { props = typeof obj.properties === 'object' ? obj.properties : JSON.parse(obj.properties || '{}'); } catch {}

    return {
      id: obj.id,
      name: obj.name,
      type_id: obj.type_id,
      type_label: obj.type_label,
      type_icon: obj.type_icon,
      type_color: obj.type_color,
      status: obj.status,
      severity: obj.severity,
      properties: props,
      direct_impacts: directImpacts,
      total_affected: totalAffected,
      infra_threatened: infraCount,
      areas_impacted: areaCount,
      risk_score: severityWeight(obj.severity) * 2.5,
    };
  }

  const profileA = getProfile(a);
  const profileB = getProfile(b);

  if (!profileA || !profileB) return res.status(404).json({ error: 'One or both objects not found' });

  res.json({
    a: profileA,
    b: profileB,
    comparison: {
      worse_affected: profileA.total_affected > profileB.total_affected ? 'a' : 'b',
      worse_infra: profileA.infra_threatened > profileB.infra_threatened ? 'a' : 'b',
      worse_severity: severityWeight(profileA.severity) >= severityWeight(profileB.severity) ? 'a' : 'b',
    },
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /summary — workbench landing stats ────────────────────────────────────
router.get('/summary', (req, res) => {
  const db = getDB();

  const totalObjects   = db.prepare('SELECT COUNT(*) as c FROM objects').get().c;
  const totalLinks     = db.prepare('SELECT COUNT(*) as c FROM links').get().c;
  const totalTypes     = db.prepare('SELECT COUNT(*) as c FROM object_types').get().c;
  const totalLinkTypes = db.prepare('SELECT COUNT(*) as c FROM link_types').get().c;
  const activeHazards  = db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-weather' AND status IN ('active','critical')`).get().c;
  const critObjects    = db.prepare(`SELECT COUNT(*) as c FROM objects WHERE severity='CRITICAL'`).get().c;
  const provinces      = db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-area' AND json_extract(properties,'$.admin_level')='Province'`).get().c;
  const facilities     = db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-facility'`).get().c;

  // Top threats (most connected hazard objects)
  const topHazards = db.prepare(`
    SELECT o.id, o.name, o.severity, o.status, COUNT(l.id) as link_count
    FROM objects o LEFT JOIN links l ON l.from_object_id = o.id
    WHERE o.type_id = 'ot-weather'
    GROUP BY o.id ORDER BY CASE o.status WHEN 'active' THEN 0 WHEN 'critical' THEN 0 ELSE 1 END ASC, link_count DESC
    LIMIT 8
  `).all();

  res.json({
    graphStats: { totalObjects, totalLinks, totalTypes, totalLinkTypes },
    situationStats: { activeHazards, critObjects, provinces, facilities },
    topHazards,
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /objects — return selectable objects for workbench ────────────────────
router.get('/objects', (req, res) => {
  const db = getDB();
  const { type_id, q } = req.query;

  let sql = `
    SELECT o.id, o.name, o.type_id, o.status, o.severity,
           ot.label as type_label, ot.icon as type_icon, ot.color as type_color,
           json_extract(o.properties,'$.event_type') as event_type,
           json_extract(o.properties,'$.affected_people') as affected_people,
           (SELECT COUNT(*) FROM links WHERE from_object_id=o.id) as out_links,
           (SELECT COUNT(*) FROM links WHERE to_object_id=o.id) as in_links
    FROM objects o JOIN object_types ot ON ot.id = o.type_id
    WHERE 1=1
  `;
  const params = [];

  if (type_id) { sql += ' AND o.type_id = ?'; params.push(type_id); }
  if (q)       { sql += ' AND LOWER(o.name) LIKE ?'; params.push(`%${q.toLowerCase()}%`); }

  sql += ' ORDER BY (out_links + in_links) DESC, CASE o.severity WHEN "CRITICAL" THEN 0 WHEN "HIGH" THEN 1 ELSE 2 END ASC LIMIT 150';

  res.json(db.prepare(sql).all(...params));
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatNode(row, linkLabel) {
  return {
    id: row.id || row.to_object_id || row.from_object_id,
    name: row.name,
    type_id: row.type_id,
    type_label: row.type_label || '',
    type_icon: row.type_icon || '●',
    type_color: row.type_color || '#00d4ff',
    status: row.status,
    severity: row.severity,
    affected_people: row.affected_people ? parseInt(row.affected_people) : null,
    beds: row.beds ? parseInt(row.beds) : null,
    capacity: row.capacity ? parseInt(row.capacity) : null,
    occupancy: row.occupancy ? parseInt(row.occupancy) : null,
    link_label: linkLabel || null,
  };
}

function buildNarrative(root, stages) {
  const lines = [];
  lines.push(`**${root.name}** triggers a cascade across ${stages.length - 1} downstream layers.`);
  for (let i = 1; i < stages.length; i++) {
    const s = stages[i];
    const count = s.nodes.length;
    const critical = s.nodes.filter(n => n.severity === 'CRITICAL').length;
    const aff = s.nodes.reduce((sum, n) => sum + (n.affected_people || 0), 0);
    const nodeNames = s.nodes.slice(0, 3).map(n => n.name).join(', ');
    lines.push(`**${s.label}** (${count} objects${critical > 0 ? `, ${critical} CRITICAL` : ''}): ${nodeNames}${count > 3 ? ` +${count-3} more` : ''}${aff > 0 ? ` — ${(aff/1000).toFixed(0)}K people` : ''}.`);
  }
  return lines.join('\n\n');
}

module.exports = router;
