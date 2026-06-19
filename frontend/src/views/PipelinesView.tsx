import React, { useEffect, useRef, useState } from 'react';
import { Play, Upload, Clock, CheckCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { pipelinesApi } from '../api/foundryApi';
import type { PipelineSource, PipelineRun } from '../types';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';

export default function PipelinesView() {
  const t = useT();
  const [sources, setSources] = useState<PipelineSource[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});
  const [lastResult, setLastResult] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addIngestLog } = useAppStore();

  const load = async () => {
    const [s, r] = await Promise.all([pipelinesApi.sources(), pipelinesApi.runs()]);
    setSources(s);
    setRuns(r);
  };

  const { language } = useAppStore();
  useEffect(() => { load().finally(() => setLoading(false)); }, [language]);

  const trigger = async (srcId: string, srcName: string) => {
    setTriggering(t => ({ ...t, [srcId]: true }));
    try {
      const res = await pipelinesApi.ingest(srcId);
      setLastResult(r => ({ ...r, [srcId]: `✓ ${res.records_ingested} records · ${res.objects_created} objects` }));
      addIngestLog(`${srcName}: ${res.message}`);
      await load();
    } catch {
      setLastResult(r => ({ ...r, [srcId]: '✗ Ingestion failed' }));
    } finally {
      setTriggering(t => ({ ...t, [srcId]: false }));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await pipelinesApi.upload(file);
      addIngestLog(`File upload: ${file.name} — ${res.records_ingested} records ingested`);
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const typeColors: Record<string, string> = {
    api:       '#00d4ff',
    satellite: '#a78bfa',
    file:      '#ffcc00',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full gap-3"><Spinner size={18} /><span className="text-foundry-muted text-sm">{t('common.loading')}</span></div>;
  }

  const totalRecords = runs.reduce((s, r) => s + r.records_ingested, 0);
  const totalObjects = runs.reduce((s, r) => s + r.objects_created, 0);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
          <div className="text-xs text-foundry-muted mb-1">{t('pip.runsLabel')}</div>
          <div className="text-2xl font-bold font-mono-code text-foundry-accent">{runs.length}</div>
        </div>
        <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
          <div className="text-xs text-foundry-muted mb-1">{t('pip.recordsIngested')}</div>
          <div className="text-2xl font-bold font-mono-code text-emerald-400">{totalRecords.toLocaleString()}</div>
        </div>
        <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
          <div className="text-xs text-foundry-muted mb-1">{t('pip.objectsCreated')}</div>
          <div className="text-2xl font-bold font-mono-code text-foundry-accent">{totalObjects}</div>
        </div>
      </div>

      {/* Data sources */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3 flex items-center gap-2">
          <Database size={13} /> {t('pip.dataSources')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((src) => (
            <div key={src.id} className="bg-foundry-card border border-foundry-border rounded-lg p-4 hover:border-foundry-border/80 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{src.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foundry-text">{src.name}</div>
                    <div className="text-[10px] text-foundry-muted mt-0.5 line-clamp-2">{src.description}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge label={src.type} />
                      <span className="text-[10px] text-foundry-muted">
                        <Clock size={9} className="inline mr-1" />{src.refresh_interval}
                      </span>
                      <span className="text-[10px]" style={{ color: typeColors[src.type] ?? '#64748b' }}>
                        {src.target_types.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="xs"
                  loading={triggering[src.id]}
                  icon={<Play size={11} />}
                  onClick={() => trigger(src.id, src.name)}
                >
                  {t('pip.run')}
                </Button>
              </div>

              {/* Last run */}
              {src.last_run && (
                <div className="mt-3 pt-3 border-t border-foundry-border">
                  <div className="flex items-center gap-2 text-[10px]">
                    {src.last_run.status === 'completed' ? (
                      <CheckCircle size={10} className="text-emerald-400" />
                    ) : (
                      <AlertCircle size={10} className="text-red-400" />
                    )}
                    <span className="text-foundry-muted">{t('pip.lastRunLabel')}</span>
                    <span className="text-foundry-text font-mono-code">{new Date(src.last_run.created_at).toLocaleString()}</span>
                    <span className="ml-auto text-foundry-accent">{src.last_run.records_ingested.toLocaleString()} records</span>
                  </div>
                </div>
              )}

              {lastResult[src.id] && (
                <div className={`mt-2 text-[10px] font-mono-code ${lastResult[src.id].startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {lastResult[src.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* File upload */}
      <Card title="CSV / JSON Upload">
        <div className="p-4">
          <div
            className="border-2 border-dashed border-foundry-border rounded-lg p-8 text-center hover:border-foundry-accent/40 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} className="mx-auto text-foundry-muted mb-3" />
            <p className="text-sm text-foundry-text-dim">{t('pip.dropFiles')}</p>
            <p className="text-xs text-foundry-muted mt-1">{t('pip.dropFilesHint')}</p>
            {uploading && <div className="mt-3 flex items-center justify-center gap-2"><Spinner size={14} /><span className="text-xs text-foundry-accent">{t('pip.uploading')}</span></div>}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleUpload} />
        </div>
      </Card>

      {/* Pipeline runs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted flex items-center gap-2">
            <RefreshCw size={12} /> {t('pip.recentRuns')}
          </span>
          <Button variant="ghost" size="xs" onClick={load} icon={<RefreshCw size={11} />}>{t('common.refresh')}</Button>
        </div>
        <div className="bg-foundry-card border border-foundry-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-foundry-surface">
              <tr className="border-b border-foundry-border">
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider">{t('pip.colSource')}</th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-20">{t('common.type')}</th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-20">{t('common.status')}</th>
                <th className="text-right px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-24">{t('pip.colRecords')}</th>
                <th className="text-right px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-24">{t('common.objects')}</th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-40">{t('pip.colStarted')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foundry-border">
              {runs.slice(0, 20).map((r) => (
                <tr key={r.id} className="hover:bg-foundry-hover">
                  <td className="px-4 py-2.5 text-foundry-text">{r.source}</td>
                  <td className="px-4 py-2.5"><Badge label={r.source_type} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      {r.status === 'completed' ? <CheckCircle size={11} className="text-emerald-400" /> : <AlertCircle size={11} className="text-red-400" />}
                      <span className={r.status === 'completed' ? 'text-emerald-400' : 'text-red-400'}>{r.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-code text-foundry-accent">{r.records_ingested.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-mono-code text-foundry-text-dim">{r.objects_created}</td>
                  <td className="px-4 py-2.5 text-foundry-muted font-mono-code">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {runs.length === 0 && (
            <div className="p-8 text-center text-foundry-muted text-sm">{t('pip.noRuns')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
