export type SeverityLevel = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';

export type IncidentStatus = 'Investigating' | 'Mitigated' | 'Resolved' | 'False Alarm';

export type FeedbackRating = 'Very Useful' | 'Useful' | 'Not Useful';

export type EvidenceConfidence = 'Strong' | 'Moderate' | 'Weak' | 'None';

export interface IncidentInput {
  title: string;
  service: string;
  environment: 'Production' | 'Staging' | 'EU-West-Prod' | 'US-East-Prod';
  severity: SeverityLevel;
  error_message: string;
  logs: string;
  symptoms: string;
  timestamp?: string;
  recent_deployment: string;
  metrics?: string;
  affected_component?: string;
}

export interface HistoricalIncidentMatch {
  incident_id: string;
  title: string;
  date: string;
  days_ago: number;
  service: string;
  environment: string;
  severity: SeverityLevel;
  symptoms: string;
  error_message: string;
  recent_deployment: string;
  root_cause: string;
  resolution_steps: string[];
  what_worked: string;
  what_did_not_work: string;
  preventive_action: string;
  outcome: string;
  engineer_feedback?: string;
  feedback_rating?: FeedbackRating;
  pattern_id?: string;
  pattern_name?: string;
  retrieval_score: number;
  semantic_score: number | null;
  keyword_score: number | null;
  relevance_explanation: string;
  matched_signals: string[];
}

export interface InvestigationStep {
  priority: number;
  action: string;
  rationale: string;
  historical_reference?: string;
  command_or_query?: string;
}

export interface RunbookStep {
  step_number: number;
  title: string;
  action: string;
  expected_result: string;
  historical_reference?: string;
  verification_command?: string;
}

export interface PossibleRootCause {
  cause: string;
  likelihood: 'High' | 'Medium' | 'Low';
  evidence: string;
  supporting_incidents: string[];
}

export interface DetectedPatternAlert {
  pattern_id: string;
  pattern_name: string;
  incident_ids: string[];
  occurrence_count: number;
  common_factor: string;
  systemic_cause: string;
  suggested_preventive_action: string;
}

export interface IncidentAnalysis {
  summary: string;
  failure_category: string;
  severity: SeverityLevel;
  signals: string[];
  memory_retrieved: boolean;
  memory_error?: string;
  evidence_strength: EvidenceConfidence;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  reasoning_points: string[];
  possible_root_causes: PossibleRootCause[];
  historical_matches: HistoricalIncidentMatch[];
  recommended_actions: InvestigationStep[];
  runbook: RunbookStep[];
  detected_pattern?: DetectedPatternAlert | null;
  hindsight_recall_latency_ms?: number;
  llm_provider?: string;
}

export interface IncidentResolution {
  status: IncidentStatus;
  root_cause: string;
  resolution_steps: string[];
  what_worked: string;
  what_did_not_work: string;
  preventive_action: string;
  engineer_feedback: string;
  feedback_rating: FeedbackRating;
  resolved_at: string;
  stored_in_hindsight: boolean;
  hindsight_document_id?: string;
  hindsight_operation_id?: string;
}

export interface IncidentRecord extends IncidentInput {
  id: string;
  created_at: string;
  updated_at: string;
  status: IncidentStatus;
  is_seed_data: boolean;
  pattern_id?: string;
  pattern_name?: string;
  analysis?: IncidentAnalysis | null;
  resolution?: IncidentResolution | null;
}

export interface MemoryTimelineEvent {
  id: string;
  incident_id: string;
  day_label: string;
  timestamp: string;
  service: string;
  severity: SeverityLevel;
  title: string;
  symptoms: string;
  root_cause: string;
  resolution_summary: string;
  what_worked: string;
  what_did_not_work: string;
  historical_matches_count: number;
  matched_incident_ids: string[];
  pattern_detected?: string;
  learning_milestone: string;
  feedback_rating?: FeedbackRating;
}

export interface ServiceProblemGroup {
  problem_title: string;
  pattern_id: string;
  occurrence_count: number;
  incident_ids: string[];
  last_occurred: string;
  root_causes: string[];
  successful_resolutions: string[];
  failed_approaches: string[];
  preventive_actions: string[];
}

export interface ServiceKnowledgeProfile {
  service: string;
  total_incidents: number;
  resolved_count: number;
  mttr_minutes_avg: number;
  reliability_tier: 'Tier-0 Critical' | 'Tier-1 Core' | 'Tier-2 Infrastructure';
  known_problems: ServiceProblemGroup[];
  recent_deployments: string[];
}

export interface MemoryInsightsStats {
  total_incidents_remembered: number;
  seed_incidents_count: number;
  live_incidents_count: number;
  resolved_incidents: number;
  resolution_rate_percent: number;
  recurring_patterns_count: number;
  known_root_causes_count: number;
  helpful_feedback_rate: number;
  hindsight_connected: boolean;
  hindsight_bank_id: string;
  hindsight_mode: 'External Hindsight Server' | 'Embedded Hindsight V1 Engine' | 'Simulated Outage';
  recurring_patterns: DetectedPatternAlert[];
  top_root_causes: { cause: string; count: number; service: string }[];
  top_resolutions: { resolution: string; success_count: number; service: string }[];
  affected_services: { service: string; count: number; resolved: number }[];
  knowledge_growth: { label: string; memories: number; match_accuracy_note: string }[];
}

export interface BeforeAfterComparison {
  incident: IncidentInput;
  without_memory: IncidentAnalysis;
  with_hindsight: IncidentAnalysis;
  what_memory_changed: {
    diagnosis_shift: {
      without: string;
      with_memory: string;
    };
    first_action_shift: {
      without: string;
      with_memory: string;
    };
    failed_actions_avoided: string[];
    evidence_citations: string[];
    time_saved_estimate: string;
  };
}
