import React, { useState } from 'react';
import { FileText, Download, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { reportsApi } from '../api/foundryApi';
import type { SituationReport } from '../types';
import { Badge, Button, Spinner } from '../components/ui';

export default function ReportsView() {
  const [report, setReport] = useState<SituationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('sitrep');

  const generate = async () => {
    setLoading(true);
    try {
      const r = await reportsApi.generate(type);
      setReport(r);
    } finally {
      setLoading(false);
    }
  };

  const exportText = () => {
    if (!report) return;
    const text = `
${report.title}
${report.classification}
Generated: ${new Date(report.generated_at).toLocaleString()}
Period: ${report.period}

EXECUTIVE SUMMARY
${report.executive_summary}

KEY FIGURES
Total Affected: ${report.key_figures.total_affected.toLocaleString()}
Total Displaced: ${report.key_figures.total_displaced.toLocaleString()}
Active Hazards: ${report.key_figures.active_hazards}
Provinces Affected: ${report.key_figures.provinces_affected}

PROVINCE MATRIX
${report.province_matrix.map(p => `  ${p.name}: ${Number(p.aff || 0).toLocaleString()} affected [${p.severity}]`).join('\n')}

CRITICAL ALERTS
${report.critical_alerts.map(a => `  [${a.severity}] ${a.title}`).join('\n')}

ACTIVE MISSIONS
${report.active_missions.map(m => `  ${m.name} — ${m.status} [${m.priority}]`).join('\n')}

Data Sources: ${report.data_sources.join(', ')}
Prepared by: ${report.prepared_by}
    `.trim();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terra-sitrep-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-foundry-border bg-foundry-surface shrink-0">
        <FileText size={16} className="text-foundry-muted" />
        <span className="text-sm font-semibold text-foundry-text">Reporting Module</span>
        <div className="ml-4 flex items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-foundry-card border border-foundry-border rounded px-3 py-1.5 text-xs text-foundry-text focus:outline-none focus:border-foundry-accent/50"
          >
            <option value="sitrep">Situation Report (SitRep)</option>
            <option value="hazard">Hazard Assessment</option>
            <option value="resource">Resource Status</option>
          </select>
          <Button variant="primary" size="sm" loading={loading} icon={<RefreshCw size={12} />} onClick={generate}>Generate</Button>
        </div>
        {report && (
          <Button variant="secondary" size="sm" icon={<Download size={12} />} onClick={exportText} className="ml-auto">Export TXT</Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!report && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText size={40} className="text-foundry-muted opacity-30 mb-4" />
            <p className="text-foundry-text text-sm font-semibold mb-1">Generate a Situation Report</p>
            <p className="text-foundry-muted text-xs max-w-sm">Select a report type above and click Generate. Reports are automatically populated with live data from the Terra ontology database.</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-full gap-3">
            <Spinner size={20} />
            <span className="text-foundry-muted text-sm">Generating report from live data…</span>
          </div>
        )}

        {report && !loading && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Report header */}
            <div className="border-b border-foundry-border pb-6">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">{report.classification}</span>
              </div>
              <h1 className="text-xl font-bold text-foundry-text mb-2">{report.title}</h1>
              <div className="flex items-center gap-6 text-xs text-foundry-muted">
                <span>Generated: <span className="text-foundry-text font-mono-code">{new Date(report.generated_at).toLocaleString()}</span></span>
                <span>Period: <span className="text-foundry-text">{report.period}</span></span>
                <span className="ml-auto">Prepared by: <span className="text-foundry-text">{report.prepared_by}</span></span>
              </div>
            </div>

            {/* Executive summary */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Executive Summary</h2>
              <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
                <p className="text-sm text-foundry-text leading-relaxed">{report.executive_summary}</p>
              </div>
            </div>

            {/* Key figures */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Key Figures</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KFCard label="Total Affected" value={report.key_figures.total_affected.toLocaleString()} color="#ff8c00" />
                <KFCard label="Total Displaced" value={report.key_figures.total_displaced.toLocaleString()} color="#ffcc00" />
                <KFCard label="Active Hazards" value={String(report.key_figures.active_hazards)} color="#ff3a3a" />
                <KFCard label="Provinces Affected" value={String(report.key_figures.provinces_affected)} color="#00d4ff" />
              </div>
            </div>

            {/* Province matrix */}
            {report.province_matrix.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Province Impact Matrix</h2>
                <div className="bg-foundry-card border border-foundry-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-foundry-surface">
                      <tr className="border-b border-foundry-border">
                        <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider">Province</th>
                        <th className="text-right px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider">Affected</th>
                        <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-24">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foundry-border">
                      {report.province_matrix.map((p, i) => (
                        <tr key={i} className="hover:bg-foundry-hover">
                          <td className="px-4 py-2.5 text-foundry-text">{p.name}</td>
                          <td className="px-4 py-2.5 text-right font-mono-code text-foundry-accent">
                            {p.aff ? Number(p.aff).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-2.5"><Badge label={p.severity ?? 'MEDIUM'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Critical alerts */}
            {report.critical_alerts.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Critical Alerts ({report.critical_alerts.length})</h2>
                <div className="space-y-2">
                  {report.critical_alerts.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 bg-red-950/30 border border-red-800/40 rounded-lg">
                      <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-red-300">{a.title}</span>
                          <Badge label={a.severity} />
                        </div>
                        {a.description && <p className="text-[11px] text-foundry-muted mt-0.5">{a.description}</p>}
                      </div>
                      <span className="text-[10px] text-foundry-muted font-mono-code">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active missions */}
            {report.active_missions.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foundry-muted mb-3">Active Missions ({report.active_missions.length})</h2>
                <div className="grid grid-cols-2 gap-3">
                  {report.active_missions.map((m, i) => (
                    <div key={i} className="bg-foundry-card border border-foundry-border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foundry-text">{m.name}</span>
                        <Badge label={m.status} />
                      </div>
                      <div className="mt-1 flex gap-2">
                        <Badge label={m.priority} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data sources */}
            <div className="pt-4 border-t border-foundry-border">
              <span className="text-xs text-foundry-muted">Data sources: </span>
              {report.data_sources.map((s) => (
                <span key={s} className="text-xs text-foundry-accent mr-3">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KFCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-foundry-card border border-foundry-border rounded-lg p-4">
      <div className="text-xs text-foundry-muted mb-1">{label}</div>
      <div className="text-xl font-bold font-mono-code" style={{ color }}>{value}</div>
    </div>
  );
}
