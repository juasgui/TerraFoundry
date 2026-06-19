import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Link2, Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { objectsApi } from '../../api/foundryApi';
import type { FoundryObject } from '../../types';
import { Badge, Button, Spinner, Tabs, StatusDot, TimelineItem } from '../ui';

export default function ObjectDetailPanel() {
  const { selectedObjectId, selectedObject, setSelectedObject, closeDetailPanel, openDetailPanel } = useAppStore();
  const [tab, setTab] = useState('properties');
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!selectedObjectId) return;
    setLoading(true);
    setTab('properties');
    objectsApi.get(selectedObjectId)
      .then(setSelectedObject)
      .finally(() => setLoading(false));
  }, [selectedObjectId]);

  const obj = selectedObject;

  const handleComment = async () => {
    if (!comment.trim() || !obj) return;
    setPosting(true);
    try {
      await objectsApi.addComment(obj.id, comment);
      const updated = await objectsApi.get(obj.id);
      setSelectedObject(updated);
      setComment('');
    } finally {
      setPosting(false);
    }
  };

  const propEntries = obj
    ? Object.entries(obj.properties).filter(([, v]) => v !== null && v !== '' && v !== undefined)
    : [];

  return (
    <div className="absolute right-0 top-0 h-full w-[480px] bg-foundry-panel border-l border-foundry-border flex flex-col animate-slide-in z-30 shadow-2xl">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-foundry-border">
        {obj && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
            style={{ background: `${obj.type_color ?? '#00d4ff'}22`, border: `1px solid ${obj.type_color ?? '#00d4ff'}44` }}
          >
            {obj.type_icon ?? '●'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center gap-2 py-2"><Spinner size={14} /><span className="text-xs text-foundry-muted">Loading…</span></div>
          ) : obj ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-foundry-text truncate">{obj.name}</h2>
                <StatusDot status={obj.status} />
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[11px] text-foundry-muted font-mono-code">{obj.id}</span>
                {obj.type_label && <span className="text-[10px] text-foundry-accent">{obj.type_label}</span>}
                {obj.severity && <Badge label={obj.severity} />}
              </div>
            </>
          ) : null}
        </div>
        <button onClick={closeDetailPanel} className="text-foundry-muted hover:text-foundry-text p-1 shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      {obj && (
        <Tabs
          tabs={[
            { id: 'properties', label: 'Properties', count: propEntries.length },
            { id: 'links', label: 'Links', count: (obj.links_out?.length ?? 0) + (obj.links_in?.length ?? 0) },
            { id: 'timeline', label: 'Timeline', count: obj.timeline?.length },
            { id: 'comments', label: 'Comments', count: obj.comments?.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!obj && !loading && (
          <div className="p-4 text-xs text-foundry-muted">Select an object to inspect.</div>
        )}

        {obj && tab === 'properties' && (
          <div className="p-4 space-y-2">
            <PropRow label="Status" value={<><StatusDot status={obj.status} /><span className="ml-1">{obj.status}</span></>} />
            {obj.severity && <PropRow label="Severity" value={<Badge label={obj.severity} />} />}
            {obj.geo_lat != null && (
              <PropRow label="Coordinates" value={<span className="font-mono-code text-[11px]">{obj.geo_lat.toFixed(4)}, {obj.geo_lng?.toFixed(4)}</span>} />
            )}
            <PropRow label="Created" value={new Date(obj.created_at).toLocaleString()} />
            <PropRow label="Updated" value={new Date(obj.updated_at).toLocaleString()} />
            <div className="pt-2 border-t border-foundry-border">
              {obj.property_definitions && obj.property_definitions.length > 0 ? (
                obj.property_definitions.map((pd) => {
                  const val = obj.properties[pd.name];
                  if (val == null || val === '') return null;
                  return (
                    <PropRow
                      key={pd.id}
                      label={pd.label}
                      value={
                        <span>
                          {String(val)}{pd.unit ? ` ${pd.unit}` : ''}
                        </span>
                      }
                    />
                  );
                })
              ) : (
                propEntries.map(([k, v]) => (
                  <PropRow key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
                ))
              )}
            </div>
          </div>
        )}

        {obj && tab === 'links' && (
          <div className="p-4 space-y-4">
            {obj.links_out && obj.links_out.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">Outgoing</div>
                {obj.links_out.map((link) => (
                  <LinkCard
                    key={link.link_id}
                    label={link.link_label}
                    id={link.target_id}
                    name={link.target_name}
                    typeLabel={link.target_type_label}
                    typeColor={link.target_type_color}
                    direction="out"
                    onNavigate={() => link.target_id && openDetailPanel(link.target_id)}
                  />
                ))}
              </div>
            )}
            {obj.links_in && obj.links_in.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">Incoming</div>
                {obj.links_in.map((link) => (
                  <LinkCard
                    key={link.link_id}
                    label={link.link_label}
                    id={link.source_id}
                    name={link.source_name}
                    typeLabel={link.source_type_label}
                    typeColor={link.source_type_color}
                    direction="in"
                    onNavigate={() => link.source_id && openDetailPanel(link.source_id)}
                  />
                ))}
              </div>
            )}
            {!obj.links_out?.length && !obj.links_in?.length && (
              <p className="text-xs text-foundry-muted py-4">No links for this object.</p>
            )}
          </div>
        )}

        {obj && tab === 'timeline' && (
          <div className="p-4">
            {obj.timeline && obj.timeline.length > 0 ? (
              obj.timeline.map((ev) => (
                <TimelineItem
                  key={ev.id}
                  title={ev.title}
                  sub={ev.description}
                  ts={ev.created_at}
                  icon={<Clock size={10} />}
                  color="#00d4ff"
                />
              ))
            ) : (
              <p className="text-xs text-foundry-muted py-4">No timeline events.</p>
            )}
          </div>
        )}

        {obj && tab === 'comments' && (
          <div className="p-4 space-y-3">
            {obj.comments?.map((c) => (
              <div key={c.id} className="bg-foundry-card border border-foundry-border rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-foundry-accent">{c.user_name}</span>
                  <span className="text-[10px] text-foundry-muted font-mono-code">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-foundry-text">{c.content}</p>
              </div>
            ))}
            <div className="border-t border-foundry-border pt-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                className="w-full bg-foundry-surface border border-foundry-border rounded p-2 text-xs text-foundry-text placeholder-foundry-muted resize-none focus:outline-none focus:border-foundry-accent/50 h-20"
              />
              <Button
                variant="primary"
                className="mt-2"
                onClick={handleComment}
                loading={posting}
                icon={<MessageSquare size={11} />}
              >
                Post Comment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-foundry-border/50 last:border-0">
      <span className="text-[11px] text-foundry-muted w-28 shrink-0 capitalize">{label}</span>
      <span className="text-xs text-foundry-text flex items-center gap-1 flex-wrap">{value}</span>
    </div>
  );
}

function LinkCard({ label, id, name, typeLabel, typeColor, direction, onNavigate }: {
  label: string; id?: string; name?: string;
  typeLabel?: string; typeColor?: string;
  direction: 'in' | 'out'; onNavigate: () => void;
}) {
  if (!id || !name) return null;
  return (
    <div
      className="flex items-center gap-3 p-2 rounded bg-foundry-card border border-foundry-border hover:border-foundry-accent/30 cursor-pointer mb-1.5 group"
      onClick={onNavigate}
    >
      <Link2 size={11} className={`shrink-0 ${direction === 'out' ? 'text-foundry-accent' : 'text-foundry-purple'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-foundry-muted">{label}</div>
        <div className="text-xs text-foundry-text truncate">{name}</div>
        {typeLabel && <div className="text-[10px]" style={{ color: typeColor ?? '#00d4ff' }}>{typeLabel}</div>}
      </div>
      <ChevronRight size={12} className="text-foundry-muted group-hover:text-foundry-accent shrink-0" />
    </div>
  );
}
