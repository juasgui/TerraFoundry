import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Network, Search, Map, Package,
  GitBranch, Wrench, Bot, FileText, ChevronLeft, ChevronRight,
  Target, Brain, Shield, Zap, Cpu,
} from 'lucide-react';
import { useT } from '../../i18n/useT';

const NAV_ITEMS = [
  { id: 'decision-center', path: '/',            icon: Brain,           tKey: 'nav.decisionCenter',        group: 'intel' },
  { id: 'commander',       path: '/commander',   icon: Shield,          tKey: 'nav.commanderView',         group: 'intel' },
  { id: 'ai',              path: '/ai',          icon: Bot,             tKey: 'nav.aiOpsOfficer',          group: 'intel' },
  { id: 'simulate',        path: '/simulate',    icon: Zap,             tKey: 'nav.simulationLab',         group: 'intel' },
  { id: 'intelligence',    path: '/intelligence',icon: Cpu,             tKey: 'nav.intelligenceWorkbench', group: 'intel' },
  { id: 'maps',            path: '/maps',        icon: Map,             tKey: 'nav.maps',                  group: 'ops' },
  { id: 'assets',          path: '/assets',      icon: Package,         tKey: 'nav.assets',                group: 'ops' },
  { id: 'missions',        path: '/missions',    icon: Target,          tKey: 'nav.missions',              group: 'ops' },
  { id: 'ontology',        path: '/ontology',    icon: Network,         tKey: 'nav.ontology',              group: 'data' },
  { id: 'objects',         path: '/objects',     icon: Search,          tKey: 'nav.objectExplorer',        group: 'data' },
  { id: 'pipelines',       path: '/pipelines',   icon: GitBranch,       tKey: 'nav.pipelines',             group: 'data' },
  { id: 'workshop',        path: '/workshop',    icon: Wrench,          tKey: 'nav.workshop',              group: 'build' },
  { id: 'reports',         path: '/reports',     icon: FileText,        tKey: 'nav.reports',               group: 'build' },
  { id: 'control-center',  path: '/ops',         icon: LayoutDashboard, tKey: 'nav.controlCenter',         group: 'build' },
];

const groups = ['intel', 'ops', 'data', 'build'];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  return (
    <aside
      className={`flex flex-col bg-foundry-surface border-r border-foundry-border transition-all duration-200 select-none shrink-0 ${collapsed ? 'w-14' : 'w-52'}`}
      style={{ minHeight: '100%' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-foundry-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-foundry-accent">T</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-xs font-bold text-foundry-text leading-tight">{t('platform.name')}</div>
            <div className="text-[10px] text-foundry-muted leading-tight">{t('platform.subtitle')}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((n) => n.group === group);
          return (
            <div key={group} className="mb-2">
              {!collapsed && (
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-foundry-muted/60">
                  {t(`group.${group}`)}
                </div>
              )}
              {items.map(({ id, path, icon: Icon, tKey }) => {
                const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
                const label = t(tKey);
                return (
                  <button
                    key={id}
                    onClick={() => navigate(path)}
                    title={collapsed ? label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors rounded-none ${
                      active
                        ? 'bg-foundry-accent/10 text-foundry-accent border-l-2 border-foundry-accent'
                        : 'text-foundry-text-dim hover:bg-foundry-hover hover:text-foundry-text border-l-2 border-transparent'
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-foundry-border p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center p-1.5 text-foundry-muted hover:text-foundry-text rounded hover:bg-foundry-hover transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
