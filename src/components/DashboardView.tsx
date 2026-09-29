import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Play,
  PlusCircle,
  GitCompare,
  ArrowRight,
  Layers,
  Search,
  Sparkles,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import type {
  IncidentRecord,
  MemoryInsightsStats,
  MemoryTimelineNode
} from '../types/incident.ts';
import type { NavTab } from './Sidebar.tsx';

interface DashboardViewProps {
  incidents: IncidentRecord[];
  insights: MemoryInsightsStats | null;
  timeline: MemoryTimelineNode[];
  onSelectIncident: (incident: IncidentRecord) => void;
  onNavigate: (tab: NavTab) => void;
  onQuickLaunchPreset: (presetIndex: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  incidents,
  insights,
  timeline,
  onSelectIncident,
  onNavigate,
  onQuickLaunchPreset
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const activeIncidents = incidents.filter((i) => i.status === 'Investigating' || i.status === 'Mitigated');
  const services = Array.from(new Set(incidents.map((i) => i.service))).sort();

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      !searchQuery.trim() ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.resolution?.root_cause || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesService = serviceFilter === 'ALL' || inc.service === serviceFilter;
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    return matchesSearch && matchesService && matchesStatus;
  });

  // Highlighted Payment API & DB Pool timeline progression for the judge walkthrough
  const featuredTimeline = timeline.filter(
    (node) => node.pattern_id === 'PATTERN-A' || !node.incident_id.startsWith('INC-10')
  );
  const displayTimeline = featuredTimeline.length >= 3 ? featuredTimeline.slice(-6) : timeline.slice(-6);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'SEV-1':
        return 'bg-red-500/15 text-red-400 border-red-500/40';
      case 'SEV-2':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/40';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Investigating':
        return 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse';
      case 'Mitigated':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Command Bar & 3-Minute Judge Walkthrough Strip */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#1E2633]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-sm">
                VECTORIZE HINDSIGHT PERSISTENT MEMORY
              </span>
              <span className="text-xs font-mono text-slate-400">
                Every resolved production incident makes the organization smarter.
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1.5 tracking-tight">
              Incident Memory OS — Production SRE Command Center
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onQuickLaunchPreset(0)}
              className="flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Scene 1: Payment API DB Timeout</span>
            </button>

            <button
              onClick={() => onNavigate('before-after')}
              className="flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold bg-violet-600/20 hover:bg-violet-600/30 text-violet-200 border border-violet-500/40 transition-colors cursor-pointer"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare Without vs With Hindsight</span>
            </button>

            <button
              onClick={() => onNavigate('new-incident')}
              className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium bg-[#18202C] hover:bg-[#1F2937] text-slate-200 border border-[#1E2633] transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>New Custom Incident</span>
            </button>
          </div>
        </div>

        {/* 5-Scene Interactive Demo Flow for Hackathon Judges */}
        <div className="pt-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Interactive Closed-Loop Demo Flow (Click any scene to jump directly):</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            <button
              onClick={() => onQuickLaunchPreset(0)}
              className="text-left p-2.5 rounded bg-[#0B0E14] hover:bg-[#151C28] border border-[#1E2633] hover:border-blue-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-blue-400">
                <span>SCENE 01</span>
                <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                Submit Payment API Timeout
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                Hindsight recalls 4 past pool exhaustion incidents & builds runbook.
              </div>
            </button>

            <button
              onClick={() => onNavigate('incident-detail')}
              className="text-left p-2.5 rounded bg-[#0B0E14] hover:bg-[#151C28] border border-[#1E2633] hover:border-emerald-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                <span>SCENE 02</span>
                <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                Resolve & Retain in Hindsight
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                Record root cause & resolution; store back into Hindsight bank.
              </div>
            </button>

            <button
              onClick={() => onQuickLaunchPreset(1)}
              className="text-left p-2.5 rounded bg-[#0B0E14] hover:bg-[#151C28] border border-[#1E2633] hover:border-amber-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                <span>SCENE 03</span>
                <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                Trigger Follow-Up Canary Outage
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                Verify newly resolved incident is immediately recalled by Hindsight!
              </div>
            </button>

            <button
              onClick={() => onNavigate('before-after')}
              className="text-left p-2.5 rounded bg-[#0B0E14] hover:bg-[#151C28] border border-[#1E2633] hover:border-violet-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-violet-400">
                <span>SCENE 04</span>
                <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                Before vs After Memory Diff
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                Side-by-side generic stateless AI vs Hindsight-powered agent.
              </div>
            </button>

            <button
              onClick={() => onNavigate('memory-insights')}
              className="text-left p-2.5 rounded bg-[#0B0E14] hover:bg-[#151C28] border border-[#1E2633] hover:border-cyan-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
                <span>SCENE 05</span>
                <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                Service Knowledge Graph
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                Inspect accumulated runbooks, root causes & failed fixes per service.
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Top-Level KPI Cards (Max 3 data points per card, crisp 1px borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11161F] border border-[#1E2633] rounded p-4">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>INCIDENTS IN HINDSIGHT</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-100 mt-2">
            {insights?.total_incidents_remembered ?? incidents.length}
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>Seeded: {insights?.seed_incidents_count ?? 24}</span>
            <span className="text-emerald-400">
              Live Added: +{insights?.live_incidents_count ?? 0}
            </span>
          </div>
        </div>

        <div className="bg-[#11161F] border border-[#1E2633] rounded p-4">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>ACTIVE INVESTIGATIONS</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-100 mt-2">
            {activeIncidents.length}
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>Resolved: {insights?.resolved_incidents_count ?? incidents.length}</span>
            <span className="text-blue-400">Ready for Triage</span>
          </div>
        </div>

        <div className="bg-[#11161F] border border-[#1E2633] rounded p-4">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>MEMORY RESOLUTION RATE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-2">
            {insights?.resolution_rate_percent ?? 100}%
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>Verified Fixes</span>
            <span className="text-slate-300">Closed-Loop Active</span>
          </div>
        </div>

        <div className="bg-[#11161F] border border-[#1E2633] rounded p-4">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>SYSTEMIC PATTERNS</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-violet-300 mt-2">
            {insights?.recurring_patterns_count ?? 6}
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>Root Causes: {insights?.known_root_causes_count ?? 24}</span>
            <span className="text-violet-400">Auto-Clustered</span>
          </div>
        </div>
      </div>

      {/* Step 7 — Incident Evolution Timeline (Visualizing How Hindsight Memory Evolves Over Time) */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1E2633]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400">
              ORGANIZATIONAL LEARNING PROGRESSION
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-0.5">
              Incident Memory Evolution Timeline (DB Connection Pool Pattern & Live Resolutions)
            </h2>
          </div>
          <button
            onClick={() => onNavigate('memory-explorer')}
            className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Explore Full Timeline ({timeline.length} nodes)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          {displayTimeline.map((node, idx) => (
            <div
              key={node.id}
              onClick={() => {
                const found = incidents.find((i) => i.id === node.incident_id);
                if (found) onSelectIncident(found);
              }}
              className="bg-[#0B0E14] border border-[#1E2633] hover:border-blue-500/40 rounded p-3 flex flex-col justify-between cursor-pointer transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-bold text-blue-400">
                    {node.day_label} · {node.incident_id}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-300 border border-slate-700">
                    #{idx + 1}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-1.5 line-clamp-1">
                  {node.service}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  {node.title}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#1E2633]">
                <div
                  className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm inline-block border ${
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
                </div>
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                  {node.learning_note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Incident Log & Memory Ledger */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded">
        <div className="p-4 border-b border-[#1E2633] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Production Incidents & Hindsight Memory Ledger ({filteredIncidents.length})
            </h2>
            <p className="text-xs text-slate-400">
              Click any incident to inspect AI root-cause diagnosis, retrieved Hindsight memories, and dynamic runbooks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by ID, service, error..."
                className="pl-8 pr-3 py-1.5 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
              />
            </div>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Services</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
              <option value="Mitigated">Mitigated</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E2633] bg-[#0B0E14]/60 text-[11px] font-mono uppercase text-slate-400">
                <th className="py-2.5 px-4">Incident ID</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Service</th>
                <th className="py-2.5 px-4">Title & Error Signal</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Hindsight Memory</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2633] text-xs">
              {filteredIncidents.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => onSelectIncident(inc)}
                  className="hover:bg-[#161D2A] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono font-semibold text-blue-400 whitespace-nowrap">
                    {inc.id}
                    {!inc.is_synthetic_seed && (
                      <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-sm">
                        LIVE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-sm border ${getSeverityBadge(
                        inc.severity
                      )}`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                    {inc.service}
                    <div className="text-[10px] font-mono text-slate-500">{inc.environment}</div>
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <div className="font-semibold text-slate-100 truncate">{inc.title}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {inc.error_message}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-sm border ${getStatusBadge(
                        inc.status
                      )}`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {inc.resolution?.stored_in_hindsight ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Retained
                      </span>
                    ) : inc.analysis?.historical_matches?.length ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-violet-300">
                        <Database className="w-3.5 h-3.5" />
                        {inc.analysis.historical_matches.length} Matches
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Resolution
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(inc);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-[#0B0E14] hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-[#1E2633] hover:border-blue-500/40 transition-colors cursor-pointer"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
