import { getHindsightClient, getHindsightConfig } from './client.ts';
import type { IncidentRecord } from '../../src/types/incident.ts';

export function formatIncidentMemoryContent(incident: IncidentRecord): string {
  const res = incident.resolution;
  return [
    `INCIDENT ${incident.id}: ${incident.title}`,
    `Service: ${incident.service} | Environment: ${incident.environment} | Severity: ${incident.severity}`,
    `Timestamp: ${incident.timestamp}`,
    `Error Message: ${incident.error_message}`,
    `Symptoms: ${incident.symptoms}`,
    `Recent Deployment/Change: ${incident.recent_deployment || 'None reported'}`,
    `Metrics: ${incident.metrics || 'N/A'} | Affected Component: ${incident.affected_component || 'N/A'}`,
    `Logs Context: ${incident.logs}`,
    res
      ? [
          `Verified Root Cause: ${res.root_cause}`,
          `Resolution Steps: ${res.resolution_steps}`,
          `What Worked (Successful Fix): ${res.what_worked}`,
          `What Did Not Work (Failed Approach): ${res.what_did_not_work}`,
          `Preventive Action: ${res.preventive_action}`,
          `Final Outcome: ${res.status} — ${res.engineer_feedback} (Engineer Feedback: ${res.feedback_rating})`
        ].join('\n')
      : 'Status: Investigating (Unresolved)'
  ].join('\n');
}

export function buildIncidentMetadata(incident: IncidentRecord): Record<string, string> {
  const res = incident.resolution;
  return {
    incident_id: incident.id,
    title: incident.title,
    service: incident.service,
    environment: incident.environment,
    severity: incident.severity,
    symptoms: incident.symptoms,
    error_message: incident.error_message,
    recent_deployment: incident.recent_deployment || '',
    root_cause: res?.root_cause || '',
    resolution: res?.resolution_steps || '',
    what_worked: res?.what_worked || '',
    what_did_not_work: res?.what_did_not_work || '',
    preventive_action: res?.preventive_action || '',
    outcome: res?.status || incident.status,
    engineer_feedback: res?.engineer_feedback || '',
    feedback_rating: res?.feedback_rating || 'Useful',
    timestamp: incident.timestamp,
    pattern_id: incident.pattern_id || '',
    pattern_name: incident.pattern_name || '',
    is_synthetic_seed: incident.is_synthetic_seed ? 'true' : 'false'
  };
}

export function buildIncidentTags(incident: IncidentRecord): string[] {
  const serviceSlug = incident.service.toLowerCase().replace(/\s+/g, '-');
  const envSlug = incident.environment.toLowerCase().replace(/\s+/g, '-');
  const tags = [
    `service:${serviceSlug}`,
    `env:${envSlug}`,
    `severity:${incident.severity.toLowerCase()}`,
    `status:${incident.status.toLowerCase()}`
  ];
  if (incident.pattern_id) {
    tags.push(`pattern:${incident.pattern_id.toLowerCase()}`);
  }
  if (incident.resolution?.feedback_rating) {
    tags.push(`feedback:${incident.resolution.feedback_rating.toLowerCase().replace(/\s+/g, '-')}`);
  }
  return tags;
}

export async function ensureIncidentMemoryBank(): Promise<string> {
  const { bankId } = getHindsightConfig();
  const client = getHindsightClient();
  await client.createBank(bankId, {
    name: 'Incident Memory OS — Organizational Reliability Bank',
    reflectMission:
      'You are an organizational SRE memory bank. Synthesize historical production incidents, root causes, what worked, what failed, and systemic deployment patterns.',
    retainMission:
      'Extract service names, error messages, symptoms, deployment changes, verified root causes, successful resolutions, failed mitigations, and preventive actions.',
    enableObservations: true,
    enableTextSearch: true,
    enableTemporalRetrieval: true,
    enableGraphRetrieval: true,
    enableReranking: true
  });
  return bankId;
}

/**
 * Retain a single resolved incident into Hindsight using the official SDK `retain()` method.
 */
export async function retainIncidentInHindsight(incident: IncidentRecord): Promise<{
  success: boolean;
  bankId: string;
  memoryId: string;
  error?: string;
}> {
  const { bankId } = getHindsightConfig();
  try {
    const client = getHindsightClient();
    await ensureIncidentMemoryBank();

    const content = formatIncidentMemoryContent(incident);
    const metadata = buildIncidentMetadata(incident);
    const tags = buildIncidentTags(incident);

    const response = await client.retain(bankId, content, {
      timestamp: incident.timestamp,
      context: `Resolved production incident ${incident.id} on ${incident.service} (${incident.environment})`,
      documentId: incident.id,
      metadata,
      tags,
      entities: [
        { text: incident.service, type: 'service' },
        { text: incident.environment, type: 'environment' },
        { text: incident.id, type: 'incident' },
        ...(incident.resolution?.root_cause
          ? [{ text: incident.resolution.root_cause.slice(0, 80), type: 'root_cause' }]
          : [])
      ]
    });

    return {
      success: response.success,
      bankId: response.bank_id,
      memoryId: `mem-${incident.id.toLowerCase()}`
    };
  } catch (err: any) {
    return {
      success: false,
      bankId,
      memoryId: '',
      error: err?.message || 'Failed to store incident memory in Hindsight'
    };
  }
}

/**
 * Batch retain multiple historical incidents into Hindsight using the official SDK `retainBatch()` method.
 */
export async function retainIncidentsBatchInHindsight(incidents: IncidentRecord[]): Promise<{
  success: boolean;
  bankId: string;
  itemsCount: number;
  error?: string;
}> {
  const { bankId } = getHindsightConfig();
  try {
    const client = getHindsightClient();
    await ensureIncidentMemoryBank();

    const resolvedIncidents = incidents.filter((inc) => inc.status === 'Resolved' && inc.resolution);
    if (resolvedIncidents.length === 0) {
      return { success: true, bankId, itemsCount: 0 };
    }

    const items = resolvedIncidents.map((inc) => ({
      content: formatIncidentMemoryContent(inc),
      timestamp: inc.timestamp,
      context: `Historical production incident ${inc.id} in ${inc.service}`,
      document_id: inc.id,
      metadata: buildIncidentMetadata(inc),
      tags: buildIncidentTags(inc),
      entities: [
        { text: inc.service, type: 'service' },
        { text: inc.environment, type: 'environment' },
        { text: inc.id, type: 'incident' }
      ]
    }));

    const response = await client.retainBatch(bankId, items, { async: false });
    return {
      success: response.success,
      bankId: response.bank_id,
      itemsCount: response.items_count
    };
  } catch (err: any) {
    return {
      success: false,
      bankId,
      itemsCount: 0,
      error: err?.message || 'Failed to batch retain incidents in Hindsight'
    };
  }
}
