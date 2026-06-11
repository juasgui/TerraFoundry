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
