import React, { useEffect, useState } from 'react';
import { Layers, Map as MapIcon } from 'lucide-react';
import { mapApi } from '../api/foundryApi';
import type { MapObject, FloodZone } from '../types';
import FoundryMap from '../components/map/FoundryMap';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui';
import { useT } from '../i18n/useT';

export default function MapsView() {
  const t = useT();
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [floodZones, setFloodZones] = useState<FloodZone[]>([]);
  const [supplyRoutes, setSupplyRoutes] = useState<{ id: string; name: string; status: string; waypoints: [number, number][]; type: string }[]>([]);
  const [heatmap, setHeatmap] = useState<{ lat: number; lng: number; intensity: number; label: string }[]>([]);
  const [layerCounts, setLayerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { mapLayers, toggleMapLayer } = useAppStore();

  useEffect(() => {
    Promise.all([
      mapApi.objects(),
      mapApi.floodZones(),
      mapApi.supplyRoutes(),
      mapApi.heatmap(),
      mapApi.layers(),
    ]).then(([o, f, r, h, l]) => {
      setObjects(o);
      setFloodZones(f);
      setSupplyRoutes(r);
      setHeatmap(h);
      setLayerCounts(l);
    }).finally(() => setLoading(false));
  }, []);

  const LAYERS: { key: keyof typeof mapLayers; labelKey: string; color: string; count?: number }[] = [
    { key: 'hazards', labelKey: 'map.hazardsWeather', color: '#00d4ff', count: layerCounts.weather },
    { key: 'resources', labelKey: 'map.resources', color: '#00ff9d', count: layerCounts.resource },
    { key: 'infrastructure', labelKey: 'map.infrastructure', color: '#a78bfa', count: layerCounts.infra },
    { key: 'supplyRoutes', labelKey: 'map.supplyRoutes', color: '#ffcc00', count: supplyRoutes.length },
    { key: 'health', labelKey: 'map.healthRisks', color: '#ff3a3a', count: layerCounts.health },
    { key: 'heatmap', labelKey: 'map.populationHeatmap', color: '#ff8c00' },
  ];

  const routeStatusColors: Record<string, string> = { ACTIVE: 'text-green-400', BLOCKED: 'text-red-400', PARTIAL: 'text-yellow-400' };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-foundry-bg/80 z-10">
            <div className="text-foundry-accent text-sm">{t('common.loading')}</div>
          </div>
        )}
        <FoundryMap
          objects={objects}
          floodZones={floodZones}
          supplyRoutes={supplyRoutes}
          heatmap={heatmap}
          height="100%"
        />
      </div>

      {/* Right panel */}
      <div className="w-56 shrink-0 bg-foundry-surface border-l border-foundry-border flex flex-col">
        {/* Layer toggles */}
        <div className="px-3 py-2.5 border-b border-foundry-border">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={12} className="text-foundry-muted" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted">{t('map.layers')}</span>
          </div>
          {LAYERS.map(({ key, labelKey, color, count }) => (
            <button
              key={key}
              onClick={() => toggleMapLayer(key)}
              className="w-full flex items-center gap-2 py-1.5 text-xs text-left hover:text-foundry-text transition-colors"
            >
              <div className={`w-3 h-3 rounded border transition-all ${mapLayers[key] ? 'border-transparent' : 'border-foundry-border bg-transparent'}`}
                style={{ background: mapLayers[key] ? color : 'transparent', borderColor: mapLayers[key] ? 'transparent' : '#1e2d3d' }} />
              <span className={mapLayers[key] ? 'text-foundry-text' : 'text-foundry-muted'}>{t(labelKey)}</span>
              {count !== undefined && <span className="ml-auto text-[10px] text-foundry-muted">{count}</span>}
            </button>
          ))}
        </div>

        {/* Supply routes status */}
        <div className="px-3 py-2.5 border-b border-foundry-border">
          <div className="flex items-center gap-2 mb-2">
            <MapIcon size={12} className="text-foundry-muted" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted">{t('map.supplyRoutes')}</span>
          </div>
          {supplyRoutes.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-1 text-xs">
              <span className={`text-[10px] font-bold ${routeStatusColors[r.status] ?? 'text-foundry-muted'}`}>●</span>
              <span className="text-foundry-text-dim truncate flex-1">{r.name}</span>
            </div>
          ))}
        </div>

        {/* Flood zones */}
        <div className="px-3 py-2.5 flex-1 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">{t('map.floodZones')} ({floodZones.length})</div>
          {floodZones.map((z) => (
            <div key={z.id} className="py-1 text-xs">
              <div className={`text-[10px] font-bold ${z.severity === 'CRITICAL' ? 'text-red-400' : z.severity === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'}`}>{z.severity}</div>
              <div className="text-foundry-text-dim truncate">{z.name}</div>
            </div>
          ))}
        </div>

        {/* Object counts */}
        <div className="px-3 py-2.5 border-t border-foundry-border">
          <div className="text-[10px] text-foundry-muted mb-1">Objects on map: <span className="text-foundry-accent font-mono-code">{objects.length}</span></div>
          <div className="text-[10px] text-foundry-muted">Flood zones: <span className="text-orange-400 font-mono-code">{floodZones.length}</span></div>
        </div>
      </div>
    </div>
  );
}
