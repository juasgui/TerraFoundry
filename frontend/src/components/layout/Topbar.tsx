import React, { useEffect, useRef, useState } from 'react';
import { Bell, Search, ChevronDown, RefreshCw, Shield, User } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { missionsApi, dashboardApi } from '../../api/foundryApi';
import { useT } from '../../i18n/useT';

export default function Topbar() {
  const { alerts, setAlerts, setMetrics, missions, setMissions, activeMission, setActiveMission, globalSearch, setGlobalSearch, language, setLanguage } = useAppStore();
  const t = useT();
  const [missionOpen, setMissionOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const missionRef = useRef<HTMLDivElement>(null);
  const unack = alerts.filter((a) => !a.acknowledged).length;

  useEffect(() => {
    missionsApi.list().then(setMissions).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (missionRef.current && !missionRef.current.contains(e.target as Node)) setMissionOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [m, a] = await Promise.all([dashboardApi.metrics(), dashboardApi.alerts()]);
      setMetrics(m);
      setAlerts(a);
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  return (
    <header className="h-12 bg-foundry-surface border-b border-foundry-border flex items-center px-4 gap-4 shrink-0">
      {/* Classification banner */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-900/30 border border-emerald-700/30">
        <Shield size={11} className="text-emerald-400" />
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{t('platform.classification')}</span>
      </div>

      {/* Mission selector */}
      <div ref={missionRef} className="relative">
        <button
          onClick={() => setMissionOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-foundry-card border border-foundry-border text-xs text-foundry-text-dim hover:text-foundry-text hover:border-foundry-accent/40 transition-colors"
        >
          <span className="text-foundry-accent">◎</span>
          <span>{activeMission?.name ?? t('topbar.allMissions')}</span>
          <ChevronDown size={11} />
        </button>
        {missionOpen && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-foundry-panel border border-foundry-border rounded-lg shadow-xl min-w-56 py-1 animate-fade-in">
            <button
              onClick={() => { setActiveMission(null); setMissionOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-foundry-text-dim hover:bg-foundry-hover hover:text-foundry-text"
            >
              {t('topbar.allMissions')}
            </button>
            {missions.map((m) => (
              <button
                key={m.id}
                onClick={() => { setActiveMission(m); setMissionOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-foundry-text-dim hover:bg-foundry-hover hover:text-foundry-text"
              >
                <span className={`mr-2 ${m.status === 'active' ? 'text-emerald-400' : 'text-foundry-muted'}`}>●</span>
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global search */}
      <div className="flex-1 max-w-sm relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foundry-muted pointer-events-none" />
        <input
          type="text"
          placeholder={t('topbar.searchPlaceholder')}
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="w-full bg-foundry-card border border-foundry-border rounded pl-8 pr-3 py-1.5 text-xs text-foundry-text placeholder-foundry-muted focus:outline-none focus:border-foundry-accent/50 transition-colors"
        />
      </div>

      <div className="flex-1" />

      {/* Live clock */}
      <LiveClock />

      {/* Refresh */}
      <button
        onClick={handleRefresh}
        className="p-1.5 text-foundry-muted hover:text-foundry-accent transition-colors"
        title={t('topbar.refresh')}
      >
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
      </button>

      {/* Language toggle */}
      <div className="flex items-center rounded border border-foundry-border overflow-hidden text-[10px] font-bold">
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-1 transition-colors ${language === 'en' ? 'bg-foundry-accent/20 text-foundry-accent' : 'text-foundry-muted hover:text-foundry-text'}`}
        >EN</button>
        <div className="w-px h-3 bg-foundry-border" />
        <button
          onClick={() => setLanguage('pt')}
          className={`px-2 py-1 transition-colors ${language === 'pt' ? 'bg-foundry-accent/20 text-foundry-accent' : 'text-foundry-muted hover:text-foundry-text'}`}
        >PT</button>
      </div>

      {/* Alerts bell */}
      <button className="relative p-1.5 text-foundry-muted hover:text-foundry-text transition-colors">
        <Bell size={15} />
        {unack > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center blink">
            {unack > 9 ? '9+' : unack}
          </span>
        )}
      </button>

      {/* User */}
      <div className="flex items-center gap-2 pl-2 border-l border-foundry-border">
        <div className="w-6 h-6 rounded-full bg-foundry-accent/20 border border-foundry-accent/40 flex items-center justify-center">
          <User size={12} className="text-foundry-accent" />
        </div>
        <span className="text-xs text-foundry-text-dim hidden md:block">{t('topbar.operator')}</span>
      </div>
    </header>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right hidden lg:block">
      <div className="text-xs font-mono-code text-foundry-accent">{time.toUTCString().slice(17, 25)} UTC</div>
      <div className="text-[10px] text-foundry-muted">{time.toLocaleDateString('en-MZ', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  );
}
