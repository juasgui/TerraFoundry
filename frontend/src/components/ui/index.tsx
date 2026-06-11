import React from 'react';
import { Loader2 } from 'lucide-react';

// ── Badge ─────────────────────────────────────────────────────────────────────
const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-950 text-red-400 border border-red-800',
  HIGH:     'bg-orange-950 text-orange-400 border border-orange-800',
  MEDIUM:   'bg-yellow-950 text-yellow-400 border border-yellow-800',
  LOW:      'bg-slate-800 text-slate-400 border border-slate-700',
  active:   'bg-emerald-950 text-emerald-400 border border-emerald-800',
  inactive: 'bg-slate-800 text-slate-400 border border-slate-700',
  critical: 'bg-red-950 text-red-400 border border-red-800',
  resolved: 'bg-slate-800 text-slate-400 border border-slate-700',
  planning: 'bg-blue-950 text-blue-400 border border-blue-800',
  deployed: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  in_transit: 'bg-cyan-950 text-cyan-400 border border-cyan-800',
  maintenance: 'bg-yellow-950 text-yellow-400 border border-yellow-800',
  available: 'bg-slate-800 text-slate-300 border border-slate-700',
  completed: 'bg-slate-800 text-slate-400 border border-slate-700',
  suspended: 'bg-orange-950 text-orange-400 border border-orange-800',
  pending:   'bg-slate-800 text-slate-400 border border-slate-700',
  running:   'bg-blue-950 text-blue-400 border border-blue-800',
  failed:    'bg-red-950 text-red-400 border border-red-800',
};

export function Badge({ label, className = '' }: { label: string; className?: string }) {
  const cls = severityColors[label] ?? 'bg-slate-800 text-slate-300 border border-slate-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${cls} ${className}`}>
      {label}
    </span>
  );
}

// ── StatusDot ─────────────────────────────────────────────────────────────────
const dotColors: Record<string, string> = {
  active: 'bg-emerald-400',
  critical: 'bg-red-400 blink',
  inactive: 'bg-slate-500',
  resolved: 'bg-slate-500',
  deployed: 'bg-emerald-400',
  available: 'bg-slate-400',
  in_transit: 'bg-cyan-400',
  maintenance: 'bg-yellow-400',
  planning: 'bg-blue-400',
  completed: 'bg-slate-500',
};

export function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${dotColors[status] ?? 'bg-slate-500'}`} />
  );
}

// ── Button ─────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const btnVariants: Record<BtnVariant, string> = {
  primary:   'bg-cyan-500/20 text-cyan-300 border border-cyan-600/50 hover:bg-cyan-500/30 hover:border-cyan-400',
  secondary: 'bg-foundry-card text-foundry-text-dim border border-foundry-border hover:bg-foundry-hover hover:text-foundry-text',
  ghost:     'text-foundry-text-dim hover:text-foundry-text hover:bg-foundry-hover',
  danger:    'bg-red-500/20 text-red-400 border border-red-700/50 hover:bg-red-500/30',
  success:   'bg-emerald-500/20 text-emerald-400 border border-emerald-700/50 hover:bg-emerald-500/30',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'xs' | 'sm' | 'md';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({ variant = 'secondary', size = 'sm', loading, icon, children, className = '', ...props }: ButtonProps) {
  const sizes = { xs: 'px-2 py-1 text-xs', sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded font-medium transition-colors duration-150 disabled:opacity-40 ${sizes[size]} ${btnVariants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', title, actions }: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`bg-foundry-card border border-foundry-border rounded-lg ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-foundry-border">
          <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">{title}</span>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`bg-foundry-surface border border-foundry-border rounded px-3 py-1.5 text-sm text-foundry-text placeholder-foundry-muted focus:outline-none focus:border-foundry-accent/60 transition-colors w-full ${className}`}
      {...props}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`bg-foundry-surface border border-foundry-border rounded px-3 py-1.5 text-sm text-foundry-text focus:outline-none focus:border-foundry-accent/60 transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-foundry-accent" />;
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-foundry-muted">
      {icon && <div className="text-3xl opacity-40">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, color = '#00d4ff', icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-foundry-card border border-foundry-border rounded-lg p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foundry-muted uppercase tracking-widest">{label}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="text-2xl font-bold font-mono-code" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-foundry-muted">{sub}</div>}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">{title}</h3>
      {actions}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-0 border-b border-foundry-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            active === t.id
              ? 'border-foundry-accent text-foundry-accent'
              : 'border-transparent text-foundry-muted hover:text-foundry-text'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-foundry-surface rounded text-[10px]">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Timeline Item ─────────────────────────────────────────────────────────────
export function TimelineItem({ icon, title, sub, ts, color = '#64748b' }: {
  icon?: React.ReactNode; title: string; sub?: string; ts: string; color?: string;
}) {
  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center gap-1">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: `${color}22`, color }}>
          {icon ?? '●'}
        </div>
        <div className="flex-1 w-px bg-foundry-border" />
      </div>
      <div className="flex-1 pb-2">
        <p className="text-xs text-foundry-text leading-relaxed">{title}</p>
        {sub && <p className="text-[11px] text-foundry-muted mt-0.5">{sub}</p>}
        <p className="text-[10px] text-foundry-muted mt-1 font-mono-code">{new Date(ts).toLocaleString()}</p>
      </div>
    </div>
  );
}
