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
  const lang = req.headers['x-lang'] || 'en';

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

  if (lang === 'pt') {
    alerts = alerts.map(a => ({
      ...a,
      title: a.title_pt || a.title,
      description: a.description_pt || a.description,
    }));
  }

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
  const lang = req.headers['x-lang'] || 'en';

  let events = db.prepare(`
    SELECT e.*, o.name as object_name, ot.label as object_type, ot.icon as object_icon, ot.color as object_color
    FROM events e
    LEFT JOIN objects o ON o.id = e.object_id
    LEFT JOIN object_types ot ON ot.id = o.type_id
    ORDER BY e.created_at DESC LIMIT ?
  `).all(Number(limit));

  if (lang === 'pt') {
    events = events.map(e => ({
      ...e,
      title: e.title_pt || e.title,
      description: e.description_pt || e.description,
    }));
  }

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

// GET decision intelligence — emerging risks, recommendations, daily delta
router.get('/decision-intel', (req, res) => {
  const db = getDB();
  const lang = req.headers['x-lang'] || 'en';
  const pt = lang === 'pt';

  // Emerging risks
  const emergingRisks = [];

  const choleraObj = db.prepare(`
    SELECT *, json_extract(properties,'$.cases') as cases, json_extract(properties,'$.cfr_pct') as cfr
    FROM objects WHERE type_id='ot-health' AND properties LIKE '%cholera%' LIMIT 1
  `).get();
  if (choleraObj) {
    emergingRisks.push({
      id: 'risk-cholera',
      title: pt ? 'Risco de cólera a escalar na Província de Sofala' : 'Cholera risk escalating in Sofala Province',
      category: 'health',
      confidence: 94,
      timeHorizon: pt ? '48 horas' : '48 hours',
      affectedPopulation: 380000,
      severity: 'CRITICAL',
      trend: pt ? 'agravamento' : 'worsening',
      detail: pt
        ? `TLM em ${choleraObj.cfr || 1.77}% — acima do limiar de emergência da OMS. Cobertura SRO em 34%. Modelo prevê 380 mortes adicionais sem reforço.`
        : `CFR at ${choleraObj.cfr || 1.77}% — above WHO emergency threshold. ORS coverage at 34%. Model predicts 380 additional deaths without scale-up.`,
      actions: pt ? [
        'Destacar 8 Equipas de Resposta Rápida do MISAU para Sofala',
        'Aumentar cobertura SRO para 85% em 48h',
        'Activar reserva de material médico de emergência da OMS em Beira',
      ] : [
        'Deploy 8 MISAU Rapid Response Teams to Sofala',
        'Scale ORS coverage to 85% within 48h',
        'Activate WHO Emergency Medical Supply cache in Beira',
      ],
    });
  }

  const gazaArea = db.prepare(`
    SELECT *, json_extract(properties,'$.displaced') as displaced
    FROM objects WHERE type_id='ot-area' AND LOWER(name) LIKE '%gaza%' LIMIT 1
  `).get();
  if (gazaArea) {
    emergingRisks.push({
      id: 'risk-shelter-gaza',
      title: pt ? 'Esgotamento de capacidade de abrigo projectado em Gaza' : 'Shelter capacity exhaustion projected in Gaza',
      category: 'shelter',
      confidence: 87,
      timeHorizon: pt ? '72 horas' : '72 hours',
      affectedPopulation: parseInt(gazaArea.displaced) || 48000,
      severity: 'HIGH',
      trend: pt ? 'agravamento' : 'worsening',
      detail: pt
        ? 'Taxa de deslocamento excede capacidade de recepção em 18%. 3 locais temporários de abrigo identificados mas ainda não activados.'
        : 'Displacement rate exceeds intake capacity by 18%. 3 temporary shelter sites identified but not yet activated.',
      actions: pt ? [
        'Activar 3 locais temporários de abrigo em Cidade de Gaza',
        'Destacar 12 comboios humanitários via EN1',
        'Coordenar com ACNUR para distribuição de NFI',
      ] : [
        'Activate 3 temporary shelter sites in Gaza City',
        'Deploy 12 humanitarian convoys via EN1',
        'Coordinate with UNHCR for NFI distribution',
      ],
    });
  }

  emergingRisks.push({
    id: 'risk-flood-tete',
    title: pt ? 'Alta probabilidade de transbordamento — Província de Tete' : 'High probability river overflow — Tete Province',
    category: 'flood',
    confidence: 91,
    timeHorizon: pt ? '31 horas' : '31 hours',
    affectedPopulation: 120000,
    severity: 'CRITICAL',
    trend: pt ? 'iminente' : 'imminent',
    detail: pt
      ? 'Cahora Bassa a 98,4% da capacidade. Descarga 2.400 m³/s. Pulso de cheia atinge Tete cidade em ~31 horas. 12 aldeias a jusante em rota directa.'
      : 'Cahora Bassa at 98.4% capacity. Discharge 2,400 m³/s. Flood pulse reaches Tete City in ~31 hours. 12 downstream villages in direct path.',
    actions: pt ? [
      'Evacuação preventiva de 12 aldeias a jusante',
      'Destacar embarcações de emergência do INGD — 4 unidades para Tete',
      'Activar 4 locais de abrigo de emergência na Província de Tete',
    ] : [
      'Pre-emptive evacuation of 12 downstream villages',
      'Deploy INGD emergency boats — 4 units to Tete City',
      'Activate 4 emergency shelter sites in Tete Province',
    ],
  });

  const inhambane = db.prepare(`
    SELECT *, json_extract(properties,'$.affected_people') as affected
    FROM objects WHERE type_id='ot-area' AND LOWER(name) LIKE '%inhambane%' LIMIT 1
  `).get();
  if (inhambane) {
    emergingRisks.push({
      id: 'risk-food-inhambane',
      title: pt ? 'Vulnerabilidade alimentar detectada em Inhambane' : 'Food supply vulnerability detected in Inhambane',
      category: 'food',
      confidence: 78,
      timeHorizon: pt ? '7 dias' : '7 days',
      affectedPopulation: 280000,
      severity: 'HIGH',
      trend: pt ? 'deterioração' : 'deteriorating',
      detail: pt
        ? 'Indicadores IPC Fase 3+. 3.ª estação consecutiva abaixo do normal. Défice de pipeline de 1.200 MT. Escalada IPC4 projectada para T3 2026 sem intervenção.'
        : 'IPC Phase 3+ indicators. 3rd consecutive drought season. Pipeline deficit of 1,200 MT. IPC4 escalation projected Q3 2026 without intervention.',
      actions: pt ? [
        'Activar IRA do PMA — dotação de emergência de $2,1M',
        'Destacar 6 camiões de convóio alimentar para províncias do sul',
        'Coordenar com FAO para programa de transferência monetária',
      ] : [
        'Activate WFP IRA — $2.1M emergency allocation',
        'Deploy 6 food convoy trucks to southern provinces',
        'Coordinate with FAO on cash transfer programme',
      ],
    });
  }

  // Recommended operational actions
  const recommendations = pt ? [
    {
      id: 'rec-1',
      priority: 'IMEDIATO',
      priorityColor: '#ff3a3a',
      title: 'Destacar 6 unidades de purificação de água para Tete',
      description: 'Pré-posicionar antes da chegada do pulso de cheia a Tete. Janela de risco de descarga de Cahora Bassa é de 31h.',
      expectedImpact: 'Reduzir insegurança hídrica para 120.000 pessoas',
      resourcesRequired: '6 unidades · 12 operadores',
      timeframe: '6 horas',
      category: 'water',
      linkedRisk: 'risk-flood-tete',
    },
    {
      id: 'rec-2',
      priority: 'IMEDIATO',
      priorityColor: '#ff3a3a',
      title: 'Destacar 12 camiões humanitários via Corredor de Nacala',
      description: 'Ponte Buzi bloqueada no corredor N6. Capacidade ferroviária de Nacala confirmada. Reencaminhamento poupa 9 dias.',
      expectedImpact: 'Prevenir escassez alimentar de 5 dias para 280.000 pessoas',
      resourcesRequired: '12 camiões · Coordenação ferroviária · 8 oficiais',
      timeframe: '12 horas',
      category: 'logistics',
      linkedRisk: 'risk-food-inhambane',
    },
    {
      id: 'rec-3',
      priority: '48H',
      priorityColor: '#ff8c00',
      title: 'Activar abrigos temporários na Província de Sofala',
      description: 'Projecções de deslocamento excedem capacidade actual em 72h.',
      expectedImpact: 'Aumentar capacidade em 18% · Proteger 45.000 deslocados',
      resourcesRequired: '3 locais · Coordenação com ACNUR',
      timeframe: '48 horas',
      category: 'shelter',
      linkedRisk: 'risk-shelter-gaza',
    },
    {
      id: 'rec-4',
      priority: '7 DIAS',
      priorityColor: '#ffcc00',
      title: 'Activar IRA do PMA — dotação de $2,1M Gaza/Inhambane',
      description: 'IPC Fase 4: 280.000 pessoas necessitam de transferência monetária incondicional + ração em espécie.',
      expectedImpact: 'Prevenir escalada IPC4 para 280.000 pessoas',
      resourcesRequired: '$2,1M IRA · Equipas de campo do PMA',
      timeframe: '72 horas para activar',
      category: 'food',
      linkedRisk: 'risk-food-inhambane',
    },
  ] : [
    {
      id: 'rec-1',
      priority: 'IMMEDIATE',
      priorityColor: '#ff3a3a',
      title: 'Deploy 6 water purification units to Tete Province',
      description: 'Pre-position ahead of flood pulse arrival at Tete City. Cahora Bassa discharge risk window is 31h.',
      expectedImpact: 'Reduce water insecurity for 120,000 people',
      resourcesRequired: '6 units · 12 operators',
      timeframe: '6 hours',
      category: 'water',
      linkedRisk: 'risk-flood-tete',
    },
    {
      id: 'rec-2',
      priority: 'IMMEDIATE',
      priorityColor: '#ff3a3a',
      title: 'Deploy 12 humanitarian trucks via Nacala Rail',
      description: 'Buzi Bridge blocked on N6 corridor. Nacala Rail confirmed capacity. Rerouting saves 9 days.',
      expectedImpact: 'Prevent 5-day food shortage for 280,000 people',
      resourcesRequired: '12 trucks · Rail coordination · 8 officers',
      timeframe: '12 hours',
      category: 'logistics',
      linkedRisk: 'risk-food-inhambane',
    },
    {
      id: 'rec-3',
      priority: '48H',
      priorityColor: '#ff8c00',
      title: 'Activate temporary shelters in Sofala Province',
      description: 'Displacement projections exceed current capacity within 72h.',
      expectedImpact: 'Increase capacity by 18% · Protect 45,000 displaced',
      resourcesRequired: '3 sites · UNHCR coordination',
      timeframe: '48 hours',
      category: 'shelter',
      linkedRisk: 'risk-shelter-gaza',
    },
    {
      id: 'rec-4',
      priority: '7 DAYS',
      priorityColor: '#ffcc00',
      title: 'Activate WFP IRA — $2.1M Gaza/Inhambane allocation',
      description: 'IPC Phase 4: 280,000 people require unconditional cash transfer + in-kind ration.',
      expectedImpact: 'Prevent IPC4 escalation for 280,000 people',
      resourcesRequired: '$2.1M IRA · WFP field teams',
      timeframe: '72 hours to activate',
      category: 'food',
      linkedRisk: 'risk-food-inhambane',
    },
  ];

  // Daily intelligence delta
  const newAlerts24h = db.prepare(`
    SELECT COUNT(*) as c FROM alerts WHERE created_at > datetime('now', '-24 hours')
  `).get().c;
  const totalAffected = db.prepare(`
    SELECT COALESCE(SUM(CAST(json_extract(properties,'$.affected_people') AS INT)),0) as s
    FROM objects WHERE type_id='ot-area'
  `).get().s;

  const delta = pt ? [
    { id: 'd1', metric: 'População em risco', change: '+8%', direction: 'up', severity: 'HIGH', detail: `${(totalAffected / 1000000).toFixed(2)}M total — aumento desde ontem` },
    { id: 'd2', metric: 'Probabilidade de cheia — regiões centrais', change: '+12%', direction: 'up', severity: 'CRITICAL', detail: 'Monitorização da bacia do Zambeze — taxa de descarga elevada' },
    { id: 'd3', metric: 'Perturbação rodoviária — Ponte Buzi EN6', change: 'NOVO', direction: 'alert', severity: 'HIGH', detail: 'Reencaminhamento logístico necessário — 4.200 MT bloqueadas' },
    { id: 'd4', metric: 'Reservas de ajuda — armazém de Beira', change: '42%', direction: 'down', severity: 'HIGH', detail: 'Abaixo do limiar mínimo de 60% — pedido de reabastecimento necessário' },
    { id: 'd5', metric: 'Tendência TLM de cólera', change: '+0,3%', direction: 'up', severity: 'CRITICAL', detail: 'A aproximar-se de 2,0% — limiar de emergência da OMS ultrapassado' },
    { id: 'd6', metric: 'Novos alertas gerados (24h)', change: `+${newAlerts24h}`, direction: newAlerts24h > 3 ? 'up' : 'neutral', severity: newAlerts24h > 5 ? 'CRITICAL' : 'MEDIUM', detail: 'Rever no painel de Alertas Críticos' },
  ] : [
    { id: 'd1', metric: 'Population at risk', change: '+8%', direction: 'up', severity: 'HIGH',     detail: `${(totalAffected / 1000000).toFixed(2)}M total — increased since yesterday` },
    { id: 'd2', metric: 'Flood probability — central regions', change: '+12%', direction: 'up', severity: 'CRITICAL', detail: 'Zambezi basin monitoring — elevated discharge rate' },
    { id: 'd3', metric: 'Road disruption — EN6 Buzi Bridge', change: 'NEW', direction: 'alert', severity: 'HIGH', detail: 'Logistics rerouting required — 4,200 MT stranded' },
    { id: 'd4', metric: 'Relief stockpiles — Beira warehouse', change: '42%', direction: 'down', severity: 'HIGH', detail: 'Below 60% minimum threshold — resupply order required' },
    { id: 'd5', metric: 'Cholera CFR trend', change: '+0.3%', direction: 'up', severity: 'CRITICAL', detail: 'Approaching 2.0% — WHO emergency threshold exceeded' },
    { id: 'd6', metric: 'New alerts generated (24h)', change: `+${newAlerts24h}`, direction: newAlerts24h > 3 ? 'up' : 'neutral', severity: newAlerts24h > 5 ? 'CRITICAL' : 'MEDIUM', detail: 'Review in Critical Alerts panel' },
  ];

  res.json({
    emergingRisks,
    recommendations,
    delta,
    generatedAt: new Date().toISOString(),
  });
});

// GET impact analysis for a specific object (cascading effects)
router.get('/impact-analysis/:objectId', (req, res) => {
  const db = getDB();
  const { objectId } = req.params;

  const obj = db.prepare('SELECT * FROM objects WHERE id = ?').get(objectId);
  if (!obj) return res.status(404).json({ error: 'Object not found' });

  let props = {};
  try { props = JSON.parse(obj.properties || '{}'); } catch {}

  const affectedAreas = db.prepare(`
    SELECT o.*, json_extract(o.properties,'$.affected_people') as affected_people,
           json_extract(o.properties,'$.displaced') as displaced
    FROM links l JOIN objects o ON o.id = l.to_object_id
    WHERE l.from_object_id = ? AND o.type_id = 'ot-area'
  `).all(objectId);

  const infraAtRisk = db.prepare(`
    SELECT DISTINCT o.name, o.type_id, o.status, o.severity,
           json_extract(o.properties,'$.infra_type') as infra_type
    FROM links l1
    JOIN objects area ON area.id = l1.to_object_id AND area.type_id = 'ot-area'
    JOIN links l2 ON l2.from_object_id = area.id
    JOIN objects o ON o.id = l2.to_object_id AND o.type_id = 'ot-infra'
    WHERE l1.from_object_id = ?
    LIMIT 8
  `).all(objectId);

  const counts = {
    areas: affectedAreas.length || 3,
    hospitals: db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-infra' AND properties LIKE '%hospital%'`).get().c || 4,
    schools: db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-infra' AND properties LIKE '%school%'`).get().c || 12,
    roads: db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-infra' AND properties LIKE '%road%'`).get().c || 8,
    bridges: 3,
    shelters: db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-infra' AND properties LIKE '%shelter%'`).get().c || 6,
  };

  const totalAffected = affectedAreas.reduce((s, a) => s + (parseInt(a.affected_people) || 0), 0) || 450000;

  const cascadeChain = [
    { stage: 1, event: obj.name, type: obj.type_id.replace('ot-', ''), severity: obj.severity || 'CRITICAL', icon: '⚠️' },
    { stage: 2, event: `${counts.areas} provinces / affected areas`, type: 'area impact', severity: 'HIGH', icon: '🗺️' },
    { stage: 3, event: `${counts.hospitals} hospitals + ${counts.schools} schools at risk`, type: 'infrastructure', severity: 'HIGH', icon: '🏥' },
    { stage: 4, event: `${counts.bridges} bridges + ${counts.roads} roads compromised`, type: 'logistics disruption', severity: 'CRITICAL', icon: '🌉' },
    { stage: 5, event: `Aid delay → food shortage for ${Math.round(totalAffected * 0.35 / 1000)}K people`, type: 'food security', severity: 'HIGH', icon: '🍽️' },
    { stage: 6, event: 'Disease risk elevation — cholera, malaria, acute watery diarrhoea', type: 'health', severity: 'CRITICAL', icon: '🦠' },
  ];

  res.json({
    object: { ...obj, properties: props },
    totalAffected,
    affectedAreas,
    infraAtRisk,
    counts,
    cascadeChain,
  });
});

// GET simulation — adjust parameters and see projected impact
router.post('/simulate', (req, res) => {
  const { rainfall = 100, windSpeed = 0, riverLevel = 50, populationDisplacement = 10, foodSupply = 80 } = req.body;

  const baseAffected = 2360000;
  const baseDisplaced = 312000;
  const baseResourceDemand = 450;

  const rainfallFactor = 1 + (Math.max(0, rainfall - 100) / 100) * 0.4;
  const riverFactor = 1 + (Math.max(0, riverLevel - 50) / 100) * 0.6;
  const windFactor = windSpeed > 100 ? 1 + (windSpeed - 100) / 200 : 1;
  const foodFactor = Math.max(0, (100 - foodSupply) / 100);

  const projectedAffected = Math.round(baseAffected * rainfallFactor * riverFactor * windFactor);
  const projectedDisplaced = Math.round(baseDisplaced * ((populationDisplacement / 100) + 0.9) * rainfallFactor);
  const shelterDemand = Math.round(projectedDisplaced * 0.65);
  const resourceDemand = Math.round(baseResourceDemand * rainfallFactor * riverFactor);
  const infrastructureStress = Math.min(100, Math.round(60 + (rainfall / 10) + (riverLevel / 5) + (windSpeed / 20)));
  const healthRisk = Math.min(100, Math.round(40 + (rainfall / 8) + ((100 - foodSupply) / 4) + (populationDisplacement / 3)));
  const foodInsecurity = Math.min(100, Math.round(30 + foodFactor * 60 + (populationDisplacement / 5)));
  const overallRisk = Math.min(10, parseFloat(((infrastructureStress + healthRisk + foodInsecurity) / 30).toFixed(1)));

  const alerts = [];
  if (rainfall > 150) alerts.push({ severity: 'CRITICAL', message: `Extreme rainfall (${rainfall}mm) — flash flood risk in low-lying areas` });
  if (riverLevel > 75) alerts.push({ severity: 'CRITICAL', message: `River at ${riverLevel}% capacity — breach probability >60%` });
  if (windSpeed > 120) alerts.push({ severity: 'CRITICAL', message: `Cyclone-force winds (${windSpeed}km/h) — infrastructure damage imminent` });
  if (foodSupply < 40) alerts.push({ severity: 'HIGH', message: `Food supply critically low (${foodSupply}%) — IPC4 risk within 72h` });
  if (populationDisplacement > 50) alerts.push({ severity: 'HIGH', message: `Mass displacement (${populationDisplacement}%) — shelter overflow projected` });

  res.json({
    inputs: { rainfall, windSpeed, riverLevel, populationDisplacement, foodSupply },
    projectedAffected,
    projectedDisplaced,
    shelterDemand,
    resourceDemand,
    infrastructureStress,
    healthRisk,
    foodInsecurity,
    overallRisk,
    alerts,
    generatedAt: new Date().toISOString(),
  });
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
