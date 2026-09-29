import React, { useState, useEffect } from 'react';
import {
  Clock,
  Database,
  Layers,
  Search,
  Sparkles,
  Terminal
} from 'lucide-react';
import type {
  HistoricalMatch,
  MemoryTimelineNode,
  SystemicPatternAlert
} from '../types/incident.ts';

interface MemoryExplorerViewProps {
  timeline: MemoryTimelineNode[];
  onSelectIncidentId: (id: string) => void;
}

const SAMPLE_QUERIES = [
  {
    label: 'Payment API DB Connection Timeout (504)',
    query: 'Timeout while acquiring database connection 504 Gateway Timeout',
    service: 'Payment API'
  },
  {
    label: 'Auth Service Redis Eviction Latency',
    query: 'ioredis Command SETEX session timed out maxmemory eviction',
    service: 'Authentication Service'
  },
  {
    label: 'Kafka Consumer Rebalance Lag Storm',
    query: 'CommitFailedException consumer group rebalance lag',
    service: 'Notification Service'
  },
  {
    label: 'API Gateway 502 Upstream Keep-Alive Reset',
    query: 'upstream prematurely closed connection 502 Bad Gateway keepAliveTimeout',
    service: 'API Gateway'
  },
  {
    label: 'PostgreSQL Autovacuum Lock Contention',
    query: 'canceling statement due to lock timeout ALTER TABLE',
    service: 'Database'
  }
];

export const MemoryExplorerView: React.FC<MemoryExplorerViewProps> = ({
  timeline,
  onSelectIncidentId
}) => {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0].query);
  const [serviceFilter, setServiceFilter] = useState(SAMPLE_QUERIES[0].service);
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<HistoricalMatch[]>([]);
  const [reflectSummary, setReflectSummary] = useState<string>('');
  const [patternAlert, setPatternAlert] = useState<SystemicPatternAlert | null>(null);
  const [memoriesSearched, setMemoriesSearched] = useState<number>(24);
  const [latencyMs, setLatencyMs] = useState<number>(8);

  const executeSearch = async (q: string, srv: string) => {
    setSearching(true);
    try {
      const res = await fetch('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          title: q,
          error_message: q,
          service: srv === 'ALL' ? '' : srv
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
        setReflectSummary(data.reflectSummary || '');
        setPatternAlert(data.systemicPattern || null);
        setMemoriesSearched(data.memoriesSearched || 24);
        setLatencyMs(data.latencyMs || 9);
      }
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    executeSearch(SAMPLE_QUERIES[0].query, SAMPLE_QUERIES[0].service);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Hindsight Recall + Reflect Search Bar */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#1E2633]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              VECTORIZE HINDSIGHT MEMORY ENGINE EXPLORER
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-0.5">
              Query Organizational Incident Memory via Hindsight <code className="text-violet-300">recall()</code> &amp;{' '}
              <code className="text-violet-300">reflect()</code>
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Searched {memoriesSearched} memories in {latencyMs}ms
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch(query, serviceFilter);
          }}
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Hindsight memory by symptom, error message, root cause, or deployment..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Services</option>
            <option value="Payment API">Payment API</option>
            <option value="Authentication Service">Authentication Service</option>
            <option value="Order Service">Order Service</option>
            <option value="Notification Service">Notification Service</option>
            <option value="User API">User API</option>
            <option value="Database">Database</option>
            <option value="Redis Cache">Redis Cache</option>
            <option value="API Gateway">API Gateway</option>
          </select>

          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shrink-0"
          >
            {searching ? 'Recalling...' : 'Recall Memories'}
          </button>
        </form>

        {/* Quick Sample Query Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-mono uppercase text-slate-500">Quick Queries:</span>
          {SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuery(sq.query);
                setServiceFilter(sq.service);
                executeSearch(sq.query, sq.service);
              }}
              className="px-2.5 py-1 rounded-sm text-[11px] font-mono bg-[#0B0E14] hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-[#1E2633] hover:border-blue-500/40 transition-colors cursor-pointer"
            >
              {sq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hindsight Reflect() Contextual Synthesis Banner */}
      {reflectSummary && (
        <div className="bg-[#11161F] border border-violet-500/40 rounded p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>HINDSIGHT REFLECT() MEMORY CONSOLIDATION</span>
            </span>
            {patternAlert && (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-violet-500/20 text-violet-200 border border-violet-500/40 rounded-sm">
                Cluster: {patternAlert.pattern_name} ({patternAlert.occurrence_count} incidents)
              </span>
            )}
          </div>
          <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed bg-[#0B0E14] p-3 rounded border border-[#1E2633]">
            {reflectSummary}
          </pre>
        </div>
      )}

      {/* Retrieved Hindsight Memory Units */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Retrieved Hindsight Memory Units ({matches.length})
            </h2>
            <p className="text-xs text-slate-400">
              Ranked using Hindsight hybrid retrieval (Semantic Cosine + BM25 Keyword + Service/Pattern Graph boost).
            </p>
          </div>
          <Database className="w-4 h-4 text-blue-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((m) => (
            <div
              key={m.incident_id}
              className="bg-[#0B0E14] border border-[#1E2633] hover:border-blue-500/40 rounded p-4 space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectIncidentId(m.incident_id)}
                    className="text-xs font-mono font-bold text-blue-400 hover:underline cursor-pointer"
                  >
                    {m.incident_id}
                  </button>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded-sm">
                    {m.service}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {m.days_ago === 0 ? 'Today' : `${m.days_ago}d ago`}
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-sm">
                  Score: {m.retrieval_scores.final}
                </span>
              </div>

              <div className="text-sm font-bold text-slate-100">{m.title}</div>

              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 bg-[#11161F] p-2 rounded border border-[#1E2633]">
                <span>Semantic: {m.retrieval_scores.semantic}</span>
                <span>|</span>
                <span>BM25 Keyword: {m.retrieval_scores.keyword}</span>
                <span>|</span>
                <span className="text-violet-300">Rating: {m.feedback_rating || 'Very Useful'}</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="font-mono text-[10px] uppercase text-slate-500 block">
                    Symptoms &amp; Error:
                  </span>
                  <span className="text-slate-300 font-mono">{m.error_message}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase text-slate-500 block">
                    Verified Root Cause:
                  </span>
                  <span className="text-slate-200">{m.root_cause}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase text-emerald-400 block">
                    Resolution That Worked:
                  </span>
                  <span className="text-emerald-300">{m.what_worked}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase text-red-400 block">
                    What Did Not Work:
                  </span>
                  <span className="text-red-300">{m.what_did_not_work}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1E2633] flex items-center justify-between">
                <span className="text-[11px] text-slate-400 truncate max-w-xs">
                  {m.relevance_explanation}
                </span>
                <button
                  onClick={() => onSelectIncidentId(m.incident_id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-[#11161F] hover:bg-blue-600/20 text-blue-300 border border-[#1E2633] cursor-pointer shrink-0"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Open Incident</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 7 — Full Incident Memory Evolution Timeline */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
          <div>
            <div className="text-[10px] font-mono uppercase text-violet-400">
              STEP 7 — ORGANIZATIONAL MEMORY EVOLUTION TIMELINE
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-0.5">
              Chronological Incident Learning Progression ({timeline.length} Retained Incidents)
            </h2>
          </div>
          <Clock className="w-4 h-4 text-violet-400" />
        </div>

        <div className="space-y-3">
          {timeline.map((node) => (
            <div
              key={node.id}
              onClick={() => onSelectIncidentId(node.incident_id)}
              className="bg-[#0B0E14] border border-[#1E2633] hover:border-blue-500/40 rounded p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {node.day_label} — {node.incident_id}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-200 rounded-sm">
                    {node.service}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-sm">
                    {node.pattern_name}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-100">{node.title}</div>
                <div className="text-xs text-slate-400">
                  <strong className="text-slate-300">Root Cause:</strong> {node.root_cause}
                </div>
                <div className="text-xs text-emerald-300 font-mono">
                  Fix: {node.what_worked}
                </div>
              </div>

              <div className="md:text-right shrink-0 space-y-1">
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-sm border inline-block ${
                    node.memory_evolution_stage === 'Initial Discovery'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : node.memory_evolution_stage === 'Memory Recalled'
                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                      : node.memory_evolution_stage === 'Pattern Consolidated'
                      ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {node.memory_evolution_stage}
                </span>
                <div className="text-[11px] text-slate-400 max-w-xs">{node.learning_note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
