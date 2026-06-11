import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Database } from 'lucide-react';
import { aiApi } from '../api/foundryApi';
import { useAppStore } from '../store/appStore';
import type { ChatMessage } from '../types';
import { Button, Spinner } from '../components/ui';

const STARTERS = [
  'What is the current situation in Sofala province?',
  'List all deployed resources',
  'What are the active hazards?',
  'Predict the impact of heavy rainfall in the Zambezi basin',
  'How many people are affected by floods?',
  'Which organizations are responding to Cyclone Idai?',
  'What is the supply chain status for Beira corridor?',
  'Generate a situation report for Mozambique',
];

export default function AIAssistant() {
  const { chatMessages, addChatMessage, clearChat, chatSessionId } = useAppStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const send = async (msg?: string) => {
    const text = (msg ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(text, chatSessionId);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.content,
        timestamp: new Date().toISOString(),
        intent: res.intent,
      };
      addChatMessage(assistantMsg);
    } catch {
      addChatMessage({
        id: `err-${Date.now()}`,
        role: 'assistant',
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
      {/* Main chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-foundry-border bg-foundry-surface shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Bot size={16} className="text-foundry-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foundry-text">Terra AI Assistant</div>
            <div className="text-[10px] text-foundry-muted">Grounded in live Mozambique ontology · Intent-based reasoning</div>
          </div>
          {chatMessages.length > 0 && (
            <Button variant="ghost" size="xs" icon={<RefreshCw size={12} />} className="ml-auto" onClick={clearChat}>Clear chat</Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-foundry-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foundry-text mb-1">Terra AI — Ontology-Grounded Intelligence</h3>
              <p className="text-xs text-foundry-muted text-center max-w-md mb-6">
                Ask about the Mozambique crisis: hazards, resources, affected populations, supply chains, mission status, and more.
                All answers are grounded in live database data.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-2xl">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left p-3 bg-foundry-card border border-foundry-border rounded-lg text-xs text-foundry-text-dim hover:text-foundry-text hover:border-foundry-accent/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user'
                  ? 'bg-foundry-hover border border-foundry-border'
                  : 'bg-cyan-500/20 border border-cyan-500/40'
              }`}>
                {msg.role === 'user'
                  ? <User size={13} className="text-foundry-text-dim" />
                  : <Bot size={13} className="text-foundry-accent" />
                }
              </div>
              <div className={`flex-1 max-w-2xl ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                <div className={`rounded-xl p-3 ${
                  msg.role === 'user'
                    ? 'bg-foundry-hover text-foundry-text text-xs'
                    : 'bg-foundry-card border border-foundry-border text-foundry-text text-xs'
                }`}>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{msg.content}</pre>
                  {msg.intent && (
                    <div className="mt-2 pt-2 border-t border-foundry-border/50">
                      <span className="text-[10px] text-foundry-muted">
                        <Database size={9} className="inline mr-1" />
                        Intent: <span className="text-foundry-accent">{msg.intent.replace(/_/g, ' ')}</span>
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
              <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                <Bot size={13} className="text-foundry-accent" />
              </div>
              <div className="bg-foundry-card border border-foundry-border rounded-xl p-3 flex items-center gap-2">
                <Spinner size={13} />
                <span className="text-xs text-foundry-muted">Querying ontology…</span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-foundry-border bg-foundry-surface shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about Mozambique hazards, resources, affected populations… (Enter to send)"
              className="flex-1 bg-foundry-card border border-foundry-border rounded-lg px-4 py-3 text-xs text-foundry-text placeholder-foundry-muted resize-none focus:outline-none focus:border-foundry-accent/50 min-h-12 max-h-32"
              rows={2}
            />
            <Button
              variant="primary"
              size="md"
              loading={loading}
              icon={<Send size={14} />}
              onClick={() => send()}
              disabled={!input.trim()}
            >
              Send
            </Button>
          </div>
          <p className="text-[10px] text-foundry-muted mt-2">Shift+Enter for new line · Enter to send</p>
        </div>
      </div>

      {/* Context sidebar */}
      <div className="w-56 shrink-0 border-l border-foundry-border bg-foundry-surface flex flex-col">
        <div className="px-4 py-3 border-b border-foundry-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-foundry-muted">AI Capabilities</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {[
            { intent: 'situation_report', label: 'Situation Report', desc: 'National/province overview' },
            { intent: 'list_hazards',     label: 'Hazard Listing',   desc: 'Active weather events' },
            { intent: 'list_resources',   label: 'Resource Status',  desc: 'Deployed assets & gaps' },
            { intent: 'prediction',       label: 'Impact Prediction',desc: 'Rainfall/flood forecasts' },
            { intent: 'recommendation',   label: 'Recommendations',  desc: 'Action priorities' },
            { intent: 'count',            label: 'Object Counts',    desc: 'Stats from ontology' },
            { intent: 'list_orgs',        label: 'Organizations',    desc: 'Responding agencies' },
            { intent: 'risk_assessment',  label: 'Risk Assessment',  desc: 'Province risk scoring' },
            { intent: 'supply_status',    label: 'Supply Chains',    desc: 'Route & warehouse status' },
            { intent: 'mission_status',   label: 'Mission Status',   desc: 'Active operations' },
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
            <div className="font-semibold text-foundry-text-dim mb-1">Data grounded in:</div>
            {['INAM', 'INGD', 'WFP LESS', 'DHIS2', 'Sentinel-2', 'CHIRPS'].map(s => (
              <div key={s} className="flex items-center gap-1 py-0.5">
                <span className="text-emerald-400 text-[8px]">●</span> {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
