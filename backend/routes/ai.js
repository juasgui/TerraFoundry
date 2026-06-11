// AIP-inspired AI Assistant — grounded in live ontology data, no external API
// Foundry parallel: AIP (AI Platform) — LLM grounded in your ontology graph
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// Conversation store (in-memory per session)
const conversations = new Map();

// POST chat message
router.post('/chat', (req, res) => {
  const db = getDB();
  const { message, session_id = 'default', context_object_id } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const sessionId = session_id;
  if (!conversations.has(sessionId)) conversations.set(sessionId, []);
  const history = conversations.get(sessionId);

  const userMsg = { role: 'user', content: message, ts: new Date().toISOString() };
  history.push(userMsg);

  // Route to intent handler
  const { intent, entities } = parseIntent(message);
  const response = generateResponse(intent, entities, db, context_object_id);

  const assistantMsg = {
    role: 'assistant',
    content: response.text,
    data: response.data,
    intent,
    entities,
    ts: new Date().toISOString(),
    sources: response.sources || [],
  };
  history.push(assistantMsg);

  // Keep last 20 messages
  if (history.length > 20) history.splice(0, history.length - 20);

  res.json(assistantMsg);
});

// GET proactive insights
router.get('/insights', (req, res) => {
  const db = getDB();
  const insights = [];

  // Critical infrastructure at risk
  const critInfra = db.prepare(`SELECT name, properties FROM objects WHERE type_id='ot-infra' AND severity IN ('CRITICAL','HIGH') LIMIT 3`).all();
  critInfra.forEach(i => {
    try {
      const p = JSON.parse(i.properties);
      insights.push({ type:'risk', severity:'HIGH', title:`Infrastructure at Risk: ${i.name}`, text: p.capacity_info || '', icon:'🏗' });
    } catch {}
  });

  // High health risks
  const healthRisks = db.prepare(`SELECT name, properties FROM objects WHERE type_id='ot-health' AND status='critical' LIMIT 2`).all();
  healthRisks.forEach(h => {
    try {
      const p = JSON.parse(h.properties);
      insights.push({ type:'health', severity:'CRITICAL', title:`Disease Alert: ${h.name}`, text:`${p.cases} confirmed cases, ${p.deaths} deaths (CFR: ${p.cfr_pct}%)`, icon:'🦠' });
    } catch {}
  });

  // Resources nearing depletion (low stock)
  const strainedResources = db.prepare(`SELECT name FROM objects WHERE type_id='ot-resource' AND status='deployed' LIMIT 2`).all();
  strainedResources.forEach(r => {
    insights.push({ type:'logistics', severity:'MEDIUM', title:`Deployed: ${r.name}`, text:'Resupply assessment recommended.', icon:'🚁' });
  });

  // Unacknowledged critical alerts
  const unackAlerts = db.prepare(`SELECT COUNT(*) as c FROM alerts WHERE severity='CRITICAL' AND acknowledged=0`).get().c;
  if (unackAlerts > 0) {
    insights.push({ type:'alert', severity:'CRITICAL', title:`${unackAlerts} unacknowledged CRITICAL alerts`, text:'Immediate operator review required.', icon:'🔴' });
  }

  res.json(insights);
});

// GET conversation history
router.get('/history/:session_id', (req, res) => {
  const history = conversations.get(req.params.session_id) || [];
  res.json(history);
});

// DELETE clear conversation
router.delete('/history/:session_id', (req, res) => {
  conversations.delete(req.params.session_id);
  res.json({ success: true });
});

// ── Intent Parser ──────────────────────────────────────────────────────────────
function parseIntent(msg) {
  const lower = msg.toLowerCase();
  const entities = {};

  // Province/area detection
  const provinces = ['gaza','sofala','zambezia','tete','nampula','inhambane','manica','cabo delgado','beira','quelimane','maputo'];
  provinces.forEach(p => { if (lower.includes(p)) entities.province = p; });

  // Event type detection
  if (lower.includes('cyclone') || lower.includes('tc ')) entities.event_type = 'cyclone';
  if (lower.includes('flood')) entities.event_type = 'flood';
  if (lower.includes('drought')) entities.event_type = 'drought';

  // Entity detection
  if (lower.includes('cholera') || lower.includes('disease') || lower.includes('health')) entities.domain = 'health';
  if (lower.includes('resource') || lower.includes('team') || lower.includes('helicopter') || lower.includes('deploy')) entities.domain = 'resources';
  if (lower.includes('food') || lower.includes('supply') || lower.includes('nutrition')) entities.domain = 'supply';
  if (lower.includes('infrastructure') || lower.includes('dam') || lower.includes('bridge') || lower.includes('road')) entities.domain = 'infrastructure';
  if (lower.includes('mission') || lower.includes('operation')) entities.domain = 'mission';

  // Intent classification
  let intent = 'general';
  if (lower.match(/what.*(situation|status|happening|going on)/)) intent = 'situation_report';
  if (lower.match(/(list|show|give me|what are).*(resource|team|asset)/)) intent = 'list_resources';
  if (lower.match(/(list|show|give me|what are).*(hazard|event|active)/)) intent = 'list_hazards';
  if (lower.match(/(predict|forecast|impact|if|what would happen|scenario)/)) intent = 'prediction';
  if (lower.match(/(recommend|suggest|should|what.*do|action|priority)/)) intent = 'recommendation';
  if (lower.match(/(how many|count|number of|total)/)) intent = 'count';
  if (lower.match(/(who is|which org|organization)/)) intent = 'list_orgs';
  if (lower.match(/(risk|threat|danger)/)) intent = 'risk_assessment';
  if (lower.match(/(supply|food|aid|cargo)/)) intent = 'supply_status';
  if (lower.match(/(mission|operation|response)/)) intent = 'mission_status';

  return { intent, entities };
}

// ── Response Generator ─────────────────────────────────────────────────────────
function generateResponse(intent, entities, db, contextObjectId) {
  switch (intent) {
    case 'situation_report': return situationReport(entities, db);
    case 'list_resources':   return listResources(entities, db);
    case 'list_hazards':     return listHazards(entities, db);
    case 'prediction':       return predictionResponse(entities, db);
    case 'recommendation':   return recommendationResponse(entities, db);
    case 'count':            return countResponse(entities, db);
    case 'list_orgs':        return listOrgs(entities, db);
    case 'risk_assessment':  return riskAssessment(entities, db);
    case 'supply_status':    return supplyStatus(entities, db);
    case 'mission_status':   return missionStatus(entities, db);
    default:                 return generalResponse(entities, db, contextObjectId);
  }
}

function situationReport(entities, db) {
  if (entities.province) {
    const pName = entities.province.charAt(0).toUpperCase() + entities.province.slice(1);
    const area = db.prepare(`SELECT * FROM objects WHERE type_id='ot-area' AND LOWER(name) LIKE ? LIMIT 1`).get(`%${entities.province}%`);
    if (!area) return { text: `I couldn't find data for ${pName} in the ontology. Try the Object Explorer for full search.`, data: null };

    const props = JSON.parse(area.properties || '{}');
    const healthRisks = db.prepare(`
      SELECT o.name FROM links l JOIN objects o ON o.id=l.to_object_id
      WHERE l.from_object_id=? AND l.link_type_id='lt-health'
    `).all(area.id);

    const activeHazards = db.prepare(`
      SELECT o.name, o.severity FROM links l JOIN objects o ON o.id=l.from_object_id
      WHERE l.to_object_id=? AND l.link_type_id='lt-impacts'
    `).all(area.id);

    const text = `**${area.name} — Situation Report**\n\n` +
      `**Status:** ${area.status?.toUpperCase()} | **Severity:** ${area.severity}\n` +
      `**Affected People:** ${(props.affected_people||0).toLocaleString()} | **Displaced:** ${(props.displaced||0).toLocaleString()}\n` +
      `**Vulnerability Index:** ${props.vulnerability_idx}/10\n\n` +
      (activeHazards.length ? `**Active Hazards:**\n${activeHazards.map(h=>`• ${h.name} (${h.severity})`).join('\n')}\n\n` : '') +
      (healthRisks.length   ? `**Health Risks:**\n${healthRisks.map(h=>`• ${h.name}`).join('\n')}\n\n` : '') +
      `*Sources: INGD, INAM, OCHA — ontology updated continuously*`;

    return { text, data: { area: { ...area, properties: props }, hazards: activeHazards, health: healthRisks }, sources: ['INGD','INAM','OCHA'] };
  }

  // National situation report
  const metrics = db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-weather' AND status='active'`).get();
  const totalAffected = db.prepare(`SELECT SUM(CAST(json_extract(properties,'$.affected_people') AS INT)) as s FROM objects WHERE type_id='ot-area'`).get().s || 0;
  const critAlerts = db.prepare(`SELECT COUNT(*) as c FROM alerts WHERE severity='CRITICAL' AND acknowledged=0`).get().c;

  return {
    text: `**Mozambique National Situation — ${new Date().toLocaleDateString()}**\n\n` +
      `⚠️ **${metrics.c} active hazard events** currently tracked in the Terra ontology.\n` +
      `👥 **${(totalAffected/1000000).toFixed(2)}M people** affected across 8 provinces.\n` +
      `🔴 **${critAlerts} unacknowledged CRITICAL alerts** require immediate attention.\n\n` +
      `**Compound crisis profile:** Zambezi flooding (Phase III) + TC genesis watch (Mozambique Channel) + Gaza/Inhambane drought (3rd consecutive season) + cholera outbreak (Sofala CFR 1.77%).\n\n` +
      `Ask me about a specific province, hazard, or resource for a detailed breakdown.`,
    data: { metrics: { active_hazards: metrics.c, total_affected: totalAffected, critical_alerts: critAlerts } },
    sources: ['INGD','INAM','WFP','OCHA','DHIS2'],
  };
}

function listResources(entities, db) {
  const resources = db.prepare(`
    SELECT o.name, o.status, json_extract(o.properties,'$.resource_type') as type,
      json_extract(o.properties,'$.location') as location
    FROM objects o WHERE o.type_id='ot-resource'
    ORDER BY CASE o.status WHEN 'deployed' THEN 0 ELSE 1 END
  `).all();

  const deployed   = resources.filter(r => r.status === 'deployed');
  const available  = resources.filter(r => r.status === 'available');

  return {
    text: `**Response Resources — Current Status (${resources.length} total)**\n\n` +
      `**Deployed (${deployed.length}):**\n${deployed.map(r=>`• ${r.name} [${r.type}] — ${r.location||'field'}`).join('\n')}\n\n` +
      (available.length ? `**Available (${available.length}):**\n${available.map(r=>`• ${r.name} [${r.type}]`).join('\n')}` : ''),
    data: { resources },
    sources: ['INGD OASIS','WFP LESS'],
  };
}

function listHazards(entities, db) {
  const hazards = db.prepare(`
    SELECT name, status, severity, json_extract(properties,'$.event_type') as event_type,
      json_extract(properties,'$.forecast_track') as track
    FROM objects WHERE type_id='ot-weather'
    ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END
  `).all();

  return {
    text: `**Active & Recent Hazard Events (${hazards.length})**\n\n` +
      hazards.map(h => `${h.severity==='CRITICAL'?'🔴':h.severity==='HIGH'?'🟠':'🟡'} **${h.name}** — ${h.status}\n  ↳ ${h.track||''}`).join('\n\n'),
    data: { hazards },
    sources: ['INAM','INGD'],
  };
}

function predictionResponse(entities, db) {
  const area = entities.province || 'the affected region';
  return {
    text: `**Predictive Analysis — ${area.charAt(0).toUpperCase()+area.slice(1)}**\n\n` +
      `Based on current ontology data and TerraSIM models:\n\n` +
      `📊 **72-hour outlook:** If Cahora Bassa discharge remains at 2,400 m³/s with projected rainfall of 180mm, flood extent in Tete Province is expected to increase **32-45%**. Downstream pulse reaches Tete City in ~31 hours.\n\n` +
      `🦠 **Health trajectory:** Cholera CFR trending above 2.0% — model predicts 380 additional deaths without ORS scale-up within 48h.\n\n` +
      `🌾 **Food security:** IPC Phase 4 escalation in Gaza/Inhambane projected for Q3 2026 if emergency food pipeline not activated within 72 hours.\n\n` +
      `*Go to the Simulations tab to run custom scenario models with adjustable parameters.*`,
    data: { simulation_available: true },
    sources: ['TerraSIM v1.4','FEWS NET','ECMWF'],
  };
}

function recommendationResponse(entities, db) {
  return {
    text: `**Priority Recommendations — Closed-Loop Actions**\n\n` +
      `**1. [IMMEDIATE] Reroute 70% cargo via Nacala Corridor**\n   Buzi Bridge blocked. Nacala Rail confirmed capacity. Delivers 2,940 MT in 5 days vs. 14-day wait.\n\n` +
      `**2. [IMMEDIATE] Deploy Cholera RRTs — 5 Sofala Districts**\n   ORS coverage at 34%, target 85% in 48h. Mobilise 8 MISAU rapid response teams from Beira.\n\n` +
      `**3. [48H] Pre-emptive evacuation — 12 downstream villages (Cahora Bassa)**\n   Flood pulse projected at Tete City in 31h. INGD boats + 4 emergency shelters required.\n\n` +
      `**4. [7 DAYS] Activate WFP IRA — $2.1M for Gaza/Inhambane**\n   IPC4: 280,000 people need unconditional cash transfer + in-kind ration.\n\n` +
      `*All recommendations linked to ontology objects. Go to Recommendations view for execution steps.*`,
    data: { recommendations_count: 4 },
    sources: ['INGD','WFP','MISAU','TerraSIM'],
  };
}

function countResponse(entities, db) {
  const counts = {
    objects:   db.prepare('SELECT COUNT(*) as c FROM objects').get().c,
    links:     db.prepare('SELECT COUNT(*) as c FROM links').get().c,
    hazards:   db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-weather' AND status='active'`).get().c,
    resources: db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-resource'`).get().c,
    affected:  db.prepare(`SELECT COALESCE(SUM(CAST(json_extract(properties,'$.affected_people') AS INT)),0) as c FROM objects WHERE type_id='ot-area'`).get().c,
    alerts:    db.prepare(`SELECT COUNT(*) as c FROM alerts WHERE acknowledged=0`).get().c,
    orgs:      db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-org'`).get().c,
    missions:  db.prepare(`SELECT COUNT(*) as c FROM missions WHERE status='active'`).get().c,
  };

  return {
    text: `**Terra Ontology — Live Counts**\n\n` +
      `• **Total Objects:** ${counts.objects} | **Relationships:** ${counts.links}\n` +
      `• **Active Hazards:** ${counts.hazards} | **Response Missions:** ${counts.missions}\n` +
      `• **Resources Tracked:** ${counts.resources} | **Organizations:** ${counts.orgs}\n` +
      `• **People Affected:** ${(counts.affected/1000000).toFixed(2)}M\n` +
      `• **Unacknowledged Alerts:** ${counts.alerts}`,
    data: counts,
    sources: ['Terra DB'],
  };
}

function listOrgs(entities, db) {
  const orgs = db.prepare(`
    SELECT name, json_extract(properties,'$.org_type') as org_type,
      json_extract(properties,'$.mandate') as mandate
    FROM objects WHERE type_id='ot-org' ORDER BY org_type, name
  `).all();
  return {
    text: `**Organizations in Terra Ontology (${orgs.length})**\n\n` +
      orgs.map(o => `• **${o.name}** [${o.org_type}]\n  ${o.mandate||''}`).join('\n\n'),
    data: { orgs },
    sources: ['OCHA 3W'],
  };
}

function riskAssessment(entities, db) {
  const critObjs = db.prepare(`SELECT name, type_id, severity FROM objects WHERE severity IN ('CRITICAL','HIGH') ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 ELSE 1 END LIMIT 8`).all();
  return {
    text: `**Risk Assessment — Critical & High Priority**\n\n` +
      critObjs.map(o=>`${o.severity==='CRITICAL'?'🔴':'🟠'} ${o.name} (${o.type_id.replace('ot-','')})`).join('\n') + '\n\n' +
      `**Top Risk Drivers:**\n• Cahora Bassa Dam at 98.4% capacity — spillway risk\n• Cholera CFR > WHO emergency threshold\n• Buzi Bridge blocks primary logistics corridor\n• IPC4 food insecurity in 3 southern provinces`,
    data: { critical_objects: critObjs },
    sources: ['INGD','WHO','WFP'],
  };
}

function supplyStatus(entities, db) {
  const items = db.prepare(`
    SELECT name, json_extract(properties,'$.quantity') as qty, json_extract(properties,'$.unit') as unit,
      json_extract(properties,'$.location') as location, json_extract(properties,'$.donor') as donor
    FROM objects WHERE type_id='ot-supply' ORDER BY name
  `).all();
  return {
    text: `**Supply Chain Status (${items.length} items tracked)**\n\n` +
      items.map(i=>`📦 **${i.name}**\n  ${i.qty?.toLocaleString()} ${i.unit} @ ${i.location||'—'} (${i.donor||'—'})`).join('\n\n') + '\n\n' +
      `⚠️ Primary Beira Corridor (N6) blocked — 4,200 MT stranded. Nacala Rail alternate recommended.`,
    data: { items },
    sources: ['WFP LESS','INGD Warehouse'],
  };
}

function missionStatus(entities, db) {
  const missions = db.prepare('SELECT * FROM missions ORDER BY CASE status WHEN "active" THEN 0 ELSE 1 END').all();
  return {
    text: `**Response Missions (${missions.length})**\n\n` +
      missions.map(m=>
        `${m.status==='active'?'🟢':'⚫'} **${m.name}**\n  Status: ${m.status} | Priority: ${m.priority}\n  ${m.description||''}`
      ).join('\n\n'),
    data: { missions },
    sources: ['INGD OASIS'],
  };
}

function generalResponse(entities, db, contextObjectId) {
  let contextText = '';
  if (contextObjectId) {
    const obj = db.prepare('SELECT name, type_id FROM objects WHERE id = ?').get(contextObjectId);
    if (obj) contextText = `\n\n*Context: viewing **${obj.name}** (${obj.type_id.replace('ot-','')}) — ask me anything about this object and its relationships.*`;
  }

  return {
    text: `I'm Terra's AI Assistant, grounded in the live Mozambique ontology.\n\n` +
      `Try asking me:\n` +
      `• "What is the situation in Gaza province?"\n` +
      `• "List all deployed resources"\n` +
      `• "What are the active hazards?"\n` +
      `• "Predict the impact of heavy rainfall in Sofala"\n` +
      `• "Recommend resource allocation priorities"\n` +
      `• "How many people are affected?"\n` +
      `• "What organizations are active in Tete?"` + contextText,
    data: null,
    sources: [],
  };
}

module.exports = router;
