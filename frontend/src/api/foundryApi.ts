import type {
  ObjectType, FoundryObject, LinkType, OntologyGraph, OntologyStats,
  Alert, OntologyEvent, Mission, DashboardMetrics, ChartData,
  Asset, PipelineSource, PipelineRun, WorkshopLayout, WorkshopWidget,
  MapObject, FloodZone, SituationReport,
} from '../types';

const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

// ── Ontology ──────────────────────────────────────────────────────────────────
export const ontologyApi = {
  stats: () => req<OntologyStats>('/ontology/stats'),
  types: () => req<ObjectType[]>('/ontology/types'),
  type: (id: string) => req<ObjectType>(`/ontology/types/${id}`),
  linkTypes: () => req<LinkType[]>('/ontology/link-types'),
  graph: () => req<OntologyGraph>('/ontology/graph'),
  createType: (body: Partial<ObjectType>) =>
    req<{ id: string }>('/ontology/types', { method: 'POST', body: JSON.stringify(body) }),
  addProperty: (typeId: string, body: Partial<{ name: string; label: string; type: string; unit: string }>) =>
    req<{ id: string }>(`/ontology/types/${typeId}/properties`, { method: 'POST', body: JSON.stringify(body) }),
};

// ── Objects ──────────────────────────────────────────────────────────────────
export interface ObjectQuery {
  q?: string; type_id?: string; status?: string; severity?: string;
  page?: number; limit?: number;
}
export const objectsApi = {
  list: (params: ObjectQuery = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
    return req<{ objects: FoundryObject[]; total: number; page: number; limit: number }>(`/objects?${qs}`);
  },
  get: (id: string) => req<FoundryObject>(`/objects/${id}`),
  byType: (typeId: string) => req<FoundryObject[]>(`/objects/by-type/${typeId}`),
  create: (body: Partial<FoundryObject>) =>
    req<{ id: string }>('/objects', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<FoundryObject>) =>
    req<{ success: boolean }>(`/objects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) =>
    req<{ success: boolean }>(`/objects/${id}`, { method: 'DELETE' }),
  addComment: (id: string, content: string, user_name = 'Operator') =>
    req<{ id: string }>(`/objects/${id}/comments`, { method: 'POST', body: JSON.stringify({ content, user_name }) }),
};

// ── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  metrics: () => req<DashboardMetrics>('/dashboard/metrics'),
  alerts: () => req<Alert[]>('/dashboard/alerts'),
  timeline: () => req<OntologyEvent[]>('/dashboard/timeline'),
  charts: () => req<ChartData>('/dashboard/charts'),
  provinceMatrix: () => req<{ province: string; affected: number; displaced: number; severity: string }[]>('/dashboard/province-matrix'),
  acknowledgeAlert: (id: string) =>
    req<{ success: boolean }>(`/dashboard/alerts/${id}/acknowledge`, { method: 'POST' }),
};

// ── Map ──────────────────────────────────────────────────────────────────────
export const mapApi = {
  objects: (params: { type_id?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]);
    return req<MapObject[]>(`/map/objects?${qs}`);
  },
  floodZones: () => req<FloodZone[]>('/map/flood-zones'),
  supplyRoutes: () => req<{ id: string; name: string; status: string; waypoints: [number, number][]; type: string }[]>('/map/supply-routes'),
  heatmap: () => req<{ lat: number; lng: number; intensity: number; label: string }[]>('/map/heatmap'),
  layers: () => req<Record<string, number>>('/map/layers'),
  infrastructure: () => req<MapObject[]>('/map/infrastructure'),
};

// ── Assets ──────────────────────────────────────────────────────────────────
export const assetsApi = {
  list: () => req<Asset[]>('/assets'),
  summary: () => req<{ available: number; deployed: number; in_transit: number; maintenance: number }>('/assets/summary/status'),
  setStatus: (id: string, status: string) =>
    req<{ success: boolean }>(`/assets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  assign: (id: string, mission_id: string) =>
    req<{ success: boolean }>(`/assets/${id}/assign`, { method: 'POST', body: JSON.stringify({ mission_id }) }),
  unassign: (id: string) =>
    req<{ success: boolean }>(`/assets/${id}/unassign`, { method: 'POST' }),
};

// ── Missions ────────────────────────────────────────────────────────────────
export const missionsApi = {
  list: (status?: string) => req<Mission[]>(`/missions${status ? `?status=${status}` : ''}`),
  get: (id: string) => req<Mission & { resources: Asset[]; organizations: FoundryObject[]; timeline: OntologyEvent[] }>(`/missions/${id}`),
  create: (body: Partial<Mission>) =>
    req<{ id: string }>('/missions', { method: 'POST', body: JSON.stringify(body) }),
  setStatus: (id: string, status: string) =>
    req<{ success: boolean }>(`/missions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ── Pipelines ────────────────────────────────────────────────────────────────
export const pipelinesApi = {
  sources: () => req<PipelineSource[]>('/pipelines/sources'),
  runs: () => req<PipelineRun[]>('/pipelines/runs'),
  ingest: (source_id: string) =>
    req<{ run_id: string; records_ingested: number; objects_created: number; message: string }>(
      '/pipelines/ingest', { method: 'POST', body: JSON.stringify({ source_id }) }
    ),
  lineage: (objectId: string) =>
    req<{ object: FoundryObject; contributing_runs: PipelineRun[]; lineage_note: string }>(`/pipelines/lineage/${objectId}`),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/pipelines/upload`, { method: 'POST', body: fd }).then(r => r.json());
  },
};

// ── AI ──────────────────────────────────────────────────────────────────────
export const aiApi = {
  chat: (message: string, session_id: string) =>
    req<{ role: string; content: string; intent?: string; session_id: string }>(
      '/ai/chat', { method: 'POST', body: JSON.stringify({ message, session_id }) }
    ),
};

// ── Workshop ────────────────────────────────────────────────────────────────
export const workshopApi = {
  list: () => req<WorkshopLayout[]>('/workshop'),
  get: (id: string) => req<WorkshopLayout>(`/workshop/${id}`),
  create: (body: { name: string; description?: string; widgets?: WorkshopWidget[] }) =>
    req<{ id: string }>('/workshop', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<WorkshopLayout>) =>
    req<{ success: boolean }>(`/workshop/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) =>
    req<{ success: boolean }>(`/workshop/${id}`, { method: 'DELETE' }),
  widgetTypes: () => req<{ type: string; label: string; icon: string; description: string }[]>('/workshop/meta/widget-types'),
};

// ── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  generate: (type = 'sitrep') => req<SituationReport>(`/reports/generate?type=${type}`),
};
