// Terra Foundry — Mozambique Ontology Seed Data
// Realistic 2022-2026 multi-hazard scenarios: floods, cyclones, drought,
// cholera, food insecurity. Based on OCHA/INGD/INAM situation reports.

const { getDB } = require('./database');

function seedIfEmpty() {
  const db = getDB();
  const count = db.prepare('SELECT COUNT(*) as c FROM objects').get().c;
  if (count === 0) {
    console.log('[Seed] Populating Terra knowledge graph from scratch...');
    runSeed(db);
    runPhase3Seed(db);
    console.log('[Seed] Done — national knowledge graph ready.');
    return;
  }
  // Extend existing database with Phase 3 national knowledge graph
  const p3check = db.prepare("SELECT COUNT(*) as c FROM objects WHERE id='we-idai-2019'").get().c;
  if (p3check === 0) {
    console.log('[Seed] Phase 3 extension — enriching national knowledge graph...');
    runPhase3Seed(db);
    console.log('[Seed] Phase 3 extension complete.');
  } else {
    console.log('[Seed] Knowledge graph already at Phase 3, skipping.');
  }
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
  const insertAlert = db.prepare(`INSERT OR IGNORE INTO alerts (id,severity,title,description,object_id,title_pt,description_pt) VALUES (?,?,?,?,?,?,?)`);
  [
    ['alt-001','CRITICAL',
      'Cahora Bassa Dam — Elevated Release Protocol',
      'Operating at 2,400 m³/s. 48-hour window before spillway activation. Downstream flood pulse projected at Tete City in 31 hours.',
      'inf-001',
      'Barragem de Cahora Bassa — Protocolo de Descarga Elevada',
      'Em funcionamento a 2.400 m³/s. Janela de 48 horas antes da activação do descarregador. Pulso de cheia a jusante projectado em Tete em 31 horas.'],
    ['alt-002','CRITICAL',
      'Cholera CFR Trending Above 2.0% — Sofala',
      '1,240 cases / 22 deaths. Exceeds WHO emergency threshold. ORS coverage at 34% — target 85% within 48h.',
      'hr-001',
      'TLM de Cólera a Superar 2,0% — Sofala',
      '1.240 casos / 22 mortes. Ultrapassa limiar de emergência da OMS. Cobertura SRO em 34% — meta 85% em 48h.'],
    ['alt-003','HIGH',
      'Buzi Bridge (N6) Impassable — 4,200 MT Stranded',
      'Primary Beira-Tete corridor blocked. Alternate via Nacala Rail recommended. Clearance ETA: 6 days.',
      'inf-005',
      'Ponte do Buzi (N6) Intransitável — 4.200 MT Retidas',
      'Corredor principal Beira-Tete bloqueado. Alternativa via Caminho de Ferro de Nacala recomendada. ETA de limpeza: 6 dias.'],
    ['alt-004','HIGH',
      'IPC Phase 4 — Gaza/Inhambane Escalation',
      '1.2M people in Crisis/Emergency food insecurity. WFP pipeline must activate within 72h.',
      'hr-003',
      'IPC Fase 4 — Escalada Gaza/Inhambane',
      '1,2M de pessoas em insegurança alimentar de Crise/Emergência. Pipeline do PMA deve ser activado em 72h.'],
    ['alt-005','HIGH',
      'Malaria Surge — 3,100 Cases in 14 Days',
      'Post-flood vector habitat expansion. Insecticide spraying capacity at 40%. Bed net distribution priority.',
      'hr-002',
      'Surto de Malária — 3.100 Casos em 14 Dias',
      'Expansão de habitat vectorial pós-cheia. Capacidade de pulverização inseticida em 40%. Prioridade na distribuição de redes mosquiteiras.'],
    ['alt-006','MEDIUM',
      'INGD Bravo Team — Supply Resupply Required',
      'Water purification unit running low on chlorine tablets. 5-day resupply needed at Tete Forward Base.',
      'res-002',
      'Equipa Bravo INGD — Reabastecimento Necessário',
      'Unidade de purificação de água a ficar sem comprimidos de cloro. Reabastecimento de 5 dias necessário na Base Avançada de Tete.'],
    ['alt-007','MEDIUM',
      'Quelimane Pre-Position Opportunity',
      'TC formation watch in Mozambique Channel. 48h window to pre-position 500 MT to Nampula coast.',
      null,
      'Oportunidade de Pré-Posicionamento em Quelimane',
      'Vigilância de formação de ciclone no Canal de Moçambique. Janela de 48h para pré-posicionar 500 MT na costa de Nampula.'],
  ].forEach(a => insertAlert.run(...a));

  // ── 7. EVENTS / TIMELINE ───────────────────────────────────────────────────
  const insertEvent = db.prepare(`INSERT OR IGNORE INTO events (id,object_id,event_type,title,description,user_name,title_pt,description_pt) VALUES (?,?,?,?,?,?,?,?)`);
  [
    ['ev-001','we-001','alert',
      'TC Freddy Category 4 landfall confirmed',
      'INAM confirms landfall near Beira at 195 km/h winds. Emergency declared.',
      'INAM',
      'Aterragem de Categoria 4 do TC Freddy confirmada',
      'INAM confirma aterragem perto de Beira a 195 km/h de vento. Emergência declarada.'],
    ['ev-002','mis-001','status_change',
      'Operation Freddy Response ACTIVATED',
      'INGD activates national response plan. All teams mobilised.',
      'INGD Ops',
      'Operação Resposta Freddy ACTIVADA',
      'INGD activa plano de resposta nacional. Todas as equipas mobilizadas.'],
    ['ev-003','res-001','status_change',
      'INGD Alpha Team deployed to Beira',
      'Team Alpha departed Maputo 06:30. ETA Beira 14:00.',
      'Dispatch',
      'Equipa Alfa INGD destacada para Beira',
      'Equipa Alfa partiu de Maputo às 06:30. ETA Beira 14:00.'],
    ['ev-004','hr-001','alert',
      'First cholera cases confirmed — Beira',
      '12 initial cases in Munhava neighbourhood. Oral rehydration points activated.',
      'MSF',
      'Primeiros casos de cólera confirmados — Beira',
      '12 casos iniciais no bairro da Munhava. Pontos de reidratação oral activados.'],
    ['ev-005','we-003','alert',
      'Zambezi River rising — Tete alert issued',
      'River at 142% of seasonal norm. Cahora Bassa controlled release underway.',
      'INAM',
      'Rio Zambeze a subir — alerta emitido para Tete',
      'Rio a 142% da norma sazonal. Descarga controlada de Cahora Bassa em curso.'],
    ['ev-006','we-003','alert',
      'Cahora Bassa: elevated release protocol',
      'Discharge increased to 2,400 m³/s. Downstream communities notified.',
      'HCB',
      'Cahora Bassa: protocolo de descarga elevada',
      'Descarga aumentada para 2.400 m³/s. Comunidades a jusante notificadas.'],
    ['ev-007','we-004','alert',
      'Third consecutive below-normal rainfall confirmed',
      'CHIRPS data confirms IPC4 risk across Gaza and Inhambane.',
      'FAO',
      'Terceira estação consecutiva abaixo do normal confirmada',
      'Dados CHIRPS confirmam risco IPC4 em Gaza e Inhambane.'],
    ['ev-008','mis-002','status_change',
      'Zambezi Flood Relief team deployed',
      'INGD Bravo and WFP logistics activated for Tete/Zambezia corridor.',
      'INGD Ops',
      'Equipa de socorro às cheias do Zambeze destacada',
      'INGD Bravo e logística do PMA activadas para o corredor Tete/Zambézia.'],
    ['ev-009','inf-005','alert',
      'Buzi Bridge submerged — N6 blocked',
      'Bridge passable only by boat. 4,200 MT cargo stranded at Beira.',
      'Transport',
      'Ponte do Buzi submersa — N6 bloqueada',
      'Ponte transitável apenas de barco. 4.200 MT de carga retidas em Beira.'],
    ['ev-010','sc-001','status_change',
      'WFP food pipeline 8,200 MT activated',
      'Maputo central store release authorised. Distribution to 38 collection points.',
      'WFP',
      'Pipeline alimentar do PMA de 8.200 MT activado',
      'Libertação do armazém central de Maputo autorizada. Distribuição para 38 pontos de recolha.'],
  ].forEach(e => insertEvent.run(...e));

  // ── 8. MISSIONS (dedicated table) ─────────────────────────────────────────
  const insertMission = db.prepare(`INSERT OR IGNORE INTO missions (id,name,status,description,lead_org_id,weather_event_id,start_date,end_date,priority,name_pt,description_pt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  [
    ['mis-001','Operation Freddy Response 2023','completed','Full-scale national response to Cyclone Freddy. Covered evacuation, medical, water, and shelter.','org-001','we-001','2023-02-20','2023-04-15','CRITICAL',
      'Operação Resposta Freddy 2023','Resposta nacional de plena escala ao Ciclone Freddy. Cobriu evacuação, medicina, água e abrigo.'],
    ['mis-002','Zambezi Flood Relief 2024','active','Ongoing flood relief for Tete and Zambezia provinces. Dam monitoring + downstream evacuation.','org-001','we-003','2024-01-10',null,'HIGH',
      'Socorro às Cheias do Zambeze 2024','Socorro às cheias em curso para as províncias de Tete e Zambézia. Monitorização da barragem + evacuação a jusante.'],
    ['mis-003','Gaza Drought Response 2025','active','Food security and livelihood response for southern provinces. IPC4 escalation management.','org-003','we-004','2025-03-01',null,'HIGH',
      'Resposta à Seca em Gaza 2025','Resposta à segurança alimentar e subsistência para províncias do sul. Gestão da escalada IPC4.'],
    ['mis-004','TC Ana Emergency Ops 2022','completed','Emergency response to Cyclone Ana in Zambezia and Nampula.','org-001','we-002','2022-01-22','2022-03-10','HIGH',
      'Operações de Emergência TC Ana 2022','Resposta de emergência ao Ciclone Ana na Zambézia e Nampula.'],
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

// ── PHASE 3: National Knowledge Graph Extension ────────────────────────────────
function runPhase3Seed(db) {
  const insertObj  = db.prepare(`INSERT OR IGNORE INTO objects (id,type_id,name,status,severity,geo_lat,geo_lng,geo_polygon,properties) VALUES (?,?,?,?,?,?,?,?,?)`);
  const insertType = db.prepare(`INSERT OR IGNORE INTO object_types (id,name,label,icon,color,description,category) VALUES (?,?,?,?,?,?,?)`);
  const insertProp = db.prepare(`INSERT OR IGNORE INTO property_definitions (id,object_type_id,name,label,type,required,enum_values,unit) VALUES (?,?,?,?,?,0,?,?)`);
  const insertLT   = db.prepare(`INSERT OR IGNORE INTO link_types (id,name,label,inverse_label,from_type_id,to_type_id,color) VALUES (?,?,?,?,?,?,?)`);
  const insertLink = db.prepare(`INSERT OR IGNORE INTO links (id,link_type_id,from_object_id,to_object_id,metadata) VALUES (?,?,?,?,?)`);
  const insertAlert = db.prepare(`INSERT OR IGNORE INTO alerts (id,severity,title,description,object_id) VALUES (?,?,?,?,?)`);
  const insertEvent = db.prepare(`INSERT OR IGNORE INTO events (id,object_id,event_type,title,description,user_name) VALUES (?,?,?,?,?,?)`);
  const insertComment = db.prepare(`INSERT OR IGNORE INTO comments (id,object_id,user_name,content) VALUES (?,?,?,?)`);

  let lid = 200; // start after existing links
  const L = (type, from, to, meta={}) => {
    insertLink.run(`lnk-${String(lid++).padStart(3,'0')}`, type, from, to, JSON.stringify(meta));
  };

  // ── NEW OBJECT TYPES ───────────────────────────────────────────────────────
  [
    { id: 'ot-facility', name: 'HealthFacility',  label: 'Health Facility',   icon: '🏥', color: '#ff6b6b', description: 'Hospitals, clinics, health centres, treatment sites', category: 'infrastructure' },
    { id: 'ot-shelter',  name: 'Shelter',          label: 'Shelter / IDP Site',icon: '⛺', color: '#ffd93d', description: 'Displacement camps, emergency shelters, transit centres', category: 'response' },
    { id: 'ot-water',    name: 'WaterFacility',    label: 'Water Facility',    icon: '💧', color: '#74c0fc', description: 'Treatment plants, boreholes, pump stations, irrigation', category: 'infrastructure' },
    { id: 'ot-crop',     name: 'CropZone',         label: 'Crop / Agri Zone',  icon: '🌾', color: '#51cf66', description: 'Agricultural zones, crop production areas, irrigation schemes', category: 'livelihoods' },
    { id: 'ot-river',    name: 'River',             label: 'River / Waterway',  icon: '🌊', color: '#4dabf7', description: 'Rivers, waterways, flood plains', category: 'geography' },
    { id: 'ot-power',    name: 'PowerStation',      label: 'Power Station',     icon: '⚡', color: '#ffe066', description: 'Power generation, grid infrastructure, distribution hubs', category: 'infrastructure' },
    { id: 'ot-telecom',  name: 'TelecomTower',      label: 'Telecom / Network', icon: '📡', color: '#cc5de8', description: 'Mobile towers, communication networks, radio infrastructure', category: 'infrastructure' },
  ].forEach(t => insertType.run(t.id, t.name, t.label, t.icon, t.color, t.description, t.category));

  // ── NEW PROPERTY DEFINITIONS ───────────────────────────────────────────────
  [
    { id: 'pd-100', ot: 'ot-facility', name: 'facility_type', label: 'Facility Type', type: 'enum', ev: '["Hospital","Clinic","Health Centre","Treatment Site","Pharmacy"]' },
    { id: 'pd-101', ot: 'ot-facility', name: 'beds',          label: 'Bed Capacity',  type: 'number', unit: 'beds' },
    { id: 'pd-102', ot: 'ot-facility', name: 'province',      label: 'Province',      type: 'string' },
    { id: 'pd-103', ot: 'ot-facility', name: 'condition',     label: 'Condition',     type: 'enum', ev: '["Operational","Damaged","Destroyed","Overwhelmed","At-Risk"]' },
    { id: 'pd-104', ot: 'ot-facility', name: 'staff_count',   label: 'Staff Count',   type: 'number', unit: 'staff' },
    { id: 'pd-110', ot: 'ot-shelter',  name: 'capacity',      label: 'Capacity (persons)', type: 'number', unit: 'persons' },
    { id: 'pd-111', ot: 'ot-shelter',  name: 'occupancy',     label: 'Current Occupancy',  type: 'number', unit: 'persons' },
    { id: 'pd-112', ot: 'ot-shelter',  name: 'site_manager',  label: 'Site Manager',       type: 'string' },
    { id: 'pd-113', ot: 'ot-shelter',  name: 'shelter_type',  label: 'Shelter Type', type: 'enum', ev: '["IDP Camp","Transit Centre","Emergency Shelter","Collective Centre","Host Community"]' },
    { id: 'pd-120', ot: 'ot-water',    name: 'water_type',    label: 'Facility Type', type: 'enum', ev: '["Treatment Plant","Borehole","Pump Station","Irrigation","Reservoir"]' },
    { id: 'pd-121', ot: 'ot-water',    name: 'daily_capacity',label: 'Daily Capacity', type: 'number', unit: 'L/day' },
    { id: 'pd-122', ot: 'ot-water',    name: 'served_pop',    label: 'Population Served', type: 'number', unit: 'persons' },
    { id: 'pd-130', ot: 'ot-crop',     name: 'crop_type',     label: 'Primary Crop', type: 'enum', ev: '["Rice","Maize","Cashew","Cotton","Cassava","Sorghum","Mixed"]' },
    { id: 'pd-131', ot: 'ot-crop',     name: 'area_ha',       label: 'Area (hectares)', type: 'number', unit: 'ha' },
    { id: 'pd-132', ot: 'ot-crop',     name: 'production_mt', label: 'Annual Production (MT)', type: 'number', unit: 'MT' },
    { id: 'pd-133', ot: 'ot-crop',     name: 'harvest_status',label: 'Harvest Status', type: 'enum', ev: '["Normal","Reduced","Failed","At-Risk","Damaged"]' },
    { id: 'pd-140', ot: 'ot-river',    name: 'length_km',     label: 'Length (km)', type: 'number', unit: 'km' },
    { id: 'pd-141', ot: 'ot-river',    name: 'flow_m3s',      label: 'Current Flow (m³/s)', type: 'number', unit: 'm³/s' },
    { id: 'pd-142', ot: 'ot-river',    name: 'flood_stage',   label: 'Flood Stage', type: 'enum', ev: '["Normal","Watch","Warning","Major Flood","Extreme Flood"]' },
    { id: 'pd-150', ot: 'ot-power',    name: 'power_type',    label: 'Power Type', type: 'enum', ev: '["Hydropower","Thermal","Solar","Wind","Grid Distribution"]' },
    { id: 'pd-151', ot: 'ot-power',    name: 'capacity_mw',   label: 'Capacity (MW)', type: 'number', unit: 'MW' },
    { id: 'pd-152', ot: 'ot-power',    name: 'served_pop',    label: 'Population Served', type: 'number', unit: 'persons' },
    { id: 'pd-160', ot: 'ot-telecom',  name: 'network_type',  label: 'Network Type', type: 'enum', ev: '["Mobile 2G","Mobile 4G","Satellite","Radio","Fibre"]' },
    { id: 'pd-161', ot: 'ot-telecom',  name: 'coverage_pop',  label: 'Coverage (persons)', type: 'number', unit: 'persons' },
    { id: 'pd-162', ot: 'ot-telecom',  name: 'operator',      label: 'Operator', type: 'string' },
  ].forEach(p => insertProp.run(p.id, p.ot, p.name, p.label, p.type, p.ev || null, p.unit || null));

  // ── NEW LINK TYPES ─────────────────────────────────────────────────────────
  [
    { id: 'lt-serves',      name: 'serves',       label: 'Serves',       inv: 'served by',   from: null,          to: null,          color: '#74c0fc' },
    { id: 'lt-located-in',  name: 'located_in_area', label: 'Located In', inv: 'contains', from: null,          to: 'ot-area',     color: '#a9e34b' },
    { id: 'lt-depends-on',  name: 'depends_on',   label: 'Depends On',   inv: 'provides to', from: null,          to: null,          color: '#ffd43b' },
    { id: 'lt-contains',    name: 'contains',     label: 'Contains',     inv: 'part of',     from: 'ot-area',     to: 'ot-area',     color: '#dee2e6' },
    { id: 'lt-feeds-into',  name: 'feeds_into',   label: 'Feeds Into',   inv: 'fed by',      from: 'ot-crop',     to: 'ot-supply',   color: '#51cf66' },
    { id: 'lt-powered-by',  name: 'powered_by',   label: 'Powered By',   inv: 'powers',      from: null,          to: 'ot-power',    color: '#ffe066' },
    { id: 'lt-flows-through',name:'flows_through','label':'Flows Through',inv: 'drained by',  from: 'ot-river',    to: 'ot-area',     color: '#4dabf7' },
    { id: 'lt-disrupted-by',name: 'disrupted_by', label: 'Disrupted By', inv: 'disrupts',    from: null,          to: 'ot-weather',  color: '#ff6b6b' },
    { id: 'lt-crosses',     name: 'crosses',      label: 'Crosses',      inv: 'crossed by',  from: 'ot-infra',    to: 'ot-river',    color: '#74c0fc' },
    { id: 'lt-covers',      name: 'covers',       label: 'Provides Coverage In', inv: 'has coverage from', from: 'ot-telecom', to: 'ot-area', color: '#cc5de8' },
  ].forEach(l => insertLT.run(l.id, l.name, l.label, l.inv, l.from, l.to, l.color));

  // ── HISTORICAL CYCLONES ────────────────────────────────────────────────────
  // Cyclone Idai (March 2019) — worst natural disaster in Africa's recorded history
  insertObj.run('we-idai-2019','ot-weather','Cyclone Idai (March 2019)','resolved','CRITICAL',-19.83,34.84,null,
    JSON.stringify({ event_type:'Cyclone', wind_speed_kmh:195, rainfall_mm:590, landfall_date:'2019-03-14', source:'INAM/ECMWF/NASA',
      forecast_track:'Direct hit on Beira, second loop through Zambezia and Malawi',
      estimated_deaths:1007, total_affected:1850000, economic_loss_usd:2000000000,
      category:'Category 3-4 (Intense Tropical Cyclone)', peak_intensity:'14 March 2019 03:00 UTC' }));

  // Cyclone Kenneth (April 2019) — strongest cyclone to ever hit mainland Africa at that time
  insertObj.run('we-kenneth-2019','ot-weather','Cyclone Kenneth (April 2019)','resolved','CRITICAL',-12.13,40.45,null,
    JSON.stringify({ event_type:'Cyclone', wind_speed_kmh:220, rainfall_mm:400, landfall_date:'2019-04-25', source:'INAM/ECMWF',
      forecast_track:'Landfall Cabo Delgado near Macomia/Mocímboa da Praia',
      estimated_deaths:45, total_affected:350000, economic_loss_usd:500000000,
      category:'Category 4 (Very Intense Tropical Cyclone)', peak_intensity:'25 April 2019' }));

  // Cyclone Dineo (2017) — Gaza Province
  insertObj.run('we-dineo-2017','ot-weather','Cyclone Dineo (Feb 2017)','resolved','HIGH',-23.5,35.2,null,
    JSON.stringify({ event_type:'Cyclone', wind_speed_kmh:155, rainfall_mm:280, landfall_date:'2017-02-15', source:'INAM',
      forecast_track:'Inhambane landfall, Gaza flooding', estimated_deaths:7, total_affected:280000 }));

  // ── ADDITIONAL PROVINCES ───────────────────────────────────────────────────
  [
    { id:'aa-012', name:'Niassa Province',   status:'active', severity:'LOW',    lat:-12.50, lng:35.00, props:{ affected_people:42000,  displaced:3000,  admin_level:'Province', population:1632527, vulnerability_idx:5.2 } },
    { id:'aa-013', name:'Maputo Province',   status:'active', severity:'MEDIUM', lat:-26.0,  lng:32.7,  props:{ affected_people:85000,  displaced:8000,  admin_level:'Province', population:1823601, vulnerability_idx:5.8 } },
    { id:'aa-014', name:'Maputo City',       status:'active', severity:'LOW',    lat:-25.97, lng:32.58, props:{ affected_people:25000,  displaced:1500,  admin_level:'City',     population:1766184, vulnerability_idx:4.5 } },
  ].forEach(a => insertObj.run(a.id,'ot-area',a.name,a.status,a.severity,a.lat,a.lng,null,JSON.stringify(a.props)));

  // ── DISTRICTS ─────────────────────────────────────────────────────────────
  const districts = [
    // Sofala Province
    { id:'aa-d01', name:'Dondo District (Sofala)',        status:'critical',  severity:'HIGH',     lat:-19.61, lng:34.74, props:{ affected_people:38000, displaced:8200, admin_level:'District', population:118000, vulnerability_idx:8.7, province:'Sofala' } },
    { id:'aa-d02', name:'Nhamatanda District (Sofala)',   status:'critical',  severity:'CRITICAL', lat:-19.07, lng:34.46, props:{ affected_people:62000, displaced:14000, admin_level:'District', population:183000, vulnerability_idx:9.2, province:'Sofala' } },
    { id:'aa-d03', name:'Buzi District (Sofala)',         status:'critical',  severity:'CRITICAL', lat:-19.83, lng:34.89, props:{ affected_people:44000, displaced:9800, admin_level:'District', population:157000, vulnerability_idx:9.5, province:'Sofala' } },
    { id:'aa-d04', name:'Chibabava District (Sofala)',    status:'active',    severity:'HIGH',     lat:-20.42, lng:34.13, props:{ affected_people:28000, displaced:4200, admin_level:'District', population:115000, vulnerability_idx:7.9, province:'Sofala' } },
    { id:'aa-d05', name:'Gorongosa District (Sofala)',    status:'active',    severity:'MEDIUM',   lat:-18.67, lng:34.13, props:{ affected_people:18000, displaced:2100, admin_level:'District', population:232000, vulnerability_idx:6.8, province:'Sofala' } },
    // Tete Province
    { id:'aa-d06', name:'Mutarara District (Tete)',       status:'active',    severity:'HIGH',     lat:-17.02, lng:35.25, props:{ affected_people:45000, displaced:7400, admin_level:'District', population:212000, vulnerability_idx:8.3, province:'Tete' } },
    { id:'aa-d07', name:'Zumbo District (Tete)',          status:'active',    severity:'MEDIUM',   lat:-15.62, lng:30.43, props:{ affected_people:12000, displaced:1800, admin_level:'District', population:67000, vulnerability_idx:6.5, province:'Tete' } },
    { id:'aa-d08', name:'Changara District (Tete)',       status:'active',    severity:'HIGH',     lat:-16.26, lng:33.20, props:{ affected_people:31000, displaced:4200, admin_level:'District', population:146000, vulnerability_idx:7.6, province:'Tete' } },
    // Zambezia Province
    { id:'aa-d09', name:'Mopeia District (Zambezia)',     status:'active',    severity:'HIGH',     lat:-18.06, lng:35.72, props:{ affected_people:52000, displaced:8800, admin_level:'District', population:157000, vulnerability_idx:8.6, province:'Zambezia' } },
    { id:'aa-d10', name:'Chinde District (Zambezia)',     status:'active',    severity:'HIGH',     lat:-18.56, lng:36.45, props:{ affected_people:29000, displaced:3900, admin_level:'District', population:103000, vulnerability_idx:7.8, province:'Zambezia' } },
    { id:'aa-d11', name:'Mocuba District (Zambezia)',     status:'active',    severity:'MEDIUM',   lat:-16.84, lng:36.99, props:{ affected_people:37000, displaced:4100, admin_level:'District', population:296000, vulnerability_idx:7.1, province:'Zambezia' } },
    // Gaza Province
    { id:'aa-d12', name:'Mabalane District (Gaza)',       status:'active',    severity:'HIGH',     lat:-23.46, lng:32.55, props:{ affected_people:24000, displaced:3100, admin_level:'District', population:72000, vulnerability_idx:8.2, province:'Gaza' } },
    { id:'aa-d13', name:'Guijá District (Gaza)',          status:'active',    severity:'MEDIUM',   lat:-24.52, lng:33.19, props:{ affected_people:19000, displaced:2300, admin_level:'District', population:94000, vulnerability_idx:7.4, province:'Gaza' } },
    // Inhambane Province
    { id:'aa-d14', name:'Vilankulo District (Inhambane)', status:'active',    severity:'MEDIUM',   lat:-22.00, lng:35.30, props:{ affected_people:22000, displaced:2100, admin_level:'District', population:183000, vulnerability_idx:6.3, province:'Inhambane' } },
    { id:'aa-d15', name:'Jangamo District (Inhambane)',   status:'active',    severity:'MEDIUM',   lat:-23.76, lng:35.45, props:{ affected_people:15000, displaced:1200, admin_level:'District', population:95000, vulnerability_idx:6.1, province:'Inhambane' } },
    // Cabo Delgado
    { id:'aa-d16', name:'Pemba District (Cabo Delgado)',  status:'active',    severity:'HIGH',     lat:-12.97, lng:40.52, props:{ affected_people:32000, displaced:12000, admin_level:'District', population:188000, vulnerability_idx:7.8, province:'Cabo Delgado' } },
    { id:'aa-d17', name:'Montepuez District (Cabo Delgado)',status:'active',  severity:'MEDIUM',   lat:-13.11, lng:39.01, props:{ affected_people:21000, displaced:6400, admin_level:'District', population:204000, vulnerability_idx:7.2, province:'Cabo Delgado' } },
  ];
  districts.forEach(a => insertObj.run(a.id,'ot-area',a.name,a.status,a.severity,a.lat,a.lng,null,JSON.stringify(a.props)));

  // ── RIVERS ─────────────────────────────────────────────────────────────────
  const rivers = [
    { id:'rv-001', name:'Zambezi River',  status:'critical', severity:'CRITICAL', lat:-16.16, lng:33.59, props:{ length_km:2574, flow_m3s:2400, flood_stage:'Warning', source:'HCB monitoring + INAM', basin_area_km2:1390000, countries:'Angola/Zambia/Zimbabwe/Mozambique' } },
    { id:'rv-002', name:'Pungwe River',   status:'active',   severity:'HIGH',     lat:-19.50, lng:34.30, props:{ length_km:400, flow_m3s:450, flood_stage:'Watch', source:'ANGRH field', basin_area_km2:29000 } },
    { id:'rv-003', name:'Buzi River',     status:'critical', severity:'HIGH',     lat:-19.83, lng:34.90, props:{ length_km:320, flow_m3s:320, flood_stage:'Warning', source:'ANGRH field', basin_area_km2:28000, note:'Buzi bridge crossing submerged — critical logistics blockage' } },
    { id:'rv-004', name:'Limpopo River',  status:'active',   severity:'MEDIUM',   lat:-24.52, lng:32.95, props:{ length_km:1750, flow_m3s:180, flood_stage:'Watch', source:'ANGRH field', basin_area_km2:415000 } },
    { id:'rv-005', name:'Save River',     status:'active',   severity:'MEDIUM',   lat:-21.20, lng:35.00, props:{ length_km:740, flow_m3s:85, flood_stage:'Normal', source:'ANGRH field', basin_area_km2:106000 } },
    { id:'rv-006', name:'Lugenda River',  status:'active',   severity:'LOW',      lat:-12.80, lng:38.00, props:{ length_km:540, flow_m3s:60, flood_stage:'Normal', source:'ANGRH field', basin_area_km2:70000 } },
    { id:'rv-007', name:'Rovuma River',   status:'active',   severity:'LOW',      lat:-10.48, lng:40.00, props:{ length_km:820, flow_m3s:400, flood_stage:'Normal', source:'ANGRH field', note:'Border river Tanzania/Mozambique' } },
  ];
  rivers.forEach(r => insertObj.run(r.id,'ot-river',r.name,r.status,r.severity,r.lat,r.lng,null,JSON.stringify(r.props)));

  // ── HEALTH FACILITIES ──────────────────────────────────────────────────────
  const facilities = [
    { id:'fac-001', name:'Beira Central Hospital',         status:'active',   severity:'HIGH',     lat:-19.83, lng:34.84, props:{ facility_type:'Hospital', beds:500, province:'Sofala',     condition:'Overwhelmed', staff_count:420, note:'Primary referral centre for central Mozambique; cholera ward at 180% capacity' } },
    { id:'fac-002', name:'Quelimane Central Hospital',     status:'active',   severity:'MEDIUM',   lat:-17.88, lng:36.89, props:{ facility_type:'Hospital', beds:280, province:'Zambezia',   condition:'Operational', staff_count:240 } },
    { id:'fac-003', name:'Tete Provincial Hospital',       status:'active',   severity:'HIGH',     lat:-16.16, lng:33.59, props:{ facility_type:'Hospital', beds:320, province:'Tete',        condition:'At-Risk', staff_count:280, note:'Flood pulse from Cahora Bassa threatens ground-floor wards' } },
    { id:'fac-004', name:'Xai-Xai Provincial Hospital',   status:'active',   severity:'MEDIUM',   lat:-25.05, lng:33.64, props:{ facility_type:'Hospital', beds:380, province:'Gaza',        condition:'Operational', staff_count:310, note:'SAM/MAM treatment centre for southern drought zone' } },
    { id:'fac-005', name:'Nampula Central Hospital',       status:'active',   severity:'LOW',      lat:-15.12, lng:39.27, props:{ facility_type:'Hospital', beds:600, province:'Nampula',     condition:'Operational', staff_count:520 } },
    { id:'fac-006', name:'Chimoio Provincial Hospital',   status:'active',   severity:'LOW',      lat:-19.11, lng:33.47, props:{ facility_type:'Hospital', beds:240, province:'Manica',      condition:'Operational', staff_count:200 } },
    { id:'fac-007', name:'MSF Emergency Treatment Centre Beira', status:'active', severity:'CRITICAL', lat:-19.82, lng:34.83, props:{ facility_type:'Treatment Site', beds:120, province:'Sofala', condition:'Overwhelmed', staff_count:85, note:'MSF cholera CTC; CFR 1.77% — approaching emergency threshold' } },
    { id:'fac-008', name:'Dondo Rural Hospital',          status:'active',   severity:'HIGH',     lat:-19.61, lng:34.74, props:{ facility_type:'Hospital', beds:80, province:'Sofala',     condition:'Damaged', staff_count:62, note:'Roof damage from Freddy; emergency repairs underway' } },
    { id:'fac-009', name:'Chokwé District Hospital',      status:'active',   severity:'HIGH',     lat:-24.52, lng:32.95, props:{ facility_type:'Hospital', beds:120, province:'Gaza',       condition:'Operational', staff_count:98, note:'Serving SAM/MAM cases; RUTF stockpile at 20 days' } },
    { id:'fac-010', name:'Mutarara Rural Hospital',       status:'active',   severity:'MEDIUM',   lat:-17.02, lng:35.25, props:{ facility_type:'Hospital', beds:60, province:'Tete',       condition:'At-Risk', staff_count:45 } },
    { id:'fac-011', name:'Buzi Health Centre',            status:'active',   severity:'CRITICAL', lat:-19.83, lng:34.90, props:{ facility_type:'Health Centre', beds:20, province:'Sofala', condition:'Damaged', staff_count:18, note:'Access road flooded; patient transfer to Beira required' } },
    { id:'fac-012', name:'Nhamatanda Health Centre',      status:'active',   severity:'HIGH',     lat:-19.07, lng:34.46, props:{ facility_type:'Health Centre', beds:18, province:'Sofala', condition:'At-Risk', staff_count:15 } },
    { id:'fac-013', name:'Mopeia Health Centre',          status:'active',   severity:'MEDIUM',   lat:-18.06, lng:35.72, props:{ facility_type:'Health Centre', beds:22, province:'Zambezia', condition:'Operational', staff_count:16 } },
    { id:'fac-014', name:'Pemba Referral Hospital',       status:'active',   severity:'HIGH',     lat:-12.97, lng:40.52, props:{ facility_type:'Hospital', beds:200, province:'Cabo Delgado', condition:'Operational', staff_count:168, note:'Only hospital within 300km post-Kenneth; chronic supply shortage' } },
    { id:'fac-015', name:'Mocuba District Hospital',      status:'active',   severity:'MEDIUM',   lat:-16.84, lng:36.99, props:{ facility_type:'Hospital', beds:90, province:'Zambezia', condition:'Operational', staff_count:72 } },
  ];
  facilities.forEach(f => insertObj.run(f.id,'ot-facility',f.name,f.status,f.severity,f.lat,f.lng,null,JSON.stringify(f.props)));

  // ── SHELTERS / IDP SITES ───────────────────────────────────────────────────
  const shelters = [
    { id:'sh-001', name:'Praia Nova IDP Camp — Beira',         status:'critical', severity:'HIGH',     lat:-19.80, lng:34.86, props:{ shelter_type:'IDP Camp', capacity:8000, occupancy:12400, site_manager:'INGD/UNHCR', province:'Sofala', note:'Over capacity — 155% utilisation; Cyclone Idai origin site' } },
    { id:'sh-002', name:'Dondo Transit Centre',                 status:'active',   severity:'HIGH',     lat:-19.61, lng:34.74, props:{ shelter_type:'Transit Centre', capacity:3500, occupancy:4100, site_manager:'INGD', province:'Sofala' } },
    { id:'sh-003', name:'Buzi Displacement Site',               status:'active',   severity:'HIGH',     lat:-19.83, lng:34.89, props:{ shelter_type:'Emergency Shelter', capacity:2200, occupancy:3800, site_manager:'INGD/CVM', province:'Sofala' } },
    { id:'sh-004', name:'Nhamatanda IDP Site',                  status:'active',   severity:'MEDIUM',   lat:-19.07, lng:34.46, props:{ shelter_type:'IDP Camp', capacity:2800, occupancy:2100, site_manager:'INGD', province:'Sofala' } },
    { id:'sh-005', name:'Chibuto Shelter (Gaza)',               status:'active',   severity:'MEDIUM',   lat:-24.69, lng:33.54, props:{ shelter_type:'Collective Centre', capacity:1800, occupancy:2100, site_manager:'INGD', province:'Gaza' } },
    { id:'sh-006', name:'Chokwé Emergency Shelter',             status:'critical', severity:'HIGH',     lat:-24.52, lng:32.95, props:{ shelter_type:'Emergency Shelter', capacity:3200, occupancy:4800, site_manager:'INGD/UNHCR', province:'Gaza', note:'Flood event; dyke breach displacement ongoing' } },
    { id:'sh-007', name:'Tete City Emergency Shelter',          status:'active',   severity:'MEDIUM',   lat:-16.18, lng:33.60, props:{ shelter_type:'Emergency Shelter', capacity:2000, occupancy:1200, site_manager:'INGD', province:'Tete', note:'Pre-positioned for Cahora Bassa flood pulse' } },
    { id:'sh-008', name:'Mutarara Displacement Camp',           status:'active',   severity:'MEDIUM',   lat:-17.02, lng:35.25, props:{ shelter_type:'IDP Camp', capacity:1500, occupancy:1800, site_manager:'INGD', province:'Tete' } },
    { id:'sh-009', name:'Quelimane Transit Centre',             status:'active',   severity:'LOW',      lat:-17.88, lng:36.89, props:{ shelter_type:'Transit Centre', capacity:1200, occupancy:400, site_manager:'INGD', province:'Zambezia' } },
    { id:'sh-010', name:'Mopeia IDP Site',                      status:'active',   severity:'HIGH',     lat:-18.06, lng:35.72, props:{ shelter_type:'IDP Camp', capacity:3000, occupancy:3600, site_manager:'INGD/UNHCR', province:'Zambezia' } },
    { id:'sh-011', name:'Pemba IDP Camp (Cabo Delgado)',        status:'active',   severity:'HIGH',     lat:-12.96, lng:40.51, props:{ shelter_type:'IDP Camp', capacity:15000, occupancy:18400, site_manager:'INGD/IOM', province:'Cabo Delgado', note:'Conflict + cyclone-displaced; chronic overcrowding' } },
    { id:'sh-012', name:'Montepuez Shelter (Cabo Delgado)',     status:'active',   severity:'MEDIUM',   lat:-13.11, lng:39.01, props:{ shelter_type:'Collective Centre', capacity:4200, occupancy:5100, site_manager:'INGD/IOM', province:'Cabo Delgado' } },
  ];
  shelters.forEach(s => insertObj.run(s.id,'ot-shelter',s.name,s.status,s.severity,s.lat,s.lng,null,JSON.stringify(s.props)));

  // ── WATER FACILITIES ───────────────────────────────────────────────────────
  const water = [
    { id:'wf-001', name:'Beira Water Treatment Plant',         status:'active',   severity:'HIGH',   lat:-19.82, lng:34.83, props:{ water_type:'Treatment Plant', daily_capacity:60000000, served_pop:592000, province:'Sofala', condition:'Damaged — partial operations', note:'Pumping station flooded; backup generators active' } },
    { id:'wf-002', name:'Quelimane Water Authority',           status:'active',   severity:'LOW',    lat:-17.88, lng:36.89, props:{ water_type:'Treatment Plant', daily_capacity:25000000, served_pop:350000, province:'Zambezia', condition:'Operational' } },
    { id:'wf-003', name:'Tete City Water Treatment',          status:'active',   severity:'HIGH',   lat:-16.18, lng:33.60, props:{ water_type:'Treatment Plant', daily_capacity:18000000, served_pop:220000, province:'Tete', condition:'At-Risk', note:'Intake at risk from Zambezi flood pulse arrival in 31h' } },
    { id:'wf-004', name:'Xai-Xai Water Treatment',           status:'active',   severity:'MEDIUM', lat:-25.05, lng:33.64, props:{ water_type:'Treatment Plant', daily_capacity:15000000, served_pop:120000, province:'Gaza', condition:'Operational' } },
    { id:'wf-005', name:'Chokwé Irrigation Network',          status:'critical', severity:'HIGH',   lat:-24.52, lng:32.95, props:{ water_type:'Irrigation', daily_capacity:180000000, served_pop:230000, province:'Gaza', condition:'Damaged — 78% submerged', note:'Gaza rice paddies 78% submerged by Limpopo flood' } },
    { id:'wf-006', name:'Dondo Rural Borehole Cluster',       status:'critical', severity:'CRITICAL',lat:-19.61,lng:34.74, props:{ water_type:'Borehole', daily_capacity:500000, served_pop:38000, province:'Sofala', condition:'Contaminated', note:'Floodwater intrusion; cholera vector risk — ORS distribution priority' } },
    { id:'wf-007', name:'Gaza Rural Borehole Network',        status:'active',   severity:'HIGH',   lat:-23.12, lng:33.02, props:{ water_type:'Borehole', daily_capacity:2000000, served_pop:180000, province:'Gaza', condition:'Operational — low yield', note:'Drought reducing water table by 3m/year' } },
    { id:'wf-008', name:'Mopeia Borehole Field',              status:'active',   severity:'MEDIUM', lat:-18.06, lng:35.72, props:{ water_type:'Borehole', daily_capacity:800000, served_pop:52000, province:'Zambezia', condition:'Operational' } },
  ];
  water.forEach(w => insertObj.run(w.id,'ot-water',w.name,w.status,w.severity,w.lat,w.lng,null,JSON.stringify(w.props)));

  // ── POWER STATIONS ─────────────────────────────────────────────────────────
  const power = [
    { id:'pw-001', name:'HCB — Cahora Bassa Hydropower',   status:'critical', severity:'CRITICAL', lat:-15.60, lng:32.70, props:{ power_type:'Hydropower', capacity_mw:2075, served_pop:15000000, condition:'At-Risk — 98.4% reservoir', note:'Elevated discharge 2,400 m³/s; forced release imminent' } },
    { id:'pw-002', name:'Beira Power Distribution Hub',    status:'active',   severity:'HIGH',     lat:-19.82, lng:34.84, props:{ power_type:'Grid Distribution', capacity_mw:180, served_pop:600000, condition:'Intermittent — storm damage', note:'Cyclone Freddy damaged 4 of 7 feeder lines; hospital on backup generator' } },
    { id:'pw-003', name:'Maputo Thermal Power Plant',      status:'active',   severity:'LOW',      lat:-25.90, lng:32.61, props:{ power_type:'Thermal', capacity_mw:104, served_pop:2000000, condition:'Operational' } },
    { id:'pw-004', name:'Moatize Coal Power Plant',        status:'active',   severity:'MEDIUM',   lat:-16.10, lng:33.75, props:{ power_type:'Thermal', capacity_mw:300, served_pop:1500000, condition:'At-Risk — Zambezi flood', note:'Transmission lines cross Zambezi flood plain' } },
  ];
  power.forEach(p => insertObj.run(p.id,'ot-power',p.name,p.status,p.severity,p.lat,p.lng,null,JSON.stringify(p.props)));

  // ── TELECOM INFRASTRUCTURE ─────────────────────────────────────────────────
  const telecom = [
    { id:'tc-001', name:'Vodacom Network — Central Mozambique', status:'active',   severity:'HIGH',   lat:-19.83, lng:34.84, props:{ network_type:'Mobile 4G', coverage_pop:3800000, operator:'Vodacom Mozambique', condition:'Degraded — 28% base stations offline post-Freddy' } },
    { id:'tc-002', name:'mCel Network — Northern Mozambique',   status:'active',   severity:'MEDIUM', lat:-15.10, lng:39.00, props:{ network_type:'Mobile 4G', coverage_pop:4200000, operator:'mCel', condition:'Operational' } },
    { id:'tc-003', name:'INGD Emergency Radio Network',         status:'active',   severity:'LOW',    lat:-25.97, lng:32.58, props:{ network_type:'Radio', coverage_pop:2000000, operator:'INGD', condition:'Operational', note:'VHF/HF network for field coordination — operates independently of grid' } },
    { id:'tc-004', name:'VSAT Satellite Link — Beira Hub',      status:'active',   severity:'LOW',    lat:-19.83, lng:34.84, props:{ network_type:'Satellite', coverage_pop:500000, operator:'OCHA/WFP', condition:'Operational', note:'Primary data link for humanitarian coordination when mobile network fails' } },
  ];
  telecom.forEach(t => insertObj.run(t.id,'ot-telecom',t.name,t.status,t.severity,t.lat,t.lng,null,JSON.stringify(t.props)));

  // ── ADDITIONAL INFRASTRUCTURE ──────────────────────────────────────────────
  [
    { id:'inf-009', name:'Nacala Corridor Railway',         status:'active', severity:'LOW',    lat:-14.54, lng:40.67, props:{ infra_type:'Road', condition:'Operational', capacity_info:'Alternate cargo corridor — 8,400 MT capacity. Currently recommended for Beira rerouting' } },
    { id:'inf-010', name:'EN6 Beira–Tete Highway',          status:'critical', severity:'HIGH', lat:-19.50, lng:34.50, props:{ infra_type:'Road', condition:'Damaged', capacity_info:'Primary central corridor. Km 214 submerged at Buzi crossing — 4,200 MT stranded' } },
    { id:'inf-011', name:'Sena Bridge (Zambezi)',           status:'active',   severity:'HIGH', lat:-17.98, lng:35.38, props:{ infra_type:'Bridge', condition:'At-Risk', capacity_info:'Main Zambezi road crossing for Tete freight. River at 142% seasonal norm.' } },
    { id:'inf-012', name:'Maputo–Johannesburg Rail Link',   status:'active',   severity:'LOW',  lat:-26.00, lng:32.30, props:{ infra_type:'Road', condition:'Operational', capacity_info:'Import route from South Africa. 12,000 MT monthly humanitarian transit' } },
    { id:'inf-013', name:'Pemba Airport (Cabo Delgado)',    status:'active',   severity:'MEDIUM',lat:-12.99,lng:40.52, props:{ infra_type:'Airport', condition:'Operational', capacity_info:'Primary humanitarian air bridge for northern Mozambique; Kenneth reconstruction hub' } },
    { id:'inf-014', name:'Lichinga Airport (Niassa)',       status:'active',   severity:'LOW',  lat:-13.27, lng:35.27, props:{ infra_type:'Airport', condition:'Operational', capacity_info:'Remote airstrip; minimal cargo capacity — 3 MT/flight' } },
  ].forEach(i => insertObj.run(i.id,'ot-infra',i.name,i.status,i.severity,i.lat,i.lng,null,JSON.stringify(i.props)));

  // ── CROP ZONES ─────────────────────────────────────────────────────────────
  const crops = [
    { id:'cr-001', name:'Gaza Floodplain Rice Zone',       status:'critical', severity:'HIGH',   lat:-23.50, lng:33.20, props:{ crop_type:'Rice', area_ha:45000, production_mt:85000, harvest_status:'Damaged', province:'Gaza', note:'78% submerged by Limpopo flooding; $42M estimated crop loss' } },
    { id:'cr-002', name:'Chokwé Irrigation Scheme',        status:'critical', severity:'HIGH',   lat:-24.52, lng:32.95, props:{ crop_type:'Rice', area_ha:28000, production_mt:54000, harvest_status:'Failed', province:'Gaza', note:'Irrigation canal infrastructure destroyed; 3rd consecutive failure' } },
    { id:'cr-003', name:'Zambezia Cashew Belt',            status:'active',   severity:'MEDIUM', lat:-17.00, lng:37.00, props:{ crop_type:'Cashew', area_ha:120000, production_mt:80000, harvest_status:'Reduced', province:'Zambezia', note:'Zambezia floods damaged 35% of cashew groves — $18M export loss projected' } },
    { id:'cr-004', name:'Manica Maize Belt',               status:'active',   severity:'LOW',    lat:-19.10, lng:33.45, props:{ crop_type:'Maize', area_ha:85000, production_mt:145000, harvest_status:'Normal', province:'Manica', note:'Above-average production this season — buffer stock opportunity' } },
    { id:'cr-005', name:'Inhambane Cashew Zone',           status:'active',   severity:'HIGH',   lat:-23.86, lng:35.38, props:{ crop_type:'Cashew', area_ha:65000, production_mt:32000, harvest_status:'Failed', province:'Inhambane', note:'Drought: 3rd consecutive failure. IPC4 escalation risk factor.' } },
    { id:'cr-006', name:'Tete Cotton and Sesame Zone',     status:'active',   severity:'MEDIUM', lat:-16.50, lng:33.50, props:{ crop_type:'Cotton', area_ha:38000, production_mt:28000, harvest_status:'Reduced', province:'Tete', note:'Zambezi flood inundation of 22% of growing area' } },
  ];
  crops.forEach(c => insertObj.run(c.id,'ot-crop',c.name,c.status,c.severity,c.lat,c.lng,null,JSON.stringify(c.props)));

  // ── ADDITIONAL ORGANISATIONS ────────────────────────────────────────────────
  [
    { id:'org-011', name:'MISAU (Ministry of Health)',   status:'active', lat:-25.97, lng:32.58, props:{ org_type:'Government', mandate:'National health sector leadership, disease surveillance, HMIS', contact:'misau@gov.mz' } },
    { id:'org-012', name:'FEWS NET Mozambique',          status:'active', lat:-25.97, lng:32.58, props:{ org_type:'UN', mandate:'Famine early warning, IPC analysis, food security monitoring', contact:'fewsnet.moz@fews.net' } },
    { id:'org-013', name:'IOM Mozambique',               status:'active', lat:-25.97, lng:32.58, props:{ org_type:'UN', mandate:'Migration and displacement, DTM monitoring, shelter', contact:'iom.maputo@iom.int' } },
    { id:'org-014', name:'UNHCR Mozambique',             status:'active', lat:-25.97, lng:32.58, props:{ org_type:'UN', mandate:'Refugee protection, NFI distribution, IDP camp management', contact:'unhcr.moz@unhcr.org' } },
    { id:'org-015', name:'World Bank / IDA',             status:'active', lat:-25.97, lng:32.58, props:{ org_type:'Donor', mandate:'Development financing, reconstruction grants, CAT DDO instruments', contact:'wbmz@worldbank.org' } },
    { id:'org-016', name:'ANGRH (Water Authority)',      status:'active', lat:-25.97, lng:32.58, props:{ org_type:'Government', mandate:'National water resources management, river monitoring, dam safety', contact:'angrh@gov.mz' } },
    { id:'org-017', name:'HCB (Hidroeléctrica Cahora Bassa)', status:'active', lat:-15.60, lng:32.70, props:{ org_type:'Government', mandate:'Cahora Bassa dam operations, hydropower generation, controlled release', contact:'hcb@hcb.co.mz' } },
  ].forEach(o => insertObj.run(o.id,'ot-org',o.name,o.status,null,o.lat,o.lng,null,JSON.stringify(o.props)));

  // ── ADDITIONAL MISSIONS ────────────────────────────────────────────────────
  // Insert as objects (for graph links) AND in missions table
  const insertMission2 = db.prepare(`INSERT OR IGNORE INTO missions (id,name,status,description,lead_org_id,weather_event_id,start_date,end_date,priority) VALUES (?,?,?,?,?,?,?,?,?)`);
  const phase3Missions = [
    { id:'mis-005', name:'Operation Idai Reconstruction 2019-2022', status:'completed', lat:-19.83, lng:34.84, props:{ start_date:'2019-03-15', end_date:'2022-06-30', lead_org:'INGD', priority:'CRITICAL' },
      mArgs:['mis-005','Operation Idai Reconstruction 2019-2022','completed','Full reconstruction programme post-Cyclone Idai. Covered housing, infrastructure, health system rebuild.','org-001','we-idai-2019','2019-03-15','2022-06-30','CRITICAL'] },
    { id:'mis-006', name:'Operation Kenneth Recovery 2019', status:'completed', lat:-12.97, lng:40.52, props:{ start_date:'2019-04-26', end_date:'2020-06-30', lead_org:'INGD', priority:'CRITICAL' },
      mArgs:['mis-006','Operation Kenneth Recovery 2019','completed','Emergency response and early recovery for Cyclone Kenneth — Cabo Delgado Province.','org-001','we-kenneth-2019','2019-04-26','2020-06-30','CRITICAL'] },
    { id:'mis-007', name:'Cahora Bassa Flood Preparedness 2026', status:'active', lat:-16.16, lng:33.59, props:{ start_date:'2026-05-01', end_date:null, lead_org:'INGD', priority:'CRITICAL' },
      mArgs:['mis-007','Cahora Bassa Flood Preparedness 2026','active','Pre-positioning resources and evacuation planning for expected Zambezi flood pulse.','org-001','we-003','2026-05-01',null,'CRITICAL'] },
    { id:'mis-008', name:'Southern Drought Food Pipeline 2026', status:'active', lat:-23.12, lng:33.02, props:{ start_date:'2026-05-15', end_date:null, lead_org:'WFP', priority:'HIGH' },
      mArgs:['mis-008','Southern Drought Food Pipeline 2026','active','Activate WFP IRA for Gaza/Inhambane food pipeline. Target 280,000 beneficiaries.','org-003','we-004','2026-05-15',null,'HIGH'] },
  ];
  phase3Missions.forEach(m => {
    insertObj.run(m.id,'ot-mission',m.name,m.status,null,m.lat,m.lng,null,JSON.stringify(m.props));
    insertMission2.run(...m.mArgs);
  });

  // ── PHASE 3 LINKS ──────────────────────────────────────────────────────────

  // Cyclone Idai impacts
  L('lt-impacts','we-idai-2019','aa-002',{note:'Direct Cat 4 landfall, Beira. 100% of city affected. 150,000 homes destroyed.'});
  L('lt-impacts','we-idai-2019','aa-007',{note:'Wind and rainfall. Manica border areas severely hit.'});
  L('lt-impacts','we-idai-2019','aa-003',{note:'Second loop, heavy rainfall across Zambezia.'});
  L('lt-impacts','we-idai-2019','aa-004',{note:'Downstream Zambezi flooding amplified by Idai rainfall.'});
  L('lt-impacts','we-idai-2019','aa-d01',{note:'Dondo severely flooded; access cut for 5 days.'});
  L('lt-impacts','we-idai-2019','aa-d02',{note:'Nhamatanda: highest death toll per km² in Sofala.'});
  L('lt-impacts','we-idai-2019','aa-d03',{note:'Buzi district: 90% of structures damaged or destroyed.'});
  L('lt-threatens','we-idai-2019','inf-003',{note:'Beira Airport: 10 cm of standing water on runway. Closed 36h.'});
  L('lt-threatens','we-idai-2019','inf-005',{note:'Buzi Bridge: first submergence event during Idai.'});
  L('lt-threatens','we-idai-2019','fac-001',{note:'Beira Central Hospital roof partially destroyed; generators failed 4h.'});
  L('lt-threatens','we-idai-2019','fac-008',{note:'Dondo Hospital: roof collapse in admin wing.'});
  L('lt-threatens','we-idai-2019','fac-011',{note:'Buzi Health Centre: completely flooded; evacuated.'});
  L('lt-exacerbates','we-idai-2019','hr-001',{note:'14,000 cholera cases post-Idai. WASH infrastructure destroyed across Beira.'});
  L('lt-threatens','we-idai-2019','pw-002',{note:'Beira distribution hub: 4 of 7 feeder lines destroyed. City in darkness 6 days.'});
  L('lt-threatens','we-idai-2019','wf-001',{note:'Beira water plant: pumping station flooded; 600,000 without safe water.'});
  L('lt-threatens','we-idai-2019','tc-001',{note:'Vodacom: 62% base stations offline. Communications blackout 72h.'});
  L('lt-threatens','we-idai-2019','rv-003',{note:'Buzi River: record flood stage — 14m above normal.'});
  L('lt-threatens','we-idai-2019','rv-002',{note:'Pungwe River: burst banks near Beira city limits.'});
  L('lt-disrupted-by','cr-002','we-idai-2019',{note:'Chokwé scheme: initial Idai flooding marked start of multi-year crisis.'});
  L('lt-disrupted-by','sh-001','we-idai-2019',{note:'Praia Nova IDP camp established in response to Idai; still active 7 years later.'});

  // Cyclone Kenneth impacts
  L('lt-impacts','we-kenneth-2019','aa-011',{note:'Direct Cat 4 landfall Cabo Delgado. Strongest cyclone ever to hit African mainland at landfall.'});
  L('lt-impacts','we-kenneth-2019','aa-d16',{note:'Pemba district: 45,000 homes damaged; full infrastructure collapse.'});
  L('lt-impacts','we-kenneth-2019','aa-d17',{note:'Montepuez: extreme rainfall; rivers flooded.'});
  L('lt-threatens','we-kenneth-2019','inf-013',{note:'Pemba Airport closed 48h. Humanitarian air bridge interrupted.'});
  L('lt-threatens','we-kenneth-2019','fac-014',{note:'Pemba Hospital: generator fuel stockout during Kenneth. 6h blackout during surgery.'});
  L('lt-threatens','we-kenneth-2019','sh-011',{note:'Kenneth displaced 160,000+ in Cabo Delgado — foundation of Pemba IDP camp system.'});

  // Province → district containment
  L('lt-contains','aa-002','aa-d01');   // Sofala → Dondo
  L('lt-contains','aa-002','aa-d02');   // Sofala → Nhamatanda
  L('lt-contains','aa-002','aa-d03');   // Sofala → Buzi
  L('lt-contains','aa-002','aa-d04');   // Sofala → Chibabava
  L('lt-contains','aa-002','aa-d05');   // Sofala → Gorongosa
  L('lt-contains','aa-004','aa-d06');   // Tete → Mutarara
  L('lt-contains','aa-004','aa-d07');   // Tete → Zumbo
  L('lt-contains','aa-004','aa-d08');   // Tete → Changara
  L('lt-contains','aa-003','aa-d09');   // Zambezia → Mopeia
  L('lt-contains','aa-003','aa-d10');   // Zambezia → Chinde
  L('lt-contains','aa-003','aa-d11');   // Zambezia → Mocuba
  L('lt-contains','aa-001','aa-d12');   // Gaza → Mabalane
  L('lt-contains','aa-001','aa-d13');   // Gaza → Guijá
  L('lt-contains','aa-001','aa-008');   // Gaza → Chokwé
  L('lt-contains','aa-006','aa-d14');   // Inhambane → Vilankulo
  L('lt-contains','aa-006','aa-d15');   // Inhambane → Jangamo
  L('lt-contains','aa-011','aa-d16');   // Cabo Delgado → Pemba
  L('lt-contains','aa-011','aa-d17');   // Cabo Delgado → Montepuez

  // Rivers flow through provinces
  L('lt-flows-through','rv-001','aa-004',{note:'Zambezi River — Tete Province main channel'});
  L('lt-flows-through','rv-001','aa-003',{note:'Zambezi River — Zambezia lower basin'});
  L('lt-flows-through','rv-001','aa-d09',{note:'Zambezi Delta — Mopeia'});
  L('lt-flows-through','rv-002','aa-002',{note:'Pungwe River — enters Sofala near Beira'});
  L('lt-flows-through','rv-003','aa-002',{note:'Buzi River — Sofala Province'});
  L('lt-flows-through','rv-003','aa-d03',{note:'Buzi River — Buzi District'});
  L('lt-flows-through','rv-004','aa-001',{note:'Limpopo River — Gaza Province'});
  L('lt-flows-through','rv-004','aa-008',{note:'Limpopo — Chokwé District'});
  L('lt-flows-through','rv-005','aa-007',{note:'Save River — Manica/Inhambane boundary'});
  L('lt-flows-through','rv-006','aa-011',{note:'Lugenda River — Cabo Delgado hinterland'});
  L('lt-flows-through','rv-007','aa-011',{note:'Rovuma River — northern border of Cabo Delgado'});

  // Rivers threaten infrastructure
  L('lt-threatens','rv-001','inf-001',{note:'Zambezi at 98.4% reservoir capacity — dam stress'});
  L('lt-threatens','rv-001','inf-004',{note:'Sena Rail Bridge: structural risk from Zambezi flow'});
  L('lt-threatens','rv-001','inf-011',{note:'Sena Road Bridge: secondary crossing at risk'});
  L('lt-threatens','rv-003','inf-005',{note:'Buzi River submerged N6 bridge — primary blockage'});
  L('lt-threatens','rv-004','wf-005',{note:'Limpopo flooding damaged Chokwé irrigation network'});

  // Bridges cross rivers
  L('lt-crosses','inf-005','rv-003',{note:'Buzi Bridge over Buzi River — submerged'});
  L('lt-crosses','inf-011','rv-001',{note:'Sena Bridge over Zambezi River'});
  L('lt-crosses','inf-004','rv-001',{note:'Sena Rail Bridge over Zambezi'});

  // Health facilities located in provinces/districts
  L('lt-located-in','fac-001','aa-002');  // Beira Central Hospital → Sofala
  L('lt-located-in','fac-001','aa-009');  // Beira Central Hospital → Beira City
  L('lt-located-in','fac-002','aa-003');  // Quelimane Hospital → Zambezia
  L('lt-located-in','fac-003','aa-004');  // Tete Hospital → Tete Province
  L('lt-located-in','fac-004','aa-001');  // Xai-Xai Hospital → Gaza Province
  L('lt-located-in','fac-005','aa-005');  // Nampula Hospital → Nampula
  L('lt-located-in','fac-006','aa-007');  // Chimoio Hospital → Manica
  L('lt-located-in','fac-007','aa-002');  // MSF Centre → Sofala
  L('lt-located-in','fac-008','aa-d01');  // Dondo Hospital → Dondo District
  L('lt-located-in','fac-009','aa-008');  // Chokwé Hospital → Chokwé District
  L('lt-located-in','fac-010','aa-d06');  // Mutarara Hospital → Mutarara District
  L('lt-located-in','fac-011','aa-d03');  // Buzi Health Centre → Buzi District
  L('lt-located-in','fac-012','aa-d02');  // Nhamatanda HC → Nhamatanda District
  L('lt-located-in','fac-013','aa-d09');  // Mopeia HC → Mopeia District
  L('lt-located-in','fac-014','aa-d16');  // Pemba Hospital → Pemba District
  L('lt-located-in','fac-015','aa-d11');  // Mocuba Hospital → Mocuba District

  // Health facilities serve areas (healthcare catchment)
  L('lt-serves','fac-001','aa-002',{note:'Primary referral for 2M people in Sofala Province'});
  L('lt-serves','fac-001','aa-d01',{note:'Dondo district referrals'});
  L('lt-serves','fac-001','aa-d02',{note:'Nhamatanda district referrals'});
  L('lt-serves','fac-002','aa-003',{note:'Zambezia primary referral'});
  L('lt-serves','fac-003','aa-004',{note:'Tete primary referral'});
  L('lt-serves','fac-003','aa-d06',{note:'Mutarara district referrals to Tete'});
  L('lt-serves','fac-004','aa-001',{note:'Gaza Province referral'});
  L('lt-serves','fac-004','aa-008',{note:'Chokwé district referrals'});
  L('lt-serves','fac-014','aa-011',{note:'Only hospital for 1M people in Cabo Delgado'});

  // Shelters serve displaced populations
  L('lt-serves','sh-001','aa-002');
  L('lt-serves','sh-001','aa-d03');  // Buzi evacuees in Praia Nova
  L('lt-serves','sh-002','aa-d01');
  L('lt-serves','sh-003','aa-d03');
  L('lt-serves','sh-005','aa-001');
  L('lt-serves','sh-006','aa-008');  // Chokwé displaced
  L('lt-serves','sh-007','aa-004');
  L('lt-serves','sh-008','aa-d06');
  L('lt-serves','sh-010','aa-d09');
  L('lt-serves','sh-011','aa-011');
  L('lt-serves','sh-012','aa-d17');

  // Shelters located in areas
  L('lt-located-in','sh-001','aa-009');   // Praia Nova → Beira City
  L('lt-located-in','sh-006','aa-008');   // Chokwé Shelter → Chokwé District
  L('lt-located-in','sh-007','aa-004');   // Tete Shelter → Tete Province
  L('lt-located-in','sh-011','aa-d16');   // Pemba IDP → Pemba District

  // Water facilities serve areas
  L('lt-serves','wf-001','aa-009',{note:'Beira city water supply'});
  L('lt-serves','wf-001','aa-002',{note:'Sofala emergency WASH'});
  L('lt-serves','wf-003','aa-004',{note:'Tete city water supply'});
  L('lt-serves','wf-004','aa-001',{note:'Xai-Xai / Gaza Province water'});
  L('lt-serves','wf-005','aa-008',{note:'Chokwé irrigation scheme'});
  L('lt-serves','wf-007','aa-001',{note:'Gaza rural boreholes'});

  // Power depends on dam / powers facilities
  L('lt-depends-on','pw-001','inf-001',{note:'HCB hydropower generated from Cahora Bassa Dam reservoir'});
  L('lt-powered-by','fac-001','pw-002',{note:'Beira Central Hospital on city grid — backup gen required if grid fails'});
  L('lt-powered-by','fac-003','pw-004',{note:'Tete Hospital partially on Moatize grid'});
  L('lt-powered-by','wf-001','pw-002',{note:'Beira water plant requires city grid — pump failure risk during outage'});
  L('lt-powered-by','wf-003','pw-004',{note:'Tete water treatment plant on Moatize grid'});

  // Telecom covers provinces
  L('lt-covers','tc-001','aa-002',{note:'Sofala coverage — 72% degraded post-Freddy'});
  L('lt-covers','tc-001','aa-007',{note:'Manica coverage'});
  L('lt-covers','tc-001','aa-004',{note:'Tete coverage — via Vodacom'});
  L('lt-covers','tc-002','aa-005',{note:'Nampula — mCel primary'});
  L('lt-covers','tc-002','aa-011',{note:'Cabo Delgado — mCel'});
  L('lt-covers','tc-002','aa-003',{note:'Zambezia — mCel'});

  // Crop zones feed supply chain
  L('lt-feeds-into','cr-004','sc-001',{note:'Manica maize production contributes to national food stockpile'});
  L('lt-disrupted-by','cr-001','we-006',{note:'Gaza rice zone: Limpopo flood submerged 78% of fields'});
  L('lt-disrupted-by','cr-002','we-006',{note:'Chokwé scheme failed due to Limpopo dyke breach'});
  L('lt-disrupted-by','cr-005','we-004',{note:'Inhambane cashew zone: 3rd consecutive drought failure'});
  L('lt-disrupted-by','cr-006','we-003',{note:'Tete cotton: Zambezi floods inundated 22% of growing area'});

  // Crop zones located in provinces
  L('lt-located-in','cr-001','aa-001');  // Gaza rice
  L('lt-located-in','cr-002','aa-008');  // Chokwé scheme
  L('lt-located-in','cr-003','aa-003');  // Zambezia cashew
  L('lt-located-in','cr-004','aa-007');  // Manica maize
  L('lt-located-in','cr-005','aa-006');  // Inhambane cashew
  L('lt-located-in','cr-006','aa-004');  // Tete cotton

  // Active hazards threatening infrastructure (current events)
  L('lt-threatens','we-003','pw-001',{note:'Zambezi flood: Cahora Bassa reservoir stress'});
  L('lt-threatens','we-003','fac-003',{note:'Tete hospital flood risk — 31h window'});
  L('lt-threatens','we-003','wf-003',{note:'Tete water intake at risk from flood pulse'});
  L('lt-threatens','we-003','pw-004',{note:'Moatize: Zambezi transmission line flooding'});
  L('lt-threatens','we-003','sh-007',{note:'Tete shelter: pre-positioned — may need relocation if flood pulse exceeds forecast'});

  // Mission→event links for new missions
  L('lt-responds','mis-005','we-idai-2019');
  L('lt-responds','mis-006','we-kenneth-2019');
  L('lt-responds','mis-007','we-003');
  L('lt-responds','mis-008','we-004');
  L('lt-participates','org-001','mis-007');
  L('lt-participates','org-016','mis-007');
  L('lt-participates','org-017','mis-007');
  L('lt-participates','org-003','mis-008');
  L('lt-participates','org-012','mis-008');
  L('lt-participates','org-008','mis-008');

  // Org→area operations
  L('lt-operates','org-011','aa-002',{note:'MISAU Beira emergency health coordination'});
  L('lt-operates','org-011','aa-001',{note:'MISAU Gaza drought nutrition response'});
  L('lt-operates','org-013','aa-011',{note:'IOM DTM monitoring, Cabo Delgado displacement'});
  L('lt-operates','org-014','aa-011',{note:'UNHCR shelter management, Pemba IDP camp'});
  L('lt-operates','org-014','aa-002',{note:'UNHCR NFI — Sofala shelters'});
  L('lt-operates','org-016','aa-004',{note:'ANGRH river monitoring — Zambezi flood early warning'});
  L('lt-operates','org-017','inf-001',{note:'HCB operations — Cahora Bassa controlled release'});

  // ── PHASE 3 ALERTS ─────────────────────────────────────────────────────────
  [
    ['alt-010','CRITICAL','Beira Central Hospital — Overcapacity Alert',   'Cholera ward at 180% capacity. Staff burnout critical. MSF requesting 50 additional ORS nurses.', 'fac-001'],
    ['alt-011','CRITICAL','Cahora Bassa Power Risk — Beira Grid',          'Power distribution hub at risk. 4 feeder lines still down. Hospital on generator — 48h fuel remaining.', 'pw-002'],
    ['alt-012','HIGH',    'Praia Nova IDP Camp — 155% Over Capacity',      '12,400 persons in 8,000-capacity site. WASH services critically inadequate. Disease risk elevated.', 'sh-001'],
    ['alt-013','HIGH',    'Tete Water Intake — Flood Pulse 31h Warning',   'Cahora Bassa pulse will compromise water intake in 31 hours. Emergency pre-positioning required.', 'wf-003'],
    ['alt-014','HIGH',    'Gaza Rice Zone — 78% Submerged',                '$42M crop loss confirmed. 230,000 farming families without income. IPC4 secondary driver.', 'cr-001'],
    ['alt-015','MEDIUM',  'Pemba Hospital — Supply Chain Alert',            'Only hospital in 300km zone. Medical stock at 12 days. No resupply flight scheduled. Air bridge required.', 'fac-014'],
    ['alt-016','MEDIUM',  'Vodacom Network — 28% Base Stations Offline',   'Central Mozambique: communication degraded. Humanitarian coordination affected in Sofala/Manica.', 'tc-001'],
  ].forEach(a => insertAlert.run(...a));

  // ── PHASE 3 EVENTS ─────────────────────────────────────────────────────────
  [
    ['ev-011','we-idai-2019','alert',    'Cyclone Idai landfall — Beira 03:00 UTC 14 March 2019',   'Category 4 landfall. 195 km/h winds. History\'s worst African cyclone at time.', 'INAM Historical'],
    ['ev-012','sh-001','status_change',  'Praia Nova IDP Camp established — 15 March 2019',          '8,000 displaced persons registered. Camp still operational 7 years later.', 'INGD Historical'],
    ['ev-013','we-kenneth-2019','alert', 'Cyclone Kenneth landfall — Cabo Delgado 25 April 2019',    'Category 4. 220 km/h. Strongest cyclone ever recorded to hit mainland Africa.', 'INAM Historical'],
    ['ev-014','fac-001','status_change', 'Beira Central Hospital cholera ward at 180% capacity',     'MSF emergency team activated. Requesting 50 additional ORS-trained nurses.', 'MSF/MISAU'],
    ['ev-015','pw-002','alert',          'Beira Power Hub — 4 feeder lines destroyed post-Freddy',   'City in darkness. Hospital on generator. Fuel 48h remaining.', 'EDM/INGD'],
    ['ev-016','rv-001','alert',          'Zambezi River — 142% of seasonal norm',                    'Cahora Bassa forced to release at 2,400 m³/s. Tete flood pulse projection confirmed.', 'ANGRH'],
    ['ev-017','cr-001','alert',          'Gaza rice zone — 78% submerged by Limpopo flooding',       '$42M loss confirmed by satellite imagery. IPC4 escalation now primary food driver.', 'FAO/Remote Sensing'],
    ['ev-018','mis-007','status_change', 'Operation Cahora Bassa Preparedness — ACTIVATED',          'INGD pre-positioning boats, shelters and water units. 31h flood pulse window.', 'INGD Ops'],
  ].forEach(e => insertEvent.run(...e));

  // ── PHASE 3 COMMENTS ────────────────────────────────────────────────────────
  [
    ['cmt-010','fac-001','Dr. Beatriz Nhantumbo (MSF)','Cholera ward at 180% capacity. We have no more beds. Patients being treated on floor mats. CFR will cross 2% within 48 hours without immediate scale-up. Requesting 8 Rapid Response Teams from MISAU.'],
    ['cmt-011','sh-001','Isabel Sitoe (UNHCR)','Praia Nova camp was established as temporary in 2019 — 7 years later we have 12,400 people who never went home. Without permanent housing solution, this camp will exist for another decade.'],
    ['cmt-012','pw-002','Eng. Alfredo Cuamba (EDM)','4 feeder lines remain down post-Freddy. Beira Central Hospital on generator — we have 48 hours of fuel. If EDM cannot restore Line 3 by tomorrow, we need emergency fuel delivery from INGD.'],
    ['cmt-013','rv-001','Dr. Celso Mahanjane (ANGRH)','Zambezi at 2,400 m³/s discharge. Flood pulse will hit Tete City in 31 hours. I am recommending immediate evacuation of all riverbank communities within 500m of the channel. This is not a drill.'],
    ['cmt-014','cr-001','Pedro Langa (FAO)','Satellite imagery confirms 78% of Gaza floodplain submerged. This is the third consecutive crop failure. Without WFP IRA activation within 72 hours, we are looking at IPC4 for 280,000 people.'],
  ].forEach(c => insertComment.run(...c));

  console.log('[Seed/Phase3] National knowledge graph extended: facilities, shelters, rivers, power, telecom, districts, historical cyclones, 200+ new links.');
}

module.exports = { seedIfEmpty, runSeed, runPhase3Seed };
