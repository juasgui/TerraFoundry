import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Network, Search, Map, Package,
  GitBranch, Wrench, Bot, FileText, ChevronLeft, ChevronRight,
  Target,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'control-center', path: '/',           icon: LayoutDashboard, label: 'Control Center',  group: 'ops' },
  { id: 'ontology',        path: '/ontology',   icon: Network,          label: 'Ontology',        group: 'data' },
  { id: 'objects',         path: '/objects',    icon: Search,           label: 'Object Explorer', group: 'data' },
  { id: 'maps',            path: '/maps',       icon: Map,              label: 'Maps',            group: 'ops' },
  { id: 'assets',          path: '/assets',     icon: Package,          label: 'Assets',          group: 'ops' },
  { id: 'missions',        path: '/missions',   icon: Target,           label: 'Missions',        group: 'ops' },
  { id: 'pipelines',       path: '/pipelines',  icon: GitBranch,        label: 'Pipelines',       group: 'data' },
  { id: 'workshop',        path: '/workshop',   icon: Wrench,           label: 'Workshop',        group: 'build' },
  { id: 'ai',              path: '/ai',         icon: Bot,              label: 'AI Assistant',    group: 'build' },
  { id: 'reports',         path: '/reports',    icon: FileText,         label: 'Reports',         group: 'build' },
];

const GROUP_LABELS: Record<string, string> = { ops: 'Operations', data: 'Data & Ontology', build: 'Build & Analysis' };

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const groups = ['ops', 'data', 'build'];

  return (
    <aside
      className={`flex flex-col bg-foundry-surface border-r border-foundry-border transition-all duration-200 select-none shrink-0 ${collapsed ? 'w-14' : 'w-52'}`}
      style={{ minHeight: '100%' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-foundry-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-foundry-accent">TF</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-xs font-bold text-foundry-text leading-tight">Terra Foundry</div>
            <div className="text-[10px] text-foundry-muted leading-tight">Borion Tech v2</div>
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
                  {GROUP_LABELS[group]}
                </div>
              )}
              {items.map(({ id, path, icon: Icon, label }) => {
                const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
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
