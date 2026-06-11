// Terra Foundry — Mozambique Ontology Seed Data
// Realistic 2022-2026 multi-hazard scenarios: floods, cyclones, drought,
// cholera, food insecurity. Based on OCHA/INGD/INAM situation reports.

const { getDB } = require('./database');

function seedIfEmpty() {
  const db = getDB();
  const count = db.prepare('SELECT COUNT(*) as c FROM objects').get().c;
  if (count > 0) { console.log('[Seed] Database already populated, skipping.'); return; }
  console.log('[Seed] Populating Terra ontology graph...');
  runSeed(db);
  console.log('[Seed] Done — ontology graph ready.');
}

function runSeed(db) {
  const now = new Date().toISOString();

  // ── 1. OBJECT TYPES ────────────────────────────────────────────────────────
  const objectTypes = [
    { id: 'ot-weather',  name: 'WeatherEvent',      label: 'Weather Event',       icon: '🌀', color: '#00d4ff', description: 'Meteorological hazards: cyclones, floods, droughts', category: 'hazard' },
    { id: 'ot-area',     name: 'AffectedArea',       label: 'Affected Area',       icon: '🗺', color: '#ff8c00', description: 'Geographic zones impacted by hazards', category: 'geography' },
    { id: 'ot-person',   name: 'PersonAtRisk',       label: 'Person at Risk',      icon: '👥', color: '#ffcc00', description: 'Vulnerable population groups', category: 'population' },
    { id: 'ot-resource', name: 'Resource',           label: 'Resource / Asset',    icon: '🚁', color: '#00ff9d', description: 'Response teams, vehicles, equipment, supplies', category: 'response' },
    { id: 'ot-infra',    name: 'Infrastructure',     label: 'Infrastructure',      icon: '🏗', color: '#ff3a3a', description: 'Critical infrastructure: dams, roads, bridges, airports', category: 'infrastructure' },
    { id: 'ot-org',      name: 'Organization',       label: 'Organization',        icon: '🏢', color: '#a78bfa', description: 'Government agencies, NGOs, UN bodies, donors', category: 'actor' },
    { id: 'ot-health',   name: 'HealthRisk',         label: 'Health Risk',         icon: '🦠', color: '#ff3a3a', description: 'Disease outbreaks, nutrition crises, WASH disruptions', category: 'health' },
    { id: 'ot-supply',   name: 'SupplyChainItem',    label: 'Supply Chain Item',   icon: '📦', color: '#00ff9d', description: 'Humanitarian aid: food, medicine, NFIs, equipment', category: 'logistics' },
    { id: 'ot-mission',  name: 'Mission',            label: 'Mission',             icon: '🎯', color: '#00d4ff', description: 'Coordinated disaster response operations', category: 'response' },
  ];

  const insertType = db.prepare(`INSERT OR IGNORE INTO object_types (id,name,label,icon,color,description,category) VALUES (?,?,?,?,?,?,?)`);
  objectTypes.forEach(t => insertType.run(t.id, t.name, t.label, t.icon, t.color, t.description, t.category));

  // ── 2. PROPERTY DEFINITIONS ────────────────────────────────────────────────
  const propDefs = [
    // WeatherEvent
    { id: 'pd-001', object_type_id: 'ot-weather', name: 'event_type',     label: 'Event Type',       type: 'enum',   enum_values: '["Cyclone","Flood","Drought","Heatwave","Storm"]' },
    { id: 'pd-002', object_type_id: 'ot-weather', name: 'wind_speed_kmh', label: 'Wind Speed (km/h)', type: 'number', unit: 'km/h' },
    { id: 'pd-003', object_type_id: 'ot-weather', name: 'rainfall_mm',    label: 'Rainfall (mm)',    type: 'number', unit: 'mm' },
    { id: 'pd-004', object_type_id: 'ot-weather', name: 'landfall_date',  label: 'Landfall / Peak Date', type: 'date' },
    { id: 'pd-005', object_type_id: 'ot-weather', name: 'source',         label: 'Data Source',      type: 'string' },
    { id: 'pd-006', object_type_id: 'ot-weather', name: 'forecast_track', label: 'Forecast Track',   type: 'string' },
    // AffectedArea
    { id: 'pd-010', object_type_id: 'ot-area', name: 'affected_people',  label: 'Affected People',    type: 'number', unit: 'people' },
    { id: 'pd-011', object_type_id: 'ot-area', name: 'displaced',        label: 'Displaced',          type: 'number', unit: 'people' },
    { id: 'pd-012', object_type_id: 'ot-area', name: 'admin_level',      label: 'Admin Level',        type: 'enum',   enum_values: '["Province","District","City","Community"]' },
    { id: 'pd-013', object_type_id: 'ot-area', name: 'population',       label: 'Total Population',   type: 'number', unit: 'people' },
    { id: 'pd-014', object_type_id: 'ot-area', name: 'vulnerability_idx',label: 'Vulnerability Index',type: 'number', unit: '/10' },
    // Resource
    { id: 'pd-020', object_type_id: 'ot-resource', name: 'resource_type',label: 'Resource Type', type: 'enum', enum_values: '["Team","Vehicle","Aircraft","Equipment","Stock","Sensor"]' },
    { id: 'pd-021', object_type_id: 'ot-resource', name: 'quantity',     label: 'Quantity',    type: 'number' },
    { id: 'pd-022', object_type_id: 'ot-resource', name: 'location',     label: 'Base Location', type: 'string' },
    { id: 'pd-023', object_type_id: 'ot-resource', name: 'capacity',     label: 'Capacity',    type: 'string' },
    // Infrastructure
    { id: 'pd-030', object_type_id: 'ot-infra', name: 'infra_type',    label: 'Infrastructure Type', type: 'enum', enum_values: '["Dam","Road","Bridge","Airport","Port","Hospital","School"]' },
    { id: 'pd-031', object_type_id: 'ot-infra', name: 'condition',     label: 'Condition',    type: 'enum', enum_values: '["Operational","Damaged","Destroyed","At-Risk"]' },
    { id: 'pd-032', object_type_id: 'ot-infra', name: 'capacity_info', label: 'Capacity Info',type: 'string' },
    // Organization
    { id: 'pd-040', object_type_id: 'ot-org', name: 'org_type',   label: 'Organization Type', type: 'enum', enum_values: '["Government","UN","NGO","Donor","Military","Academic"]' },
    { id: 'pd-041', object_type_id: 'ot-org', name: 'mandate',    label: 'Mandate/Focus',     type: 'string' },
    { id: 'pd-042', object_type_id: 'ot-org', name: 'contact',    label: 'Contact',            type: 'string' },
    // HealthRisk
    { id: 'pd-050', object_type_id: 'ot-health', name: 'disease',       label: 'Disease/Condition', type: 'string' },
    { id: 'pd-051', object_type_id: 'ot-health', name: 'cases',         label: 'Confirmed Cases',   type: 'number' },
    { id: 'pd-052', object_type_id: 'ot-health', name: 'deaths',        label: 'Deaths',             type: 'number' },
    { id: 'pd-053', object_type_id: 'ot-health', name: 'cfr_pct',       label: 'Case Fatality Rate %', type: 'number' },
    { id: 'pd-054', object_type_id: 'ot-health', name: 'at_risk',       label: 'Population at Risk', type: 'number' },
    // SupplyChainItem
    { id: 'pd-060', object_type_id: 'ot-supply', name: 'item_type',  label: 'Item Type',     type: 'string' },
    { id: 'pd-061', object_type_id: 'ot-supply', name: 'quantity',   label: 'Quantity',      type: 'number' },
    { id: 'pd-062', object_type_id: 'ot-supply', name: 'unit',       label: 'Unit',          type: 'string' },
    { id: 'pd-063', object_type_id: 'ot-supply', name: 'location',   label: 'Current Location', type: 'string' },
    { id: 'pd-064', object_type_id: 'ot-supply', name: 'donor',      label: 'Donor',         type: 'string' },
  ];

  const insertProp = db.prepare(`INSERT OR IGNORE INTO property_definitions (id,object_type_id,name,label,type,required,enum_values,unit) VALUES (?,?,?,?,?,0,?,?)`);
  propDefs.forEach(p => insertProp.run(p.id, p.object_type_id, p.name, p.label, p.type, p.enum_values || null, p.unit || null));

  // ── 3. LINK TYPES ──────────────────────────────────────────────────────────
  const linkTypes = [
    { id: 'lt-impacts',      name: 'impacts_on',        label: 'Impacts On',        inverse_label: 'impacted by',      from_type_id: 'ot-weather',  to_type_id: 'ot-area',     color: '#ff3a3a' },
    { id: 'lt-threatens',    name: 'threatens',         label: 'Threatens',         inverse_label: 'threatened by',    from_type_id: 'ot-weather',  to_type_id: 'ot-infra',    color: '#ff8c00' },
    { id: 'lt-health',       name: 'has_health_risk',   label: 'Has Health Risk',   inverse_label: 'health risk in',   from_type_id: 'ot-area',     to_type_id: 'ot-health',   color: '#ff3a3a' },
    { id: 'lt-located',      name: 'located_in',        label: 'Located In',        inverse_label: 'contains',         from_type_id: 'ot-person',   to_type_id: 'ot-area',     color: '#ffcc00' },
    { id: 'lt-deploys',      name: 'deploys',           label: 'Deploys',           inverse_label: 'deployed by',      from_type_id: 'ot-mission',  to_type_id: 'ot-resource', color: '#00ff9d' },
    { id: 'lt-responds',     name: 'responds_to',       label: 'Responds To',       inverse_label: 'addressed by',    from_type_id: 'ot-mission',  to_type_id: 'ot-weather',  color: '#00d4ff' },
    { id: 'lt-participates', name: 'participates_in',   label: 'Participates In',   inverse_label: 'participated by', from_type_id: 'ot-org',      to_type_id: 'ot-mission',  color: '#a78bfa' },
    { id: 'lt-supplies',     name: 'supplies',          label: 'Supplies',          inverse_label: 'supplied by',     from_type_id: 'ot-supply',   to_type_id: 'ot-area',     color: '#00ff9d' },
    { id: 'lt-monitors',     name: 'monitors',          label: 'Monitors',          inverse_label: 'monitored by',    from_type_id: 'ot-org',      to_type_id: 'ot-weather',  color: '#00d4ff' },
    { id: 'lt-assigned',     name: 'assigned_to',       label: 'Assigned To',       inverse_label: 'has resource',    from_type_id: 'ot-resource', to_type_id: 'ot-mission',  color: '#00ff9d' },
    { id: 'lt-operates',     name: 'operates_in',       label: 'Operates In',       inverse_label: 'has operator',    from_type_id: 'ot-org',      to_type_id: 'ot-area',     color: '#a78bfa' },
    { id: 'lt-exacerbates',  name: 'exacerbates',       label: 'Exacerbates',       inverse_label: 'exacerbated by', from_type_id: 'ot-weather',  to_type_id: 'ot-health',   color: '#ff3a3a' },
  ];

  const insertLT = db.prepare(`INSERT OR IGNORE INTO link_types (id,name,label,inverse_label,from_type_id,to_type_id,color) VALUES (?,?,?,?,?,?,?)`);
  linkTypes.forEach(l => insertLT.run(l.id, l.name, l.label, l.inverse_label, l.from_type_id, l.to_type_id, l.color));

  // ── 4. OBJECTS ─────────────────────────────────────────────────────────────
  const insertObj = db.prepare(`INSERT OR IGNORE INTO objects (id,type_id,name,status,severity,geo_lat,geo_lng,geo_polygon,properties) VALUES (?,?,?,?,?,?,?,?,?)`);

  // WeatherEvents
  const weatherEvents = [
    { id:'we-001', name:'Cyclone Freddy (Feb-Mar 2023)', status:'resolved', severity:'CRITICAL', lat:-20.16, lng:34.84, props:{ event_type:'Cyclone', wind_speed_kmh:195, rainfall_mm:450, landfall_date:'2023-02-22', source:'INAM/ECMWF', forecast_track:'Beira landfall, second loop through Zambezia' } },
    { id:'we-002', name:'Cyclone Ana (Jan 2022)',         status:'resolved', severity:'HIGH',     lat:-16.0,  lng:38.5,  props:{ event_type:'Cyclone', wind_speed_kmh:110, rainfall_mm:280, landfall_date:'2022-01-24', source:'INAM', forecast_track:'Nampula/Zambezia landfall' } },
    { id:'we-003', name:'Zambezi Floods 2024',           status:'active',   severity:'CRITICAL', lat:-16.16, lng:33.59, props:{ event_type:'Flood', rainfall_mm:380, source:'CHIRPS/INGD', forecast_track:'Zambezi main channel, Cahora Bassa overflow risk' } },
    { id:'we-004', name:'Gaza-Inhambane Drought 2025',   status:'active',   severity:'HIGH',     lat:-23.8,  lng:33.5,  props:{ event_type:'Drought', rainfall_mm:42, source:'CHIRPS/FAO', forecast_track:'3rd consecutive below-normal season, southern corridor' } },
    { id:'we-005', name:'Cyclone Gombe (Mar 2022)',       status:'resolved', severity:'MEDIUM',   lat:-14.5,  lng:40.2,  props:{ event_type:'Cyclone', wind_speed_kmh:155, rainfall_mm:310, landfall_date:'2022-03-11', source:'INAM', forecast_track:'Nampula/Cabo Delgado landfall' } },
    { id:'we-006', name:'Limpopo Flood 2024',            status:'active',   severity:'MEDIUM',   lat:-24.5,  lng:32.9,  props:{ event_type:'Flood', rainfall_mm:220, source:'INGD Field Teams', forecast_track:'Chokwé district, dyke breach risk' } },
  ];

  weatherEvents.forEach(w => insertObj.run(w.id,'ot-weather',w.name,w.status,w.severity,w.lat,w.lng,null,JSON.stringify(w.props)));

  // AffectedAreas
  const affectedAreas = [
    { id:'aa-001', name:'Gaza Province',          status:'critical',  severity:'HIGH',     lat:-23.12, lng:33.02, pop:[ [-21.5,31.5],[-21.5,35.5],[-25.5,35.5],[-25.5,31.5] ], props:{ affected_people:490000, displaced:62000, admin_level:'Province', population:1228137, vulnerability_idx:8.4 } },
    { id:'aa-002', name:'Sofala Province',         status:'critical',  severity:'CRITICAL', lat:-19.83, lng:34.84, pop:[ [-18.5,33.5],[-18.5,36.0],[-21.5,36.0],[-21.5,33.5] ], props:{ affected_people:240000, displaced:38000, admin_level:'Province', population:2071050, vulnerability_idx:9.1 } },
    { id:'aa-003', name:'Zambezia Province',       status:'active',    severity:'HIGH',     lat:-17.88, lng:36.87, pop:null, props:{ affected_people:420000, displaced:48000, admin_level:'Province', population:4847437, vulnerability_idx:7.8 } },
    { id:'aa-004', name:'Tete Province',           status:'active',    severity:'HIGH',     lat:-16.16, lng:33.59, pop:null, props:{ affected_people:280000, displaced:35000, admin_level:'Province', population:2648941, vulnerability_idx:8.0 } },
    { id:'aa-005', name:'Nampula Province',        status:'active',    severity:'MEDIUM',   lat:-15.12, lng:39.27, pop:null, props:{ affected_people:340000, displaced:29000, admin_level:'Province', population:6102867, vulnerability_idx:7.2 } },
    { id:'aa-006', name:'Inhambane Province',      status:'active',    severity:'MEDIUM',   lat:-23.86, lng:35.38, pop:null, props:{ affected_people:185000, displaced:12000, admin_level:'Province', population:1441839, vulnerability_idx:6.8 } },
    { id:'aa-007', name:'Manica Province',         status:'active',    severity:'MEDIUM',   lat:-19.10, lng:33.45, pop:null, props:{ affected_people:120000, displaced:9000,  admin_level:'Province', population:1671579, vulnerability_idx:6.1 } },
    { id:'aa-008', name:'Chokwé District (Gaza)',  status:'critical',  severity:'HIGH',     lat:-24.52, lng:32.95, pop:[ [-24.0,32.2],[-24.0,33.6],[-25.2,33.6],[-25.2,32.2] ], props:{ affected_people:68000, displaced:14000, admin_level:'District', population:230000, vulnerability_idx:8.9 } },
    { id:'aa-009', name:'Beira City',              status:'active',    severity:'MEDIUM',   lat:-19.83, lng:34.84, pop:null, props:{ affected_people:48000, displaced:6000, admin_level:'City', population:592055, vulnerability_idx:7.5 } },
    { id:'aa-010', name:'Quelimane City',          status:'active',    severity:'LOW',      lat:-17.88, lng:36.89, pop:null, props:{ affected_people:18000, displaced:2000, admin_level:'City', population:351600, vulnerability_idx:5.8 } },
    { id:'aa-011', name:'Cabo Delgado Province',   status:'active',    severity:'HIGH',     lat:-12.33, lng:39.27, pop:null, props:{ affected_people:285000, displaced:80000, admin_level:'Province', population:2290809, vulnerability_idx:8.6 } },
  ];

  affectedAreas.forEach(a => insertObj.run(a.id,'ot-area',a.name,a.status,a.severity,a.lat,a.lng, a.pop ? JSON.stringify(a.pop) : null, JSON.stringify(a.props)));

  // Organizations
  const orgs = [
    { id:'org-001', name:'INGD',                     status:'active', lat:-25.97, lng:32.58, props:{ org_type:'Government', mandate:'National disaster management and risk reduction', contact:'ingd@gov.mz' } },
    { id:'org-002', name:'INAM',                     status:'active', lat:-25.97, lng:32.58, props:{ org_type:'Government', mandate:'National meteorology and early warning', contact:'inam@gov.mz' } },
    { id:'org-003', name:'WFP Mozambique',            status:'active', lat:-25.97, lng:32.58, props:{ org_type:'UN', mandate:'Food security and emergency logistics', contact:'wfp.maputo@wfp.org' } },
    { id:'org-004', name:'UNICEF Mozambique',         status:'active', lat:-25.97, lng:32.58, props:{ org_type:'UN', mandate:'Child protection, WASH, nutrition', contact:'unicef.moz@unicef.org' } },
    { id:'org-005', name:'MSF (Médecins Sans Frontières)', status:'active', lat:-19.83, lng:34.84, props:{ org_type:'NGO', mandate:'Emergency medical response', contact:'msf.beira@msf.org' } },
    { id:'org-006', name:'OCHA Mozambique',           status:'active', lat:-25.97, lng:32.58, props:{ org_type:'UN', mandate:'Humanitarian coordination and information management', contact:'ocha.moz@un.org' } },
    { id:'org-007', name:'Cruz Vermelha de Moçambique', status:'active', lat:-25.97, lng:32.58, props:{ org_type:'NGO', mandate:'First aid, blood, disaster preparedness', contact:'cvm@cvm.org.mz' } },
    { id:'org-008', name:'FAO Mozambique',            status:'active', lat:-25.97, lng:32.58, props:{ org_type:'UN', mandate:'Food security, agriculture, livelihoods', contact:'fao.moz@fao.org' } },
    { id:'org-009', name:'USAID/BHA Mozambique',      status:'active', lat:-25.97, lng:32.58, props:{ org_type:'Donor', mandate:'US government humanitarian assistance', contact:'usaid.moz@usaid.gov' } },
    { id:'org-010', name:'Save the Children Moz',     status:'active', lat:-25.97, lng:32.58, props:{ org_type:'NGO', mandate:'Child protection, education, health', contact:'sc.moz@savethechildren.org' } },
  ];

  orgs.forEach(o => insertObj.run(o.id,'ot-org',o.name,o.status,null,o.lat,o.lng,null,JSON.stringify(o.props)));

  // Infrastructure
  const infra = [
    { id:'inf-001', name:'Cahora Bassa Dam',        status:'critical', severity:'CRITICAL', lat:-15.60, lng:32.70, props:{ infra_type:'Dam',     condition:'At-Risk',    capacity_info:'2,075 MW hydro, 98.4% reservoir capacity, 2,400 m³/s discharge' } },
    { id:'inf-002', name:'EN1 Highway (Maputo-Beira)', status:'active', severity:'HIGH',   lat:-22.00, lng:33.50, props:{ infra_type:'Road',    condition:'Damaged',    capacity_info:'Primary national road, 1,200 km. Km 214 impassable.' } },
    { id:'inf-003', name:'Beira International Airport', status:'active', severity:'MEDIUM', lat:-19.80, lng:34.91, props:{ infra_type:'Airport',  condition:'Operational', capacity_info:'Main logistics hub for central Mozambique relief operations' } },
    { id:'inf-004', name:'Sena Railway Bridge',     status:'critical', severity:'HIGH',     lat:-17.44, lng:35.02, props:{ infra_type:'Bridge',   condition:'At-Risk',    capacity_info:'Critical rail link to Tete, last inspection flagged structural risk' } },
    { id:'inf-005', name:'Buzi River Bridge (N6)',  status:'critical', severity:'CRITICAL', lat:-19.83, lng:34.90, props:{ infra_type:'Bridge',   condition:'Damaged',    capacity_info:'Submerged at Km 214 — blocks primary Beira-Tete corridor' } },
    { id:'inf-006', name:'Quelimane Airport',       status:'active',   severity:'LOW',      lat:-17.86, lng:36.87, props:{ infra_type:'Airport',  condition:'Operational', capacity_info:'Secondary hub for Zambezia relief operations' } },
    { id:'inf-007', name:'Maputo International Port', status:'active', severity:'LOW',      lat:-25.97, lng:32.58, props:{ infra_type:'Port',     condition:'Operational', capacity_info:'Primary import port; 8,200 MT humanitarian capacity' } },
    { id:'inf-008', name:'Chicualacuala Border Post', status:'active', severity:'MEDIUM',   lat:-22.10, lng:31.66, props:{ infra_type:'Road',     condition:'At-Risk',    capacity_info:'Zimbabwe border crossing; alternate supply route when EN1 blocked' } },
  ];

  infra.forEach(i => insertObj.run(i.id,'ot-infra',i.name,i.status,i.severity,i.lat,i.lng,null,JSON.stringify(i.props)));

  // Resources
  const resources = [
    { id:'res-001', name:'INGD Response Team Alpha',    status:'deployed',   severity:null, lat:-19.83, lng:34.84, props:{ resource_type:'Team',     quantity:25,   location:'Beira Operations Base',  capacity:'Search & rescue, evacuation, shelter setup' } },
    { id:'res-002', name:'INGD Response Team Bravo',    status:'deployed',   severity:null, lat:-16.16, lng:33.59, props:{ resource_type:'Team',     quantity:20,   location:'Tete Forward Base',       capacity:'Flood response, logistics, community liaison' } },
    { id:'res-003', name:'SAR Helicopter Unit 1',       status:'deployed',   severity:null, lat:-19.80, lng:34.91, props:{ resource_type:'Aircraft',  quantity:1,    location:'Beira Airport',           capacity:'Rescue winch, 8-pax, range 450 km' } },
    { id:'res-004', name:'SAR Helicopter Unit 2',       status:'available',  severity:null, lat:-25.97, lng:32.58, props:{ resource_type:'Aircraft',  quantity:1,    location:'Maputo Reserve',          capacity:'Medical evac, 6-pax, range 380 km' } },
    { id:'res-005', name:'Medical Response Unit Sofala', status:'deployed',  severity:null, lat:-19.83, lng:34.84, props:{ resource_type:'Team',     quantity:12,   location:'Beira Central Hospital',  capacity:'Cholera treatment, trauma, ORS distribution' } },
    { id:'res-006', name:'Medical Unit Gaza',           status:'deployed',   severity:null, lat:-23.12, lng:33.02, props:{ resource_type:'Team',     quantity:10,   location:'Xai-Xai District Hospital', capacity:'Malnutrition treatment, SAM/MAM protocols' } },
    { id:'res-007', name:'Water Purification Unit 1',   status:'deployed',   severity:null, lat:-16.16, lng:33.59, props:{ resource_type:'Equipment', quantity:3,    location:'Tete Province',           capacity:'30,000 L/day each, chlorination, testing' } },
    { id:'res-008', name:'WFP Logistics Hub Beira',     status:'active',     severity:null, lat:-19.83, lng:34.84, props:{ resource_type:'Stock',    quantity:2100, location:'Beira Port Warehouse',    capacity:'5,000 MT capacity — 42% fill rate' } },
    { id:'res-009', name:'INGD Boat Unit Zambezi',      status:'deployed',   severity:null, lat:-16.30, lng:33.80, props:{ resource_type:'Vehicle',  quantity:6,    location:'Zambezi River, Tete',     capacity:'6 motorboats, 15-person capacity each' } },
    { id:'res-010', name:'Drone Surveillance Unit',     status:'available',  severity:null, lat:-25.97, lng:32.58, props:{ resource_type:'Equipment', quantity:4,    location:'Maputo Reserve',          capacity:'Fixed-wing UAV, 6h endurance, SAR + flood mapping' } },
    { id:'res-011', name:'Emergency Shelter Stock',     status:'active',     severity:null, lat:-19.83, lng:34.84, props:{ resource_type:'Stock',    quantity:2400, location:'Beira Hub + Quelimane',   capacity:'2,400 family kits — tarpaulins, rope, tools' } },
  ];

  resources.forEach(r => insertObj.run(r.id,'ot-resource',r.name,r.status,r.severity,r.lat,r.lng,null,JSON.stringify(r.props)));

  // HealthRisks
  const healthRisks = [
    { id:'hr-001', name:'Cholera Outbreak Sofala 2024',       status:'critical', severity:'CRITICAL', lat:-19.83, lng:34.84, props:{ disease:'Vibrio cholerae',   cases:1240, deaths:22, cfr_pct:1.77, at_risk:52000 } },
    { id:'hr-002', name:'Malaria Surge Zambezi 2024',         status:'active',   severity:'HIGH',     lat:-16.50, lng:35.20, props:{ disease:'Plasmodium falciparum', cases:3100, deaths:18, cfr_pct:0.58, at_risk:210000 } },
    { id:'hr-003', name:'Acute Malnutrition Gaza 2025',       status:'active',   severity:'HIGH',     lat:-23.12, lng:33.02, props:{ disease:'SAM/MAM',            cases:45000, deaths:0, cfr_pct:0, at_risk:280000 } },
    { id:'hr-004', name:'Cholera Risk Tete Province 2024',    status:'active',   severity:'MEDIUM',   lat:-16.16, lng:33.59, props:{ disease:'Vibrio cholerae',   cases:320, deaths:4, cfr_pct:1.25, at_risk:94000 } },
    { id:'hr-005', name:'Malnutrition — Inhambane 2025',      status:'active',   severity:'MEDIUM',   lat:-23.86, lng:35.38, props:{ disease:'MAM',               cases:18000, deaths:0, cfr_pct:0, at_risk:95000 } },
  ];

  healthRisks.forEach(h => insertObj.run(h.id,'ot-health',h.name,h.status,h.severity,h.lat,h.lng,null,JSON.stringify(h.props)));

  // SupplyChainItems
  const supplies = [
    { id:'sc-001', name:'Emergency Food Rations (WFP)',      status:'active', lat:-19.83, lng:34.84, props:{ item_type:'Food',          quantity:5400,  unit:'MT',      location:'Beira Hub + Maputo Central', donor:'WFP/USAID' } },
    { id:'sc-002', name:'Oral Rehydration Salts',            status:'active', lat:-19.83, lng:34.84, props:{ item_type:'Medicine',      quantity:80000, unit:'sachets', location:'Beira Hub',                  donor:'UNICEF' } },
    { id:'sc-003', name:'Family Shelter Kits',               status:'active', lat:-19.83, lng:34.84, props:{ item_type:'NFI',           quantity:2400,  unit:'kits',    location:'Beira + Quelimane',          donor:'UNHCR/INGD' } },
    { id:'sc-004', name:'Water Purification Tablets',        status:'active', lat:-25.97, lng:32.58, props:{ item_type:'WASH',          quantity:500000,unit:'tabs',    location:'Maputo Central Store',       donor:'UNICEF' } },
    { id:'sc-005', name:'Medical/Cholera Kits',              status:'active', lat:-19.83, lng:34.84, props:{ item_type:'Medicine',      quantity:800,   unit:'kits',    location:'Beira Hub',                  donor:'WHO/MSF' } },
    { id:'sc-006', name:'Plumpy\'Nut (RUTF)',                status:'active', lat:-25.97, lng:32.58, props:{ item_type:'Nutrition',     quantity:45000, unit:'cartons', location:'Maputo Central',             donor:'UNICEF' } },
    { id:'sc-007', name:'Insecticide-Treated Bed Nets',      status:'active', lat:-25.97, lng:32.58, props:{ item_type:'Health',        quantity:120000,unit:'nets',    location:'Maputo Central',             donor:'PMI/USAID' } },
  ];

  supplies.forEach(s => insertObj.run(s.id,'ot-supply',s.name,s.status,null,s.lat,s.lng,null,JSON.stringify(s.props)));

  // PersonAtRisk
  const persons = [
    { id:'par-001', name:'Flood-Affected Population (Sofala/Gaza)',   status:'active', severity:'CRITICAL', lat:-21.0, lng:34.0, props:{ affected_people:730000, displaced:100000, admin_level:'Province', population:3299187, vulnerability_idx:9.1 } },
    { id:'par-002', name:'Drought-Affected Population (Southern Moz)',status:'active', severity:'HIGH',     lat:-23.5, lng:34.0, props:{ affected_people:1200000, displaced:0, admin_level:'Province', population:2669978, vulnerability_idx:8.4 } },
    { id:'par-003', name:'Cyclone-Displaced Population (Nampula)',    status:'active', severity:'MEDIUM',   lat:-15.5, lng:39.5, props:{ affected_people:340000, displaced:29000, admin_level:'Province', population:6102867, vulnerability_idx:7.2 } },
  ];

  persons.forEach(p => insertObj.run(p.id,'ot-person',p.name,p.status,p.severity,p.lat,p.lng,null,JSON.stringify(p.props)));

  // Missions
  const missions = [
    { id:'mis-001', name:'Operation Freddy Response 2023', status:'completed', severity:null, lat:-19.83, lng:34.84, props:{ start_date:'2023-02-20', end_date:'2023-04-15', lead_org:'INGD', priority:'CRITICAL' } },
    { id:'mis-002', name:'Zambezi Flood Relief 2024',     status:'active',    severity:null, lat:-16.16, lng:33.59, props:{ start_date:'2024-01-10', end_date:null,         lead_org:'INGD', priority:'HIGH' } },
    { id:'mis-003', name:'Gaza Drought Response 2025',    status:'active',    severity:null, lat:-23.12, lng:33.02, props:{ start_date:'2025-03-01', end_date:null,         lead_org:'WFP',  priority:'HIGH' } },
    { id:'mis-004', name:'TC Ana Emergency Ops 2022',     status:'completed', severity:null, lat:-16.0,  lng:38.5,  props:{ start_date:'2022-01-22', end_date:'2022-03-10', lead_org:'INGD', priority:'HIGH' } },
  ];

  missions.forEach(m => insertObj.run(m.id,'ot-mission',m.name,m.status,m.severity,m.lat,m.lng,null,JSON.stringify(m.props)));

  // ── 5. LINKS ───────────────────────────────────────────────────────────────
  const now2 = new Date().toISOString();
  const insertLink = db.prepare(`INSERT OR IGNORE INTO links (id,link_type_id,from_object_id,to_object_id,metadata) VALUES (?,?,?,?,?)`);

  let lid = 1;
  const L = (type, from, to, meta={}) => {
    insertLink.run(`lnk-${String(lid++).padStart(3,'0')}`, type, from, to, JSON.stringify(meta));
  };

  // Cyclone Freddy impacts
  L('lt-impacts','we-001','aa-002',{note:'Direct landfall, Category 4'});
  L('lt-impacts','we-001','aa-001',{note:'Storm surge and rainfall flooding'});
  L('lt-impacts','we-001','aa-006',{note:'Heavy rainfall, flooding'});
  L('lt-impacts','we-001','aa-007',{note:'Wind damage, flooding'});
  L('lt-threatens','we-001','inf-003',{note:'Airport operations suspended during landfall'});
  L('lt-threatens','we-001','inf-005',{note:'Buzi bridge submerged by storm surge'});
  L('lt-threatens','we-001','inf-002',{note:'EN1 damaged at multiple points'});
  L('lt-exacerbates','we-001','hr-001',{note:'WASH infrastructure destroyed, water contamination'});

  // Cyclone Ana impacts
  L('lt-impacts','we-002','aa-003',{note:'Heavy rainfall, river flooding'});
  L('lt-impacts','we-002','aa-005',{note:'Landfall near Angoche, wind damage'});
  L('lt-threatens','we-002','inf-006',{note:'Quelimane airport temporarily closed'});

  // Zambezi Floods
  L('lt-impacts','we-003','aa-004',{note:'Main Zambezi basin inundation, Tete City at risk'});
  L('lt-impacts','we-003','aa-003',{note:'Lower Zambezi flooding, crop destruction'});
  L('lt-impacts','we-003','aa-002',{note:'Downstream Pungwe tributary contribution'});
  L('lt-threatens','we-003','inf-001',{note:'Cahora Bassa at 98.4% — elevated release protocol'});
  L('lt-threatens','we-003','inf-004',{note:'Sena Rail Bridge at structural risk from flow'});
  L('lt-exacerbates','we-003','hr-002',{note:'Standing water creating Anopheles habitat'});
  L('lt-exacerbates','we-003','hr-004',{note:'WASH disruption in Tete flood corridor'});

  // Gaza Drought
  L('lt-impacts','we-004','aa-001',{note:'3rd consecutive below-normal rainfall season'});
  L('lt-impacts','we-004','aa-006',{note:'Soil moisture deficit 68%, crop failure'});
  L('lt-exacerbates','we-004','hr-003',{note:'Harvest failure driving acute malnutrition'});
  L('lt-exacerbates','we-004','hr-005',{note:'Southern corridor food security collapse'});

  // Limpopo Flood
  L('lt-impacts','we-006','aa-008',{note:'Dyke breach, Chokwé rice paddies 78% submerged'});
  L('lt-impacts','we-006','aa-001',{note:'Gaza floodplain inundation'});
  L('lt-threatens','we-006','inf-008',{note:'Chicualacuala road disrupted'});

  // TC Gombe
  L('lt-impacts','we-005','aa-005',{note:'Nampula coastal flooding'});
  L('lt-impacts','we-005','aa-011',{note:'Cabo Delgado wind and rain'});

  // Area → HealthRisk
  L('lt-health','aa-002','hr-001',{note:'Cholera confirmed in 5 Sofala districts'});
  L('lt-health','aa-002','hr-002',{note:'Malaria transmission elevated post-flood'});
  L('lt-health','aa-004','hr-004',{note:'Cholera risk elevated in flood corridor'});
  L('lt-health','aa-003','hr-002',{note:'Malaria surge in Zambezia flood zone'});
  L('lt-health','aa-001','hr-003',{note:'IPC4 acute malnutrition, harvest failure'});
  L('lt-health','aa-006','hr-005',{note:'Malnutrition secondary to drought'});

  // PersonAtRisk → AffectedArea
  L('lt-located','par-001','aa-002',{note:'Sofala primary impact zone'});
  L('lt-located','par-001','aa-001',{note:'Gaza flood-affected population'});
  L('lt-located','par-002','aa-001',{note:'Gaza drought-affected'});
  L('lt-located','par-002','aa-006',{note:'Inhambane drought-affected'});
  L('lt-located','par-003','aa-005',{note:'Nampula cyclone-displaced'});

  // Mission: Operation Freddy Response 2023
  L('lt-responds','mis-001','we-001');
  L('lt-deploys','mis-001','res-001');
  L('lt-deploys','mis-001','res-003');
  L('lt-deploys','mis-001','res-005');
  L('lt-participates','org-001','mis-001');
  L('lt-participates','org-003','mis-001');
  L('lt-participates','org-004','mis-001');
  L('lt-participates','org-005','mis-001');
  L('lt-participates','org-006','mis-001');
  L('lt-participates','org-007','mis-001');
  L('lt-participates','org-009','mis-001');

  // Mission: Zambezi Flood Relief 2024
  L('lt-responds','mis-002','we-003');
  L('lt-deploys','mis-002','res-002');
  L('lt-deploys','mis-002','res-007');
  L('lt-deploys','mis-002','res-009');
  L('lt-participates','org-001','mis-002');
  L('lt-participates','org-003','mis-002');
  L('lt-participates','org-004','mis-002');
  L('lt-participates','org-006','mis-002');
  L('lt-participates','org-008','mis-002');

  // Mission: Gaza Drought Response
  L('lt-responds','mis-003','we-004');
  L('lt-deploys','mis-003','res-006');
  L('lt-participates','org-001','mis-003');
  L('lt-participates','org-003','mis-003');
  L('lt-participates','org-008','mis-003');
  L('lt-participates','org-010','mis-003');
  L('lt-participates','org-009','mis-003');

  // Resource → Mission (assigned_to)
  L('lt-assigned','res-001','mis-001');
  L('lt-assigned','res-003','mis-001');
  L('lt-assigned','res-005','mis-001');
  L('lt-assigned','res-002','mis-002');
  L('lt-assigned','res-007','mis-002');
  L('lt-assigned','res-009','mis-002');
  L('lt-assigned','res-006','mis-003');

  // Org monitors WeatherEvents
  L('lt-monitors','org-002','we-001');
  L('lt-monitors','org-002','we-002');
  L('lt-monitors','org-002','we-003');
  L('lt-monitors','org-002','we-004');
  L('lt-monitors','org-001','we-003');
  L('lt-monitors','org-001','we-004');
  L('lt-monitors','org-006','we-001');
  L('lt-monitors','org-006','we-003');

  // Org operates in areas
  L('lt-operates','org-005','aa-002',{note:'MSF Beira emergency operations'});
  L('lt-operates','org-003','aa-001',{note:'WFP food distribution Gaza'});
  L('lt-operates','org-003','aa-002',{note:'WFP logistics hub Beira'});
  L('lt-operates','org-008','aa-001',{note:'FAO food security assessment'});

  // SupplyChain → AffectedArea
  L('lt-supplies','sc-001','aa-001',{note:'5,400 MT distributed across 38 collection points'});
  L('lt-supplies','sc-001','aa-002',{note:'Emergency food distribution Sofala'});
  L('lt-supplies','sc-001','aa-006',{note:'Inhambane drought response distribution'});
  L('lt-supplies','sc-002','aa-002',{note:'ORS for cholera treatment — Sofala'});
  L('lt-supplies','sc-002','aa-004',{note:'ORS pre-positioned Tete'});
  L('lt-supplies','sc-003','aa-001',{note:'Shelter kits Gaza'});
  L('lt-supplies','sc-003','aa-002',{note:'Shelter kits Sofala'});
  L('lt-supplies','sc-005','aa-002',{note:'Medical kits Sofala cholera response'});
  L('lt-supplies','sc-006','aa-001',{note:'RUTF for acute malnutrition Gaza'});
  L('lt-supplies','sc-007','aa-003',{note:'ITNs for malaria prevention Zambezia'});

  // ── 6. ALERTS ──────────────────────────────────────────────────────────────
  const insertAlert = db.prepare(`INSERT OR IGNORE INTO alerts (id,severity,title,description,object_id) VALUES (?,?,?,?,?)`);
  [
    ['alt-001','CRITICAL','Cahora Bassa Dam — Elevated Release Protocol',    'Operating at 2,400 m³/s. 48-hour window before spillway activation. Downstream flood pulse projected at Tete City in 31 hours.', 'inf-001'],
    ['alt-002','CRITICAL','Cholera CFR Trending Above 2.0% — Sofala',       '1,240 cases / 22 deaths. Exceeds WHO emergency threshold. ORS coverage at 34% — target 85% within 48h.', 'hr-001'],
    ['alt-003','HIGH',    'Buzi Bridge (N6) Impassable — 4,200 MT Stranded', 'Primary Beira-Tete corridor blocked. Alternate via Nacala Rail recommended. Clearance ETA: 6 days.', 'inf-005'],
    ['alt-004','HIGH',    'IPC Phase 4 — Gaza/Inhambane Escalation',         '1.2M people in Crisis/Emergency food insecurity. WFP pipeline must activate within 72h.', 'hr-003'],
    ['alt-005','HIGH',    'Malaria Surge — 3,100 Cases in 14 Days',          'Post-flood vector habitat expansion. Insecticide spraying capacity at 40%. Bed net distribution priority.', 'hr-002'],
    ['alt-006','MEDIUM',  'INGD Bravo Team — Supply Resupply Required',      'Water purification unit running low on chlorine tablets. 5-day resupply needed at Tete Forward Base.', 'res-002'],
    ['alt-007','MEDIUM',  'Quelimane Pre-Position Opportunity',              'TC formation watch in Mozambique Channel. 48h window to pre-position 500 MT to Nampula coast.', null],
  ].forEach(a => insertAlert.run(...a));

  // ── 7. EVENTS / TIMELINE ───────────────────────────────────────────────────
  const insertEvent = db.prepare(`INSERT OR IGNORE INTO events (id,object_id,event_type,title,description,user_name) VALUES (?,?,?,?,?,?)`);
  [
    ['ev-001','we-001','alert',       'TC Freddy Category 4 landfall confirmed',            'INAM confirms landfall near Beira at 195 km/h winds. Emergency declared.', 'INAM'],
    ['ev-002','mis-001','status_change','Operation Freddy Response ACTIVATED',              'INGD activates national response plan. All teams mobilised.', 'INGD Ops'],
    ['ev-003','res-001','status_change','INGD Alpha Team deployed to Beira',                'Team Alpha departed Maputo 06:30. ETA Beira 14:00.', 'Dispatch'],
    ['ev-004','hr-001','alert',        'First cholera cases confirmed — Beira',              '12 initial cases in Munhava neighbourhood. Oral rehydration points activated.', 'MSF'],
    ['ev-005','we-003','alert',        'Zambezi River rising — Tete alert issued',           'River at 142% of seasonal norm. Cahora Bassa controlled release underway.', 'INAM'],
    ['ev-006','we-003','alert',        'Cahora Bassa: elevated release protocol',            'Discharge increased to 2,400 m³/s. Downstream communities notified.', 'HCB'],
    ['ev-007','we-004','alert',        'Third consecutive below-normal rainfall confirmed', 'CHIRPS data confirms IPC4 risk across Gaza and Inhambane.', 'FAO'],
    ['ev-008','mis-002','status_change','Zambezi Flood Relief team deployed',               'INGD Bravo and WFP logistics activated for Tete/Zambezia corridor.', 'INGD Ops'],
    ['ev-009','inf-005','alert',       'Buzi Bridge submerged — N6 blocked',                'Bridge passable only by boat. 4,200 MT cargo stranded at Beira.', 'Transport'],
    ['ev-010','sc-001','status_change','WFP food pipeline 8,200 MT activated',              'Maputo central store release authorised. Distribution to 38 collection points.', 'WFP'],
  ].forEach(e => insertEvent.run(...e));

  // ── 8. MISSIONS (dedicated table) ─────────────────────────────────────────
  const insertMission = db.prepare(`INSERT OR IGNORE INTO missions (id,name,status,description,lead_org_id,weather_event_id,start_date,end_date,priority) VALUES (?,?,?,?,?,?,?,?,?)`);
  [
    ['mis-001','Operation Freddy Response 2023','completed','Full-scale national response to Cyclone Freddy. Covered evacuation, medical, water, and shelter.','org-001','we-001','2023-02-20','2023-04-15','CRITICAL'],
    ['mis-002','Zambezi Flood Relief 2024','active','Ongoing flood relief for Tete and Zambezia provinces. Dam monitoring + downstream evacuation.','org-001','we-003','2024-01-10',null,'HIGH'],
    ['mis-003','Gaza Drought Response 2025','active','Food security and livelihood response for southern provinces. IPC4 escalation management.','org-003','we-004','2025-03-01',null,'HIGH'],
    ['mis-004','TC Ana Emergency Ops 2022','completed','Emergency response to Cyclone Ana in Zambezia and Nampula.','org-001','we-002','2022-01-22','2022-03-10','HIGH'],
  ].forEach(m => insertMission.run(...m));

  // ── 9. PIPELINE RUNS ───────────────────────────────────────────────────────
  const insertRun = db.prepare(`INSERT OR IGNORE INTO pipeline_runs (id,source,source_type,status,records_ingested,objects_created,links_created,started_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?)`);
  [
    ['run-001','INAM Meteorological Feed','api','completed',2400,8,12,'2026-06-10T08:00:00','2026-06-10T08:02:14'],
    ['run-002','INGD Situation Reports','api','completed',840,11,18,'2026-06-10T09:00:00','2026-06-10T09:01:44'],
    ['run-003','WFP LESS Tracker','api','completed',320,4,6,'2026-06-10T10:00:00','2026-06-10T10:00:58'],
    ['run-004','DHIS2 Health Surveillance','api','completed',1200,5,8,'2026-06-10T11:00:00','2026-06-10T11:02:01'],
    ['run-005','Sentinel-2 SAR (ESA Copernicus)','satellite','completed',4800,3,5,'2026-06-10T12:00:00','2026-06-10T12:08:22'],
  ].forEach(r => insertRun.run(...r));

  // ── 10. WORKSHOP LAYOUTS ───────────────────────────────────────────────────
  const insertWS = db.prepare(`INSERT OR IGNORE INTO workshop_layouts (id,name,description,template,widgets) VALUES (?,?,?,?,?)`);
  [
    ['ws-001','Flood Response Dashboard','Real-time overview for active flood operations','flood_response', JSON.stringify([
      { id:'w1', type:'metric', title:'Affected People',   query:'totalAffected',   size:'sm', position:{x:0,y:0} },
      { id:'w2', type:'metric', title:'Active Hazards',    query:'activeHazards',   size:'sm', position:{x:1,y:0} },
      { id:'w3', type:'metric', title:'Resources Deployed',query:'deployedResources',size:'sm', position:{x:2,y:0} },
      { id:'w4', type:'metric', title:'Risk Index',         query:'riskIndex',        size:'sm', position:{x:3,y:0} },
      { id:'w5', type:'map',    title:'Operational Map',    size:'lg', position:{x:0,y:1} },
      { id:'w6', type:'alerts', title:'Live Alerts',        size:'md', position:{x:3,y:1} },
      { id:'w7', type:'chart',  title:'Affected by Province', chartType:'bar', query:'byProvince', size:'md', position:{x:0,y:2} },
      { id:'w8', type:'timeline',title:'Incident Timeline',  size:'md', position:{x:2,y:2} },
    ])],
    ['ws-002','Resource Allocation','Track deployed assets and mission readiness','resources', JSON.stringify([
      { id:'w1', type:'metric', title:'Total Resources',    query:'totalResources',   size:'sm', position:{x:0,y:0} },
      { id:'w2', type:'metric', title:'Deployed',           query:'deployedResources',size:'sm', position:{x:1,y:0} },
      { id:'w3', type:'table',  title:'Resource Catalog',   query:'resources',         size:'lg', position:{x:0,y:1} },
      { id:'w4', type:'chart',  title:'Resources by Status', chartType:'pie', query:'resourceStatus', size:'md', position:{x:3,y:1} },
    ])],
    ['ws-003','Health Risk Monitor','Track disease outbreaks and health indicators','health', JSON.stringify([
      { id:'w1', type:'metric', title:'Cholera Cases',      query:'choleraCases',     size:'sm', position:{x:0,y:0} },
      { id:'w2', type:'metric', title:'At-Risk Population', query:'atRisk',            size:'sm', position:{x:1,y:0} },
      { id:'w3', type:'map',    title:'Health Hotspots',    size:'lg', position:{x:0,y:1} },
      { id:'w4', type:'chart',  title:'Cases Over Time',    chartType:'line', query:'casesTrend', size:'md', position:{x:3,y:1} },
    ])],
  ].forEach(w => insertWS.run(...w));

  // ── 11. COMMENTS ───────────────────────────────────────────────────────────
  const insertComment = db.prepare(`INSERT OR IGNORE INTO comments (id,object_id,user_name,content) VALUES (?,?,?,?)`);
  [
    ['cmt-001','we-003','Ana Rodrigues (INGD)','Discharge now at 2,400 m³/s. Evacuation of downstream settlements must begin by 18:00 today. Coordinating with Tete Provincial Government.'],
    ['cmt-002','hr-001','Dr. Carlos Nuvunga (MSF)','Cholera CFR concerning — we need more ORS at Munhava and Nhangau. Can WFP confirm stockpile release timeline?'],
    ['cmt-003','mis-002','Maria Sitoe (WFP)','Food pipeline activated. 8,200 MT approved for release from Maputo. First convoy to depart via Nacala corridor given N6 blockage.'],
    ['cmt-004','inf-005','Eng. João Macamo (ANGRH)','Buzi bridge assessment complete. Bailey bridge deployment from FADM could restore passage in 5-7 days. MINDEF request submitted.'],
    ['cmt-005','we-004','Pedro Langa (FAO)','CHIRPS confirms third consecutive season below 60% of normal for Gaza and Inhambane. IPC Phase 4 escalation expected. WFP IRA needed.'],
  ].forEach(c => insertComment.run(...c));

  console.log('[Seed] Inserted: objects, links, alerts, events, missions, pipelines, workshop layouts, comments.');
}

module.exports = { seedIfEmpty, runSeed };
