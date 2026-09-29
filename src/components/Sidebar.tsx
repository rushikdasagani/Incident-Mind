import React from 'react';
import {
  Activity,
  PlusCircle,
  GitCompare,
  Database,
  BarChart3,
  ShieldAlert,
  RefreshCw,
  Wifi,
  WifiOff,
  Terminal,
  Sparkles
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'new-incident'
  | 'incident-detail'
  | 'before-after'
  | 'memory-explorer'
  | 'memory-insights';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  totalMemories: number;
  activeIncidentsCount: number;
  hindsightConnected: boolean;
  hindsightBankId: string;
  outageSimulated: boolean;
  onToggleOutage: () => void;
  onSeedDemo: () => void;
  isSeeding: boolean;
  selectedIncidentId: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  totalMemories,
  activeIncidentsCount,
  hindsightConnected,
  hindsightBankId,
  outageSimulated,
  onToggleOutage,
  onSeedDemo,
  isSeeding,
  selectedIncidentId
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Command Center',
      icon: <Activity className="w-4 h-4" />,
      badge: activeIncidentsCount > 0 ? `${activeIncidentsCount} ACTIVE` : undefined,
      badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30'
    },
    {
      id: 'new-incident',
      label: 'Report Incident',
      icon: <PlusCircle className="w-4 h-4" />
    },
    {
      id: 'incident-detail',
      label: 'Active Investigation',
      icon: <Terminal className="w-4 h-4" />,
      badge: selectedIncidentId || undefined,
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    },
    {
      id: 'before-after',
      label: 'Before vs After Memory',
      icon: <GitCompare className="w-4 h-4" />,
      badge: 'DEMO',
      badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-500/30'
    },
    {
      id: 'memory-explorer',
      label: 'Hindsight Explorer',
      icon: <Database className="w-4 h-4" />,
      badge: totalMemories,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'memory-insights',
      label: 'Service Knowledge Graph',
      icon: <BarChart3 className="w-4 h-4" />
    }
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#0B0E14] border-r border-[#1E2633] flex flex-col justify-between select-none">
      {/* Top Brand Header */}
      <div>
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#1E2633]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-100 leading-none">
                INCIDENT MEMORY
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400 mt-0.5">
                HINDSIGHT SRE OS v1.0
              </div>
            </div>
          </div>
        </div>

        {/* Hindsight Persistent Memory Telemetry Strip */}
        <div className="p-3 border-b border-[#1E2633] bg-[#11161F]/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              HINDSIGHT MEMORY BANK
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-semibold border ${
                hindsightConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border-red-500/40'
              }`}
            >
              {hindsightConnected ? (
                <>
                  <Wifi className="w-2.5 h-2.5" /> ONLINE
                </>
              ) : (
                <>
                  <WifiOff className="w-2.5 h-2.5" /> OFFLINE
                </>
              )}
            </span>
          </div>
          <div className="text-xs font-mono text-slate-200 truncate" title={hindsightBankId}>
            {hindsightBankId}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Retained Incidents:</span>
            <span className="text-slate-100 font-semibold">{totalMemories}</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="p-2 space-y-1">
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Incident Response Workflow
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-slate-100 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#11161F] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-blue-400' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded-sm border ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Demo Seed + Outage Resilience Test */}
      <div className="p-3 border-t border-[#1E2633] space-y-2 bg-[#0D1118]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Demo & Resilience Controls
        </div>

        <button
          onClick={onSeedDemo}
          disabled={isSeeding}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium bg-[#11161F] hover:bg-[#18202C] text-slate-200 border border-[#1E2633] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>{isSeeding ? 'Seeding Hindsight Bank...' : 'Reset & Seed 24 Incidents'}</span>
        </button>

        <button
          onClick={onToggleOutage}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono border transition-colors cursor-pointer ${
            outageSimulated
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
              : 'bg-[#11161F] text-slate-400 border-[#1E2633] hover:text-slate-200'
          }`}
          title="Test D: Simulate Hindsight unavailability to verify graceful fallback"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Outage</span>
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-sm text-[10px] uppercase ${
              outageSimulated ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {outageSimulated ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </aside>
  );
};
