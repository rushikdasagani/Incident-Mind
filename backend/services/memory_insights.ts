import { dbStore } from '../db/sqlite.ts';
import { verifyHindsightConnection } from '../hindsight/client.ts';
import type {
  MemoryInsightsStats,
  MemoryTimelineNode,
  ServiceKnowledgeProfile
} from '../../src/types/incident.ts';

export async function getMemoryInsightsStats(): Promise<MemoryInsightsStats> {
  const incidents = dbStore.getAllIncidents();
  const hsStatus = await verifyHindsightConnection();

  const resolved = incidents.filter((i) => i.status === 'Resolved' && i.resolution);
  const seedCount = incidents.filter((i) => i.is_synthetic_seed).length;
  const liveCount = incidents.length - seedCount;

  // Group by pattern_id / root cause
  const patternMap = new Map<
    string,
    {
      pattern_id: string;
      pattern_name: string;
      count: number;
      incident_ids: string[];
      services: Set<string>;
      systemic_cause: string;
      preventive_action: string;
    }
  >();

  const rootCauseMap = new Map<string, { count: number; services: Set<string> }>();
  const serviceMap = new Map<string, { count: number; patterns: Map<string, number> }>();
  const resolutionList: Array<{
    resolution: string;
    success_count: number;
    service: string;
    feedback_score: string;
  }> = [];

  for (const inc of incidents) {
    // Service aggregation
    const sEntry = serviceMap.get(inc.service) || { count: 0, patterns: new Map() };
    sEntry.count++;
    const pName = inc.pattern_name || 'Service Degradation';
    sEntry.patterns.set(pName, (sEntry.patterns.get(pName) || 0) + 1);
    serviceMap.set(inc.service, sEntry);

    if (inc.resolution) {
      const rcKey = inc.pattern_name || inc.resolution.root_cause.slice(0, 75);
      const rcEntry = rootCauseMap.get(rcKey) || { count: 0, services: new Set() };
      rcEntry.count++;
      rcEntry.services.add(inc.service);
      rootCauseMap.set(rcKey, rcEntry);

      const pId = inc.pattern_id || `PAT-${inc.service.slice(0, 3).toUpperCase()}`;
      const existingPat = patternMap.get(pId);
      if (existingPat) {
        existingPat.count++;
        existingPat.incident_ids.push(inc.id);
        existingPat.services.add(inc.service);
      } else {
        patternMap.set(pId, {
          pattern_id: pId,
          pattern_name: inc.pattern_name || inc.resolution.root_cause.slice(0, 60),
          count: 1,
          incident_ids: [inc.id],
          services: new Set([inc.service]),
          systemic_cause: inc.resolution.root_cause,
          preventive_action: inc.resolution.preventive_action
        });
      }
    }
  }

  const recurringPatterns = Array.from(patternMap.values())
    .sort((a, b) => b.count - a.count)
    .map((p) => ({
      pattern_id: p.pattern_id,
      pattern_name: p.pattern_name,
      count: p.count,
      incident_ids: p.incident_ids,
      common_factor: `${Array.from(p.services).join(', ')} deployments & runtime config`,
      systemic_cause: p.systemic_cause,
      preventive_action: p.preventive_action
    }));

  for (const p of recurringPatterns) {
    const sampleInc = resolved.find((i) => i.pattern_id === p.pattern_id) || resolved[0];
    if (sampleInc?.resolution) {
      resolutionList.push({
        resolution: sampleInc.resolution.what_worked,
        success_count: p.count,
        service: sampleInc.service,
        feedback_score: sampleInc.resolution.feedback_rating
      });
    }
  }

  const mostCommonRootCauses = Array.from(rootCauseMap.entries())
    .map(([root_cause, data]) => ({
      root_cause,
      count: data.count,
      services: Array.from(data.services)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const frequentlyAffectedServices = Array.from(serviceMap.entries())
    .map(([service, data]) => {
      let topPattern = 'General';
      let maxC = 0;
      for (const [pat, c] of data.patterns.entries()) {
        if (c > maxC) {
          maxC = c;
          topPattern = pat;
        }
      }
      return {
        service,
        incident_count: data.count,
        top_pattern: topPattern
      };
    })
    .sort((a, b) => b.incident_count - a.incident_count);

  const resolutionRate =
    incidents.length > 0 ? Math.round((resolved.length / incidents.length) * 100) : 0;

  return {
    total_incidents_remembered: resolved.length,
    seed_incidents_count: seedCount,
    live_incidents_count: liveCount,
    resolved_incidents_count: resolved.length,
    resolution_rate_percent: resolutionRate,
    recurring_patterns_count: recurringPatterns.filter((p) => p.count >= 2).length,
    known_root_causes_count: rootCauseMap.size,
    hindsight_bank_id: hsStatus.bankId,
    hindsight_connected: hsStatus.connected,
    hindsight_base_url: hsStatus.baseUrl,
    hindsight_version: hsStatus.version,
    hindsight_outage_simulated: hsStatus.outageSimulated,
    most_common_root_causes: mostCommonRootCauses,
    most_successful_resolutions: resolutionList.slice(0, 6),
    frequently_affected_services: frequentlyAffectedServices,
    recurring_patterns: recurringPatterns
  };
}

export function getMemoryTimeline(): MemoryTimelineNode[] {
  const incidents = dbStore
    .getAllIncidents()
    .filter((i) => i.status === 'Resolved' && i.resolution)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (incidents.length === 0) return [];

  const earliestMs = new Date(incidents[0].timestamp).getTime();
  const patternCounter = new Map<string, number>();

  return incidents.map((inc) => {
    const dayNum = Math.max(
      1,
      Math.round((new Date(inc.timestamp).getTime() - earliestMs) / (1000 * 3600 * 24)) + 1
    );
    const patKey = inc.pattern_id || inc.service;
    const priorCount = patternCounter.get(patKey) || 0;
    patternCounter.set(patKey, priorCount + 1);

    let stage: MemoryTimelineNode['memory_evolution_stage'] = 'Initial Discovery';
    let learningNote =
      'First occurrence recorded in Hindsight. Root cause and verified fix extracted into organizational memory.';

    if (priorCount === 1) {
      stage = 'Memory Recalled';
      learningNote =
        'Hindsight recalled the prior incident, allowing the agent to skip generic triage and recommend the verified fix.';
    } else if (priorCount === 2) {
      stage = 'Pattern Consolidated';
      learningNote = `Hindsight consolidated ${priorCount + 1} related incidents into a recurring organizational pattern and flagged failed mitigations.`;
    } else if (priorCount >= 3) {
      stage = 'Preventive Guardrail';
      learningNote = `High-confidence systemic pattern (${priorCount + 1} matches). Agent automatically generated runbook + CI/CD preventive policy.`;
    }

    return {
      id: `tl-${inc.id}`,
      incident_id: inc.id,
      day_label: `Day ${dayNum}`,
      timestamp: inc.timestamp,
      service: inc.service,
      severity: inc.severity,
      title: inc.title,
      symptoms: inc.symptoms,
      root_cause: inc.resolution?.root_cause || '',
      resolution: inc.resolution?.resolution_steps || '',
      what_worked: inc.resolution?.what_worked || '',
      what_did_not_work: inc.resolution?.what_did_not_work || '',
      pattern_id: inc.pattern_id || 'PATTERN-CUSTOM',
      pattern_name: inc.pattern_name || 'Service Reliability Pattern',
      memory_evolution_stage: stage,
      prior_matches_count: priorCount,
      learning_note: learningNote
    };
  });
}

export function getServiceKnowledgeProfiles(): ServiceKnowledgeProfile[] {
  const incidents = dbStore.getAllIncidents();
  const byService = new Map<string, typeof incidents>();

  for (const inc of incidents) {
    const list = byService.get(inc.service) || [];
    list.push(inc);
    byService.set(inc.service, list);
  }

  const profiles: ServiceKnowledgeProfile[] = [];

  for (const [service, list] of byService.entries()) {
    const resolved = list.filter((i) => i.status === 'Resolved' && i.resolution);
    const problemGroups = new Map<
      string,
      {
        problem_title: string;
        pattern_id: string;
        incident_ids: string[];
        last_occurred: string;
        verified_root_causes: Set<string>;
        successful_resolutions: Set<string>;
        failed_approaches: Set<string>;
        preventive_actions: Set<string>;
      }
    >();

    for (const inc of resolved) {
      const key = inc.pattern_name || inc.title;
      const existing = problemGroups.get(key) || {
        problem_title: key,
        pattern_id: inc.pattern_id || 'PATTERN-GEN',
        incident_ids: [],
        last_occurred: inc.timestamp,
        verified_root_causes: new Set<string>(),
        successful_resolutions: new Set<string>(),
        failed_approaches: new Set<string>(),
        preventive_actions: new Set<string>()
      };

      existing.incident_ids.push(inc.id);
      if (new Date(inc.timestamp) > new Date(existing.last_occurred)) {
        existing.last_occurred = inc.timestamp;
      }
      if (inc.resolution?.root_cause) existing.verified_root_causes.add(inc.resolution.root_cause);
      if (inc.resolution?.what_worked) existing.successful_resolutions.add(inc.resolution.what_worked);
      if (inc.resolution?.what_did_not_work) {
        existing.failed_approaches.add(inc.resolution.what_did_not_work);
      }
      if (inc.resolution?.preventive_action) {
        existing.preventive_actions.add(inc.resolution.preventive_action);
      }
      problemGroups.set(key, existing);
    }

    profiles.push({
      service,
      total_incidents: list.length,
      resolved_count: resolved.length,
      known_problems: Array.from(problemGroups.values()).map((g) => ({
        problem_title: g.problem_title,
        pattern_id: g.pattern_id,
        occurrence_count: g.incident_ids.length,
        incident_ids: g.incident_ids,
        last_occurred: g.last_occurred,
        verified_root_causes: Array.from(g.verified_root_causes),
        successful_resolutions: Array.from(g.successful_resolutions),
        failed_approaches: Array.from(g.failed_approaches),
        preventive_actions: Array.from(g.preventive_actions)
      }))
    });
  }

  return profiles.sort((a, b) => b.total_incidents - a.total_incidents);
}
