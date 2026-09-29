import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, type NavTab } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { NewIncidentView, type DemoPreset } from './components/NewIncidentView.tsx';
import { IncidentDetailView } from './components/IncidentDetailView.tsx';
import { BeforeAfterView } from './components/BeforeAfterView.tsx';
import { MemoryExplorerView } from './components/MemoryExplorerView.tsx';
import { MemoryInsightsView } from './components/MemoryInsightsView.tsx';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Sparkles,
  Terminal
} from 'lucide-react';
import type {
  IncidentRecord,
  MemoryInsightsStats,
  MemoryTimelineNode,
  ServiceKnowledgeProfile
} from './types/incident.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [presets, setPresets] = useState<DemoPreset[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [insights, setInsights] = useState<MemoryInsightsStats | null>(null);
  const [timeline, setTimeline] = useState<MemoryTimelineNode[]>([]);
  const [serviceProfiles, setServiceProfiles] = useState<ServiceKnowledgeProfile[]>([]);
  const [presetIndexToLoad, setPresetIndexToLoad] = useState<number | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [incRes, insRes, timeRes, srvRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/memory/insights'),
        fetch('/api/memory/timeline'),
        fetch('/api/memory/services')
      ]);

      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.incidents || []);
        setPresets(incData.presets || []);
        setSelectedIncident((prev) => {
          if (!prev && incData.incidents?.length > 0) {
            return incData.incidents[0];
          }
          if (prev) {
            const updated = incData.incidents.find((i: IncidentRecord) => i.id === prev.id);
            return updated || prev;
          }
          return null;
        });
      }

      if (insRes.ok) {
        setInsights(await insRes.json());
      }
      if (timeRes.ok) {
        const tData = await timeRes.json();
        setTimeline(tData.timeline || []);
      }
      if (srvRes.ok) {
        const sData = await srvRes.json();
        setServiceProfiles(sData.services || []);
      }
    } catch (err) {
      console.error('Error loading Incident Memory OS data:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/demo/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAllData();
        showToast(
          `Seeded ${data.seeded_incidents} historical incidents into Hindsight bank "${data.bank_id}".`
        );
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const handleToggleOutage = async () => {
    const nextState = !(insights?.hindsight_outage_simulated ?? false);
    const res = await fetch('/api/hindsight/simulate-outage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextState })
    });
    if (res.ok) {
      await fetchAllData();
      showToast(
        nextState
          ? 'Simulated Hindsight Outage ENABLED (Test D): New analyses will demonstrate graceful fallback.'
          : 'Simulated Hindsight Outage DISABLED: Hindsight Memory Bank is back online.'
      );
    }
  };

  const handleSelectIncident = (incident: IncidentRecord) => {
    setSelectedIncident(incident);
    setActiveTab('incident-detail');
  };

  const handleSelectIncidentById = (incidentId: string) => {
    const found = incidents.find((i) => i.id === incidentId);
    if (found) {
      setSelectedIncident(found);
      setActiveTab('incident-detail');
    } else {
      showToast(`Incident ${incidentId} selected.`);
    }
  };

  const handleQuickLaunchPreset = (presetIdx: number) => {
    setPresetIndexToLoad(presetIdx);
    setActiveTab('new-incident');
  };

  const activeIncidentsCount = incidents.filter(
    (i) => i.status === 'Investigating' || i.status === 'Mitigated'
  ).length;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        totalMemories={insights?.total_incidents_remembered ?? incidents.length}
        activeIncidentsCount={activeIncidentsCount}
        hindsightConnected={insights?.hindsight_connected ?? true}
        hindsightBankId={insights?.hindsight_bank_id ?? 'incident-memory-os-prod'}
        outageSimulated={insights?.hindsight_outage_simulated ?? false}
        onToggleOutage={handleToggleOutage}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
        selectedIncidentId={selectedIncident?.id ?? null}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operational Status Header */}
        <header className="h-14 px-6 bg-[#0B0E14] border-b border-[#1E2633] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>WORKSPACE:</span>
            </span>
            <span className="text-slate-100 font-semibold uppercase">
              {activeTab.replace('-', ' ')}
            </span>
            {insights?.hindsight_outage_simulated && (
              <span className="px-2 py-0.5 rounded-sm bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>TEST D: HINDSIGHT OUTAGE SIMULATION ACTIVE</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#11161F] border border-[#1E2633] text-slate-300">
              <Database className="w-3.5 h-3.5 text-violet-400" />
              <span>Hindsight SDK: @vectorize-io/hindsight-client</span>
            </div>
            <button
              onClick={() => handleQuickLaunchPreset(0)}
              className="px-3 py-1.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo Scene 1</span>
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="mx-6 mt-4 p-3 rounded bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-[10px] uppercase cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active View Container */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              incidents={incidents}
              insights={insights}
              timeline={timeline}
              onSelectIncident={handleSelectIncident}
              onNavigate={setActiveTab}
              onQuickLaunchPreset={handleQuickLaunchPreset}
            />
          )}

          {activeTab === 'new-incident' && (
            <NewIncidentView
              presets={presets}
              initialPresetIndex={presetIndexToLoad}
              onClearPresetIndex={() => setPresetIndexToLoad(null)}
              onIncidentCreated={async (created) => {
                await fetchAllData();
                setSelectedIncident(created);
                setActiveTab('incident-detail');
                showToast(
                  `Incident ${created.id} created and analyzed using ${
                    created.analysis?.historical_matches?.length ?? 0
                  } Hindsight historical matches.`
                );
              }}
            />
          )}

          {activeTab === 'incident-detail' && (
            <IncidentDetailView
              incident={selectedIncident}
              onIncidentUpdated={async (updated) => {
                setSelectedIncident(updated);
                await fetchAllData();
              }}
              onTriggerFollowUpDemo={() => handleQuickLaunchPreset(1)}
              onSelectHistoricalIncident={handleSelectIncidentById}
            />
          )}

          {activeTab === 'before-after' && <BeforeAfterView presets={presets} />}

          {activeTab === 'memory-explorer' && (
            <MemoryExplorerView
              timeline={timeline}
              onSelectIncidentId={handleSelectIncidentById}
            />
          )}

          {activeTab === 'memory-insights' && (
            <MemoryInsightsView
              insights={insights}
              serviceProfiles={serviceProfiles}
              onSelectIncidentId={handleSelectIncidentById}
            />
          )}
        </main>
      </div>
    </div>
  );
}
