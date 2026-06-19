import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, TrendingUp, Users, Wind, Truck, Radio,
  ChevronRight, Activity, Zap, Shield, ArrowUp, ArrowDown,
  Clock, CheckCircle, Target, Eye, RefreshCw, Brain,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/foundryApi';
import { useAppStore } from '../store/appStore';
import type { DecisionIntel, EmergingRisk, OperationalRecommendation, DeltaItem, DashboardMetrics } from '../types';
import { Badge, KpiCard, Spinner } from '../components/ui';
import { useT } from '../i18n/useT';

const CATEGORY_ICONS: Record<string, string> = {
  health: '🦠', shelter: '🏚️', flood: '🌊', food: '🍽️',
  logistics: '🚛', water: '💧', alert: '🔴',
};

const CATEGORY_COLORS: Record<string, string> = {
  health: '#a78bfa', shelter: '#fb923c', flood: '#38bdf8',
  food: '#4ade80', logistics: '#facc15', water: '#22d3ee', alert: '#f87171',
};

const DIRECTION_ICONS: Record<string, React.ReactNode> = {
  up:      <ArrowUp size={10} className="text-red-400" />,
  down:    <ArrowDown size={10} className="text-orange-400" />,
  alert:   <AlertTriangle size={10} className="text-orange-400" />,
  neutral: <Activity size={10} className="text-foundry-muted" />,
};

export default function DecisionCenter() {
  const t = useT();
  const { metrics, setMetrics, alerts, setAlerts } = useAppStore();
  const language = useAppStore((s) => s.language);
  const [intel, setIntel] = useState<DecisionIntel | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<EmergingRisk | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [m, a, i] = await Promise.all([
        dashboardApi.metrics(),
        dashboardApi.alerts(),
        dashboardApi.decisionIntel(),
      ]);
      setMetrics(m);
      setAlerts(a);
      setIntel(i);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }, [setMetrics, setAlerts]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load, language]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Brain size={22} className="text-foundry-accent" />
        </div>
        <span className="text-foundry-muted text-sm">{t('dc.loadingIntel')}</span>
      </div>
    );
  }

  const unack = alerts.filter((a) => !a.acknowledged);
  const critCount = unack.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <div className="h-full overflow-y-auto">
      {/* System Banner */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2 bg-red-950/60 border-b border-red-800/40 backdrop-blur-sm">
        <Radio size={12} className="text-red-400 blink shrink-0" />
        <span className="text-xs text-red-300 flex-1">
          <span className="font-bold">{t('ops.activeEmergency')}:</span>{' '}
          {t('ops.multiHazard', { events: String(metrics?.activeHazards ?? 0), provinces: String(metrics?.provincesAffected ?? 0) })}
          {' '}· {((metrics?.totalAffected ?? 0) / 1e6).toFixed(2)}M {t('kpi.people')} at risk
        </span>
        <button onClick={load} className="flex items-center gap-1 text-[10px] text-red-400/60 hover:text-red-300 transition-colors">
          <RefreshCw size={10} />
          <span className="font-mono">{lastRefresh.toLocaleTimeString()}</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label={t('kpi.affected')} value={`${((metrics?.totalAffected ?? 0) / 1e6).toFixed(2)}M`}
            sub={t('kpi.people')} color="#ff8c00" icon={<Users size={14} />} />
          <KpiCard label={t('kpi.displaced')} value={`${((metrics?.totalDisplaced ?? 0) / 1000).toFixed(0)}K`}
            sub={t('kpi.people')} color="#ffcc00" icon={<TrendingUp size={14} />} />
          <KpiCard label={t('kpi.activeHazards')} value={metrics?.activeHazards ?? 0}
            sub={t('kpi.events')} color="#ff3a3a" icon={<Wind size={14} />} />
          <KpiCard label={t('kpi.deployedAssets')} value={metrics?.deployedResources ?? 0}
            sub={t('kpi.resources')} color="#00ff9d" icon={<Truck size={14} />} />
          <KpiCard label={t('kpi.criticalAlerts')} value={critCount}
            sub={t('kpi.unacknowledged')} color="#ff3a3a" icon={<AlertTriangle size={14} />} />
          <KpiCard label={t('kpi.activeMissions')} value={metrics?.activeMissions ?? 0}
            sub={t('kpi.operations')} color="#a78bfa" icon={<Target size={14} />} />
        </div>

        {/* Risk Index */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-foundry-card border border-foundry-border rounded-lg">
          <Shield size={13} className="text-foundry-muted shrink-0" />
          <span className="text-xs text-foundry-muted w-24 shrink-0">{t('dc.nationalRiskIndex')}</span>
          <div className="flex-1 h-2.5 bg-foundry-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((metrics?.riskIndex ?? 0) / 10) * 100}%`,
                background: 'linear-gradient(90deg, #00ff9d, #ffcc00, #ff3a3a)',
              }}
            />
          </div>
          <span className="text-sm font-bold font-mono-code text-red-400 w-12 text-right">
            {metrics?.riskIndex ?? 0}/10
          </span>
        </div>

        {/* Main intelligence grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* EMERGING RISKS — left 3/5 */}
          <div className="xl:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest text-foundry-text">{t('dc.emergingRisks')}</span>
                {intel && (
                  <span className="text-[10px] text-foundry-muted font-mono-code ml-1">
                    {t('dc.detectedAiGenerated', { n: String(intel.emergingRisks.length) })} {new Date(intel.generatedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/objects')}
                className="flex items-center gap-1 text-[10px] text-foundry-accent hover:text-cyan-300 transition-colors"
              >
                {t('dc.viewAllObjects')} <ChevronRight size={10} />
              </button>
            </div>

            <div className="space-y-2">
              {intel?.emergingRisks.map((risk) => (
                <RiskCard
                  key={risk.id}
                  risk={risk}
                  selected={selectedRisk?.id === risk.id}
                  onClick={() => setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)}
                />
              ))}
              {!intel?.emergingRisks.length && (
                <div className="text-center py-8 text-foundry-muted text-xs">{t('dc.noRisks')}</div>
              )}
            </div>
          </div>

          {/* RECOMMENDED ACTIONS — right 2/5 */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-cyan-500 rounded-full" />
              <span className="text-xs font-bold uppercase tracking-widest text-foundry-text">{t('dc.recommendations')}</span>
            </div>

            <div className="space-y-2">
              {intel?.recommendations.map((rec) => (
                <ActionCard key={rec.id} rec={rec} />
              ))}
            </div>

            {/* Quick links */}
            <div className="pt-2 space-y-1.5">
              {[
                { labelKey: 'dc.launchSimulation', path: '/simulate', icon: <Zap size={11} /> },
                { labelKey: 'dc.viewAiBriefing', path: '/ai', icon: <Brain size={11} /> },
                { labelKey: 'dc.commanderDashboard', path: '/commander', icon: <Eye size={11} /> },
              ].map(({ labelKey, path, icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-foundry-surface border border-foundry-border rounded-lg text-xs text-foundry-text-dim hover:text-foundry-accent hover:border-foundry-accent/40 transition-colors"
                >
                  <span className="text-foundry-accent">{icon}</span>
                  {t(labelKey)}
                  <ChevronRight size={10} className="ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Detail Expansion */}
        {selectedRisk && <RiskDetail risk={selectedRisk} onClose={() => setSelectedRisk(null)} />}

        {/* DAILY INTELLIGENCE BRIEFING */}
        <div className="bg-foundry-card border border-foundry-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-foundry-border bg-foundry-surface/50">
            <Activity size={13} className="text-foundry-accent" />
            <span className="text-xs font-bold uppercase tracking-widest text-foundry-text">{t('dc.dailyDelta')}</span>
            <span className="ml-auto text-[10px] text-foundry-muted">{t('dc.changedSinceYesterday')}</span>
          </div>
          <div className="divide-y divide-foundry-border">
            {intel?.delta.map((item) => (
              <DeltaRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Bottom row: alerts + agencies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-foundry-card border border-foundry-border rounded-lg flex flex-col max-h-56">
            <div className="flex items-center justify-between px-4 py-3 border-b border-foundry-border">
              <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">{t('cmd.criticalAlerts')}</span>
              <span className="text-[10px] font-mono-code text-red-400">{t('dc.unacknowledgedCount', { n: String(unack.length) })}</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-foundry-border">
              {unack.length === 0 ? (
                <div className="flex items-center gap-2 p-4 text-xs text-emerald-400">
                  <CheckCircle size={12} /> {t('dc.allAlertsAck')}
                </div>
              ) : (
                unack.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-start gap-2 px-3 py-2">
                    <AlertTriangle size={11} className={`shrink-0 mt-0.5 ${a.severity === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foundry-text truncate">{a.title}</p>
                      {a.description && <p className="text-[10px] text-foundry-muted truncate">{a.description}</p>}
                    </div>
                    <Badge label={a.severity} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Agency coordination panel */}
          <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">{t('dc.agencyCoord')}</div>
            <div className="space-y-2">
              {[
                { name: 'INGD', status: 'active', roleKey: 'dc.roleLeadAuth', color: '#00ff9d' },
                { name: 'INAM', status: 'active', roleKey: 'dc.roleMeteoro', color: '#38bdf8' },
                { name: 'WFP', status: 'active', roleKey: 'dc.roleFoodSec', color: '#facc15' },
                { name: 'UNICEF', status: 'active', roleKey: 'dc.roleChildPro', color: '#a78bfa' },
                { name: 'WHO/MISAU', status: 'active', roleKey: 'dc.roleHealth', color: '#fb923c' },
              ].map((agency) => (
                <div key={agency.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full blink" style={{ background: agency.color }} />
                  <span className="text-xs font-semibold text-foundry-text w-16">{agency.name}</span>
                  <span className="text-[10px] text-foundry-muted flex-1">{t(agency.roleKey)}</span>
                  <span className="text-[10px] font-mono-code" style={{ color: agency.color }}>LIVE</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-foundry-border">
              <button
                onClick={() => navigate('/missions')}
                className="w-full text-[10px] text-foundry-accent hover:text-cyan-300 flex items-center justify-center gap-1 transition-colors"
              >
                {t('dc.viewAllMissions')} <ChevronRight size={9} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCard({ risk, selected, onClick }: { risk: EmergingRisk; selected: boolean; onClick: () => void }) {
  const sevColor = risk.severity === 'CRITICAL' ? '#ff3a3a' : '#ff8c00';
  const catColor = CATEGORY_COLORS[risk.category] || '#64748b';
  const catIcon = CATEGORY_ICONS[risk.category] || '⚠️';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border transition-all duration-150 overflow-hidden ${
        selected
          ? 'bg-foundry-hover border-foundry-accent/60 shadow-lg shadow-cyan-500/5'
          : 'bg-foundry-card border-foundry-border hover:border-foundry-border/80 hover:bg-foundry-hover/50'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Severity indicator */}
        <div className="shrink-0 mt-0.5 flex flex-col items-center gap-1">
          <span className="text-base leading-none">{catIcon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1.5">
            <p className="text-xs font-semibold text-foundry-text flex-1 leading-snug">{risk.title}</p>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0"
              style={{ color: sevColor, borderColor: sevColor + '40', background: sevColor + '10' }}
            >
              {risk.severity}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Confidence */}
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1 bg-foundry-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${risk.confidence}%`, background: catColor }}
                />
              </div>
              <span className="text-[10px] font-mono-code" style={{ color: catColor }}>{risk.confidence}% conf.</span>
            </div>

            {/* Time horizon */}
            <div className="flex items-center gap-1 text-[10px] text-foundry-muted">
              <Clock size={9} />
              <span>{risk.timeHorizon}</span>
            </div>

            {/* Affected pop */}
            <div className="flex items-center gap-1 text-[10px] text-foundry-muted">
              <Users size={9} />
              <span>{(risk.affectedPopulation / 1000).toFixed(0)}K people</span>
            </div>

            {/* Trend badge */}
            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
              risk.trend === 'imminent' ? 'bg-red-950 text-red-400' :
              risk.trend === 'worsening' ? 'bg-orange-950 text-orange-400' :
              'bg-yellow-950 text-yellow-400'
            }`}>
              {risk.trend}
            </span>
          </div>
        </div>

        <ChevronRight size={12} className={`shrink-0 mt-1 transition-transform ${selected ? 'rotate-90 text-foundry-accent' : 'text-foundry-muted'}`} />
      </div>
    </button>
  );
}

function RiskDetail({ risk, onClose }: { risk: EmergingRisk; onClose: () => void }) {
  const catColor = CATEGORY_COLORS[risk.category] || '#64748b';
  return (
    <div className="bg-foundry-card border rounded-lg overflow-hidden" style={{ borderColor: catColor + '60' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: catColor + '40', background: catColor + '08' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{CATEGORY_ICONS[risk.category]}</span>
          <span className="text-xs font-bold text-foundry-text">{risk.title}</span>
        </div>
        <button onClick={onClose} className="text-[10px] text-foundry-muted hover:text-foundry-text px-2 py-1 rounded hover:bg-foundry-hover">
          CLOSE ✕
        </button>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-foundry-muted uppercase tracking-widest mb-2">Intelligence Assessment</div>
          <p className="text-xs text-foundry-text leading-relaxed">{risk.detail}</p>
        </div>
        <div>
          <div className="text-[10px] text-foundry-muted uppercase tracking-widest mb-2">Recommended Actions</div>
          <div className="space-y-1.5">
            {risk.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-mono-code rounded px-1.5 py-0.5 shrink-0 mt-0.5" style={{ background: catColor + '20', color: catColor }}>
                  {i + 1}
                </span>
                <p className="text-xs text-foundry-text-dim">{action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ rec }: { rec: OperationalRecommendation }) {
  const catColor = CATEGORY_COLORS[rec.category] || '#64748b';
  return (
    <div className="bg-foundry-card border border-foundry-border rounded-lg p-3 hover:border-foundry-border/70 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5"
          style={{ color: rec.priorityColor, borderColor: rec.priorityColor + '40', background: rec.priorityColor + '10' }}
        >
          {rec.priority}
        </span>
        <p className="text-xs font-semibold text-foundry-text leading-snug flex-1">{rec.title}</p>
      </div>
      <p className="text-[11px] text-foundry-muted mb-2 leading-relaxed">{rec.description}</p>
      <div className="flex items-center gap-1.5 pt-2 border-t border-foundry-border/50">
        <CheckCircle size={9} style={{ color: catColor }} />
        <span className="text-[10px] font-medium" style={{ color: catColor }}>{rec.expectedImpact}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-foundry-muted">
        <Clock size={9} />
        <span>{rec.timeframe}</span>
        <span className="mx-1">·</span>
        <Truck size={9} />
        <span className="truncate">{rec.resourcesRequired}</span>
      </div>
    </div>
  );
}

function DeltaRow({ item }: { item: DeltaItem }) {
  const sevColor = item.severity === 'CRITICAL' ? 'text-red-400' : item.severity === 'HIGH' ? 'text-orange-400' : 'text-yellow-400';
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-foundry-hover/30 transition-colors">
      <div className="flex items-center gap-1 shrink-0 w-5">
        {DIRECTION_ICONS[item.direction]}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-foundry-text">{item.metric}</span>
        {item.detail && <span className="text-[10px] text-foundry-muted ml-2">— {item.detail}</span>}
      </div>
      <span className={`text-xs font-bold font-mono-code shrink-0 ${sevColor}`}>{item.change}</span>
    </div>
  );
}
