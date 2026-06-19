import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Eye, Save, X, LayoutGrid } from 'lucide-react';
import { workshopApi } from '../api/foundryApi';
import type { WorkshopLayout, WorkshopWidget } from '../types';
import { Button, Card, Input, Spinner } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';

const WIDGET_ICONS: Record<string, string> = {
  metric: '📊', map: '🗺', chart: '📈', table: '📋',
  alerts: '🔔', timeline: '⏱', text: '📝', search: '🔍',
};

export default function Workshop() {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const [layouts, setLayouts] = useState<WorkshopLayout[]>([]);
  const [widgetTypes, setWidgetTypes] = useState<{ type: string; label: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WorkshopLayout | null>(null);
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<WorkshopLayout | null>(null);

  const load = async () => {
    const [l, wt] = await Promise.all([workshopApi.list(), workshopApi.widgetTypes()]);
    setLayouts(l);
    setWidgetTypes(wt);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [language]);

  const create = async () => {
    if (!newName) return;
    setCreating(true);
    try {
      const { id } = await workshopApi.create({ name: newName, description: '', widgets: [] });
      await load();
      const newLayout = (await workshopApi.get(id));
      setEditing(newLayout);
      setShowNew(false);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await workshopApi.update(editing.id, { name: editing.name, widgets: editing.widgets });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await workshopApi.delete(id);
    await load();
    if (editing?.id === id) setEditing(null);
  };

  const addWidget = (type: string) => {
    if (!editing) return;
    const newWidget: WorkshopWidget = {
      id: `w-${Date.now()}`,
      type: type as WorkshopWidget['type'],
      title: widgetTypes.find(wt => wt.type === type)?.label ?? type,
      config: {},
    };
    setEditing(e => e ? { ...e, widgets: [...e.widgets, newWidget] } : e);
  };

  const removeWidget = (wId: string) => {
    setEditing(e => e ? { ...e, widgets: e.widgets.filter(w => w.id !== wId) } : e);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full gap-3"><Spinner size={18} /><span className="text-foundry-muted text-sm">{t('common.loading')}</span></div>;
  }

  // Preview mode
  if (preview) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-foundry-border bg-foundry-surface shrink-0">
          <span className="text-xs font-semibold text-foundry-text">{preview.name}</span>
          <span className="text-[10px] text-foundry-muted ml-2">{t('wks.previewMode')}</span>
          <Button variant="ghost" size="xs" icon={<X size={12} />} className="ml-auto" onClick={() => setPreview(null)}>{t('wks.exitPreview')}</Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {preview.widgets.length === 0 ? (
            <div className="flex items-center justify-center h-full text-foundry-muted text-sm">{t('wks.noWidgets')}</div>
          ) : (
            <div className="grid grid-cols-3 gap-4 auto-rows-min">
              {preview.widgets.map((w) => <WidgetPreview key={w.id} widget={w} />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  if (editing) {
    return (
      <div className="h-full flex overflow-hidden">
        {/* Widget palette */}
        <div className="w-52 shrink-0 border-r border-foundry-border bg-foundry-surface flex flex-col">
          <div className="px-4 py-3 border-b border-foundry-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">{t('wks.widgetPalette')}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {widgetTypes.map((wt) => (
              <button
                key={wt.type}
                onClick={() => addWidget(wt.type)}
                className="w-full flex items-center gap-2 p-2.5 rounded bg-foundry-card border border-foundry-border hover:border-foundry-accent/40 text-left transition-colors group"
              >
                <span className="text-base">{WIDGET_ICONS[wt.type] ?? '▪'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foundry-text group-hover:text-foundry-accent">{wt.label}</div>
                  <div className="text-[10px] text-foundry-muted truncate">{wt.description}</div>
                </div>
                <Plus size={11} className="text-foundry-muted group-hover:text-foundry-accent shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-foundry-border bg-foundry-surface shrink-0">
            <input
              value={editing.name}
              onChange={e => setEditing(ed => ed ? { ...ed, name: e.target.value } : ed)}
              className="bg-transparent text-sm font-semibold text-foundry-text border-b border-transparent hover:border-foundry-border focus:border-foundry-accent outline-none px-1"
            />
            <span className="text-[10px] text-foundry-muted">{editing.widgets.length} widgets</span>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" size="xs" icon={<Eye size={12} />} onClick={() => setPreview(editing)}>{t('wks.preview')}</Button>
              <Button variant="primary" size="xs" icon={<Save size={12} />} loading={saving} onClick={save}>{t('common.save')}</Button>
              <Button variant="ghost" size="xs" icon={<X size={12} />} onClick={() => setEditing(null)}>{t('common.close')}</Button>
            </div>
          </div>

          {/* Widget canvas */}
          <div className="flex-1 overflow-auto p-4 bg-foundry-bg">
            {editing.widgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-foundry-border rounded-xl text-center">
                <LayoutGrid size={28} className="text-foundry-muted mb-3 opacity-40" />
                <p className="text-sm text-foundry-muted">{t('wks.emptyCanvas')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 auto-rows-min">
                {editing.widgets.map((w) => (
                  <div key={w.id} className="relative group">
                    <WidgetPreview widget={w} />
                    <button
                      onClick={() => removeWidget(w.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded bg-red-900/80 border border-red-700/60 flex items-center justify-center transition-opacity"
                    >
                      <X size={10} className="text-red-300" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Layout gallery
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foundry-text">{t('wks.title')}</h2>
          <p className="text-xs text-foundry-muted mt-0.5">{t('wks.subtitle')}</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(!showNew)}>{t('wks.newLayout')}</Button>
      </div>

      {showNew && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-foundry-card border border-foundry-border rounded-lg">
          <Input placeholder={t('wks.layoutNamePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" />
          <Button variant="primary" size="sm" loading={creating} onClick={create}>{t('wks.create')}</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {layouts.map((l) => (
          <div key={l.id} className="bg-foundry-card border border-foundry-border rounded-lg hover:border-foundry-border/80 transition-colors">
            {/* Header */}
            <div className="p-4 border-b border-foundry-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foundry-text">{l.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => setPreview(l)} className="p-1 text-foundry-muted hover:text-foundry-accent"><Eye size={13} /></button>
                  <button onClick={() => setEditing(l)} className="p-1 text-foundry-muted hover:text-foundry-accent"><Edit3 size={13} /></button>
                  <button onClick={() => remove(l.id)} className="p-1 text-foundry-muted hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
              {l.description && <p className="text-[11px] text-foundry-muted mt-1">{l.description}</p>}
            </div>

            {/* Widget grid preview */}
            <div className="p-3">
              {l.widgets.length === 0 ? (
                <div className="text-xs text-foundry-muted text-center py-4">{t('wks.emptyLayout')}</div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {l.widgets.slice(0, 9).map((w) => (
                    <div key={w.id} className="bg-foundry-surface rounded p-1.5 border border-foundry-border">
                      <span className="text-xs">{WIDGET_ICONS[w.type] ?? '▪'}</span>
                      <div className="text-[9px] text-foundry-muted truncate mt-0.5">{w.title}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[10px] text-foundry-muted mt-2">{l.widgets.length} widget{l.widgets.length !== 1 ? 's' : ''} · Updated {new Date(l.updated_at).toLocaleDateString()}</div>
            </div>
          </div>
        ))}

        {layouts.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
            <LayoutGrid size={32} className="text-foundry-muted mb-4 opacity-30" />
            <p className="text-foundry-muted text-sm">{t('wks.noLayouts')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WidgetPreview({ widget }: { widget: WorkshopWidget }) {
  const t = useT();
  const icons: Record<string, string> = {
    metric: '📊', map: '🗺', chart: '📈', table: '📋',
    alerts: '🔔', timeline: '⏱', text: '📝', search: '🔍',
  };
  const widgetDescKey = `wks.widgetDesc.${widget.type}`;
  return (
    <div className="bg-foundry-card border border-foundry-border rounded-lg p-3 min-h-24">
      <div className="flex items-center gap-2 mb-2 border-b border-foundry-border pb-2">
        <span className="text-sm">{icons[widget.type] ?? '▪'}</span>
        <span className="text-xs font-medium text-foundry-text">{widget.title}</span>
      </div>
      <div className="text-[10px] text-foundry-muted italic">
        {t(widgetDescKey)}
      </div>
    </div>
  );
}
