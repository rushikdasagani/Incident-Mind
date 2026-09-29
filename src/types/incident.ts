export type IncidentSeverity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';

export type IncidentStatus = 'Investigating' | 'Mitigated' | 'Resolved' | 'False Alarm';

export type FeedbackRating = 'Very Useful' | 'Useful' | 'Not Useful';

export interface HistoricalMatch {
  incident_id: string;
  memory_id: string;
  title: string;
  date: string;
  days_ago: number;
  service: string;
  environment: string;
  severity: IncidentSeverity;
  symptoms: string;
  error_message: string;
  recent_deployment?: string;
  root_cause: string;
  resolution: string;
  what_worked: string;
  what_did_not_work: string;
  preventive_action: string;
  outcome: string;
  engineer_feedback?: string;
  feedback_rating?: FeedbackRating;
  pattern_id?: string;
  pattern_name?: string;
  retrieval_scores: {
    final: number;
    semantic: number | null;
    keyword: number | null;
    reranker?: number | null;
  };
  relevance_explanation: string;
}

export interface RecommendedAction {
  priority: number;
  action: string;
  rationale: string;
  supporting_incidents: string[];
  warning_from_history?: string;
}

export interface RunbookStep {
  step_number: number;
  title: string;
  command_or_action: string;
  expected_result: string;
  historical_reference?: string;
  verification_check: string;
}

export interface SystemicPatternAlert {
  detected: boolean;
  pattern_id: string;
  pattern_name: string;
  occurrence_count: number;
  matching_incident_ids: string[];
  common_factor: string;
  systemic_root_cause: string;
  suggested_preventive_action: string;
}

export type MemoryConfidenceLevel =
  | 'Strong historical evidence'
  | 'Moderate historical evidence'
  | 'Weak historical evidence'
  | 'No relevant historical memory';

export interface IncidentAnalysis {
  summary: string;
  severity_assessment: string;
  failure_category: string;
  signals: string[];
  possible_root_causes: Array<{
    cause: string;
    likelihood: 'High' | 'Medium' | 'Low';
    evidence_type: 'Historical Memory' | 'Symptom Hypothesis';
    supporting_incidents: string[];
    explanation: string;
  }>;
  historical_matches: HistoricalMatch[];
  memory_powered_reasoning: string[];
  recommended_actions: RecommendedAction[];
  runbook: RunbookStep[];
  confidence: 'High' | 'Medium' | 'Low';
  memory_confidence: {
    level: MemoryConfidenceLevel;
    score_percent: number;
    explanation: string;
    bars_filled: number; // out of 20
  };
  systemic_pattern?: SystemicPatternAlert | null;
  hindsight_status: {
    used: boolean;
    available: boolean;
    bank_id: string;
    memories_searched: number;
    matches_found: number;
    reflect_summary?: string;
    error_message?: string;
    latency_ms?: number;
  };
  llm_provider: string;
  analyzed_at: string;
}

export interface IncidentResolution {
  status: IncidentStatus;
  root_cause: string;
  resolution_steps: string;
  what_worked: string;
  what_did_not_work: string;
  preventive_action: string;
  engineer_feedback: string;
  feedback_rating: FeedbackRating;
  resolved_at: string;
  resolved_by: string;
  stored_in_hindsight: boolean;
  hindsight_memory_id?: string;
  hindsight_operation_details?: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  service: string;
  environment: 'Production' | 'Staging' | 'EU-Central-Prod' | 'US-East-Prod' | 'AP-South-Prod';
  severity: IncidentSeverity;
  status: IncidentStatus;
  error_message: string;
  logs: string;
  symptoms: string;
  timestamp: string;
  recent_deployment: string;
  metrics?: string;
  affected_component?: string;
  is_synthetic_seed?: boolean;
  pattern_id?: string;
  pattern_name?: string;
  analysis?: IncidentAnalysis | null;
  resolution?: IncidentResolution | null;
  created_at: string;
  updated_at: string;
}

export interface BeforeAfterComparison {
  incident_input: {
    title: string;
    service: string;
    environment: string;
    severity: IncidentSeverity;
    error_message: string;
    symptoms: string;
    logs: string;
    recent_deployment: string;
    metrics?: string;
  };
  without_memory: {
    summary: string;
    possible_causes: string[];
    generic_steps: string[];
    confidence: string;
    limitations: string[];
  };
  with_hindsight: IncidentAnalysis;
  what_memory_changed: {
    generic_diagnosis: string;
    memory_powered_diagnosis: string;
    key_differences: Array<{
      dimension: string;
      without_memory: string;
      with_hindsight: string;
    }>;
    time_saved_estimate: string;
    wasted_actions_avoided: string[];
  };
}

export interface MemoryTimelineNode {
  id: string;
  incident_id: string;
  day_label: string;
  timestamp: string;
  service: string;
  severity: IncidentSeverity;
  title: string;
  symptoms: string;
  root_cause: string;
  resolution: string;
  what_worked: string;
  what_did_not_work: string;
  pattern_id: string;
  pattern_name: string;
  memory_evolution_stage: 'Initial Discovery' | 'Memory Recalled' | 'Pattern Consolidated' | 'Preventive Guardrail';
  prior_matches_count: number;
  learning_note: string;
}

export interface ServiceKnowledgeProfile {
  service: string;
  total_incidents: number;
  resolved_count: number;
  known_problems: Array<{
    problem_title: string;
    pattern_id: string;
    occurrence_count: number;
    incident_ids: string[];
    last_occurred: string;
    verified_root_causes: string[];
    successful_resolutions: string[];
    failed_approaches: string[];
    preventive_actions: string[];
  }>;
}

export interface MemoryInsightsStats {
  total_incidents_remembered: number;
  seed_incidents_count: number;
  live_incidents_count: number;
  resolved_incidents_count: number;
  resolution_rate_percent: number;
  recurring_patterns_count: number;
  known_root_causes_count: number;
  hindsight_bank_id: string;
  hindsight_connected: boolean;
  hindsight_base_url: string;
  hindsight_version: string;
  hindsight_outage_simulated: boolean;
  most_common_root_causes: Array<{
    root_cause: string;
    count: number;
    services: string[];
  }>;
  most_successful_resolutions: Array<{
    resolution: string;
    success_count: number;
    service: string;
    feedback_score: string;
  }>;
  frequently_affected_services: Array<{
    service: string;
    incident_count: number;
    top_pattern: string;
  }>;
  recurring_patterns: Array<{
    pattern_id: string;
    pattern_name: string;
    count: number;
    incident_ids: string[];
    common_factor: string;
    systemic_cause: string;
    preventive_action: string;
  }>;
}
