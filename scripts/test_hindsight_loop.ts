import 'dotenv/config';
import express from 'express';
import { hindsightEngineRouter } from '../backend/hindsight/engine_router.ts';
import { dbStore } from '../backend/db/sqlite.ts';
import {
  verifyHindsightConnection,
  setSimulatedHindsightOutage
} from '../backend/hindsight/client.ts';
import {
  retainIncidentInHindsight,
  retainIncidentsBatchInHindsight
} from '../backend/hindsight/memory_store.ts';
import { retrieveRelevantIncidentMemories } from '../backend/hindsight/memory_retrieval.ts';
import { analyzeIncidentWithHindsight } from '../backend/agents/incident_agent.ts';
import { SEED_INCIDENTS } from '../data/seed_incidents.ts';
import type { IncidentRecord } from '../src/types/incident.ts';

async function runVerificationSuite() {
  console.log('================================================================');
  console.log(' INCIDENT MEMORY OS — HINDSIGHT CLOSED-LOOP VERIFICATION SUITE');
  console.log('================================================================\n');

  // Start an ephemeral local server on port 3099 if not already running so @vectorize-io/hindsight-client executes real HTTP calls
  const testPort = 3099;
  process.env.HINDSIGHT_BASE_URL = `http://localhost:${testPort}/hindsight-engine`;

  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/hindsight-engine', hindsightEngineRouter);

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(testPort, '127.0.0.1', () => resolve(s));
  });

  try {
    dbStore.ensureSeeded();
    await retainIncidentsBatchInHindsight(SEED_INCIDENTS);

    const conn = await verifyHindsightConnection();
    console.log(`[Connection Check] Connected=${conn.connected}, Version=${conn.version}, Bank=${conn.bankId}\n`);

    // ------------------------------------------------------------------------
    // TEST A — Storage
    // ------------------------------------------------------------------------
    console.log('--- TEST A: Hindsight Memory Storage (Retain) ---');
    const sampleIncident: IncidentRecord = {
      id: 'INC-TEST-901',
      title: 'Checkout GraphQL Gateway OutOfMemory Heap Crash',
      service: 'Order Service',
      environment: 'Production',
      severity: 'SEV-1',
      status: 'Resolved',
      error_message: 'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
      logs: '[2026-09-29T08:00:00Z] ERROR [order-service] FATAL ERROR: Reached heap limit Allocation failed',
      symptoms: 'Order GraphQL pods restarting with OOMKilled exit code 137 during bulk cart export',
      timestamp: new Date().toISOString(),
      recent_deployment: 'Order Service v4.9 deployed 15 minutes ago with unbounded batch loader',
      is_synthetic_seed: false,
      pattern_id: 'PATTERN-TEST-OOM',
      pattern_name: 'Unbounded GraphQL Batch Loader Heap Exhaustion',
      resolution: {
        status: 'Resolved',
        root_cause: 'Unbounded DataLoader cache in Order Service v4.9 retained entire cart payloads in V8 heap.',
        resolution_steps: '1. Capped DataLoader batch size to 50.\n2. Set NODE_OPTIONS="--max-old-space-size=4096".\n3. Rolled back v4.9.',
        what_worked: 'Capping DataLoader batch size to 50 and clearing per-request cache.',
        what_did_not_work: 'Simply restarting pods without capping DataLoader.',
        preventive_action: 'Add heap profiling threshold alert in CI.',
        engineer_feedback: 'Pinpointed the exact V8 heap leak.',
        feedback_rating: 'Very Useful',
        resolved_at: new Date().toISOString(),
        resolved_by: 'Test Runner SRE',
        stored_in_hindsight: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const retainRes = await retainIncidentInHindsight(sampleIncident);
    if (!retainRes.success) {
      throw new Error(`Test A Failed: ${retainRes.error}`);
    }
    console.log(`PASS Test A: Stored incident ${sampleIncident.id} in Hindsight bank "${retainRes.bankId}" (memoryId=${retainRes.memoryId})\n`);

    // ------------------------------------------------------------------------
    // TEST B — Retrieval
    // ------------------------------------------------------------------------
    console.log('--- TEST B: Hindsight Memory Retrieval (Recall + Reflect) ---');
    const retrievalRes = await retrieveRelevantIncidentMemories({
      title: 'Order Service OOMKilled JavaScript Heap Out of Memory',
      service: 'Order Service',
      environment: 'Production',
      severity: 'SEV-1',
      error_message: 'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
      symptoms: 'Pods crashing with OOMKilled 137 on bulk cart query',
      logs: '[2026-09-29T08:05:00Z] ERROR [order-service] FATAL ERROR: Reached heap limit Allocation failed',
      recent_deployment: 'Order Service v4.9.1'
    });

    const matchedTestInc = retrievalRes.matches.find((m) => m.incident_id === 'INC-TEST-901');
    if (!matchedTestInc) {
      throw new Error('Test B Failed: Stored incident INC-TEST-901 was not retrieved by Hindsight recall.');
    }
    console.log(
      `PASS Test B: Retrieved INC-TEST-901 with real score=${matchedTestInc.retrieval_scores.final} (semantic=${matchedTestInc.retrieval_scores.semantic}, bm25=${matchedTestInc.retrieval_scores.keyword})\n`
    );

    // ------------------------------------------------------------------------
    // TEST C — Closed Learning Loop
    // ------------------------------------------------------------------------
    console.log('--- TEST C: Closed Learning Loop (Incident #1 -> Resolve -> Incident #2) ---');
    const incident1: IncidentRecord = {
      id: 'INC-LOOP-101',
      title: 'Payment API Webhook Signature Verification Failure',
      service: 'Payment API',
      environment: 'Production',
      severity: 'SEV-1',
      status: 'Resolved',
      error_message: 'StripeSignatureVerificationError: No signatures found matching the expected signature for payload',
      logs: '[2026-09-29T09:00:00Z] ERROR [payment-api] StripeSignatureVerificationError on POST /v1/webhooks/stripe (body parsed as JSON before raw buffer check)',
      symptoms: '100% of incoming payment settlement webhooks failing with HTTP 400',
      timestamp: new Date().toISOString(),
      recent_deployment: 'Payment API v2.9 deployed with global express.json() middleware reordering',
      is_synthetic_seed: false,
      pattern_id: 'PATTERN-WEBHOOK-RAW',
      pattern_name: 'Webhook Raw Body Buffer Middleware Corruption',
      resolution: {
        status: 'Resolved',
        root_cause: 'Global express.json() middleware mutated req.body before HMAC SHA-256 raw buffer verification.',
        resolution_steps: 'Mounted express.raw({ type: "application/json" }) specifically on /v1/webhooks/stripe prior to express.json().',
        what_worked: 'Restoring raw buffer middleware ordering on /v1/webhooks/stripe.',
        what_did_not_work: 'Rotating webhook signing secret in Stripe dashboard.',
        preventive_action: 'Integration test verifying raw buffer HMAC signature on webhook route.',
        engineer_feedback: 'Saved 45 minutes of unnecessary secret rotation.',
        feedback_rating: 'Very Useful',
        resolved_at: new Date().toISOString(),
        resolved_by: 'On-Call SRE',
        stored_in_hindsight: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await retainIncidentInHindsight(incident1);

    const incident2Analysis = await analyzeIncidentWithHindsight({
      id: 'INC-LOOP-102',
      title: 'Payment API Settlement Webhooks Returning 400 Signature Error',
      service: 'Payment API',
      environment: 'Production',
      severity: 'SEV-1',
      error_message: 'StripeSignatureVerificationError: No signatures found matching the expected signature for payload',
      symptoms: 'All incoming settlement webhooks rejected with 400 after middleware update',
      logs: '[2026-09-29T10:10:00Z] ERROR [payment-api] StripeSignatureVerificationError on /v1/webhooks/stripe',
      recent_deployment: 'Payment API v2.9.2 middleware refactor deployed 10 minutes ago',
      useMemory: true
    });

    const foundLoop1 = incident2Analysis.historical_matches.some((m) => m.incident_id === 'INC-LOOP-101');
    if (!foundLoop1) {
      throw new Error('Test C Failed: Incident #1 (INC-LOOP-101) was not retrieved during Incident #2 analysis.');
    }
    const citesLoop1 =
      incident2Analysis.possible_root_causes.some((rc) => rc.supporting_incidents.includes('INC-LOOP-101')) ||
      incident2Analysis.recommended_actions.some((a) => a.supporting_incidents.includes('INC-LOOP-101'));
    if (!citesLoop1) {
      throw new Error('Test C Failed: Incident #1 did not visibly influence Incident #2 diagnosis/recommendations.');
    }
    console.log(
      `PASS Test C: Closed Learning Loop verified! INC-LOOP-101 retrieved and cited in Incident #2 root cause & action plan.\n`
    );

    // ------------------------------------------------------------------------
    // TEST D — Failure Handling (Simulated Hindsight Outage)
    // ------------------------------------------------------------------------
    console.log('--- TEST D: Hindsight Failure Handling & Graceful Fallback ---');
    setSimulatedHindsightOutage(true);
    const fallbackAnalysis = await analyzeIncidentWithHindsight({
      id: 'INC-OUTAGE-999',
      title: 'Payment API Database Timeout',
      service: 'Payment API',
      environment: 'Production',
      severity: 'SEV-1',
      error_message: 'Timeout while acquiring database connection',
      symptoms: 'Requests returning 504 errors',
      logs: 'TimeoutError: Timeout while acquiring database connection',
      recent_deployment: 'Payment API v2.8 deployed 25 minutes ago',
      useMemory: true
    });
    setSimulatedHindsightOutage(false);

    if (fallbackAnalysis.hindsight_status.available !== false) {
      throw new Error('Test D Failed: hindsight_status.available should be false during simulated outage.');
    }
    if (!fallbackAnalysis.hindsight_status.error_message) {
      throw new Error('Test D Failed: Missing clear warning message when Hindsight is unavailable.');
    }
    console.log(
      `PASS Test D: Graceful fallback verified! Warning surfaced: "${fallbackAnalysis.hindsight_status.error_message}"\n`
    );

    console.log('================================================================');
    console.log(' ALL 4 HINDSIGHT VERIFICATION TESTS (A, B, C, D) PASSED!');
    console.log('================================================================');
  } finally {
    server.close();
  }
}

runVerificationSuite().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
