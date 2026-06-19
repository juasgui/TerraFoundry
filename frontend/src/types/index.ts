export interface ObjectType {
  id: string;
  name: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  category: string;
  object_count?: number;
  property_definitions?: PropertyDef[];
  link_types?: LinkType[];
}

export interface PropertyDef {
  id: string;
  object_type_id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'geo';
  required: number;
  enum_values?: string;
  unit?: string;
}

export interface LinkType {
  id: string;
  name: string;
  label: string;
  inverse_label?: string;
  from_type_id?: string;
  to_type_id?: string;
  color: string;
  description?: string;
}

export interface FoundryObject {
  id: string;
  type_id: string;
  name: string;
  status: string;
  severity?: string;
  geo_lat?: number;
  geo_lng?: number;
  geo_polygon?: [number, number][];
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  type?: ObjectType;
  links_out?: ObjectLink[];
  links_in?: ObjectLink[];
  timeline?: OntologyEvent[];
  comments?: Comment[];
  alerts?: Alert[];
  property_definitions?: PropertyDef[];
}

export interface ObjectLink {
  id: string;
  link_type_id: string;
  from_object_id: string;
  to_object_id: string;
  metadata: Record<string, unknown>;
  link_type?: LinkType;
  target?: FoundryObject;
  source?: FoundryObject;
}

export interface Alert {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description?: string;
  object_id?: string;
  acknowledged: number;
  acknowledged_by?: string;
  created_at: string;
}

export interface OntologyEvent {
  id: string;
  object_id?: string;
  event_type: string;
  title: string;
  description?: string;
  user_name: string;
  created_at: string;
}

export interface Comment {
  id: string;
  object_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface Mission {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'suspended' | 'completed';
  description?: string;
  lead_org_id?: string;
  lead_org_name?: string;
  weather_event_id?: string;
  weather_event_name?: string;
  start_date?: string;
  priority: string;
  resource_count?: number;
  org_count?: number;
  created_at: string;
}

export interface DashboardMetrics {
  totalAffected: number;
  totalDisplaced: number;
  activeHazards: number;
  deployedResources: number;
  criticalAlerts: number;
  choleraCases: number;
  riskIndex: number;
  activeMissions: number;
  totalObjects: number;
  totalLinks: number;
  provincesAffected: number;
  lastUpdated: string;
}

export interface ChartData {
  byProvince: { name: string; affected: number; severity: string }[];
  byType: { name: string; count: number; color: string }[];
  resourceStatus: { name: string; value: number }[];
  healthCases: { disease: string; cases: number; severity: string }[];
  affectedTrend: { date: string; affected: number; displaced: number }[];
}

export interface Asset {
  id: string;
  type_id: string;
  name: string;
  status: string;
  properties: Record<string, unknown>;
  resource_type?: string;
  location?: string;
  assigned_mission_id?: string;
  assigned_mission_name?: string;
}

export interface PipelineSource {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  refresh_interval: string;
  target_types: string[];
  last_run?: PipelineRun;
}

export interface PipelineRun {
  id: string;
  source: string;
  source_type: string;
  status: string;
  records_ingested: number;
  records_failed: number;
  objects_created: number;
  links_created: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface WorkshopLayout {
  id: string;
  name: string;
  description?: string;
  template: string;
  widgets: WorkshopWidget[];
  created_at: string;
  updated_at: string;
}

export interface WorkshopWidget {
  id: string;
  type: 'metric' | 'map' | 'chart' | 'table' | 'alerts' | 'timeline' | 'text' | 'search';
  title: string;
  config?: Record<string, unknown>;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface MapObject {
  id: string;
  type_id: string;
  name: string;
  status: string;
  severity?: string;
  geo_lat: number;
  geo_lng: number;
  properties: Record<string, unknown>;
}

export interface FloodZone {
  id: string;
  name: string;
  severity: string;
  geo_polygon: [number, number][];
  properties: Record<string, unknown>;
}

export interface OntologyGraph {
  nodes: { id: string; label: string; icon: string; color: string; count: number }[];
  edges: { id: string; label: string; from: string; to: string; color: string }[];
}

export interface OntologyStats {
  typeStats: { id: string; label: string; icon: string; color: string; count: number }[];
  totalLinks: number;
  totalObjects: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
  objects?: FoundryObject[];
}

export interface EmergingRisk {
  id: string;
  title: string;
  category: string;
  confidence: number;
  timeHorizon: string;
  affectedPopulation: number;
  severity: string;
  trend: string;
  detail: string;
  actions: string[];
}

export interface OperationalRecommendation {
  id: string;
  priority: string;
  priorityColor: string;
  title: string;
  description: string;
  expectedImpact: string;
  resourcesRequired: string;
  timeframe: string;
  category: string;
  linkedRisk?: string;
}

export interface DeltaItem {
  id: string;
  metric: string;
  change: string;
  direction: 'up' | 'down' | 'alert' | 'neutral';
  severity: string;
  detail: string;
}

export interface DecisionIntel {
  emergingRisks: EmergingRisk[];
  recommendations: OperationalRecommendation[];
  delta: DeltaItem[];
  generatedAt: string;
}

export interface ImpactAnalysis {
  object: FoundryObject;
  totalAffected: number;
  affectedAreas: FoundryObject[];
  infraAtRisk: { name: string; type_id: string; status: string; severity: string; infra_type?: string }[];
  counts: { areas: number; hospitals: number; schools: number; roads: number; bridges: number; shelters: number };
  cascadeChain: { stage: number; event: string; type: string; severity: string; icon: string }[];
}

export interface SimulationResult {
  inputs: { rainfall: number; windSpeed: number; riverLevel: number; populationDisplacement: number; foodSupply: number };
  projectedAffected: number;
  projectedDisplaced: number;
  shelterDemand: number;
  resourceDemand: number;
  infrastructureStress: number;
  healthRisk: number;
  foodInsecurity: number;
  overallRisk: number;
  alerts: { severity: string; message: string }[];
  generatedAt: string;
}

export interface AiBriefingRisk {
  rank: number;
  title: string;
  detail: string;
  severity: string;
  source: string;
  confidence: number;
  actionRequired: string;
}

export interface AiBriefing {
  greeting: string;
  timestamp: string;
  operatorName: string;
  summary: string;
  risks: AiBriefingRisk[];
  stats: { critAlerts: number; newAlerts24h: number; activeHazards: number; activeMissions: number; totalAffected: number };
}

// ── Intelligence Workbench Types ──────────────────────────────────────────────

export interface IntelNode {
  id: string;
  name: string;
  type_id: string;
  type_label: string;
  type_icon: string;
  type_color: string;
  status: string;
  severity: string | null;
  affected_people: number | null;
  beds: number | null;
  capacity: number | null;
  occupancy: number | null;
  link_label: string | null;
}

export interface IntelStage {
  stage: number;
  label: string;
  role: string;
  nodes: IntelNode[];
}

export interface ImpactChainResult {
  root: IntelNode;
  stages: IntelStage[];
  totalObjects: number;
  totalAffected: number;
  criticalCount: number;
  infraAtRisk: number;
  narrative: string;
  generatedAt: string;
}

export interface RootCauseLevel {
  level: number;
  label: string;
  nodes: IntelNode[];
}

export interface RootCauseResult {
  outcome: IntelNode;
  levels: RootCauseLevel[];
  rootCauses: IntelNode[];
  totalFactors: number;
  generatedAt: string;
}

export interface VulnerabilityProvince {
  id: string;
  name: string;
  status: string;
  severity: string;
  vulnerability_idx: number;
  affected_people: number;
  displaced: number;
  population: number;
  active_hazards: number;
  health_facilities: number;
  health_risks: number;
  infra_at_risk: number;
  shelter_capacity: number;
  shelter_occupancy: number;
  shelter_utilisation_pct: number;
  exposure_score: number;
  risk_level: string;
}

export interface VulnerabilityResult {
  provinces: VulnerabilityProvince[];
  summary: { critical: number; high: number; medium: number; low: number; totalAffected: number };
  generatedAt: string;
}

export interface HistoricalEvent {
  id: string;
  name: string;
  year: number;
  status: string;
  severity: string;
  event_type: string;
  wind_speed_kmh: number | null;
  rainfall_mm: number | null;
  landfall_date: string | null;
  category: string | null;
  estimated_deaths: number | null;
  total_affected: number | null;
  economic_loss_usd: number | null;
  impacted_areas: { name: string; severity: string }[];
  infra_threatened: number;
  response_missions: number;
  missions_list: { name: string; status: string }[];
}

export interface HistoricalResult {
  events: HistoricalEvent[];
  generatedAt: string;
}

export interface CompareProfile {
  id: string;
  name: string;
  type_id: string;
  type_label: string;
  type_icon: string;
  type_color: string;
  status: string;
  severity: string;
  properties: Record<string, unknown>;
  direct_impacts: IntelNode[];
  total_affected: number;
  infra_threatened: number;
  areas_impacted: number;
  risk_score: number;
}

export interface CompareResult {
  a: CompareProfile;
  b: CompareProfile;
  comparison: { worse_affected: string; worse_infra: string; worse_severity: string };
  generatedAt: string;
}

export interface IntelWorkbenchSummary {
  graphStats: { totalObjects: number; totalLinks: number; totalTypes: number; totalLinkTypes: number };
  situationStats: { activeHazards: number; critObjects: number; provinces: number; facilities: number };
  topHazards: { id: string; name: string; severity: string; status: string; link_count: number }[];
  generatedAt: string;
}

export interface SituationReport {
  type: string;
  title: string;
  generated_at: string;
  classification: string;
  period: string;
  executive_summary: string;
  key_figures: {
    total_affected: number;
    total_displaced: number;
    active_hazards: number;
    provinces_affected: number;
  };
  province_matrix: { name: string; severity: string; aff: string }[];
  critical_alerts: Alert[];
  active_missions: Mission[];
  data_sources: string[];
  prepared_by: string;
}
