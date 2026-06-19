import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Zap, RefreshCw, AlertTriangle, Users, Home, Truck, Activity, Droplets,
  Wind, TrendingUp, Play, RotateCcw, ChevronRight,
} from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { dashboardApi } from '../api/foundryApi';
import type { SimulationResult } from '../types';
import { Badge, Button, Spinner } from '../components/ui';
import { useT } from '../i18n/useT';

const DEFAULT_PARAMS = { rainfall: 100, windSpeed: 0, riverLevel: 50, populationDisplacement: 10, foodSupply: 80 };

function SliderControl({
  label, icon, value, min, max, step = 1, unit, color, danger,
  onChange,
}: {
  label: string; icon: React.ReactNode; value: number; min: number; max: number;
  step?: number; unit: string; color: string; danger?: number;
  onChange: (v: number) => void;
}) {
  const t = useT();
  const pct = ((value - min) / (max - min)) * 100;
  const isDangerous = danger !== undefined && value >= danger;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-xs font-medium text-foundry-text">{label}</span>
          {isDangerous && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/50">{t('sim.extreme')}</span>
          )}
        </div>
        <span className="text-sm font-bold font-mono-code" style={{ color: isDangerous ? '#ff3a3a' : color }}>
          {value} <span className="text-xs font-normal text-foundry-muted">{unit}</span>
        </span>
      </div>
      <div className="relative">
        <div className="h-2 bg-foundry-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${pct}%`,
              background: isDangerous
                ? 'linear-gradient(90deg, #ff8c00, #ff3a3a)'
                : `linear-gradient(90deg, ${color}88, ${color})`,
            }}
          />
        </div>
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
        />
      </div>
      <div className="flex justify-between text-[9px] text-foundry-muted">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function RiskGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 28;
  const circumference = Math.PI * radius;
  const strokeDash = (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="44" viewBox="0 0 72 44">
        <path
          d={`M 8 40 A ${radius} ${radius} 0 0 1 64 40`}
          fill="none" stroke="#1e2d3d" strokeWidth="6" strokeLinecap="round"
        />
        <path
          d={`M 8 40 A ${radius} ${radius} 0 0 1 64 40`}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="36" y="36" textAnchor="middle" fill={color} fontSize="11" fontWeight="bold" fontFamily="monospace">
          {value}%
        </text>
      </svg>
      <span className="text-[10px] text-foundry-muted text-center leading-tight">{label}</span>
    </div>
  );
}

const SCENARIO_PRESETS = [
  {
    nameKey: 'sim.preset.baseline', descKey: 'sim.preset.baselineDesc',
    params: { rainfall: 100, windSpeed: 0, riverLevel: 50, populationDisplacement: 10, foodSupply: 80 },
    color: '#00ff9d',
  },
  {
    nameKey: 'sim.preset.cyclone', descKey: 'sim.preset.cycloneDesc',
    params: { rainfall: 280, windSpeed: 175, riverLevel: 85, populationDisplacement: 45, foodSupply: 40 },
    color: '#ff3a3a',
  },
  {
    nameKey: 'sim.preset.zambezi', descKey: 'sim.preset.zambeziDesc',
    params: { rainfall: 190, windSpeed: 20, riverLevel: 98, populationDisplacement: 60, foodSupply: 55 },
    color: '#ff8c00',
  },
  {
    nameKey: 'sim.preset.drought', descKey: 'sim.preset.droughtDesc',
    params: { rainfall: 20, windSpeed: 0, riverLevel: 15, populationDisplacement: 25, foodSupply: 15 },
    color: '#facc15',
  },
];

export default function SimulationLab() {
  const t = useT();
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSimulation = useCallback(async (p = params) => {
    setLoading(true);
    try {
      const res = await dashboardApi.simulate(p);
      setResult(res);
      setHasRun(true);
    } catch {}
    setLoading(false);
  }, [params]);

  const setParam = useCallback((key: keyof typeof params, value: number) => {
    setParams((prev) => {
      const next = { ...prev, [key]: value };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSimulation(next), 400);
      return next;
    });
  }, [runSimulation]);

  const applyPreset = useCallback((preset: typeof SCENARIO_PRESETS[0]) => {
    setParams(preset.params);
    runSimulation(preset.params);
  }, [runSimulation]);

  useEffect(() => { runSimulation(); }, []);

  const radarData = result ? [
    { metric: t('sim.floodRisk'), value: result.infrastructureStress },
    { metric: t('sim.healthRisk'), value: result.healthRisk },
    { metric: t('sim.foodInsecurity'), value: result.foodInsecurity },
    { metric: t('sim.displacementShort'), value: Math.min(100, params.populationDisplacement * 1.5) },
    { metric: t('sim.infraStress'), value: result.infrastructureStress },
    { metric: t('sim.overall'), value: result.overallRisk * 10 },
  ] : [];

  const trendData = result ? [
    { label: t('sim.day1'),  affected: Math.round(result.projectedAffected * 0.3),  displaced: Math.round(result.projectedDisplaced * 0.2) },
    { label: t('sim.day3'),  affected: Math.round(result.projectedAffected * 0.6),  displaced: Math.round(result.projectedDisplaced * 0.5) },
    { label: t('sim.day7'),  affected: Math.round(result.projectedAffected * 0.85), displaced: Math.round(result.projectedDisplaced * 0.8) },
    { label: t('sim.day14'), affected: result.projectedAffected,                    displaced: result.projectedDisplaced },
    { label: t('sim.day30'), affected: Math.round(result.projectedAffected * 0.95), displaced: result.projectedDisplaced },
  ] : [];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left panel — controls */}
      <div className="w-72 shrink-0 flex flex-col border-r border-foundry-border bg-foundry-surface">
        <div className="px-4 py-3 border-b border-foundry-border">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-foundry-accent" />
            <span className="text-sm font-bold text-foundry-text">{t('sim.title')}</span>
          </div>
          <p className="text-[10px] text-foundry-muted">{t('sim.subtitle')}</p>
        </div>

        {/* Scenario presets */}
        <div className="px-4 py-3 border-b border-foundry-border">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">{t('sim.parameters')}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.nameKey}
                onClick={() => applyPreset(preset)}
                className="text-left p-2 rounded border border-foundry-border hover:border-foundry-accent/40 bg-foundry-card hover:bg-foundry-hover transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: preset.color }} />
                  <span className="text-[11px] font-semibold text-foundry-text truncate">{t(preset.nameKey)}</span>
                </div>
                <p className="text-[9px] text-foundry-muted leading-tight">{t(preset.descKey)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Parameter sliders */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          <SliderControl
            label={t('sim.rainfall')} icon={<Droplets size={13} />}
            value={params.rainfall} min={0} max={400} unit="mm" color="#38bdf8" danger={200}
            onChange={(v) => setParam('rainfall', v)}
          />
          <SliderControl
            label={t('sim.windSpeed')} icon={<Wind size={13} />}
            value={params.windSpeed} min={0} max={250} unit="km/h" color="#a78bfa" danger={120}
            onChange={(v) => setParam('windSpeed', v)}
          />
          <SliderControl
            label={t('sim.riverLevel')} icon={<Activity size={13} />}
            value={params.riverLevel} min={0} max={100} unit="%" color="#06b6d4" danger={80}
            onChange={(v) => setParam('riverLevel', v)}
          />
          <SliderControl
            label={t('sim.displacement')} icon={<Users size={13} />}
            value={params.populationDisplacement} min={0} max={100} unit="%" color="#fb923c" danger={50}
            onChange={(v) => setParam('populationDisplacement', v)}
          />
          <SliderControl
            label={t('sim.foodSecurity')} icon={<TrendingUp size={13} />}
            value={params.foodSupply} min={0} max={100} unit="%" color="#4ade80"
            onChange={(v) => setParam('foodSupply', v)}
          />
        </div>

        <div className="p-3 border-t border-foundry-border space-y-2">
          <Button
            variant="primary" size="sm" icon={<Play size={12} />}
            onClick={() => runSimulation()} loading={loading}
            className="w-full justify-center"
          >
            {t('sim.runSimulation')}
          </Button>
          <Button
            variant="ghost" size="sm" icon={<RotateCcw size={12} />}
            onClick={() => { setParams(DEFAULT_PARAMS); runSimulation(DEFAULT_PARAMS); }}
            className="w-full justify-center"
          >
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Right panel — results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && !hasRun && (
          <div className="flex items-center justify-center h-full gap-3">
            <Spinner size={16} />
            <span className="text-foundry-muted text-sm">{t('sim.running')}</span>
          </div>
        )}

        {result && (
          <>
            {/* Simulation alerts */}
            {result.alerts.length > 0 && (
              <div className="space-y-1.5">
                {result.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-red-950/40 border-red-800/40 text-red-300'
                        : 'bg-orange-950/40 border-orange-800/40 text-orange-300'
                    }`}
                  >
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    {alert.message}
                  </div>
                ))}
              </div>
            )}

            {/* Header stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t('sim.projectedAffected'), value: `${(result.projectedAffected / 1e6).toFixed(2)}M`, color: '#ff8c00', icon: <Users size={14} /> },
                { label: t('sim.projectedDisplaced'), value: `${(result.projectedDisplaced / 1000).toFixed(0)}K`, color: '#ffcc00', icon: <Home size={14} /> },
                { label: t('ast.available'), value: `${(result.shelterDemand / 1000).toFixed(0)}K beds`, color: '#a78bfa', icon: <Home size={14} /> },
                { label: t('kpi.resources'), value: `${result.resourceDemand} units`, color: '#00ff9d', icon: <Truck size={14} /> },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-foundry-card border border-foundry-border rounded-lg p-3 flex items-center gap-3">
                  <span style={{ color: kpi.color }}>{kpi.icon}</span>
                  <div>
                    <div className="text-[10px] text-foundry-muted mb-0.5">{kpi.label}</div>
                    <div className="text-lg font-bold font-mono-code leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gauges + Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-4">{t('sim.riskSectorAnalysis')}</div>
                <div className="flex items-center justify-around">
                  <RiskGauge value={result.infrastructureStress} label={t('sim.infrastructureStress')} color="#ff8c00" />
                  <RiskGauge value={result.healthRisk} label={t('sim.healthRisk')} color="#a78bfa" />
                  <RiskGauge value={result.foodInsecurity} label={t('sim.foodInsecurity')} color="#facc15" />
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center border-4"
                      style={{
                        borderColor: result.overallRisk >= 7 ? '#ff3a3a' : result.overallRisk >= 5 ? '#ff8c00' : '#00ff9d',
                        color: result.overallRisk >= 7 ? '#ff3a3a' : result.overallRisk >= 5 ? '#ff8c00' : '#00ff9d',
                      }}
                    >
                      <span className="text-xl font-bold font-mono-code">{result.overallRisk}</span>
                    </div>
                    <span className="text-[10px] text-foundry-muted text-center">{t('sim.overallRiskLabel')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-2">{t('sim.multiDimProfile')}</div>
                <ResponsiveContainer width="100%" height={160}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e2d3d" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar dataKey="value" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.15} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Projected impact trend */}
            <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">{t('sim.projectedTrajectory')}</div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="affGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff8c00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff8c00" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dispGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffcc00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ffcc00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: '#1a2030', border: '1px solid #1e2d3d', borderRadius: 6, fontSize: 11 }}
                    formatter={(v: number, name: string) => [`${(v / 1000).toFixed(0)}K`, name === 'affected' ? t('chart.affectedLabel') : t('chart.displacedLabel')]}
                  />
                  <Area type="monotone" dataKey="affected" stroke="#ff8c00" strokeWidth={2} fill="url(#affGrad)" />
                  <Area type="monotone" dataKey="displaced" stroke="#ffcc00" strokeWidth={1.5} fill="url(#dispGrad)" strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Model info */}
            <div className="flex items-center justify-between px-4 py-2 bg-foundry-surface border border-foundry-border rounded-lg text-[10px] text-foundry-muted">
              <span>TerraSIM v2 · {loading ? t('sim.recalculating') : `${t('sim.generated')} ${new Date(result.generatedAt).toLocaleTimeString()}`}</span>
              <span>{t('sim.dataSourcesFooter')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
