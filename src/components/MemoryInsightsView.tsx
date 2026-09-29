import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Layers,
  Server,
  ShieldAlert,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import type {
  MemoryInsightsStats,
  ServiceKnowledgeProfile
} from '../types/incident.ts';

interface MemoryInsightsViewProps {
  insights: MemoryInsightsStats | null;
  serviceProfiles: ServiceKnowledgeProfile[];
  onSelectIncidentId: (id: string) => void;
}

export const MemoryInsightsView: React.FC<MemoryInsightsViewProps> = ({
  insights,
  serviceProfiles,
  onSelectIncidentId
}) => {
  const [selectedService, setSelectedService] = useState<string>(
    serviceProfiles[0]?.service || 'Payment API'
  );

  const activeProfile =
    serviceProfiles.find((p) => p.service === selectedService) || serviceProfiles[0];

  return (
    <div className="space-y-6">
      {/* Step 4 — Service Knowledge Graph */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#1E2633]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400">
              INNOVATION STEP 4 — SERVICE KNOWLEDGE GRAPH
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-0.5">
              Per-Service Accumulated Operational Memory &amp; Failure Playbooks
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any production microservice to view its known recurring issues, verified root causes, successful fixes, and failed approaches.
            </p>
          </div>
          <Server className="w-5 h-5 text-blue-400 shrink-0" />
        </div>

        {/* Service Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {serviceProfiles.map((prof) => {
            const active = prof.service === activeProfile?.service;
            return (
              <button
                key={prof.service}
                onClick={() => setSelectedService(prof.service)}
                className={`px-3 py-2 rounded text-xs font-medium border transition-colors cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-blue-600/20 text-slate-100 border-blue-500/50'
                    : 'bg-[#0B0E14] text-slate-400 border-[#1E2633] hover:text-slate-200'
                }`}
              >
                <span>{prof.service}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#11161F] text-blue-300 rounded-sm border border-[#1E2633]">
                  {prof.total_incidents}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Service Knowledge Graph Details */}
        {activeProfile && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0B0E14] p-4 rounded border border-[#1E2633]">
              <div>
                <div className="text-[10px] font-mono uppercase text-blue-400">
                  SERVICE MEMORY PROFILE
                </div>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  {activeProfile.service} — {activeProfile.known_problems.length} Known Failure Pattern(s)
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">
                  Total Incidents: <strong className="text-slate-100">{activeProfile.total_incidents}</strong>
                </span>
                <span className="text-emerald-400">
                  Resolved in Hindsight: <strong>{activeProfile.resolved_count}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeProfile.known_problems.map((prob, idx) => (
                <div
                  key={idx}
                  className="bg-[#0B0E14] border border-[#1E2633] rounded p-4 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E2633]">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-violet-400">
                        KNOWN RECURRING PROBLEM #{idx + 1} ({prob.occurrence_count} OCCURRENCES)
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                        {prob.problem_title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {prob.incident_ids.map((id) => (
                        <button
                          key={id}
                          onClick={() => onSelectIncidentId(id)}
                          className="px-2 py-0.5 text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-sm hover:bg-blue-500/25 cursor-pointer"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-[#11161F] border border-[#1E2633] rounded p-3 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Verified Root Causes</span>
                      </div>
                      <ul className="space-y-1 text-slate-200">
                        {prob.verified_root_causes.map((rc, i) => (
                          <li key={i} className="leading-relaxed">
                            • {rc}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#11161F] border border-emerald-500/30 rounded p-3 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Successful Resolutions</span>
                      </div>
                      <ul className="space-y-1 text-emerald-200">
                        {prob.successful_resolutions.map((res, i) => (
                          <li key={i} className="leading-relaxed">
                            • {res}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#11161F] border border-red-500/30 rounded p-3 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase text-red-400 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span>Failed Approaches (Avoid)</span>
                      </div>
                      <ul className="space-y-1 text-red-200/90">
                        {prob.failed_approaches.map((fa, i) => (
                          <li key={i} className="leading-relaxed">
                            • {fa}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#11161F] border border-blue-500/30 rounded p-3 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase text-blue-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>Preventive Guardrails</span>
                      </div>
                      <ul className="space-y-1 text-blue-200">
                        {prob.preventive_actions.map((pa, i) => (
                          <li key={i} className="leading-relaxed">
                            • {pa}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 6 — Organizational Memory Insights & Systemic Pattern Analytics */}
      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Systemic Recurring Patterns */}
          <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
              <div>
                <div className="text-[10px] font-mono uppercase text-violet-400">
                  CROSS-INCIDENT CORRELATION
                </div>
                <h2 className="text-base font-bold text-slate-100 mt-0.5">
                  Systemic Recurring Failure Patterns ({insights.recurring_patterns.length})
                </h2>
              </div>
              <Layers className="w-4 h-4 text-violet-400" />
            </div>

            <div className="space-y-3">
              {insights.recurring_patterns.map((pat) => (
                <div
                  key={pat.pattern_id}
                  className="bg-[#0B0E14] border border-[#1E2633] rounded p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{pat.pattern_name}</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-sm">
                      {pat.count} Incidents
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{pat.systemic_cause}</div>
                  <div className="text-[11px] font-mono text-emerald-300">
                    Preventive Action: {pat.preventive_action}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {pat.incident_ids.map((id) => (
                      <button
                        key={id}
                        onClick={() => onSelectIncidentId(id)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#11161F] text-blue-300 border border-[#1E2633] rounded-sm hover:border-blue-500/40 cursor-pointer"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Successful Resolutions & Frequently Affected Services */}
          <div className="space-y-6">
            <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
                <div>
                  <div className="text-[10px] font-mono uppercase text-emerald-400">
                    VERIFIED REMEDIATION OUTCOMES
                  </div>
                  <h2 className="text-base font-bold text-slate-100 mt-0.5">
                    Highest-Rated Historical Resolutions
                  </h2>
                </div>
                <BarChart3 className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="space-y-2.5">
                {insights.most_successful_resolutions.slice(0, 5).map((res, i) => (
                  <div
                    key={i}
                    className="bg-[#0B0E14] border border-[#1E2633] rounded p-3 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs text-slate-200 font-medium">{res.resolution}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Service: {res.service} · Rating: {res.feedback_score}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-sm shrink-0">
                      {res.success_count}x Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
                <div>
                  <div className="text-[10px] font-mono uppercase text-blue-400">
                    SERVICE HOTSPOTS
                  </div>
                  <h2 className="text-base font-bold text-slate-100 mt-0.5">
                    Most Frequently Affected Production Services
                  </h2>
                </div>
                <Database className="w-4 h-4 text-blue-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {insights.frequently_affected_services.map((srv) => (
                  <div
                    key={srv.service}
                    onClick={() => setSelectedService(srv.service)}
                    className="bg-[#0B0E14] border border-[#1E2633] hover:border-blue-500/40 rounded p-3 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{srv.service}</span>
                      <span className="text-xs font-mono font-bold text-blue-400">
                        {srv.incident_count} incidents
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 truncate">
                      Top Pattern: {srv.top_pattern}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
