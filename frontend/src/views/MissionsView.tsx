import React, { useEffect, useState } from 'react';
import { Target, Plus, ChevronRight } from 'lucide-react';
import { missionsApi } from '../api/foundryApi';
import type { Mission } from '../types';
import { Badge, Button, Input, Select, Spinner, StatusDot } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';

export default function MissionsView() {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selected, setSelected] = useState<(Mission & { resources?: unknown[]; organizations?: unknown[]; timeline?: unknown[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newMission, setNewMission] = useState({ name: '', description: '', priority: 'HIGH' });
  const [creating, setCreating] = useState(false);

  const load = () => missionsApi.list().then(setMissions).finally(() => setLoading(false));

  useEffect(() => { load(); }, [language]);

  const openMission = async (m: Mission) => {
    setDetailLoading(true);
    try {
      const detail = await missionsApi.get(m.id);
      setSelected(detail);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await missionsApi.setStatus(id, status);
    await load();
    if (selected?.id === id) {
      const detail = await missionsApi.get(id);
      setSelected(detail);
    }
  };

  const create = async () => {
    if (!newMission.name) return;
    setCreating(true);
    try {
      await missionsApi.create(newMission);
      await load();
      setShowNew(false);
      setNewMission({ name: '', description: '', priority: 'HIGH' });
    } finally {
      setCreating(false);
    }
  };

  const priorityColors: Record<string, string> = { CRITICAL: '#ff3a3a', HIGH: '#ff8c00', MEDIUM: '#ffcc00', LOW: '#64748b' };

  if (loading) {
    return <div className="flex items-center justify-center h-full gap-3"><Spinner size={18} /><span className="text-foundry-muted text-sm">{t('common.loading')}</span></div>;
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Mission list */}
      <div className="w-72 shrink-0 border-r border-foundry-border bg-foundry-surface flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-foundry-border">
          <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">{t('mis.title')} ({missions.length})</span>
          <Button variant="ghost" size="xs" icon={<Plus size={12} />} onClick={() => setShowNew(!showNew)}>{t('common.add')}</Button>
        </div>
        {showNew && (
          <div className="p-3 border-b border-foundry-border bg-foundry-card space-y-2">
            <Input placeholder="Mission name" value={newMission.name} onChange={e => setNewMission(p => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Description" value={newMission.description} onChange={e => setNewMission(p => ({ ...p, description: e.target.value }))} />
            <Select value={newMission.priority} onChange={e => setNewMission(p => ({ ...p, priority: e.target.value }))}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <div className="flex gap-2">
              <Button variant="primary" size="xs" loading={creating} onClick={create}>Create</Button>
              <Button variant="ghost" size="xs" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto divide-y divide-foundry-border">
          {missions.map((m) => (
            <button
              key={m.id}
              onClick={() => openMission(m)}
              className={`w-full text-left p-3 hover:bg-foundry-hover transition-colors ${selected?.id === m.id ? 'bg-foundry-card' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: priorityColors[m.priority] ?? '#64748b' }} />
                  <span className="text-xs font-medium text-foundry-text truncate max-w-40">{m.name}</span>
                </div>
                <ChevronRight size={12} className="text-foundry-muted shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-1 ml-3.5">
                <StatusDot status={m.status} />
                <span className="text-[10px] text-foundry-muted capitalize">{m.status}</span>
                {m.resource_count !== undefined && (
                  <span className="text-[10px] text-foundry-muted ml-auto">{m.resource_count} resources</span>
                )}
              </div>
              {m.lead_org_name && (
                <div className="text-[10px] text-foundry-muted ml-3.5 mt-0.5 truncate">{m.lead_org_name}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mission detail */}
      <div className="flex-1 overflow-y-auto p-4">
        {detailLoading && (
          <div className="flex items-center gap-3 py-8"><Spinner /><span className="text-foundry-muted text-sm">{t('mis.detailLoading')}</span></div>
        )}
        {!selected && !detailLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Target size={32} className="text-foundry-muted opacity-30 mb-4" />
            <p className="text-foundry-muted text-sm">{t('mis.selectMission')}</p>
          </div>
        )}
        {selected && !detailLoading && (
          <div className="space-y-4 max-w-3xl">
            {/* Header */}
            <div className="flex items-start gap-4 p-4 bg-foundry-card border border-foundry-border rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                <Target size={18} className="text-foundry-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-base font-semibold text-foundry-text">{selected.name}</h2>
                  <Badge label={selected.status} />
                  <Badge label={selected.priority} />
                </div>
                {selected.description && <p className="text-xs text-foundry-text-dim mt-1">{selected.description}</p>}
                <div className="flex gap-4 mt-2 text-[11px] text-foundry-muted">
                  {selected.lead_org_name && <span>Lead: <span className="text-foundry-text">{selected.lead_org_name}</span></span>}
                  {selected.weather_event_name && <span>Event: <span className="text-foundry-text">{selected.weather_event_name}</span></span>}
                  {selected.start_date && <span>Start: <span className="text-foundry-text">{selected.start_date}</span></span>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['active', 'suspended', 'completed'].filter(s => s !== selected.status).map(s => (
                  <Button
                    key={s}
                    variant={s === 'active' ? 'success' : s === 'suspended' ? 'secondary' : 'ghost'}
                    size="xs"
                    onClick={() => updateStatus(selected.id, s)}
                  >
                    → {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Resources */}
            {selected.resources && selected.resources.length > 0 && (
              <div className="bg-foundry-card border border-foundry-border rounded-lg">
                <div className="px-4 py-3 border-b border-foundry-border text-xs font-semibold uppercase tracking-widest text-foundry-muted">
                  Deployed Resources ({selected.resources.length})
                </div>
                <div className="divide-y divide-foundry-border">
                  {(selected.resources as (Record<string, unknown>)[]).map((r: Record<string, unknown>) => (
                    <div key={r.id as string} className="flex items-center gap-3 px-4 py-2.5">
                      <StatusDot status={r.status as string} />
                      <div className="flex-1">
                        <div className="text-xs text-foundry-text">{r.name as string}</div>
                        {r.resource_type ? <div className="text-[10px] text-foundry-muted">{r.resource_type as string}</div> : null}
                      </div>
                      {r.location ? <span className="text-[10px] text-foundry-muted">{r.location as string}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizations */}
            {selected.organizations && selected.organizations.length > 0 && (
              <div className="bg-foundry-card border border-foundry-border rounded-lg">
                <div className="px-4 py-3 border-b border-foundry-border text-xs font-semibold uppercase tracking-widest text-foundry-muted">
                  Participating Organizations ({selected.organizations.length})
                </div>
                <div className="divide-y divide-foundry-border">
                  {(selected.organizations as (Record<string, unknown>)[]).map((o: Record<string, unknown>) => (
                    <div key={o.id as string} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-foundry-purple text-sm">🏢</span>
                      <div className="text-xs text-foundry-text">{o.name as string}</div>
                      {o.org_type ? <Badge label={o.org_type as string} className="ml-auto" /> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {selected.timeline && selected.timeline.length > 0 && (
              <div className="bg-foundry-card border border-foundry-border rounded-lg">
                <div className="px-4 py-3 border-b border-foundry-border text-xs font-semibold uppercase tracking-widest text-foundry-muted">
                  Timeline
                </div>
                <div className="p-4 space-y-2">
                  {(selected.timeline as (Record<string, unknown>)[]).map((ev: Record<string, unknown>) => (
                    <div key={ev.id as string} className="flex gap-3 text-xs">
                      <span className="text-[10px] text-foundry-muted font-mono-code w-32 shrink-0">
                        {new Date(ev.created_at as string).toLocaleString()}
                      </span>
                      <span className="text-foundry-text">{ev.title as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
