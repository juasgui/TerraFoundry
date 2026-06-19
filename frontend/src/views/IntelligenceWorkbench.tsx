import React, { useEffect, useState, useCallback } from 'react';
import {
  GitBranch, Search, AlertTriangle, Clock, Users, Activity,
  ChevronDown, ChevronRight, ArrowRight, Shield, Database,
  BarChart2, History, Layers, Target, Cpu, RefreshCw,
} from 'lucide-react';
import { intelligenceApi } from '../api/foundryApi';
import type {
  ImpactChainResult, RootCauseResult, VulnerabilityResult,
  HistoricalResult, IntelWorkbenchSummary, IntelNode, FoundryObject,
} from '../types';
import { Spinner } from '../components/ui';
import { useT } from '../i18n/useT';

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'impact' | 'rootcause' | 'vulnerability' | 'historical';

const TABS: { id: Tab; label: string; tKey: string; icon: React.ComponentType<any>; desc: string }[] = [
  { id: 'impact',        label: 'Impact Chain',      tKey: 'intel.impactChain',    icon: GitBranch, desc: 'Trace forward cascading effects of any event' },
  { id: 'rootcause',    label: 'Root Cause',         tKey: 'intel.rootCause',      icon: Layers,    desc: 'Trace backward to identify underlying drivers' },
  { id: 'vulnerability', label: 'Vulnerability',     tKey: 'intel.vulnerability',  icon: Shield,    desc: 'Province-level exposure and risk matrix' },
  { id: 'historical',   label: 'Historical',         tKey: 'intel.historical',     icon: History,   desc: 'Compare all recorded hazard events' },
];

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#ff3a3a', HIGH: '#ff8c00', MEDIUM: '#ffcc00', LOW: '#00ff9d',
};
const SEV_BG: Record<string, string> = {
  CRITICAL: 'rgba(255,58,58,0.12)', HIGH: 'rgba(255,140,0,0.12)',
  MEDIUM: 'rgba(255,204,0,0.10)', LOW: 'rgba(0,255,157,0.08)',
};

// ── Severity badge ─────────────────────────────────────────────────────────────
function SevBadge({ sev }: { sev: string | null }) {
  if (!sev) return null;
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ color: SEV_COLOR[sev] || '#888', background: SEV_BG[sev] || 'rgba(136,136,136,0.1)' }}>
      {sev}
    </span>
  );
}

// ── Object selector ────────────────────────────────────────────────────────────
function ObjectSelector({
  objects, selected, onSelect, label,
}: {
  objects: FoundryObject[]; selected: string | null;
  onSelect: (id: string) => void; label: string;
}) {
  const [q, setQ] = useState('');

  const filtered = q.length > 0
    ? objects.filter(o => o.name.toLowerCase().includes(q.toLowerCase()) || (o as any).type_label?.toLowerCase().includes(q.toLowerCase()))
    : objects;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-foundry-border">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">{label}</div>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-foundry-muted" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search objects..."
            className="w-full pl-6 pr-2 py-1.5 bg-foundry-bg border border-foundry-border rounded text-xs text-foundry-text placeholder-foundry-muted focus:outline-none focus:border-foundry-accent"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-foundry-muted text-center">No objects found</div>
        )}
        {filtered.map(obj => {
          const o = obj as any;
          const active = selected === obj.id;
          return (
            <button
              key={obj.id}
              onClick={() => onSelect(obj.id)}
              className={`w-full text-left px-3 py-2 border-l-2 transition-colors hover:bg-foundry-hover ${
                active ? 'border-foundry-accent bg-foundry-accent/10' : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm leading-none">{o.type_icon || '●'}</span>
                <span className={`text-xs font-medium truncate ${active ? 'text-foundry-accent' : 'text-foundry-text'}`}>
                  {obj.name}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <span className="text-[10px] text-foundry-muted">{o.type_label}</span>
                {obj.severity && <SevBadge sev={obj.severity} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Impact chain node card ─────────────────────────────────────────────────────
function NodeCard({ node, compact = false }: { node: IntelNode; compact?: boolean }) {
  return (
    <div
      className={`rounded border flex-shrink-0 ${compact ? 'px-2.5 py-2 min-w-[140px] max-w-[200px]' : 'px-3 py-2.5 min-w-[160px] max-w-[220px]'}`}
      style={{ borderColor: SEV_COLOR[node.severity || ''] || '#333', background: SEV_BG[node.severity || ''] || 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base leading-none">{node.type_icon}</span>
        <div className="min-w-0">
          <div className={`font-medium leading-tight text-foundry-text truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {node.name}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        <span className="text-[10px] text-foundry-muted">{node.type_label}</span>
        {node.severity && <SevBadge sev={node.severity} />}
      </div>
      {node.affected_people && node.affected_people > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <Users size={9} className="text-foundry-muted" />
          <span className="text-[10px] text-foundry-muted">{(node.affected_people / 1000).toFixed(0)}K affected</span>
        </div>
      )}
      {node.link_label && (
        <div className="text-[10px] text-foundry-accent/70 mt-1 italic truncate">↳ {node.link_label}</div>
      )}
    </div>
  );
}

// ── IMPACT CHAIN VIEW ─────────────────────────────────────────────────────────
function ImpactChainView({ data, loading }: { data: ImpactChainResult | null; loading: boolean }) {
  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full text-foundry-muted">
      <GitBranch size={36} className="mb-3 opacity-30" />
      <p className="text-sm">Select an object to trace its impact chain</p>
      <p className="text-xs mt-1 opacity-60">Start with a weather event, infrastructure failure, or any hazard</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Objects Affected', value: data.totalObjects, icon: Database, color: '#00d4ff' },
          { label: 'People at Risk', value: data.totalAffected > 0 ? `${(data.totalAffected/1000000).toFixed(2)}M` : '—', icon: Users, color: '#ffcc00' },
          { label: 'Critical Nodes', value: data.criticalCount, icon: AlertTriangle, color: '#ff3a3a' },
          { label: 'Infra at Risk', value: data.infraAtRisk, icon: Activity, color: '#ff8c00' },
        ].map(s => (
          <div key={s.label} className="bg-foundry-surface border border-foundry-border rounded-lg p-3 flex items-center gap-3">
            <s.icon size={16} style={{ color: s.color }} className="shrink-0" />
            <div>
              <div className="text-lg font-bold text-foundry-text leading-none">{s.value}</div>
              <div className="text-[10px] text-foundry-muted mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cascade stages */}
      <div className="space-y-3">
        {data.stages.map((stage, si) => (
          <div key={stage.stage}>
            {/* Stage header */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                stage.role === 'trigger' ? 'bg-foundry-accent text-foundry-bg'
                : stage.role === 'impact' ? 'bg-orange-500/80 text-white'
                : stage.role === 'cascading' ? 'bg-red-600/80 text-white'
                : 'bg-foundry-surface border border-foundry-border text-foundry-muted'
              }`}>{stage.stage}</div>
              <div>
                <span className="text-xs font-semibold text-foundry-text">{stage.label}</span>
                <span className="text-[10px] text-foundry-muted ml-2">{stage.nodes.length} object{stage.nodes.length !== 1 ? 's' : ''}</span>
              </div>
              {si < data.stages.length - 1 && (
                <div className="flex-1 h-px bg-foundry-border ml-2" />
              )}
            </div>

            {/* Nodes row */}
            <div className="flex gap-2 flex-wrap pl-8">
              {stage.nodes.map((node, ni) => (
                <NodeCard key={`${node.id}-${ni}`} node={node} compact={stage.nodes.length > 4} />
              ))}
            </div>

            {/* Arrow between stages */}
            {si < data.stages.length - 1 && (
              <div className="flex items-center gap-2 pl-8 mt-3 mb-1">
                <ChevronDown size={14} className="text-foundry-muted opacity-50" />
                <span className="text-[10px] text-foundry-muted opacity-50">cascades to</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Narrative */}
      {data.narrative && (
        <div className="mt-6 p-4 bg-foundry-surface border border-foundry-border rounded-lg">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">AI Analysis Narrative</div>
          {data.narrative.split('\n\n').map((para, i) => (
            <p key={i} className="text-xs text-foundry-text-dim mb-2 leading-relaxed">
              {para.replace(/\*\*(.*?)\*\*/g, '$1')}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ROOT CAUSE VIEW ────────────────────────────────────────────────────────────
function RootCauseView({ data, loading }: { data: RootCauseResult | null; loading: boolean }) {
  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full text-foundry-muted">
      <Layers size={36} className="mb-3 opacity-30" />
      <p className="text-sm">Select an object to trace its root causes</p>
      <p className="text-xs mt-1 opacity-60">Best for health risks, supply disruptions, and infrastructure failures</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Root causes banner */}
      {data.rootCauses.length > 0 && (
        <div className="mb-5 p-3 rounded-lg border border-red-500/30 bg-red-900/10">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-2">Identified Root Causes</div>
          <div className="flex flex-wrap gap-2">
            {data.rootCauses.map((rc, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-foundry-surface border border-red-500/20 rounded px-2 py-1">
                <span className="text-sm">{rc.type_icon}</span>
                <span className="text-xs text-foundry-text">{rc.name}</span>
                <SevBadge sev={rc.severity} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Causal levels (root → outcome) */}
      <div className="space-y-3">
        {data.levels.map((level, li) => (
          <div key={level.level}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                level.level === data.levels.length - 1 ? 'bg-foundry-accent/20 text-foundry-accent'
                : level.level === 0 ? 'bg-red-500/20 text-red-400'
                : 'bg-foundry-surface text-foundry-muted border border-foundry-border'
              }`}>
                {level.label}
              </div>
              <span className="text-[10px] text-foundry-muted">{level.nodes.length} factor{level.nodes.length !== 1 ? 's' : ''}</span>
              {li < data.levels.length - 1 && <div className="flex-1 h-px bg-foundry-border" />}
            </div>

            <div className="flex gap-2 flex-wrap pl-4">
              {level.nodes.map((node, ni) => (
                <NodeCard key={`${node.id}-${ni}`} node={node} />
              ))}
            </div>

            {li < data.levels.length - 1 && (
              <div className="flex items-center gap-2 pl-4 mt-3 mb-1">
                <ChevronDown size={14} className="text-foundry-accent opacity-60" />
                <span className="text-[10px] text-foundry-muted opacity-60">leads to</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-[10px] text-foundry-muted">
        {data.totalFactors} contributing factors identified across {data.levels.length} causal levels
      </div>
    </div>
  );
}

// ── VULNERABILITY VIEW ────────────────────────────────────────────────────────
function VulnerabilityView({ data, loading }: { data: VulnerabilityResult | null; loading: boolean }) {
  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full text-foundry-muted">
      <Shield size={36} className="mb-3 opacity-30" />
      <p className="text-sm">Loading vulnerability matrix...</p>
    </div>
  );

  const { provinces, summary } = data;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Critical Risk', value: summary.critical, color: '#ff3a3a' },
          { label: 'High Risk', value: summary.high, color: '#ff8c00' },
          { label: 'Medium Risk', value: summary.medium, color: '#ffcc00' },
          { label: 'Low Risk', value: summary.low, color: '#00ff9d' },
        ].map(s => (
          <div key={s.label} className="bg-foundry-surface border border-foundry-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-foundry-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-foundry-muted mb-3">
        Total population at risk: <span className="text-foundry-text font-semibold">{(summary.totalAffected/1000000).toFixed(2)}M</span> — sorted by composite exposure score
      </div>

      {/* Province table */}
      <div className="space-y-2">
        {provinces.map(prov => {
          const color = SEV_COLOR[prov.risk_level] || '#888';
          const bg    = SEV_BG[prov.risk_level] || 'rgba(136,136,136,0.05)';
          return (
            <div key={prov.id} className="border border-foundry-border rounded-lg overflow-hidden" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ background: bg }}>
                {/* Province name + risk */}
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <div className="text-sm font-semibold text-foundry-text">{prov.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SevBadge sev={prov.risk_level} />
                      <span className="text-[10px] text-foundry-muted">Score: {prov.exposure_score}/10</span>
                    </div>
                  </div>
                </div>

                {/* Risk score bar */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-32 h-2 bg-foundry-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(prov.exposure_score / 10) * 100}%`, background: color }}
                    />
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color }}>{prov.exposure_score}</span>
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-6 gap-0 divide-x divide-foundry-border bg-foundry-bg/30">
                {[
                  { label: 'Affected', value: prov.affected_people > 0 ? `${(prov.affected_people/1000).toFixed(0)}K` : '—', icon: '👥' },
                  { label: 'Displaced', value: prov.displaced > 0 ? `${(prov.displaced/1000).toFixed(0)}K` : '—', icon: '🏃' },
                  { label: 'Active Hazards', value: prov.active_hazards, icon: '⚠️' },
                  { label: 'Health Risks', value: prov.health_risks, icon: '🦠' },
                  { label: 'Facilities', value: prov.health_facilities, icon: '🏥' },
                  { label: 'Shelter Use', value: prov.shelter_utilisation_pct > 0 ? `${prov.shelter_utilisation_pct}%` : '—', icon: '⛺' },
                ].map(m => (
                  <div key={m.label} className="px-3 py-2 text-center">
                    <div className="text-xs font-bold text-foundry-text">{m.value}</div>
                    <div className="text-[10px] text-foundry-muted">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── HISTORICAL VIEW ────────────────────────────────────────────────────────────
function HistoricalView({ data, loading }: { data: HistoricalResult | null; loading: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full text-foundry-muted">
      <History size={36} className="mb-3 opacity-30" />
      <p className="text-sm">Loading historical event record...</p>
    </div>
  );

  const events = data.events.sort((a, b) => (b.year || 0) - (a.year || 0));
  const maxAffected = Math.max(...events.map(e => e.total_affected || 0));

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="text-xs text-foundry-muted mb-4">
        {events.length} hazard events recorded in the Terra knowledge graph — sorted newest to oldest
      </div>

      <div className="space-y-2">
        {events.map(ev => {
          const color = ev.status === 'active' || ev.status === 'critical' ? (SEV_COLOR[ev.severity] || '#ff8c00') : '#4a5568';
          const isExpanded = expandedId === ev.id;
          const affPct = maxAffected > 0 ? ((ev.total_affected || 0) / maxAffected) * 100 : 0;

          return (
            <div key={ev.id} className="border border-foundry-border rounded-lg overflow-hidden bg-foundry-surface">
              {/* Header */}
              <button
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-foundry-hover transition-colors text-left"
                onClick={() => setExpandedId(isExpanded ? null : ev.id)}
              >
                {/* Year pill */}
                <div className="shrink-0 w-14 text-center py-1 rounded text-xs font-bold"
                  style={{ background: `${color}20`, color }}>
                  {ev.year || '?'}
                </div>

                {/* Name + type */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foundry-text truncate">{ev.name}</span>
                    {ev.status === 'active' && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}
                    {ev.status === 'resolved' && <span className="text-[10px] text-foundry-muted">resolved</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-foundry-muted">{ev.event_type}</span>
                    {ev.category && <span className="text-[10px] text-foundry-muted">{ev.category}</span>}
                    <SevBadge sev={ev.severity} />
                  </div>
                </div>

                {/* Key metrics */}
                <div className="flex items-center gap-4 shrink-0">
                  {ev.wind_speed_kmh && (
                    <div className="text-center">
                      <div className="text-xs font-bold text-foundry-text">{ev.wind_speed_kmh} km/h</div>
                      <div className="text-[10px] text-foundry-muted">Wind</div>
                    </div>
                  )}
                  {ev.rainfall_mm && (
                    <div className="text-center">
                      <div className="text-xs font-bold text-foundry-text">{ev.rainfall_mm} mm</div>
                      <div className="text-[10px] text-foundry-muted">Rainfall</div>
                    </div>
                  )}
                  {ev.total_affected && (
                    <div className="text-center">
                      <div className="text-xs font-bold text-foundry-text">{(ev.total_affected/1000000).toFixed(2)}M</div>
                      <div className="text-[10px] text-foundry-muted">Affected</div>
                    </div>
                  )}
                  {ev.estimated_deaths != null && ev.estimated_deaths > 0 && (
                    <div className="text-center">
                      <div className="text-xs font-bold text-red-400">{ev.estimated_deaths.toLocaleString()}</div>
                      <div className="text-[10px] text-foundry-muted">Deaths</div>
                    </div>
                  )}
                  <div className="text-foundry-muted">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>
              </button>

              {/* Affected bar */}
              {ev.total_affected && affPct > 0 && (
                <div className="px-4 pb-1">
                  <div className="h-1 bg-foundry-border rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${affPct}%`, background: color }} />
                  </div>
                </div>
              )}

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-foundry-border px-4 py-3 grid grid-cols-2 gap-4 bg-foundry-bg/20">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">Areas Impacted</div>
                    {ev.impacted_areas.length === 0 ? (
                      <p className="text-xs text-foundry-muted">No direct area links recorded</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {ev.impacted_areas.map((a, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded border border-foundry-border text-foundry-text-dim">
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">Response</div>
                    <div className="space-y-1">
                      {ev.missions_list.map((m, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Target size={10} className="text-foundry-accent" />
                          <span className="text-xs text-foundry-text-dim">{m.name}</span>
                          <span className="text-[10px] text-foundry-muted">({m.status})</span>
                        </div>
                      ))}
                      {ev.infra_threatened > 0 && (
                        <div className="text-xs text-foundry-muted mt-1">
                          {ev.infra_threatened} infrastructure objects threatened
                        </div>
                      )}
                      {ev.economic_loss_usd && (
                        <div className="text-xs text-orange-400 mt-1">
                          Economic loss: ${(ev.economic_loss_usd / 1e9).toFixed(1)}B estimated
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN WORKBENCH ────────────────────────────────────────────────────────────
export default function IntelligenceWorkbench() {
  const translate = useT();
  const [tab, setTab] = useState<Tab>('impact');
  const [objects, setObjects] = useState<FoundryObject[]>([]);
  const [summary, setSummary] = useState<IntelWorkbenchSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [impactData, setImpactData]  = useState<ImpactChainResult | null>(null);
  const [rootData,   setRootData]    = useState<RootCauseResult | null>(null);
  const [vulnData,   setVulnData]    = useState<VulnerabilityResult | null>(null);
  const [histData,   setHistData]    = useState<HistoricalResult | null>(null);

  const [loading, setLoading] = useState(false);

  // Load object list + summary on mount
  useEffect(() => {
    intelligenceApi.objects().then(setObjects).catch(() => {});
    intelligenceApi.summary().then(setSummary).catch(() => {});
  }, []);

  // Auto-load vulnerability and historical (no object needed)
  useEffect(() => {
    if (tab === 'vulnerability' && !vulnData) {
      setLoading(true);
      intelligenceApi.vulnerability().then(d => { setVulnData(d); setLoading(false); }).catch(() => setLoading(false));
    }
    if (tab === 'historical' && !histData) {
      setLoading(true);
      intelligenceApi.historical().then(d => { setHistData(d); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [tab]);

  // Load analysis when object selected
  const runAnalysis = useCallback((id: string, t: Tab) => {
    setLoading(true);
    if (t === 'impact') {
      intelligenceApi.impactChain(id).then(d => { setImpactData(d); setLoading(false); }).catch(() => setLoading(false));
    } else if (t === 'rootcause') {
      intelligenceApi.rootCause(id).then(d => { setRootData(d); setLoading(false); }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    runAnalysis(id, tab);
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (selectedId && (t === 'impact' || t === 'rootcause')) {
      runAnalysis(selectedId, t);
    }
  };

  const needsObjectSelect = tab === 'impact' || tab === 'rootcause';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-foundry-surface border-b border-foundry-border px-5 py-3 flex items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-foundry-accent" />
            <h1 className="text-sm font-bold text-foundry-text">{translate('intel.title')}</h1>
          </div>
          <p className="text-[10px] text-foundry-muted mt-0.5">Root cause · Impact chains · Vulnerability · Historical analysis</p>
        </div>

        {summary && (
          <div className="flex items-center gap-5 ml-auto">
            {[
              { label: 'Objects', value: summary.graphStats.totalObjects },
              { label: 'Relationships', value: summary.graphStats.totalLinks },
              { label: 'Active Hazards', value: summary.situationStats.activeHazards, highlight: true },
              { label: 'Critical', value: summary.situationStats.critObjects, highlight: true },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-sm font-bold ${s.highlight ? 'text-foundry-accent' : 'text-foundry-text'}`}>{s.value}</div>
                <div className="text-[10px] text-foundry-muted">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 px-5 bg-foundry-surface border-b border-foundry-border shrink-0">
        {TABS.map(tab_ => (
          <button
            key={tab_.id}
            onClick={() => handleTabChange(tab_.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              tab === tab_.id
                ? 'border-foundry-accent text-foundry-accent'
                : 'border-transparent text-foundry-muted hover:text-foundry-text'
            }`}
          >
            <tab_.icon size={13} />
            {translate(tab_.tKey)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — object selector (only for impact/rootcause) */}
        {needsObjectSelect && (
          <div className="w-60 bg-foundry-surface border-r border-foundry-border flex flex-col shrink-0 overflow-hidden">
            <ObjectSelector
              objects={objects}
              selected={selectedId}
              onSelect={handleSelect}
              label="Select Object to Analyse"
            />
          </div>
        )}

        {/* Main analysis area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-foundry-bg">
          {tab === 'impact' && (
            <ImpactChainView data={impactData} loading={loading} />
          )}
          {tab === 'rootcause' && (
            <RootCauseView data={rootData} loading={loading} />
          )}
          {tab === 'vulnerability' && (
            <VulnerabilityView data={vulnData} loading={loading} />
          )}
          {tab === 'historical' && (
            <HistoricalView data={histData} loading={loading} />
          )}
        </div>

        {/* Right sidebar — quick access to top hazards (impact/rootcause only) */}
        {needsObjectSelect && summary && (
          <div className="w-48 bg-foundry-surface border-l border-foundry-border flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-foundry-border">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted">{translate('intel.topHazards')}</div>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {summary.topHazards.map(h => (
                <button
                  key={h.id}
                  onClick={() => handleSelect(h.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-foundry-hover transition-colors border-l-2 ${
                    selectedId === h.id ? 'border-foundry-accent bg-foundry-accent/5' : 'border-transparent'
                  }`}
                >
                  <div className="text-[11px] font-medium text-foundry-text leading-tight truncate">{h.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <SevBadge sev={h.severity} />
                    <span className="text-[10px] text-foundry-muted">{h.link_count} links</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
