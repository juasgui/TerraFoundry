import React, { useEffect, useState } from 'react';
import { Package, CheckCircle, Truck, Wrench, AlertCircle } from 'lucide-react';
import { assetsApi, missionsApi } from '../api/foundryApi';
import type { Asset, Mission } from '../types';
import { Badge, Button, Select, Spinner, StatusDot } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';

type StatusFlow = 'available' | 'deployed' | 'in_transit' | 'maintenance';
const FLOW: StatusFlow[] = ['available', 'deployed', 'in_transit', 'maintenance'];

export default function AssetsView() {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [working, setWorking] = useState<Record<string, boolean>>({});

  const load = async () => {
    const [a, m] = await Promise.all([assetsApi.list(), missionsApi.list()]);
    setAssets(a);
    setMissions(m.filter(m => m.status === 'active' || m.status === 'planning'));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [language]);

  const setStatus = async (id: string, status: string) => {
    setWorking(w => ({ ...w, [id]: true }));
    try {
      await assetsApi.setStatus(id, status);
      await load();
    } finally {
      setWorking(w => ({ ...w, [id]: false }));
    }
  };

  const assign = async (id: string, missionId: string) => {
    setWorking(w => ({ ...w, [id]: true }));
    try {
      await assetsApi.assign(id, missionId);
      await load();
    } finally {
      setWorking(w => ({ ...w, [id]: false }));
    }
  };

  const unassign = async (id: string) => {
    setWorking(w => ({ ...w, [id]: true }));
    try {
      await assetsApi.unassign(id);
      await load();
    } finally {
      setWorking(w => ({ ...w, [id]: false }));
    }
  };

  const filtered = filter ? assets.filter(a => a.status === filter) : assets;

  const counts = FLOW.reduce((acc, s) => ({ ...acc, [s]: assets.filter(a => a.status === s).length }), {} as Record<string, number>);
  const statusIcons: Record<string, React.ReactNode> = {
    available: <CheckCircle size={12} />,
    deployed: <Package size={12} />,
    in_transit: <Truck size={12} />,
    maintenance: <Wrench size={12} />,
  };
  const statusColors: Record<string, string> = {
    available: 'text-foundry-muted',
    deployed: 'text-emerald-400',
    in_transit: 'text-cyan-400',
    maintenance: 'text-yellow-400',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full gap-3"><Spinner size={18} /><span className="text-foundry-muted text-sm">{t('common.loading')}</span></div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Status summary cards */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-foundry-border bg-foundry-surface shrink-0">
        {FLOW.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? '' : s)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              filter === s ? 'border-foundry-accent/50 bg-foundry-accent/10' : 'border-foundry-border bg-foundry-card hover:border-foundry-border/80'
            }`}
          >
            <span className={statusColors[s]}>{statusIcons[s]}</span>
            <div className="text-left">
              <div className={`text-lg font-bold font-mono-code ${statusColors[s]}`}>{counts[s] ?? 0}</div>
              <div className="text-[10px] text-foundry-muted capitalize">{s.replace('_', ' ')}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-foundry-surface z-10">
            <tr className="border-b border-foundry-border">
              <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider">{t('ast.colAsset')}</th>
              <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-28">{t('common.status')}</th>
              <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-28">{t('common.type')}</th>
              <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider">{t('common.location')}</th>
              <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider">{t('mis.title')}</th>
              <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-64">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foundry-border">
            {filtered.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                missions={missions}
                working={!!working[asset.id]}
                onSetStatus={(s) => setStatus(asset.id, s)}
                onAssign={(mId) => assign(asset.id, mId)}
                onUnassign={() => unassign(asset.id)}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-foundry-muted text-sm">
            <AlertCircle size={16} className="mr-2" />
            {t('ast.noAssetsFilter', { s: filter })}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetRow({ asset, missions, working, onSetStatus, onAssign, onUnassign }: {
  asset: Asset;
  missions: Mission[];
  working: boolean;
  onSetStatus: (s: string) => void;
  onAssign: (mId: string) => void;
  onUnassign: () => void;
}) {
  const t = useT();
  const [missionPick, setMissionPick] = useState('');
  const nextStatuses: Record<string, string[]> = {
    available: ['deployed', 'maintenance'],
    deployed: ['in_transit', 'available'],
    in_transit: ['deployed', 'available'],
    maintenance: ['available'],
  };
  const next = nextStatuses[asset.status] ?? [];

  return (
    <tr className="hover:bg-foundry-hover">
      <td className="px-4 py-3">
        <div className="font-medium text-foundry-text">{asset.name}</div>
        <div className="text-[10px] font-mono-code text-foundry-muted">{asset.id}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <StatusDot status={asset.status} />
          <span className="capitalize">{asset.status.replace('_', ' ')}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-foundry-text-dim">{asset.resource_type ?? asset.properties?.resource_type as string ?? '—'}</td>
      <td className="px-4 py-3 text-foundry-muted">{asset.location ?? asset.properties?.location as string ?? '—'}</td>
      <td className="px-4 py-3">
        {asset.assigned_mission_name ? (
          <span className="text-foundry-accent text-[11px]">◎ {asset.assigned_mission_name}</span>
        ) : (
          <span className="text-foundry-muted text-[11px]">{t('ast.unassigned')}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {next.map((s) => (
            <Button
              key={s}
              variant={s === 'deployed' ? 'success' : s === 'maintenance' ? 'secondary' : 'secondary'}
              size="xs"
              loading={working}
              onClick={() => onSetStatus(s)}
            >
              → {s.replace('_', ' ')}
            </Button>
          ))}
          {!asset.assigned_mission_id && missions.length > 0 && (
            <div className="flex items-center gap-1">
              <Select
                className="text-[10px] py-0.5 px-1 h-6"
                value={missionPick}
                onChange={(e) => setMissionPick(e.target.value)}
              >
                <option value="">{t('ast.assign')}</option>
                {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
              {missionPick && (
                <Button variant="primary" size="xs" loading={working} onClick={() => onAssign(missionPick)}>Go</Button>
              )}
            </div>
          )}
          {asset.assigned_mission_id && (
            <Button variant="ghost" size="xs" loading={working} onClick={onUnassign}>{t('ast.unassign')}</Button>
          )}
        </div>
      </td>
    </tr>
  );
}
