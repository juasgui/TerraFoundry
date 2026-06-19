import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Users, Truck, Target, TrendingUp, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/foundryApi';
import type { DecisionIntel, DashboardMetrics } from '../types';
import { Spinner } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';

export default function CommanderView() {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [intel, setIntel] = useState<DecisionIntel | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [m, i] = await Promise.all([dashboardApi.metrics(), dashboardApi.decisionIntel()]);
      setMetrics(m);
      setIntel(i);
      setLastUpdate(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [language]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Spinner size={20} />
        <span className="text-foundry-muted text-sm">{t('common.loading')}</span>
      </div>
    );
  }

  const topRisks = intel?.emergingRisks.slice(0, 4) ?? [];
  const topActions = intel?.recommendations.slice(0, 3) ?? [];

  return (
    <div className="h-full overflow-y-auto bg-foundry-bg">
      {/* Commander Header */}
      <div className="border-b border-foundry-border bg-foundry-surface">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
                <Shield size={16} className="text-foundry-accent" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foundry-text tracking-wide">{t('cmd.dashboardTitle')}</h1>
                <p className="text-[10px] text-foundry-muted uppercase tracking-widest">{t('cmd.crisisSubtitle')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="flex items-center gap-1.5 text-[10px] text-foundry-muted hover:text-foundry-accent transition-colors">
              <RefreshCw size={10} />
              {t('cmd.updated')} {lastUpdate.toLocaleTimeString()}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs text-foundry-accent border border-foundry-accent/40 px-3 py-1.5 rounded hover:bg-foundry-accent/10 transition-colors"
            >
              <Eye size={12} />
              {t('cmd.executiveSummary')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6 space-y-6">
        {/* National Status — 4 big numbers */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: t('cmd.nationalRiskIndex'),
              value: `${metrics?.riskIndex ?? 0}/10`,
              sub: t('cmd.compoundMultiHazard'),
              color: '#ff3a3a',
              bg: 'from-red-950/60 to-red-900/20',
              border: 'border-red-800/40',
              icon: <Shield size={20} />,
            },
            {
              label: t('cmd.peopleAffected'),
              value: `${((metrics?.totalAffected ?? 0) / 1e6).toFixed(2)}M`,
              sub: t('cmd.kDisplaced', { n: ((metrics?.totalDisplaced ?? 0) / 1000).toFixed(0) }),
              color: '#ff8c00',
              bg: 'from-orange-950/60 to-orange-900/20',
              border: 'border-orange-800/40',
              icon: <Users size={20} />,
            },
            {
              label: t('cmd.activeHazardEvents'),
              value: metrics?.activeHazards ?? 0,
              sub: t('cmd.provincesAffectedSub', { n: String(metrics?.provincesAffected ?? 0) }),
              color: '#ffcc00',
              bg: 'from-yellow-950/60 to-yellow-900/20',
              border: 'border-yellow-800/40',
              icon: <AlertTriangle size={20} />,
            },
            {
              label: t('cmd.responseMissions'),
              value: metrics?.activeMissions ?? 0,
              sub: t('cmd.resourcesDeployedSub', { n: String(metrics?.deployedResources ?? 0) }),
              color: '#00ff9d',
              bg: 'from-emerald-950/60 to-emerald-900/20',
              border: 'border-emerald-800/40',
              icon: <Target size={20} />,
            },
          ].map((kpi) => (
            <div key={kpi.label} className={`bg-gradient-to-br ${kpi.bg} border ${kpi.border} rounded-xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foundry-muted">{kpi.label}</span>
                <span style={{ color: kpi.color, opacity: 0.6 }}>{kpi.icon}</span>
              </div>
              <div className="text-4xl font-bold font-mono-code mb-1" style={{ color: kpi.color }}>
                {kpi.value}
              </div>
              <div className="text-[11px] text-foundry-muted">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Two columns: top risks + recommended actions */}
        <div className="grid grid-cols-2 gap-6">
          {/* Top risks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-red-500 rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-foundry-text">{t('dc.emergingRisks')}</h2>
              <span className="text-[10px] text-foundry-muted ml-1">— {topRisks.length} critical / high</span>
            </div>
            <div className="space-y-3">
              {topRisks.map((risk, i) => {
                const sevColor = risk.severity === 'CRITICAL' ? '#ff3a3a' : '#ff8c00';
                return (
                  <div key={risk.id} className="bg-foundry-card border border-foundry-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="text-xs font-bold w-5 h-5 rounded flex items-center justify-center shrink-0"
                        style={{ background: sevColor + '20', color: sevColor }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-foundry-text leading-snug">{risk.title}</p>
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded border shrink-0"
                            style={{ color: sevColor, borderColor: sevColor + '40', background: sevColor + '10' }}
                          >
                            {risk.severity}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-foundry-muted">
                          <span>⏱ {risk.timeHorizon}</span>
                          <span>👥 {(risk.affectedPopulation / 1000).toFixed(0)}K at risk</span>
                          <span className="font-mono-code text-foundry-accent">{risk.confidence}% conf.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-cyan-500 rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-foundry-text">{t('cmd.keyDecisions')}</h2>
            </div>
            <div className="space-y-3">
              {topActions.map((rec) => (
                <div key={rec.id} className="bg-foundry-card border border-foundry-border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded border shrink-0"
                      style={{ color: rec.priorityColor, borderColor: rec.priorityColor + '40', background: rec.priorityColor + '10' }}
                    >
                      {rec.priority}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foundry-text mb-1 leading-snug">{rec.title}</p>
                      <p className="text-[11px] text-foundry-muted mb-2">{rec.description}</p>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#00ff9d' }}>
                        <TrendingUp size={10} />
                        <span>{rec.expectedImpact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resource gap summary */}
        <div className="bg-foundry-card border border-foundry-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck size={15} className="text-foundry-muted" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-foundry-text">{t('cmd.resourceDeployment')}</h2>
            </div>
            <button
              onClick={() => navigate('/assets')}
              className="flex items-center gap-1 text-[10px] text-foundry-accent hover:text-cyan-300 transition-colors"
            >
              {t('cmd.fullAssetView')} <ChevronRight size={10} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { labelKey: 'cmd.medicalTeams', value: '24', cap: '30', pct: 80, color: '#a78bfa' },
              { labelKey: 'cmd.logisticsActive', value: '38', cap: '52', pct: 73, color: '#facc15' },
              { labelKey: 'cmd.helicopters', value: '6', cap: '8', pct: 75, color: '#38bdf8' },
              { labelKey: 'cmd.shelterSites', value: '12', cap: '20', pct: 60, color: '#4ade80' },
            ].map((r) => (
              <div key={r.labelKey} className="space-y-2">
                <div className="text-[10px] text-foundry-muted uppercase tracking-wider">{t(r.labelKey)}</div>
                <div className="text-xl font-bold font-mono-code" style={{ color: r.color }}>
                  {r.value}<span className="text-xs text-foundry-muted font-normal">/{r.cap}</span>
                </div>
                <div className="h-1.5 bg-foundry-surface rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-foundry-border">
          <p className="text-[10px] text-foundry-muted">{t('cmd.classification')}</p>
          <p className="text-[10px] text-foundry-muted font-mono-code">{new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
