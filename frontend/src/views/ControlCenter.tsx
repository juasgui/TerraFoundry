import React, { useEffect, useState } from 'react';
import { AlertTriangle, Users, Wind, Truck, Activity, Heart, TrendingUp, Radio } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppStore } from '../store/appStore';
import { dashboardApi } from '../api/foundryApi';
import type { OntologyEvent, ChartData } from '../types';
import { Badge, KpiCard, Spinner, TimelineItem } from '../components/ui';

export default function ControlCenter() {
  const { metrics, setMetrics, alerts, setAlerts } = useAppStore();
  const [timeline, setTimeline] = useState<OntologyEvent[]>([]);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.metrics(),
      dashboardApi.alerts(),
      dashboardApi.timeline(),
      dashboardApi.charts(),
    ]).then(([m, a, t, c]) => {
      setMetrics(m);
      setAlerts(a);
      setTimeline(t);
      setCharts(c);
    }).finally(() => setLoading(false));

    const id = setInterval(async () => {
      const [m, a] = await Promise.all([dashboardApi.metrics(), dashboardApi.alerts()]);
      setMetrics(m);
      setAlerts(a);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Spinner size={20} />
        <span className="text-foundry-muted text-sm">Loading Common Operating Picture…</span>
      </div>
    );
  }

  const unack = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Status banner */}
      <div className="flex items-center gap-3 px-4 py-2 bg-red-950/40 border border-red-800/40 rounded-lg">
        <Radio size={14} className="text-red-400 blink shrink-0" />
        <span className="text-xs text-red-300">
          <span className="font-bold">ACTIVE EMERGENCY:</span> Mozambique multi-hazard compound crisis — {metrics?.activeHazards ?? 0} active events · {metrics?.provincesAffected ?? 0} provinces affected
        </span>
        <span className="ml-auto text-[10px] text-red-500 font-mono-code">{new Date(metrics?.lastUpdated ?? '').toLocaleTimeString()}</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Affected" value={`${((metrics?.totalAffected ?? 0) / 1e6).toFixed(2)}M`}
          sub="people" color="#ff8c00" icon={<Users size={14} />} />
        <KpiCard label="Displaced" value={`${((metrics?.totalDisplaced ?? 0) / 1000).toFixed(0)}K`}
          sub="people" color="#ffcc00" icon={<TrendingUp size={14} />} />
        <KpiCard label="Active Hazards" value={metrics?.activeHazards ?? 0}
          sub="events" color="#ff3a3a" icon={<Wind size={14} />} />
        <KpiCard label="Deployed Assets" value={metrics?.deployedResources ?? 0}
          sub="resources" color="#00ff9d" icon={<Truck size={14} />} />
        <KpiCard label="Critical Alerts" value={unack.filter(a => a.severity === 'CRITICAL').length}
          sub="unacknowledged" color="#ff3a3a" icon={<AlertTriangle size={14} />} />
        <KpiCard label="Cholera Cases" value={`${((metrics?.choleraCases ?? 0) / 1000).toFixed(1)}K`}
          sub="cumulative" color="#a78bfa" icon={<Heart size={14} />} />
      </div>

      {/* Risk index bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-foundry-card border border-foundry-border rounded-lg">
        <Activity size={13} className="text-foundry-muted shrink-0" />
        <span className="text-xs text-foundry-muted w-24 shrink-0">Risk Index</span>
        <div className="flex-1 h-2 bg-foundry-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((metrics?.riskIndex ?? 0) / 10) * 100}%`,
              background: `linear-gradient(90deg, #00ff9d, #ffcc00, #ff3a3a)`,
            }}
          />
        </div>
        <span className="text-sm font-bold font-mono-code text-red-400 w-10 text-right">{metrics?.riskIndex ?? 0}/10</span>
      </div>

      {/* Charts + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Province chart */}
        {charts && (
          <div className="bg-foundry-card border border-foundry-border rounded-lg p-4 col-span-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Affected by Province</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={charts.byProvince.slice(0, 7)} barSize={14}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={36} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: '#1a2030', border: '1px solid #1e2d3d', borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(v: number) => [`${(v / 1000).toFixed(0)}K`, 'Affected']}
                />
                <Bar dataKey="affected" radius={[2, 2, 0, 0]}>
                  {charts.byProvince.slice(0, 7).map((entry, i) => (
                    <Cell key={i} fill={entry.severity === 'CRITICAL' ? '#ff3a3a' : entry.severity === 'HIGH' ? '#ff8c00' : '#ffcc00'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trend line */}
        {charts && (
          <div className="bg-foundry-card border border-foundry-border rounded-lg p-4 col-span-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Affected Trend</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={charts.affectedTrend}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: '#1a2030', border: '1px solid #1e2d3d', borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number, name: string) => [`${(v / 1000).toFixed(0)}K`, name]}
                />
                <Line type="monotone" dataKey="affected" stroke="#ff8c00" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="displaced" stroke="#ffcc00" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Active alerts */}
        <div className="bg-foundry-card border border-foundry-border rounded-lg col-span-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-foundry-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">Critical Alerts</span>
            <span className="text-[10px] font-mono-code text-red-400">{unack.length} unack'd</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-foundry-border">
            {unack.length === 0 && (
              <div className="p-4 text-xs text-foundry-muted">All alerts acknowledged.</div>
            )}
            {unack.slice(0, 6).map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </div>
      </div>

      {/* Missions + Timeline row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Object type breakdown */}
        {charts && (
          <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Ontology Breakdown</div>
            <div className="grid grid-cols-3 gap-2">
              {charts.byType.map((t) => (
                <div key={t.name} className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                  <span className="text-[11px] text-foundry-text-dim truncate">{t.name}</span>
                  <span className="ml-auto text-[11px] font-mono-code font-semibold text-foundry-text">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline feed */}
        <div className="bg-foundry-card border border-foundry-border rounded-lg flex flex-col max-h-64">
          <div className="px-4 py-3 border-b border-foundry-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">Live Event Feed</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {timeline.slice(0, 10).map((ev) => (
              <TimelineItem
                key={ev.id}
                title={ev.title}
                sub={ev.description}
                ts={ev.created_at}
                icon={<Activity size={8} />}
                color="#00d4ff"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Health cases */}
      {charts && charts.healthCases.length > 0 && (
        <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Health Surveillance</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {charts.healthCases.map((h) => (
              <div key={h.disease} className="bg-foundry-surface rounded p-3 border border-foundry-border">
                <div className="text-xs text-foundry-muted mb-1">{h.disease}</div>
                <div className="text-lg font-bold font-mono-code text-red-400">{h.cases.toLocaleString()}</div>
                <Badge label={h.severity} className="mt-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: { id: string; severity: string; title: string; description?: string; created_at: string } }) {
  const { acknowledgeAlert } = useAppStore();
  const colors: Record<string, string> = { CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-yellow-400' };
  return (
    <div className="flex items-start gap-2 px-3 py-2 hover:bg-foundry-hover group">
      <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${colors[alert.severity] ?? 'text-foundry-muted'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foundry-text truncate">{alert.title}</p>
        {alert.description && <p className="text-[10px] text-foundry-muted truncate">{alert.description}</p>}
        <p className="text-[10px] text-foundry-muted font-mono-code">{new Date(alert.created_at).toLocaleTimeString()}</p>
      </div>
      <button
        onClick={() => { acknowledgeAlert(alert.id); dashboardApi.acknowledgeAlert(alert.id); }}
        className="opacity-0 group-hover:opacity-100 text-[10px] text-foundry-muted hover:text-foundry-accent shrink-0"
      >
        ACK
      </button>
    </div>
  );
}
