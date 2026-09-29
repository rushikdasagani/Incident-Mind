import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  Layers,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  XCircle
} from 'lucide-react';
import type {
  FeedbackRating,
  IncidentRecord,
  IncidentStatus
} from '../types/incident.ts';

interface IncidentDetailViewProps {
  incident: IncidentRecord | null;
  onIncidentUpdated: (updated: IncidentRecord) => void;
  onTriggerFollowUpDemo: () => void;
  onSelectHistoricalIncident: (incidentId: string) => void;
}

export const IncidentDetailView: React.FC<IncidentDetailViewProps> = ({
  incident,
  onIncidentUpdated,
  onTriggerFollowUpDemo,
  onSelectHistoricalIncident
}) => {
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  // Resolution Form State (Step 8)
  const [resStatus, setResStatus] = useState<IncidentStatus>('Resolved');
  const [rootCause, setRootCause] = useState('');
  const [resolutionSteps, setResolutionSteps] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidNotWork, setWhatDidNotWork] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [engineerFeedback, setEngineerFeedback] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>('Very Useful');
  const [isResolving, setIsResolving] = useState(false);
  const [resolveSuccessMessage, setResolveSuccessMessage] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!incident) return;
    setCheckedSteps({});
    setResolveSuccessMessage(null);
    setResolveError(null);

    if (incident.resolution) {
      setResStatus(incident.resolution.status);
      setRootCause(incident.resolution.root_cause);
      setResolutionSteps(incident.resolution.resolution_steps);
      setWhatWorked(incident.resolution.what_worked);
      setWhatDidNotWork(incident.resolution.what_did_not_work);
      setPreventiveAction(incident.resolution.preventive_action);
      setEngineerFeedback(incident.resolution.engineer_feedback);
      setFeedbackRating(incident.resolution.feedback_rating);
    } else {
      // Pre-populate smart defaults from top Hindsight match so the engineer can edit or 1-click resolve
      const topMatch = incident.analysis?.historical_matches?.[0];
      const topCause = incident.analysis?.possible_root_causes?.[0]?.cause;
      setResStatus('Resolved');
      setRootCause(
        topMatch?.root_cause ||
          topCause ||
          `Database connection pool exhaustion in ${incident.service} following ${incident.recent_deployment}`
      );
      setResolutionSteps(
        topMatch?.resolution ||
          `1. Increased ${incident.service} DB_MAX_POOL_SIZE from 50 to 100.\n2. Added 3000ms connection acquire timeout with jitter backoff.\n3. Performed rolling restart of ${incident.service} pods.`
      );
      setWhatWorked(
        topMatch?.what_worked ||
          'Increasing DB_MAX_POOL_SIZE from 50 to 100 and enforcing 3000ms acquire timeout.'
      );
      setWhatDidNotWork(
        topMatch?.what_did_not_work ||
          'Restarting pods without raising the connection pool limit.'
      );
      setPreventiveAction(
        incident.analysis?.systemic_pattern?.suggested_preventive_action ||
          topMatch?.preventive_action ||
          'Add CI check validating DB_MAX_POOL_SIZE >= 100 before production rollout.'
      );
      setEngineerFeedback(
        topMatch
          ? `Hindsight match ${topMatch.incident_id} pinpointed the exact connection pool regression immediately.`
          : 'AI analysis accurately categorized failure signals.'
      );
      setFeedbackRating('Very Useful');
    }
  }, [incident?.id]);

  if (!incident) {
    return (
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-10 text-center space-y-3">
        <Terminal className="w-8 h-8 text-slate-500 mx-auto" />
        <div className="text-base font-bold text-slate-200">No Active Incident Selected</div>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Select any incident from the Command Center ledger or create a new production incident to view Hindsight memory analysis.
        </p>
      </div>
    );
  }

  const analysis = incident.analysis;

  const handleRunAnalysis = async (useMemory = true) => {
    setIsReanalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: incident.id,
          useMemory
        })
      });
      const data = await res.json();
      if (res.ok && data.incident) {
        onIncidentUpdated(data.incident);
      }
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolveError(null);
    setResolveSuccessMessage(null);

    if (!rootCause.trim() || !resolutionSteps.trim()) {
      setResolveError('Confirmed Root Cause and Resolution Steps are required.');
      return;
    }

    setIsResolving(true);
    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: incident.id,
          status: resStatus,
          root_cause: rootCause,
          resolution_steps: resolutionSteps,
          what_worked: whatWorked,
          what_did_not_work: whatDidNotWork,
          preventive_action: preventiveAction,
          engineer_feedback: engineerFeedback,
          feedback_rating: feedbackRating
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve incident');

      onIncidentUpdated(data.incident);
      setResolveSuccessMessage(
        data.incident.resolution?.hindsight_operation_details ||
          'Incident resolved and permanently retained in Hindsight organizational memory!'
      );
    } catch (err: any) {
      setResolveError(err?.message || 'Error resolving incident');
    } finally {
      setIsResolving(false);
    }
  };

  const renderConfidenceBar = (barsFilled = 16) => {
    const total = 20;
    const filled = Math.max(0, Math.min(total, barsFilled));
    return (
      <span className="font-mono tracking-tight text-xs">
        <span className="text-slate-500">[</span>
        <span className="text-emerald-400">{'█'.repeat(filled)}</span>
        <span className="text-slate-700">{'░'.repeat(total - filled)}</span>
        <span className="text-slate-500">]</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Incident Header & Hindsight Telemetry Banner */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E2633]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400">{incident.id}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm border ${
                  incident.severity === 'SEV-1'
                    ? 'bg-red-500/15 text-red-400 border-red-500/40'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                }`}
              >
                {incident.severity}
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-sm border ${
                  incident.status === 'Resolved'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/15 text-red-400 border-red-500/40'
                }`}
              >
                {incident.status}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#0B0E14] text-slate-300 border border-[#1E2633] rounded-sm">
                {incident.service} · {incident.environment}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1.5">{incident.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleRunAnalysis(true)}
              disabled={isReanalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span>{isReanalyzing ? 'Analyzing with Hindsight...' : 'Re-Analyze with Hindsight'}</span>
            </button>

            <button
              onClick={() => handleRunAnalysis(false)}
              disabled={isReanalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-[#0B0E14] hover:bg-[#18202C] text-slate-300 border border-[#1E2633] transition-colors cursor-pointer disabled:opacity-50"
              title="Run stateless analysis without Hindsight memory to compare"
            >
              <span>Run Without Memory</span>
            </button>
          </div>
        </div>

        {/* Raw Incident Signals & Logs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#0B0E14] border border-[#1E2633] rounded p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500">Error Message</div>
            <div className="font-mono text-red-300 mt-1 break-words">{incident.error_message}</div>
          </div>
          <div className="bg-[#0B0E14] border border-[#1E2633] rounded p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500">Observed Symptoms</div>
            <div className="text-slate-200 mt-1">{incident.symptoms}</div>
          </div>
          <div className="bg-[#0B0E14] border border-[#1E2633] rounded p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500">
              Recent Deployment / Change
            </div>
            <div className="font-mono text-amber-300 mt-1">{incident.recent_deployment}</div>
          </div>
        </div>

        <div className="bg-[#0B0E14] border border-[#1E2633] rounded p-3">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-500 mb-1">
            <span>Telemetry & Production Logs</span>
            {incident.metrics && <span className="text-blue-400">{incident.metrics}</span>}
          </div>
          <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {incident.logs}
          </pre>
        </div>
      </div>

      {/* Test D Warning Banner if Hindsight was Unavailable or Disabled */}
      {analysis && !analysis.hindsight_status.available && (
        <div className="p-4 rounded bg-amber-500/15 border border-amber-500/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold font-mono uppercase text-amber-300">
              HINDSIGHT MEMORY UNAVAILABLE — GRACEFUL FALLBACK MODE ACTIVE (TEST D)
            </div>
            <div className="text-xs text-amber-100/90">
              {analysis.hindsight_status.error_message ||
                'Hindsight server could not be reached. The agent fell back to stateless symptom analysis without crashing.'}
            </div>
          </div>
        </div>
      )}

      {/* If incident does not have an analysis yet (e.g. raw historical seed), allow 1-click analysis */}
      {!analysis && (
        <div className="bg-[#11161F] border border-[#1E2633] rounded p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase text-violet-400">
              HISTORICAL SEED INCIDENT RECORD
            </div>
            <h3 className="text-base font-bold text-slate-100 mt-0.5">
              Run Live Hindsight Recall & AI Root-Cause Analysis on {incident.id}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              This incident is already stored in Hindsight memory. Click to run full multi-incident pattern correlation and runbook generation.
            </p>
          </div>
          <button
            onClick={() => handleRunAnalysis(true)}
            disabled={isReanalyzing}
            className="flex items-center gap-2 px-4 py-2.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isReanalyzing ? 'Running Hindsight Analysis...' : 'Run AI Incident Analysis'}</span>
          </button>
        </div>
      )}

      {analysis && (
        <>
          {/* Step 5 — Memory Confidence Indicator & Hindsight Retrieval Telemetry */}
          <div className="bg-[#11161F] border border-[#1E2633] rounded p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                    STEP 5 — HINDSIGHT MEMORY CONFIDENCE INDICATOR
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-[#0B0E14] text-slate-300 border border-[#1E2633] rounded-sm">
                    Bank: {analysis.hindsight_status.bank_id} ({analysis.hindsight_status.latency_ms ?? 12}ms)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  {renderConfidenceBar(analysis.memory_confidence.bars_filled)}
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {analysis.memory_confidence.score_percent}%
                  </span>
                  <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-sm">
                    {analysis.memory_confidence.level}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {analysis.memory_confidence.explanation}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-[#0B0E14] border border-[#1E2633] rounded p-3 shrink-0 font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">MEMORIES SEARCHED</div>
                  <div className="text-base font-bold text-slate-100">
                    {analysis.hindsight_status.memories_searched}
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-[#1E2633]" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">HISTORICAL MATCHES</div>
                  <div className="text-base font-bold text-violet-300">
                    {analysis.historical_matches.length}
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-[#1E2633]" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">DIAGNOSIS CONFIDENCE</div>
                  <div className="text-base font-bold text-emerald-400">{analysis.confidence}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 — Recurring Pattern Detection Alert (Multi-Incident Correlation) */}
          {analysis.systemic_pattern && analysis.systemic_pattern.detected && (
            <div className="bg-violet-950/20 border-2 border-violet-500/50 rounded p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-violet-500/30">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-violet-400 shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300">
                      MULTI-INCIDENT PATTERN DETECTED ACROSS HINDSIGHT MEMORY
                    </span>
                    <h2 className="text-base font-bold text-slate-100">
                      Pattern Detected: {analysis.systemic_pattern.occurrence_count} incidents matched &ldquo;
                      {analysis.systemic_pattern.pattern_name}&rdquo;
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {analysis.systemic_pattern.matching_incident_ids.map((id) => (
                    <button
                      key={id}
                      onClick={() => onSelectHistoricalIncident(id)}
                      className="px-2 py-0.5 text-[10px] font-mono bg-[#0B0E14] hover:bg-violet-500/30 text-violet-300 border border-violet-500/40 rounded-sm cursor-pointer"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#0B0E14]/90 border border-violet-500/30 rounded p-3">
                  <div className="text-[10px] font-mono uppercase text-violet-300">
                    Common Trigger Factor
                  </div>
                  <div className="text-slate-200 mt-1 font-medium">
                    {analysis.systemic_pattern.common_factor}
                  </div>
                </div>
                <div className="bg-[#0B0E14]/90 border border-violet-500/30 rounded p-3">
                  <div className="text-[10px] font-mono uppercase text-violet-300">
                    Systemic Root Cause
                  </div>
                  <div className="text-slate-200 mt-1 font-medium">
                    {analysis.systemic_pattern.systemic_root_cause}
                  </div>
                </div>
                <div className="bg-[#0B0E14]/90 border border-emerald-500/30 rounded p-3">
                  <div className="text-[10px] font-mono uppercase text-emerald-400">
                    Suggested Preventive Action
                  </div>
                  <div className="text-emerald-200 mt-1 font-medium">
                    {analysis.systemic_pattern.suggested_preventive_action}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main 2-Column Workspace: Diagnosis & Reasoning (Left) + Historical Matches (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: AI Incident Analysis + Memory-Powered Reasoning + Ranked Plan */}
            <div className="lg:col-span-7 space-y-6">
              {/* Structured Summary & Signals */}
              <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-blue-400">
                      STEP 6 — AI INCIDENT ANALYSIS
                    </div>
                    <h2 className="text-base font-bold text-slate-100 mt-0.5">
                      Diagnosis & Failure Classification: {analysis.failure_category}
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-[#0B0E14] text-slate-400 border border-[#1E2633] rounded-sm">
                    {analysis.llm_provider}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed bg-[#0B0E14] p-3.5 rounded border border-[#1E2633]">
                  {analysis.summary}
                </p>

                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-2">
                    Detected Production Signals
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.signals.map((sig, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-[11px] font-mono bg-[#0B0E14] text-blue-300 border border-[#1E2633] rounded-sm"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Possible Root Causes with Historical Evidence */}
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-2">
                    Probable Root Causes (Ranked by Historical Evidence)
                  </div>
                  <div className="space-y-2.5">
                    {analysis.possible_root_causes.map((rc, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0B0E14] border border-[#1E2633] rounded p-3.5 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-100">
                            {idx + 1}. {rc.cause}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono rounded-sm border ${
                                rc.evidence_type === 'Historical Memory'
                                  ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {rc.evidence_type}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-sm border ${
                                rc.likelihood === 'High'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              Likelihood: {rc.likelihood}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">{rc.explanation}</p>
                        {rc.supporting_incidents.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-mono text-slate-500">
                              Supporting Hindsight Incidents:
                            </span>
                            {rc.supporting_incidents.map((id) => (
                              <button
                                key={id}
                                onClick={() => onSelectHistoricalIncident(id)}
                                className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-sm hover:bg-blue-500/25 cursor-pointer"
                              >
                                {id}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 7 — Memory-Powered Reasoning & Ranked Investigation Plan */}
              <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-5">
                <div className="pb-3 border-b border-[#1E2633]">
                  <div className="text-[10px] font-mono uppercase text-violet-400">
                    STEP 7 — MEMORY-POWERED REASONING
                  </div>
                  <h2 className="text-base font-bold text-slate-100 mt-0.5">
                    Why Historical Memory Points to This Diagnosis & Action Plan
                  </h2>
                </div>

                <div className="space-y-2">
                  {analysis.memory_powered_reasoning.map((reason, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0B0E14] border border-[#1E2633] rounded p-3 flex items-start gap-2.5 text-xs text-slate-200"
                    >
                      <span className="font-mono font-bold text-violet-400 shrink-0">
                        0{idx + 1}.
                      </span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-xs font-mono uppercase text-emerald-400 mb-2.5">
                    Recommended Investigation & Remediation Plan
                  </div>
                  <div className="space-y-3">
                    {analysis.recommended_actions.map((act) => (
                      <div
                        key={act.priority}
                        className="bg-[#0B0E14] border border-[#1E2633] rounded p-3.5 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-100">
                            Priority {act.priority}: {act.action}
                          </span>
                          <div className="flex items-center gap-1">
                            {act.supporting_incidents.map((id) => (
                              <button
                                key={id}
                                onClick={() => onSelectHistoricalIncident(id)}
                                className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-sm cursor-pointer"
                              >
                                {id}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-slate-300">
                          <span className="font-mono text-slate-400">Why: </span>
                          {act.rationale}
                        </div>
                        {act.warning_from_history && (
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              Historical Warning (Avoid): {act.warning_from_history}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Historical Matches Retrieved from Hindsight */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-emerald-400">
                      HINDSIGHT RECALL() RESULTS
                    </div>
                    <h2 className="text-base font-bold text-slate-100 mt-0.5">
                      Historical Matches ({analysis.historical_matches.length})
                    </h2>
                  </div>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>

                {analysis.historical_matches.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-[#0B0E14] rounded border border-[#1E2633]">
                    No historical incidents retrieved (Memory disabled or no matching patterns).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysis.historical_matches.map((match, idx) => (
                      <div
                        key={match.incident_id}
                        className={`bg-[#0B0E14] rounded p-4 border space-y-2.5 ${
                          idx === 0 ? 'border-emerald-500/50' : 'border-[#1E2633]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onSelectHistoricalIncident(match.incident_id)}
                              className="text-xs font-mono font-bold text-blue-400 hover:underline cursor-pointer"
                            >
                              {match.incident_id}
                            </button>
                            <span className="text-[11px] font-mono text-slate-400">
                              {match.days_ago === 0 ? 'Today' : `${match.days_ago}d ago`}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded-sm">
                              {match.service}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-sm">
                            Score: {match.retrieval_scores.final}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-100">{match.title}</div>

                        {/* Real Hindsight Sub-Scores */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 bg-[#11161F] px-2.5 py-1 rounded border border-[#1E2633]">
                          <span>Semantic: {match.retrieval_scores.semantic ?? 'N/A'}</span>
                          <span>·</span>
                          <span>BM25: {match.retrieval_scores.keyword ?? 'N/A'}</span>
                          <span>·</span>
                          <span className="text-emerald-400">{match.outcome}</span>
                        </div>

                        <div className="space-y-1.5 text-xs pt-1">
                          <div>
                            <span className="font-mono text-[10px] uppercase text-slate-500 block">
                              Historical Root Cause:
                            </span>
                            <span className="text-slate-200">{match.root_cause}</span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] uppercase text-emerald-400 block">
                              What Worked (Verified Resolution):
                            </span>
                            <span className="text-emerald-300">{match.what_worked}</span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] uppercase text-red-400 block">
                              What Did Not Work:
                            </span>
                            <span className="text-red-300/90">{match.what_did_not_work}</span>
                          </div>
                          <div className="pt-1 border-t border-[#1E2633] text-[11px] text-slate-400">
                            <span className="font-mono text-violet-300">Why Retrieved: </span>
                            {match.relevance_explanation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3 (Innovation) — Dynamic Runbook Generation from Historical Resolutions */}
          <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1E2633]">
              <div>
                <div className="text-[10px] font-mono uppercase text-blue-400">
                  INNOVATION STEP 3 — DYNAMIC RUNBOOK GENERATION
                </div>
                <h2 className="text-base font-bold text-slate-100 mt-0.5">
                  Executable Remediation Runbook Synthesized from Hindsight Memory
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Check off steps as you execute commands during triage
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.runbook.map((step) => {
                const isDone = Boolean(checkedSteps[step.step_number]);
                return (
                  <div
                    key={step.step_number}
                    className={`bg-[#0B0E14] rounded p-4 border transition-colors ${
                      isDone ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-[#1E2633]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() =>
                            setCheckedSteps((prev) => ({
                              ...prev,
                              [step.step_number]: !prev[step.step_number]
                            }))
                          }
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-100">
                          Step {step.step_number}: {step.title}
                        </span>
                      </label>
                      {step.historical_reference && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-sm shrink-0">
                          {step.historical_reference}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 relative group">
                      <pre className="p-2.5 rounded bg-[#11161F] border border-[#1E2633] text-[11px] font-mono text-blue-300 overflow-x-auto">
                        {step.command_or_action}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(step.command_or_action);
                          setCopiedStep(step.step_number);
                          setTimeout(() => setCopiedStep(null), 1500);
                        }}
                        className="absolute top-2 right-2 px-2 py-1 rounded bg-[#0B0E14] border border-[#1E2633] text-[10px] font-mono text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedStep === step.step_number ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="mt-2.5 text-[11px] text-slate-400 space-y-1">
                      <div>
                        <span className="font-mono text-slate-500">Expected Result: </span>
                        <span className="text-slate-300">{step.expected_result}</span>
                      </div>
                      <div>
                        <span className="font-mono text-emerald-400">Verification: </span>
                        <span className="text-slate-300">{step.verification_check}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Step 8 — Incident Resolution & Hindsight Closed-Loop Memory Retention */}
      <div className="bg-[#11161F] border-2 border-emerald-500/40 rounded p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2633]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-sm">
                STEP 8 — CLOSED-LOOP ORGANIZATIONAL LEARNING
              </span>
              {incident.resolution?.stored_in_hindsight && (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  Stored in Hindsight ({incident.resolution.hindsight_memory_id})
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-1">
              Resolve Incident & Retain Root Cause, Fix, and Outcome in Hindsight
            </h2>
          </div>

          {analysis?.historical_matches?.[0] && (
            <button
              type="button"
              onClick={() => {
                const top = analysis.historical_matches[0];
                setRootCause(top.root_cause);
                setResolutionSteps(top.resolution);
                setWhatWorked(top.what_worked);
                setWhatDidNotWork(top.what_did_not_work);
                setPreventiveAction(top.preventive_action);
                setEngineerFeedback(
                  `Applied verified fix from ${top.incident_id}; resolved outage in under 8 minutes.`
                );
                setFeedbackRating('Very Useful');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-[#0B0E14] hover:bg-[#18202C] text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill from Match {analysis.historical_matches[0].incident_id}</span>
            </button>
          )}
        </div>

        {resolveError && (
          <div className="p-3 rounded bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{resolveError}</span>
          </div>
        )}

        {resolveSuccessMessage && (
          <div className="p-4 rounded bg-emerald-500/15 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resolveSuccessMessage}</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-200">
                HINDSIGHT RETAIN() COMPLETE
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-emerald-500/30">
              <span className="text-xs text-slate-200">
                Want to prove the closed learning loop right now? Launch a follow-up incident and watch Hindsight recall{' '}
                <strong className="font-mono text-emerald-300">{incident.id}</strong>!
              </span>
              <button
                type="button"
                onClick={onTriggerFollowUpDemo}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Scene 3: Trigger Follow-Up Incident to Prove Learning</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleResolveSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Resolution Status
              </label>
              <select
                value={resStatus}
                onChange={(e) => setResStatus(e.target.value as IncidentStatus)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100"
              >
                <option value="Resolved">Resolved</option>
                <option value="Mitigated">Mitigated</option>
                <option value="Investigating">Investigating</option>
                <option value="False Alarm">False Alarm</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                AI Recommendation Usefulness Rating
              </label>
              <select
                value={feedbackRating}
                onChange={(e) => setFeedbackRating(e.target.value as FeedbackRating)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-emerald-300 font-mono"
              >
                <option value="Very Useful">Very Useful (Prioritized in future Hindsight recalls)</option>
                <option value="Useful">Useful</option>
                <option value="Not Useful">Not Useful (Flagged as ineffective)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Engineer Feedback Note
              </label>
              <input
                type="text"
                value={engineerFeedback}
                onChange={(e) => setEngineerFeedback(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Confirmed Root Cause *
              </label>
              <textarea
                rows={2}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Resolution Steps Executed *
              </label>
              <textarea
                rows={2}
                value={resolutionSteps}
                onChange={(e) => setResolutionSteps(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs font-mono text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-emerald-400 mb-1.5">
                What Worked (Verified Fix)
              </label>
              <input
                type="text"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-emerald-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-red-400 mb-1.5">
                What Did Not Work (Negative Memory)
              </label>
              <input
                type="text"
                value={whatDidNotWork}
                onChange={(e) => setWhatDidNotWork(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-red-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-blue-400 mb-1.5">
                Preventive Guardrail Action
              </label>
              <input
                type="text"
                value={preventiveAction}
                onChange={(e) => setPreventiveAction(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-blue-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>
                Calls <code className="text-emerald-300">HindsightClient.retain()</code> with structured root cause, fix, negative memory, and engineer feedback.
              </span>
            </div>

            <button
              type="submit"
              disabled={isResolving}
              className="flex items-center gap-2 px-5 py-2.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>
                {isResolving
                  ? 'Retaining in Hindsight Memory Bank...'
                  : 'Resolve Incident & Store in Hindsight Memory'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
