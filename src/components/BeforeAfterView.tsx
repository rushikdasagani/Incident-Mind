import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  GitCompare,
  Play,
  ShieldAlert,
  Sparkles,
  XCircle
} from 'lucide-react';
import type { BeforeAfterComparison } from '../types/incident.ts';
import type { DemoPreset } from './NewIncidentView.tsx';

interface BeforeAfterViewProps {
  presets: DemoPreset[];
}

export const BeforeAfterView: React.FC<BeforeAfterViewProps> = ({ presets }) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [comparison, setComparison] = useState<BeforeAfterComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async (presetIdx: number) => {
    const preset = presets[presetIdx] || presets[0];
    if (!preset) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/before-after', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comparison failed');
      setComparison(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to run comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runComparison(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Scenario Selector Header */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E2633]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-sm">
                CORE HACKATHON PROOF — SECTION 9
              </span>
              <span className="text-xs font-mono text-slate-400">
                Why Hindsight Persistent Memory Beats Stateless LLM Troubleshooting
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-1">
              Side-by-Side Comparison: Without Memory vs With Hindsight Organizational Memory
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPresetIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedPresetIndex(idx);
                runComparison(idx);
              }}
              className="px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {presets.map((p, idx) => (
                <option key={idx} value={idx}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => runComparison(selectedPresetIndex)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Running...' : 'Re-Run Comparison'}</span>
            </button>
          </div>
        </div>

        {/* Active Incident Input Summary */}
        {comparison && (
          <div className="pt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#0B0E14] border border-[#1E2633] rounded p-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Incident Title</div>
              <div className="font-semibold text-slate-200 mt-0.5">
                {comparison.incident_input.title}
              </div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1E2633] rounded p-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Service & Env</div>
              <div className="font-mono text-blue-400 mt-0.5">
                {comparison.incident_input.service} ({comparison.incident_input.environment})
              </div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1E2633] rounded p-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Error Signal</div>
              <div className="font-mono text-red-300 truncate mt-0.5">
                {comparison.incident_input.error_message}
              </div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1E2633] rounded p-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Recent Deployment</div>
              <div className="font-mono text-amber-300 truncate mt-0.5">
                {comparison.incident_input.recent_deployment}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/40 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-[#11161F] border border-[#1E2633] rounded p-10 text-center space-y-2">
          <GitCompare className="w-6 h-6 text-violet-400 animate-spin mx-auto" />
          <div className="text-sm font-semibold text-slate-200">
            Running Stateless Baseline vs Hindsight Memory-Grounded Agent...
          </div>
          <div className="text-xs font-mono text-slate-400">
            Querying Hindsight bank and comparing root-cause specificity & action plans
          </div>
        </div>
      )}

      {comparison && !loading && (
        <>
          {/* Two-Column Side-by-Side Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT COLUMN: WITHOUT MEMORY */}
            <div className="bg-[#11161F] border border-[#1E2633] rounded flex flex-col justify-between">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700 rounded-sm">
                      AGENT WITHOUT MEMORY
                    </span>
                    <h2 className="text-base font-bold text-slate-200 mt-1.5">
                      Generic Stateless AI Troubleshooting
                    </h2>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-[10px] text-slate-500 uppercase">CONFIDENCE</div>
                    <div className="text-xs font-semibold text-amber-400">
                      {comparison.without_memory.confidence}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase text-slate-400 mb-1">
                    Stateless Diagnosis Summary
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0E14] p-3 rounded border border-[#1E2633]">
                    {comparison.without_memory.summary}
                  </p>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase text-slate-400 mb-2">
                    Unranked Possible Causes (Guesswork)
                  </div>
                  <ul className="space-y-1.5">
                    {comparison.without_memory.possible_causes.map((c, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-300 bg-[#0B0E14] px-3 py-2 rounded border border-[#1E2633] flex items-center gap-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase text-slate-400 mb-2">
                    Generic Troubleshooting Steps
                  </div>
                  <ol className="space-y-1.5">
                    {comparison.without_memory.generic_steps.map((step, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-400 bg-[#0B0E14] px-3 py-2 rounded border border-[#1E2633] font-mono"
                      >
                        {idx + 1}. {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase text-red-400 mb-2">
                    Why Stateless AI Fails On-Call SREs
                  </div>
                  <ul className="space-y-1.5">
                    {comparison.without_memory.limitations.map((lim, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-red-300/90 bg-red-500/5 px-3 py-2 rounded border border-red-500/20 flex items-start gap-2"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: WITH HINDSIGHT MEMORY */}
            <div className="bg-[#11161F] border-2 border-blue-500/50 rounded flex flex-col justify-between">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E2633]">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-sm">
                      AGENT WITH HINDSIGHT MEMORY
                    </span>
                    <h2 className="text-base font-bold text-slate-100 mt-1.5">
                      Hindsight-Grounded SRE Response Agent
                    </h2>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-[10px] text-slate-400 uppercase">MEMORY CONFIDENCE</div>
                    <div className="text-xs font-bold text-emerald-400">
                      {comparison.with_hindsight.confidence} (
                      {comparison.with_hindsight.memory_confidence.score_percent}%)
                    </div>
                  </div>
                </div>

                {/* Historical Matches Badge Bar */}
                <div className="p-3 rounded bg-violet-500/10 border border-violet-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-violet-300 shrink-0" />
                    <span className="text-xs font-semibold text-violet-200">
                      Found {comparison.with_hindsight.historical_matches.length} Similar Historical
                      Incidents in Hindsight
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {comparison.with_hindsight.historical_matches.slice(0, 3).map((m) => (
                      <span
                        key={m.incident_id}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#0B0E14] text-violet-300 border border-violet-500/40 rounded-sm"
                      >
                        {m.incident_id} ({m.days_ago}d ago)
                      </span>
                    ))}
                  </div>
                </div>

                {comparison.with_hindsight.historical_matches[0] && (
                  <div className="p-3.5 rounded bg-[#0B0E14] border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-emerald-400">
                        STRONGEST HISTORICAL MATCH ({comparison.with_hindsight.historical_matches[0].incident_id} ·{' '}
                        {comparison.with_hindsight.historical_matches[0].days_ago} days ago)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Score: {comparison.with_hindsight.historical_matches[0].retrieval_scores.final}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-100">
                      Historical Root Cause: {comparison.with_hindsight.historical_matches[0].root_cause}
                    </div>
                    <div className="text-xs text-emerald-300 font-mono">
                      Verified Fix: {comparison.with_hindsight.historical_matches[0].what_worked}
                    </div>
                    <div className="text-[11px] text-amber-300 font-mono">
                      Avoid (Failed Previously):{' '}
                      {comparison.with_hindsight.historical_matches[0].what_did_not_work}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[11px] font-mono uppercase text-blue-400 mb-2">
                    Memory-Powered Reasoning
                  </div>
                  <ul className="space-y-1.5">
                    {comparison.with_hindsight.memory_powered_reasoning.map((reason, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-200 bg-[#0B0E14] px-3 py-2 rounded border border-[#1E2633] flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase text-emerald-400 mb-2">
                    Ranked Action Plan with Historical Evidence
                  </div>
                  <div className="space-y-2">
                    {comparison.with_hindsight.recommended_actions.slice(0, 3).map((act) => (
                      <div
                        key={act.priority}
                        className="bg-[#0B0E14] p-3 rounded border border-[#1E2633] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-100">
                            Priority {act.priority}: {act.action}
                          </span>
                          <div className="flex items-center gap-1">
                            {act.supporting_incidents.map((id) => (
                              <span
                                key={id}
                                className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-sm"
                              >
                                {id}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">Why: {act.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Summary Matrix: "What Memory Changed" */}
          <div className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1E2633]">
              <div>
                <div className="text-[10px] font-mono uppercase text-emerald-400">
                  MEASURABLE OPERATIONAL IMPACT
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">
                  What Hindsight Memory Changed in This Investigation
                </h3>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                <Clock className="w-3.5 h-3.5" />
                <span>Estimated Time Saved: {comparison.what_memory_changed.time_saved_estimate}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1E2633] bg-[#0B0E14] text-[11px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-4">Dimension</th>
                    <th className="py-2.5 px-4">Without Memory (Stateless AI)</th>
                    <th className="py-2.5 px-4 text-blue-300">With Hindsight Organizational Memory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2633]">
                  {comparison.what_memory_changed.key_differences.map((diff, idx) => (
                    <tr key={idx} className="hover:bg-[#161D2A]">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-200 whitespace-nowrap">
                        {diff.dimension}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{diff.without_memory}</td>
                      <td className="py-3 px-4 text-emerald-300 font-medium">
                        {diff.with_hindsight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {comparison.what_memory_changed.wasted_actions_avoided.length > 0 && (
              <div className="p-3.5 rounded bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold">Wasted Actions Avoided Thanks to Hindsight:</span>
                  <span className="font-mono">
                    {comparison.what_memory_changed.wasted_actions_avoided.join(' | ')}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase text-amber-300 shrink-0">
                  NEGATIVE MEMORY GUARDRAIL
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
