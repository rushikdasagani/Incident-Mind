import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Cpu,
  Database,
  Play,
  Sparkles,
  Terminal,
  Zap
} from 'lucide-react';
import type { IncidentRecord, IncidentSeverity } from '../types/incident.ts';

export interface DemoPreset {
  name: string;
  title: string;
  service: string;
  environment: 'Production' | 'Staging' | 'EU-Central-Prod' | 'US-East-Prod' | 'AP-South-Prod';
  severity: IncidentSeverity;
  error_message: string;
  symptoms: string;
  logs: string;
  recent_deployment: string;
  metrics?: string;
  affected_component?: string;
}

interface NewIncidentViewProps {
  presets: DemoPreset[];
  initialPresetIndex?: number | null;
  onIncidentCreated: (incident: IncidentRecord) => void;
  onClearPresetIndex?: () => void;
}

const SERVICES = [
  'Payment API',
  'Authentication Service',
  'Order Service',
  'Notification Service',
  'User API',
  'Database',
  'Redis Cache',
  'API Gateway'
];

const ENVIRONMENTS = [
  'Production',
  'US-East-Prod',
  'EU-Central-Prod',
  'AP-South-Prod',
  'Staging'
] as const;

export const NewIncidentView: React.FC<NewIncidentViewProps> = ({
  presets,
  initialPresetIndex,
  onIncidentCreated,
  onClearPresetIndex
}) => {
  const defaultPreset = presets[0] || {
    name: 'Scene 1 (Primary Demo): Payment API Database Timeout',
    title: 'Payment API Database Timeout',
    service: 'Payment API',
    environment: 'Production',
    severity: 'SEV-1' as IncidentSeverity,
    error_message: 'Timeout while acquiring database connection',
    symptoms: 'Requests returning 504 errors',
    logs: `[2026-09-29T09:45:12Z] ERROR [payment-api-prod-8d4f] TimeoutError: Timeout while acquiring database connection after 5000ms (pool: active=50, idle=0, waiting=164)\n[2026-09-29T09:45:13Z] ERROR [envoy-ingress] HTTP 504 Gateway Timeout on POST /v1/payments/authorize`,
    recent_deployment: 'Payment API v2.8 deployed 25 minutes ago',
    metrics: 'db_pool_utilization: 100% (50/50), http_504_rate: 41.2%, p99_latency: 5120ms',
    affected_component: 'payment-api-db-pool'
  };

  const [title, setTitle] = useState(defaultPreset.title);
  const [service, setService] = useState(defaultPreset.service);
  const [environment, setEnvironment] = useState<string>(defaultPreset.environment);
  const [severity, setSeverity] = useState<IncidentSeverity>(defaultPreset.severity);
  const [errorMessage, setErrorMessage] = useState(defaultPreset.error_message);
  const [symptoms, setSymptoms] = useState(defaultPreset.symptoms);
  const [logs, setLogs] = useState(defaultPreset.logs);
  const [recentDeployment, setRecentDeployment] = useState(defaultPreset.recent_deployment);
  const [metrics, setMetrics] = useState(defaultPreset.metrics || '');
  const [affectedComponent, setAffectedComponent] = useState(
    defaultPreset.affected_component || ''
  );
  const [useMemory, setUseMemory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const applyPreset = (p: DemoPreset) => {
    setTitle(p.title);
    setService(p.service);
    setEnvironment(p.environment);
    setSeverity(p.severity);
    setErrorMessage(p.error_message);
    setSymptoms(p.symptoms);
    setLogs(p.logs);
    setRecentDeployment(p.recent_deployment);
    setMetrics(p.metrics || '');
    setAffectedComponent(p.affected_component || '');
    setErrorBanner(null);
  };

  useEffect(() => {
    if (
      initialPresetIndex !== null &&
      initialPresetIndex !== undefined &&
      presets[initialPresetIndex]
    ) {
      applyPreset(presets[initialPresetIndex]);
      if (onClearPresetIndex) onClearPresetIndex();
    }
  }, [initialPresetIndex, presets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!title.trim() || !service.trim() || (!errorMessage.trim() && !symptoms.trim())) {
      setErrorBanner(
        'Please provide an Incident Title, Service, and at least an Error Message or Symptoms.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          service,
          environment,
          severity,
          error_message: errorMessage,
          symptoms,
          logs,
          recent_deployment: recentDeployment,
          metrics,
          affected_component: affectedComponent,
          useMemory
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create and analyze incident');
      }

      onIncidentCreated(data);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unexpected error during incident creation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & One-Click Hackathon Presets */}
      <div className="bg-[#11161F] border border-[#1E2633] rounded p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#1E2633]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400">
              STEP 1 — PRODUCTION INCIDENT INGESTION
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-0.5">
              Report New Production Incident & Trigger Hindsight Memory Analysis
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseMemory(!useMemory)}
              className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer flex items-center gap-2 ${
                useMemory
                  ? 'bg-violet-500/15 text-violet-200 border-violet-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Hindsight Memory Recall: {useMemory ? 'ENABLED' : 'DISABLED'}</span>
            </button>
          </div>
        </div>

        {/* One-Click Demo Scenario Presets */}
        <div className="pt-4">
          <div className="text-[11px] font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Load Realistic Production Scenario Preset:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-left p-3 rounded border transition-all cursor-pointer ${
                  title === preset.title
                    ? 'bg-blue-600/15 border-blue-500/50 text-slate-100'
                    : 'bg-[#0B0E14] border-[#1E2633] hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-blue-400">
                    {preset.name}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-red-500/15 text-red-400 border border-red-500/30 rounded-sm">
                    {preset.severity}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-1">{preset.title}</div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  {preset.service} · {preset.error_message}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incident Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#11161F] border border-[#1E2633] rounded p-5 space-y-5"
      >
        {errorBanner && (
          <div className="p-3 rounded bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              Incident Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Payment API Database Timeout"
              className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              Affected Service *
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Severity *
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="w-full px-2.5 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="SEV-1">SEV-1</option>
                <option value="SEV-2">SEV-2</option>
                <option value="SEV-3">SEV-3</option>
                <option value="SEV-4">SEV-4</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              Primary Error Message *
            </label>
            <input
              type="text"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="e.g. Timeout while acquiring database connection"
              className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs font-mono text-red-300 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              Observed Symptoms *
            </label>
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Requests returning 504 errors"
              className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              Recent Deployment / Change
            </label>
            <input
              type="text"
              value={recentDeployment}
              onChange={(e) => setRecentDeployment(e.target.value)}
              placeholder="e.g. Payment API v2.8 deployed 25 minutes ago"
              className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs text-amber-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              Telemetry Metrics (Optional)
            </label>
            <input
              type="text"
              value={metrics}
              onChange={(e) => setMetrics(e.target.value)}
              placeholder="e.g. db_pool_utilization: 100% (50/50)"
              className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              Affected Component (Optional)
            </label>
            <input
              type="text"
              value={affectedComponent}
              onChange={(e) => setAffectedComponent(e.target.value)}
              placeholder="e.g. payment-api-db-pool"
              className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Stack Trace / Production Log Snippet</span>
          </label>
          <textarea
            rows={4}
            value={logs}
            onChange={(e) => setLogs(e.target.value)}
            className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E2633] rounded text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 leading-relaxed"
          />
        </div>

        <div className="pt-3 border-t border-[#1E2633] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400 shrink-0" />
            <span>
              Submitting queries Hindsight bank <code className="text-slate-200">incident-memory-os-prod</code> via{' '}
              <code className="text-violet-300">recall()</code> + <code className="text-violet-300">reflect()</code> before synthesizing root causes.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSubmitting ? (
              <>
                <Zap className="w-4 h-4 animate-spin" />
                <span>Searching Hindsight & Generating Runbook...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Analyze Incident with Hindsight Memory</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
