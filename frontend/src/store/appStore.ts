import { create } from 'zustand';
import type { FoundryObject, Alert, Mission, DashboardMetrics, ChatMessage } from '../types';

interface AppState {
  // navigation
  activeView: string;
  setActiveView: (v: string) => void;

  // object detail panel
  selectedObjectId: string | null;
  selectedObject: FoundryObject | null;
  detailPanelOpen: boolean;
  openDetailPanel: (id: string) => void;
  closeDetailPanel: () => void;
  setSelectedObject: (obj: FoundryObject | null) => void;

  // AI panel
  aiPanelOpen: boolean;
  toggleAiPanel: () => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  chatSessionId: string;

  // dashboard data
  metrics: DashboardMetrics | null;
  setMetrics: (m: DashboardMetrics) => void;
  alerts: Alert[];
  setAlerts: (a: Alert[]) => void;
  acknowledgeAlert: (id: string) => void;

  // missions
  missions: Mission[];
  setMissions: (m: Mission[]) => void;
  activeMission: Mission | null;
  setActiveMission: (m: Mission | null) => void;

  // global search
  globalSearch: string;
  setGlobalSearch: (s: string) => void;

  // map layer toggles
  mapLayers: {
    hazards: boolean;
    resources: boolean;
    infrastructure: boolean;
    supplyRoutes: boolean;
    health: boolean;
    heatmap: boolean;
  };
  toggleMapLayer: (layer: keyof AppState['mapLayers']) => void;

  // ingest notifications
  ingestLog: { id: string; message: string; ts: string }[];
  addIngestLog: (msg: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeView: 'control-center',
  setActiveView: (v) => set({ activeView: v }),

  selectedObjectId: null,
  selectedObject: null,
  detailPanelOpen: false,
  openDetailPanel: (id) => set({ selectedObjectId: id, detailPanelOpen: true }),
  closeDetailPanel: () => set({ detailPanelOpen: false, selectedObjectId: null, selectedObject: null }),
  setSelectedObject: (obj) => set({ selectedObject: obj }),

  aiPanelOpen: false,
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  chatMessages: [],
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),
  chatSessionId: `sess-${Date.now()}`,

  metrics: null,
  setMetrics: (m) => set({ metrics: m }),
  alerts: [],
  setAlerts: (a) => set({ alerts: a }),
  acknowledgeAlert: (id) =>
    set((s) => ({ alerts: s.alerts.map((a) => a.id === id ? { ...a, acknowledged: 1 } : a) })),

  missions: [],
  setMissions: (m) => set({ missions: m }),
  activeMission: null,
  setActiveMission: (m) => set({ activeMission: m }),

  globalSearch: '',
  setGlobalSearch: (s) => set({ globalSearch: s }),

  mapLayers: {
    hazards: true,
    resources: true,
    infrastructure: true,
    supplyRoutes: true,
    health: true,
    heatmap: false,
  },
  toggleMapLayer: (layer) =>
    set((s) => ({ mapLayers: { ...s.mapLayers, [layer]: !s.mapLayers[layer] } })),

  ingestLog: [],
  addIngestLog: (message) =>
    set((s) => ({
      ingestLog: [{ id: String(Date.now()), message, ts: new Date().toISOString() }, ...s.ingestLog].slice(0, 50),
    })),
}));
