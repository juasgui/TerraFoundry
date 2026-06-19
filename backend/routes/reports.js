// Reports — generate situation reports from ontology data
const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');

router.get('/generate', (req, res) => {
  const db = getDB();
  const { type = 'sitrep' } = req.query;
  const lang = req.headers['x-lang'] || 'en';
  const isPT = lang === 'pt';

  const totalAffected = db.prepare(`SELECT COALESCE(SUM(CAST(json_extract(properties,'$.affected_people') AS INT)),0) as s FROM objects WHERE type_id='ot-area'`).get().s;
  const totalDisplaced = db.prepare(`SELECT COALESCE(SUM(CAST(json_extract(properties,'$.displaced') AS INT)),0) as s FROM objects WHERE type_id='ot-area'`).get().s;
  const activeHazards = db.prepare(`SELECT COUNT(*) as c FROM objects WHERE type_id='ot-weather' AND status='active'`).get().c;
  const provinces = db.prepare(`SELECT name, severity, json_extract(properties,'$.affected_people') as aff FROM objects WHERE type_id='ot-area' AND json_extract(properties,'$.admin_level')='Province' ORDER BY aff DESC`).all();
  let critAlerts = db.prepare(`SELECT * FROM alerts WHERE severity='CRITICAL' AND acknowledged=0 ORDER BY created_at DESC`).all();
  let activeMissions = db.prepare(`SELECT name, status, priority FROM missions WHERE status='active'`).all();

  if (isPT) {
    critAlerts = critAlerts.map(a => ({ ...a, title: a.title_pt || a.title, description: a.description_pt || a.description }));
    activeMissions = activeMissions.map(m => ({ ...m, name: m.name_pt || m.name, description: m.description_pt || m.description }));
  }

  const report = {
    type,
    title: isPT ? `Terra CRO — Relatório de Situação de Moçambique` : `Terra CRO — Mozambique Situation Report`,
    generated_at: new Date().toISOString(),
    classification: isPT ? 'NÃO CLASSIFICADO — PARA USO OPERACIONAL' : 'UNCLASSIFIED — FOR OPERATIONAL USE',
    period: `${new Date(Date.now() - 86400000).toLocaleDateString()} – ${new Date().toLocaleDateString()}`,
    executive_summary: isPT
      ? `Moçambique enfrenta uma crise composta: ${activeHazards} eventos de ameaça activos afectando ${(totalAffected/1000000).toFixed(2)} milhões de pessoas em 8 províncias. ${critAlerts.length} alertas críticos requerem acção imediata. Imagem Operacional Comum actualizada continuamente via Terra Foundry.`
      : `Mozambique faces a compound crisis: ${activeHazards} active hazard events affecting ${(totalAffected/1000000).toFixed(2)} million people across 8 provinces. ${critAlerts.length} critical alerts require immediate action. Common Operating Picture updated continuously via Terra Foundry.`,
    key_figures: { total_affected: totalAffected, total_displaced: totalDisplaced, active_hazards: activeHazards, provinces_affected: provinces.length },
    province_matrix: provinces,
    critical_alerts: critAlerts,
    active_missions: activeMissions,
    data_sources: ['INAM', 'INGD', 'WFP', 'DHIS2', 'OCHA', 'Sentinel-2'],
    prepared_by: isPT ? 'Módulo de Relatórios Automatizados Terra Foundry' : 'Terra Foundry Automated Reporting Module',
  };

  res.json(report);
});

module.exports = router;
