import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useAppStore } from '../../store/appStore';
import type { MapObject, FloodZone } from '../../types';

// Fix Leaflet default icons for Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  objects: MapObject[];
  floodZones: FloodZone[];
  supplyRoutes: { id: string; name: string; status: string; waypoints: [number, number][]; type: string }[];
  heatmap: { lat: number; lng: number; intensity: number; label: string }[];
  height?: string;
}

const typeColors: Record<string, string> = {
  'ot-weather':  '#00d4ff',
  'ot-area':     '#ff8c00',
  'ot-resource': '#00ff9d',
  'ot-health':   '#ff3a3a',
  'ot-infra':    '#a78bfa',
  'ot-org':      '#ffcc00',
  'ot-supply':   '#00ff9d',
  'ot-mission':  '#00d4ff',
};

const routeColors: Record<string, string> = {
  ACTIVE: '#00ff9d', BLOCKED: '#ff3a3a', PARTIAL: '#ffcc00', PENDING: '#64748b',
};

export default function FoundryMap({ objects, floodZones, supplyRoutes, heatmap, height = '100%' }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const objectsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const zonesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const routesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const heatLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const { mapLayers, openDetailPanel } = useAppStore();

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-18.5, 35.3],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      opacity: 0.6,
    }).addTo(map);

    objectsLayerRef.current.addTo(map);
    zonesLayerRef.current.addTo(map);
    routesLayerRef.current.addTo(map);
    heatLayerRef.current.addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Objects layer
  useEffect(() => {
    const layer = objectsLayerRef.current;
    layer.clearLayers();
    if (!mapLayers.hazards && !mapLayers.resources && !mapLayers.health && !mapLayers.infrastructure) return;

    objects.forEach((obj) => {
      if (!mapLayers.hazards && obj.type_id === 'ot-weather') return;
      if (!mapLayers.resources && obj.type_id === 'ot-resource') return;
      if (!mapLayers.health && obj.type_id === 'ot-health') return;
      if (!mapLayers.infrastructure && obj.type_id === 'ot-infra') return;

      const color = typeColors[obj.type_id] ?? '#64748b';
      const svgIcon = L.divIcon({
        className: '',
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid ${color}66;box-shadow:0 0 8px ${color}88"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([obj.geo_lat, obj.geo_lng], { icon: svgIcon });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <div style="font-weight:600;color:#e2e8f0;margin-bottom:4px">${obj.name}</div>
          <div style="color:${color};font-size:11px;margin-bottom:4px">${obj.type_id.replace('ot-','')}</div>
          ${obj.severity ? `<div style="color:#ff3a3a;font-size:10px;font-weight:700">${obj.severity}</div>` : ''}
          <div style="color:#64748b;font-size:10px;margin-top:4px">Status: ${obj.status}</div>
          <button onclick="window.__openDetail && window.__openDetail('${obj.id}')"
            style="margin-top:6px;background:#00d4ff22;border:1px solid #00d4ff55;color:#00d4ff;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer">
            View 360°
          </button>
        </div>
      `);
      layer.addLayer(marker);
    });

    (window as unknown as Record<string, unknown>).__openDetail = openDetailPanel;
  }, [objects, mapLayers, openDetailPanel]);

  // Flood zones layer
  useEffect(() => {
    const layer = zonesLayerRef.current;
    layer.clearLayers();
    if (!mapLayers.hazards) return;

    floodZones.forEach((zone) => {
      if (!zone.geo_polygon?.length) return;
      const color = zone.severity === 'CRITICAL' ? '#ff3a3a' : zone.severity === 'HIGH' ? '#ff8c00' : '#ffcc00';
      L.polygon(zone.geo_polygon as L.LatLngExpression[], {
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.12,
        dashArray: '4,4',
      })
        .bindPopup(`<b style="color:#e2e8f0">${zone.name}</b><br/><span style="color:${color};font-size:11px">${zone.severity}</span>`)
        .addTo(layer);
    });
  }, [floodZones, mapLayers.hazards]);

  // Supply routes layer
  useEffect(() => {
    const layer = routesLayerRef.current;
    layer.clearLayers();
    if (!mapLayers.supplyRoutes) return;

    supplyRoutes.forEach((route) => {
      if (!route.waypoints?.length) return;
      const color = routeColors[route.status] ?? '#64748b';
      L.polyline(route.waypoints as L.LatLngExpression[], {
        color,
        weight: route.status === 'BLOCKED' ? 3 : 2,
        opacity: 0.8,
        dashArray: route.status === 'BLOCKED' ? '6,4' : undefined,
      })
        .bindPopup(`<b style="color:#e2e8f0">${route.name}</b><br/><span style="color:${color};font-size:11px">● ${route.status}</span>`)
        .addTo(layer);
    });
  }, [supplyRoutes, mapLayers.supplyRoutes]);

  // Heatmap layer (simulated with circles)
  useEffect(() => {
    const layer = heatLayerRef.current;
    layer.clearLayers();
    if (!mapLayers.heatmap) return;

    heatmap.forEach((pt) => {
      const r = 20 + pt.intensity * 40;
      L.circle([pt.lat, pt.lng], {
        radius: r * 1000,
        color: 'transparent',
        fillColor: `hsl(${Math.floor((1 - pt.intensity) * 120)}, 100%, 50%)`,
        fillOpacity: 0.2 * pt.intensity,
        weight: 0,
      })
        .bindTooltip(pt.label, { permanent: false, direction: 'top', className: 'leaflet-tooltip-dark' })
        .addTo(layer);
    });
  }, [heatmap, mapLayers.heatmap]);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}
