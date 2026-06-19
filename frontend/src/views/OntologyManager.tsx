import React, { useEffect, useState } from 'react';
import { Plus, ChevronRight, GitBranch, Tag, Link2 } from 'lucide-react';
import { ontologyApi } from '../api/foundryApi';
import type { ObjectType, LinkType, OntologyGraph } from '../types';
import { Button, Card, Spinner, Badge, Input } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';

export default function OntologyManager() {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const [types, setTypes] = useState<ObjectType[]>([]);
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
  const [graph, setGraph] = useState<OntologyGraph | null>(null);
  const [selected, setSelected] = useState<ObjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState({ name: '', label: '', icon: '●', color: '#00d4ff', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([ontologyApi.types(), ontologyApi.linkTypes(), ontologyApi.graph()])
      .then(([t, lt, g]) => { setTypes(t); setLinkTypes(lt); setGraph(g); })
      .finally(() => setLoading(false));
  }, [language]);

  const selectType = async (t: ObjectType) => {
    const detail = await ontologyApi.type(t.id);
    setSelected(detail);
  };

  const createType = async () => {
    if (!newType.name || !newType.label) return;
    setCreating(true);
    try {
      await ontologyApi.createType(newType);
      const updated = await ontologyApi.types();
      setTypes(updated);
      setShowAddType(false);
      setNewType({ name: '', label: '', icon: '●', color: '#00d4ff', description: '' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full gap-3"><Spinner size={20} /><span className="text-foundry-muted text-sm">{t('common.loading')}</span></div>;
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: type list */}
      <div className="w-64 shrink-0 border-r border-foundry-border flex flex-col bg-foundry-surface">
        <div className="flex items-center justify-between px-4 py-3 border-b border-foundry-border">
          <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">{t('ont.objectTypes')}</span>
          <Button variant="ghost" size="xs" icon={<Plus size={12} />} onClick={() => setShowAddType(!showAddType)}>{t('ont.new')}</Button>
        </div>
        {showAddType && (
          <div className="p-3 border-b border-foundry-border bg-foundry-card space-y-2">
            <Input placeholder={t('ont.placeholderName')} value={newType.name} onChange={e => setNewType(p => ({ ...p, name: e.target.value }))} />
            <Input placeholder={t('ont.placeholderLabel')} value={newType.label} onChange={e => setNewType(p => ({ ...p, label: e.target.value }))} />
            <div className="flex gap-2">
              <Input placeholder={t('ont.placeholderIcon')} value={newType.icon} onChange={e => setNewType(p => ({ ...p, icon: e.target.value }))} className="w-20" />
              <input type="color" value={newType.color} onChange={e => setNewType(p => ({ ...p, color: e.target.value }))} className="w-10 h-8 bg-transparent border border-foundry-border rounded cursor-pointer" />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="xs" loading={creating} onClick={createType}>{t('ont.create')}</Button>
              <Button variant="ghost" size="xs" onClick={() => setShowAddType(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => selectType(t)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left transition-colors border-l-2 ${
                selected?.id === t.id
                  ? 'bg-foundry-card border-l-foundry-accent text-foundry-text'
                  : 'border-l-transparent text-foundry-text-dim hover:bg-foundry-hover hover:text-foundry-text'
              }`}
            >
              <span className="text-base shrink-0" style={{ color: t.color }}>{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{t.label}</div>
                <div className="text-[10px] text-foundry-muted font-mono-code">{t.name}</div>
              </div>
              <span className="text-[10px] font-mono-code font-semibold" style={{ color: t.color }}>{t.object_count ?? 0}</span>
              <ChevronRight size={11} className="text-foundry-muted shrink-0" />
            </button>
          ))}
        </div>

        {/* Stats footer */}
        <div className="px-4 py-3 border-t border-foundry-border grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-foundry-muted">{t('ont.objectTypes')}</div>
            <div className="text-sm font-bold font-mono-code text-foundry-accent">{types.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-foundry-muted">{t('ont.linkTypes')}</div>
            <div className="text-sm font-bold font-mono-code text-foundry-accent">{linkTypes.length}</div>
          </div>
        </div>
      </div>

      {/* Center: selected type detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-30">🕸</div>
              <p className="text-foundry-muted text-sm">{t('ont.selectTypeHint')}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Type header */}
            <div className="flex items-center gap-4 p-4 bg-foundry-card border border-foundry-border rounded-lg">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${selected.color}22`, border: `1px solid ${selected.color}44` }}>
                {selected.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foundry-text">{selected.label}</h2>
                <div className="text-xs font-mono-code text-foundry-muted">{selected.id}</div>
                {selected.description && <p className="text-xs text-foundry-text-dim mt-1">{selected.description}</p>}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono-code" style={{ color: selected.color }}>
                  {selected.object_count ?? 0}
                </div>
                <div className="text-[10px] text-foundry-muted">{t('common.objects')}</div>
              </div>
            </div>

            {/* Properties */}
            <Card title="Properties" actions={<span className="text-[10px] text-foundry-muted">{selected.property_definitions?.length ?? 0} defined</span>}>
              {!selected.property_definitions?.length ? (
                <div className="p-4 text-xs text-foundry-muted">{t('ont.noProperties')}</div>
              ) : (
                <div className="divide-y divide-foundry-border">
                  {selected.property_definitions.map((pd) => (
                    <div key={pd.id} className="flex items-center gap-4 px-4 py-2.5">
                      <Tag size={11} className="text-foundry-muted shrink-0" />
                      <div className="w-32 shrink-0">
                        <div className="text-xs font-medium text-foundry-text">{pd.label}</div>
                        <div className="text-[10px] font-mono-code text-foundry-muted">{pd.name}</div>
                      </div>
                      <Badge label={pd.type} className="mr-2" />
                      {pd.unit && <span className="text-[10px] text-foundry-muted">{pd.unit}</span>}
                      {pd.required ? <span className="text-[10px] text-red-400 ml-auto">{t('ont.required')}</span> : <span className="ml-auto text-[10px] text-foundry-muted">{t('ont.optional')}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Link types for this object type */}
            {selected.link_types && selected.link_types.length > 0 && (
              <Card title="Link Types" actions={<span className="text-[10px] text-foundry-muted">{selected.link_types.length} relations</span>}>
                <div className="divide-y divide-foundry-border">
                  {selected.link_types.map((lt) => (
                    <div key={lt.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Link2 size={11} className="text-foundry-muted shrink-0" style={{ color: lt.color }} />
                      <div className="flex-1">
                        <div className="text-xs text-foundry-text">{lt.label}</div>
                        {lt.inverse_label && <div className="text-[10px] text-foundry-muted">↩ {lt.inverse_label}</div>}
                      </div>
                      {lt.to_type_id && (
                        <div className="text-[10px] text-foundry-muted font-mono-code">→ {lt.to_type_id}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Right: graph visualization */}
      <div className="w-72 shrink-0 border-l border-foundry-border bg-foundry-surface flex flex-col">
        <div className="px-4 py-3 border-b border-foundry-border">
          <span className="text-xs font-semibold uppercase tracking-widest text-foundry-muted">{t('ont.propertyGraph')}</span>
        </div>
        {graph && <OntologyGraphSVG graph={graph} selectedId={selected?.id} onSelect={(id) => {
          const t = types.find(t => t.id === id);
          if (t) selectType(t);
        }} />}

        {/* Link types list */}
        <div className="border-t border-foundry-border">
          <div className="px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted">{t('ont.allLinkTypes')} ({linkTypes.length})</span>
          </div>
          <div className="overflow-y-auto max-h-40">
            {linkTypes.map((lt) => (
              <div key={lt.id} className="flex items-center gap-2 px-4 py-1.5 border-b border-foundry-border/50 last:border-0">
                <div className="w-2 h-0.5 rounded-full shrink-0" style={{ background: lt.color }} />
                <span className="text-[11px] text-foundry-text-dim truncate">{lt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OntologyGraphSVG({ graph, selectedId, onSelect }: {
  graph: OntologyGraph;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const W = 280, H = 280;
  const cx = W / 2, cy = H / 2, r = 100;
  const n = graph.nodes.length;

  const nodePositions = graph.nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { ...node, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const posMap = Object.fromEntries(nodePositions.map((n) => [n.id, { x: n.x, y: n.y }]));

  return (
    <div className="flex-1 overflow-hidden">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#1e2d3d" />
          </marker>
        </defs>

        {/* Edges */}
        {graph.edges.map((edge) => {
          const from = posMap[edge.from];
          const to = posMap[edge.to];
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={edge.color ?? '#1e2d3d'}
              strokeWidth={1}
              strokeOpacity={0.5}
              markerEnd="url(#arrow)"
            />
          );
        })}

        {/* Nodes */}
        {nodePositions.map((node) => {
          const isSelected = node.id === selectedId;
          return (
            <g key={node.id} onClick={() => onSelect(node.id)} style={{ cursor: 'pointer' }}>
              <circle
                cx={node.x} cy={node.y} r={isSelected ? 18 : 14}
                fill={`${node.color}33`}
                stroke={node.color}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={10}>
                {node.icon}
              </text>
              <text
                x={node.x} y={node.y + (isSelected ? 26 : 22)}
                textAnchor="middle" fontSize={8}
                fill={isSelected ? node.color : '#64748b'}
                fontWeight={isSelected ? 'bold' : 'normal'}
              >
                {node.label.split(' ')[0]}
              </text>
              {node.count > 0 && (
                <text x={node.x + 12} y={node.y - 12} textAnchor="middle" fontSize={8} fill={node.color} fontWeight="bold">
                  {node.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
