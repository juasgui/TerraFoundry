import React, { useEffect, useRef, useState } from 'react';
import {
  Send, Bot, User, RefreshCw, Database, AlertTriangle,
  Shield, ChevronRight, Sparkles, Activity, CheckCircle,
} from 'lucide-react';
import { aiApi } from '../api/foundryApi';
import { useAppStore } from '../store/appStore';
import type { ChatMessage, AiBriefing } from '../types';
import { Button, Spinner, Badge } from '../components/ui';
import { useT } from '../i18n/useT';

const QUICK_ACTIONS_EN = [
  'What should we prioritize right now?',
  'What are the three biggest risks?',
  'Which assets should be deployed?',
  'Summarize the situation in Sofala',
  'Predict impact of heavy rainfall in Zambezi basin',
  'Which districts require evacuation?',
  'What is the supply chain status?',
  'Recommend resource allocation priorities',
];

const QUICK_ACTION_KEYS = ['ai.qa1','ai.qa2','ai.qa3','ai.qa4','ai.qa5','ai.qa6','ai.qa7','ai.qa8'];

export default function AIAssistant() {
  const t = useT();
  const { chatMessages, addChatMessage, clearChat, chatSessionId } = useAppStore();
  const language = useAppStore((s) => s.language);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<AiBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingExpanded, setBriefingExpanded] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBriefing(null);
    setBriefingLoading(true);
    setBriefingExpanded(true);
    aiApi.briefing()
      .then(setBriefing)
      .catch(() => {})
      .finally(() => setBriefingLoading(false));
  }, [language]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const send = async (msg?: string) => {
    const text = (msg ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setInput('');
    setBriefingExpanded(false);
    setLoading(true);

    try {
      const res = await aiApi.chat(text, chatSessionId);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`, role: 'assistant', content: res.content,
        timestamp: new Date().toISOString(), intent: res.intent,
      };
      addChatMessage(assistantMsg);
    } catch {
      addChatMessage({
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'Unable to reach Terra AI. Check that the backend is running.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-foundry-border bg-foundry-surface shrink-0">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center">
              <Shield size={17} className="text-foundry-accent" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-foundry-surface blink" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-foundry-text">{t('ai.title')}</div>
            <div className="text-[10px] text-emerald-400">● {t('ops.online')} — {t('ai.groundedMozOntology')}</div>
          </div>
          {chatMessages.length > 0 && (
            <Button variant="ghost" size="xs" icon={<RefreshCw size={12} />} onClick={clearChat}>
              {t('ai.clearChat')}
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Proactive briefing card (shown at session start) */}
          {briefingExpanded && (
            <div className="bg-foundry-card border border-cyan-800/40 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/30 border-b border-cyan-800/30">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-foundry-accent" />
                  <span className="text-xs font-bold text-foundry-text">{t('ai.title')}</span>
                  <span className="text-[10px] text-foundry-muted">— {t('ai.proactiveBriefing')}</span>
                </div>
                <span className="text-[10px] text-foundry-muted font-mono-code">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              {briefingLoading ? (
                <div className="flex items-center gap-2 p-4">
                  <Spinner size={14} />
                  <span className="text-xs text-foundry-muted">{t('ai.analysingOvernight')}</span>
                </div>
              ) : briefing ? (
                <div className="p-4 space-y-4">
                  {/* Greeting */}
                  <div>
                    <p className="text-sm font-semibold text-foundry-text mb-1">
                      {briefing.greeting}. {t('ai.introSuffix')}
                    </p>
                    <p className="text-xs text-foundry-text-dim leading-relaxed">{briefing.summary}</p>
                  </div>

                  {/* Risk items */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2">
                      {t('ai.emergingRisksAttention')}
                    </div>
                    <div className="space-y-2">
                      {briefing.risks.map((risk) => (
                        <div key={risk.rank} className="flex items-start gap-3 p-3 bg-foundry-surface rounded-lg border border-foundry-border">
                          <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                            risk.severity === 'CRITICAL'
                              ? 'bg-red-950 text-red-400'
                              : 'bg-orange-950 text-orange-400'
                          }`}>
                            {risk.rank}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-semibold text-foundry-text">{risk.title}</p>
                              <Badge label={risk.severity} />
                            </div>
                            <p className="text-[11px] text-foundry-muted leading-relaxed mb-1">{risk.detail}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-foundry-accent font-medium">
                                ↳ {risk.actionRequired}
                              </span>
                              <span className="text-[10px] text-foundry-muted font-mono-code">{risk.confidence}% confidence · {risk.source}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-foundry-border/50">
                    <span className="text-[10px] text-foundry-muted">{t('ai.quickActionsHint')}</span>
                    <button
                      onClick={() => setBriefingExpanded(false)}
                      className="ml-auto text-[10px] text-foundry-muted hover:text-foundry-text"
                    >
                      {t('ai.collapse')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-xs text-foundry-muted">{t('ai.briefingUnavailable')}</div>
              )}
            </div>
          )}

          {/* Collapsed briefing toggle */}
          {!briefingExpanded && chatMessages.length === 0 && (
            <button
              onClick={() => setBriefingExpanded(true)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-foundry-surface border border-cyan-800/30 rounded-lg text-xs text-foundry-muted hover:text-foundry-text hover:border-cyan-800/50 transition-colors"
            >
              <Shield size={11} className="text-foundry-accent" />
              {t('ai.showBriefing')}
              <ChevronRight size={10} className="ml-auto rotate-90" />
            </button>
          )}

          {/* Quick actions (only when no messages yet) */}
          {chatMessages.length === 0 && !briefingExpanded && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted mb-2 px-1">{t('ai.quickActions')}</div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTION_KEYS.map((key, i) => (
                  <button
                    key={key}
                    onClick={() => send(QUICK_ACTIONS_EN[i])}
                    className="text-left p-3 bg-foundry-card border border-foundry-border rounded-lg text-xs text-foundry-text-dim hover:text-foundry-text hover:border-foundry-accent/40 transition-colors"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user'
                  ? 'bg-foundry-hover border border-foundry-border'
                  : 'bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40'
              }`}>
                {msg.role === 'user'
                  ? <User size={13} className="text-foundry-text-dim" />
                  : <Shield size={13} className="text-foundry-accent" />
                }
              </div>
              <div className={`flex-1 max-w-2xl ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                <div className={`rounded-xl p-3 ${
                  msg.role === 'user'
                    ? 'bg-foundry-hover text-foundry-text text-xs'
                    : 'bg-foundry-card border border-foundry-border text-foundry-text text-xs'
                }`}>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{msg.content}</pre>
                  {msg.intent && msg.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-foundry-border/50 flex items-center gap-2">
                      <Database size={9} className="text-foundry-muted" />
                      <span className="text-[10px] text-foundry-muted">
                        Intent: <span className="text-foundry-accent">{msg.intent.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={8} /> {t('ai.groundedOntology')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-foundry-muted mt-1 font-mono-code px-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center">
                <Shield size={13} className="text-foundry-accent" />
              </div>
              <div className="bg-foundry-card border border-foundry-border rounded-xl p-3 flex items-center gap-2">
                <Spinner size={13} />
                <span className="text-xs text-foundry-muted">{t('ai.thinking')}</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-foundry-border bg-foundry-surface shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('ai.chatPlaceholder')}
              className="flex-1 bg-foundry-card border border-foundry-border rounded-lg px-4 py-3 text-xs text-foundry-text placeholder-foundry-muted resize-none focus:outline-none focus:border-foundry-accent/50 min-h-12 max-h-32"
              rows={2}
            />
            <Button variant="primary" size="md" loading={loading} icon={<Send size={14} />}
              onClick={() => send()} disabled={!input.trim()}>
              {t('ai.send')}
            </Button>
          </div>
          <p className="text-[10px] text-foundry-muted mt-2">{t('ai.shiftEnterHint')}</p>
        </div>
      </div>

      {/* Right capability panel */}
      <div className="w-52 shrink-0 border-l border-foundry-border bg-foundry-surface flex flex-col">
        <div className="px-4 py-3 border-b border-foundry-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted">{t('intel.title')}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {[
            { intent: 'situation_report', label: 'Situation Report',   desc: 'National/province overview' },
            { intent: 'list_hazards',     label: 'Hazard Intelligence', desc: 'Active weather events' },
            { intent: 'list_resources',   label: 'Resource Status',    desc: 'Deployed assets & gaps' },
            { intent: 'prediction',       label: 'Impact Prediction',  desc: 'Rainfall/flood forecasts' },
            { intent: 'recommendation',   label: 'Action Priorities',  desc: 'Closed-loop recommendations' },
            { intent: 'risk_assessment',  label: 'Risk Assessment',    desc: 'Province risk scoring' },
            { intent: 'supply_status',    label: 'Supply Chains',      desc: 'Route & warehouse status' },
            { intent: 'mission_status',   label: 'Mission Status',     desc: 'Active operations' },
            { intent: 'list_orgs',        label: 'Organizations',      desc: 'Responding agencies' },
            { intent: 'count',            label: 'Ontology Counts',    desc: 'Object stats' },
          ].map((c) => (
            <button
              key={c.intent}
              onClick={() => send(c.label)}
              className="w-full text-left p-2.5 rounded bg-foundry-card border border-foundry-border hover:border-foundry-accent/40 transition-colors"
            >
              <div className="text-[11px] font-medium text-foundry-text">{c.label}</div>
              <div className="text-[10px] text-foundry-muted">{c.desc}</div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-foundry-border">
          <div className="text-[10px] text-foundry-muted">
            <div className="font-semibold text-foundry-text-dim mb-2">{t('ai.liveDataSources')}</div>
            {[
              { name: 'INAM', color: '#38bdf8' },
              { name: 'INGD', color: '#4ade80' },
              { name: 'WFP LESS', color: '#facc15' },
              { name: 'DHIS2', color: '#a78bfa' },
              { name: 'Sentinel-2', color: '#fb923c' },
              { name: 'CHIRPS', color: '#06b6d4' },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full blink shrink-0" style={{ background: s.color }} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
