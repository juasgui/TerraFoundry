import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { objectsApi, ontologyApi } from '../api/foundryApi';
import type { FoundryObject, ObjectType } from '../types';
import { useAppStore } from '../store/appStore';
import { Badge, Button, Input, Select, Spinner, StatusDot } from '../components/ui';

const PAGE_SIZE = 20;

export default function ObjectExplorer() {
  const [objects, setObjects] = useState<FoundryObject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const { openDetailPanel, globalSearch } = useAppStore();

  const load = useCallback(async (p: number, q: string, type: string, status: string, severity: string) => {
    setLoading(true);
    try {
      const res = await objectsApi.list({ q: q || undefined, type_id: type || undefined, status: status || undefined, severity: severity || undefined, page: p, limit: PAGE_SIZE });
      setObjects(res.objects);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ontologyApi.types().then(setTypes);
  }, []);

  useEffect(() => {
    load(page, search || globalSearch, filterType, filterStatus, filterSeverity);
  }, [page, search, globalSearch, filterType, filterStatus, filterSeverity]);

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-foundry-border bg-foundry-surface shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foundry-muted" />
          <Input
            className="pl-8"
            placeholder="Search objects by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-foundry-muted" />
          <Select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
          <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {['active', 'inactive', 'critical', 'resolved', 'deployed', 'available', 'planning'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}>
            <option value="">All Severities</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <span className="text-xs text-foundry-muted font-mono-code ml-auto">{total} objects</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-3">
            <Spinner />
            <span className="text-foundry-muted text-sm">Loading…</span>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-foundry-surface z-10">
              <tr className="border-b border-foundry-border">
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-8"></th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-32">Type</th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-24">Status</th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-24">Severity</th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-32">Location</th>
                <th className="text-left px-4 py-2.5 text-foundry-muted font-semibold uppercase tracking-wider w-36">Updated</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foundry-border">
              {objects.map((obj) => (
                <ObjectRow key={obj.id} obj={obj} onOpen={() => openDetailPanel(obj.id)} />
              ))}
            </tbody>
          </table>
        )}
        {!loading && objects.length === 0 && (
          <div className="flex items-center justify-center h-32 text-foundry-muted text-sm">No objects match your filters.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-foundry-border bg-foundry-surface shrink-0">
        <span className="text-xs text-foundry-muted">
          Page {page} of {pages} · {total} total
        </span>
        <div className="flex gap-1 ml-auto">
          <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={12} />} />
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + Math.max(1, page - 3)).filter(p => p <= pages).map((p) => (
            <Button
              key={p} variant={p === page ? 'primary' : 'ghost'} size="xs"
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button variant="ghost" size="xs" disabled={page >= pages} onClick={() => setPage(p => p + 1)} icon={<ChevronRight size={12} />} />
        </div>
      </div>
    </div>
  );
}

function ObjectRow({ obj, onOpen }: { obj: FoundryObject; onOpen: () => void }) {
  return (
    <tr className="hover:bg-foundry-hover cursor-pointer group" onClick={onOpen}>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: obj.type?.color ?? '#64748b' }}>{obj.type?.icon ?? '●'}</span>
      </td>
      <td className="px-4 py-2.5">
        <div className="font-medium text-foundry-text group-hover:text-foundry-accent transition-colors">{obj.name}</div>
        <div className="text-[10px] text-foundry-muted font-mono-code">{obj.id}</div>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-foundry-text-dim" style={{ color: obj.type?.color }}>{obj.type?.label ?? obj.type_id}</span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <StatusDot status={obj.status} />
          <span className="text-foundry-text-dim capitalize">{obj.status}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        {obj.severity && <Badge label={obj.severity} />}
      </td>
      <td className="px-4 py-2.5 text-foundry-muted">
        {obj.geo_lat != null ? `${obj.geo_lat.toFixed(2)}, ${obj.geo_lng?.toFixed(2)}` : '—'}
      </td>
      <td className="px-4 py-2.5 text-foundry-muted font-mono-code">
        {new Date(obj.updated_at).toLocaleDateString()}
      </td>
      <td className="px-2 py-2.5">
        <Eye size={13} className="text-foundry-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>
    </tr>
  );
}
