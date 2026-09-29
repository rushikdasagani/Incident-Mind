import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './backend/db/sqlite.ts';
import { hindsightEngineRouter } from './backend/hindsight/engine_router.ts';
import {
  verifyHindsightConnection,
  setSimulatedHindsightOutage,
  getHindsightConfig
} from './backend/hindsight/client.ts';
import {
  retainIncidentInHindsight,
  retainIncidentsBatchInHindsight
} from './backend/hindsight/memory_store.ts';
import { retrieveRelevantIncidentMemories } from './backend/hindsight/memory_retrieval.ts';
import {
  analyzeIncidentWithHindsight,
  generateBeforeAfterMemoryDemo
} from './backend/agents/incident_agent.ts';
import {
  getMemoryInsightsStats,
  getMemoryTimeline,
  getServiceKnowledgeProfiles
} from './backend/services/memory_insights.ts';
import { SEED_INCIDENTS, DEMO_INCIDENT_PRESETS } from './data/seed_incidents.ts';
import type { IncidentRecord, IncidentResolution } from './src/types/incident.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  // Mount the OpenAPI-compliant Hindsight v1 engine so @vectorize-io/hindsight-client
  // works out-of-the-box on port 3000 or can point to an external Hindsight server.
  app.use('/hindsight-engine', hindsightEngineRouter);

  // --------------------------------------------------------------------------
  // API: Hindsight Connection Status & Outage Simulation (Test D)
  // --------------------------------------------------------------------------
  app.get('/api/hindsight/status', async (_req, res) => {
    const status = await verifyHindsightConnection();
    res.json(status);
  });

  app.post('/api/hindsight/simulate-outage', async (req, res) => {
    const enabled = Boolean(req.body?.enabled);
    setSimulatedHindsightOutage(enabled);
    const status = await verifyHindsightConnection();
    res.json(status);
  });

  // --------------------------------------------------------------------------
  // API: Incidents CRUD
  // --------------------------------------------------------------------------
  app.get('/api/incidents', (_req, res) => {
    const incidents = dbStore.getAllIncidents();
    res.json({
      incidents,
      presets: DEMO_INCIDENT_PRESETS
    });
  });

  app.get('/api/incidents/:id', (req, res) => {
    const incident = dbStore.getIncidentById(req.params.id);
    if (!incident) {
      res.status(404).json({ error: `Incident ${req.params.id} not found` });
      return;
    }
    res.json(incident);
  });

  app.post('/api/incidents', async (req, res) => {
    try {
      const body = req.body || {};
      const title = (body.title || '').trim();
      const service = (body.service || '').trim();
      const error_message = (body.error_message || '').trim();
      const symptoms = (body.symptoms || '').trim();

      if (!title || !service || (!error_message && !symptoms)) {
        res.status(400).json({
          error: 'Incident title, service, and at least an error message or symptom description are required.'
        });
        return;
      }

      const all = dbStore.getAllIncidents();
      const maxNum = all.reduce((max, inc) => {
        const m = inc.id.match(/INC-(\d+)/);
        return m ? Math.max(max, Number(m[1])) : max;
      }, 1025);

      const newId = body.id || `INC-${maxNum + 1}`;
      const now = new Date().toISOString();

      const newIncident: IncidentRecord = {
        id: newId,
        title,
        service,
        environment: body.environment || 'Production',
        severity: body.severity || 'SEV-1',
        status: 'Investigating',
        error_message: error_message || 'Unspecified error',
        logs: body.logs || `[${now}] ERROR [${service.toLowerCase()}] ${error_message}`,
        symptoms: symptoms || error_message,
        timestamp: body.timestamp || now,
        recent_deployment: body.recent_deployment || 'None reported',
        metrics: body.metrics || undefined,
        affected_component: body.affected_component || undefined,
        is_synthetic_seed: false,
        analysis: null,
        resolution: null,
        created_at: now,
        updated_at: now
      };

      // Run AI + Hindsight analysis automatically unless skipAnalysis=true
      if (body.skipAnalysis !== true) {
        const analysis = await analyzeIncidentWithHindsight({
          id: newIncident.id,
          title: newIncident.title,
          service: newIncident.service,
          environment: newIncident.environment,
          severity: newIncident.severity,
          error_message: newIncident.error_message,
          logs: newIncident.logs,
          symptoms: newIncident.symptoms,
          recent_deployment: newIncident.recent_deployment,
          metrics: newIncident.metrics,
          affected_component: newIncident.affected_component,
          useMemory: body.useMemory !== false
        });
        newIncident.analysis = analysis;
        if (analysis.systemic_pattern?.pattern_id) {
          newIncident.pattern_id = analysis.systemic_pattern.pattern_id;
          newIncident.pattern_name = analysis.systemic_pattern.pattern_name;
        }
      }

      dbStore.upsertIncident(newIncident);
      res.status(201).json(newIncident);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create incident' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Analyze Incident (On-Demand or Re-Analysis)
  // --------------------------------------------------------------------------
  app.post('/api/analyze', async (req, res) => {
    try {
      const body = req.body || {};
      const incidentId = body.incident_id;
      let target: IncidentRecord | null = incidentId ? dbStore.getIncidentById(incidentId) : null;

      const input = {
        id: target?.id || body.id,
        title: (body.title || target?.title || '').trim(),
        service: (body.service || target?.service || '').trim(),
        environment: body.environment || target?.environment || 'Production',
        severity: body.severity || target?.severity || 'SEV-1',
        error_message: (body.error_message || target?.error_message || '').trim(),
        logs: body.logs || target?.logs || '',
        symptoms: (body.symptoms || target?.symptoms || '').trim(),
        recent_deployment: body.recent_deployment ?? target?.recent_deployment ?? '',
        metrics: body.metrics ?? target?.metrics,
        affected_component: body.affected_component ?? target?.affected_component,
        useMemory: body.useMemory !== false
      };

      if (!input.title || !input.service) {
        res.status(400).json({ error: 'Incident title and service are required for analysis.' });
        return;
      }

      const analysis = await analyzeIncidentWithHindsight(input);
      if (target) {
        target = dbStore.updateIncidentAnalysis(target.id, analysis);
      }

      res.json({
        analysis,
        incident: target
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Incident analysis failed' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Resolve Incident & Retain in Hindsight Memory Loop
  // --------------------------------------------------------------------------
  app.post('/api/resolve', async (req, res) => {
    try {
      const body = req.body || {};
      const incidentId = body.incident_id;
      if (!incidentId) {
        res.status(400).json({ error: 'incident_id is required' });
        return;
      }

      const existing = dbStore.getIncidentById(incidentId);
      if (!existing) {
        res.status(404).json({ error: `Incident ${incidentId} not found` });
        return;
      }

      if (!body.root_cause || !body.resolution_steps) {
        res.status(400).json({ error: 'Root cause and resolution steps are required.' });
        return;
      }

      const now = new Date().toISOString();
      const resolution: IncidentResolution = {
        status: body.status || 'Resolved',
        root_cause: body.root_cause.trim(),
        resolution_steps: body.resolution_steps.trim(),
        what_worked: (body.what_worked || body.resolution_steps).trim(),
        what_did_not_work: (body.what_did_not_work || 'Restarting pods without fixing configuration').trim(),
        preventive_action: (body.preventive_action || 'Add automated deployment config check').trim(),
        engineer_feedback: (body.engineer_feedback || 'Historical incident recommendation was accurate.').trim(),
        feedback_rating: body.feedback_rating || 'Very Useful',
        resolved_at: now,
        resolved_by: body.resolved_by || 'On-Call SRE Engineer',
        stored_in_hindsight: false
      };

      // Update incident in SQLite first
      existing.status = resolution.status;
      existing.resolution = resolution;
      if (body.pattern_id) existing.pattern_id = body.pattern_id;
      if (body.pattern_name) existing.pattern_name = body.pattern_name;
      else if (!existing.pattern_name && existing.analysis?.failure_category) {
        existing.pattern_name = existing.analysis.failure_category;
      }

      // Store in Hindsight using official HindsightClient.retain()
      const retainResult = await retainIncidentInHindsight(existing);
      resolution.stored_in_hindsight = retainResult.success;
      resolution.hindsight_memory_id = retainResult.memoryId || undefined;
      resolution.hindsight_operation_details = retainResult.success
        ? `Retained in Hindsight bank "${retainResult.bankId}" as memory ${retainResult.memoryId}`
        : `Hindsight storage warning: ${retainResult.error}`;

      const updated = dbStore.updateIncidentResolution(existing.id, resolution);

      res.json({
        incident: updated,
        hindsight_retain: retainResult
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to resolve incident' });
    }
  });

  // --------------------------------------------------------------------------
  // API: Hindsight Memory Search, Timeline, Insights, and Service Profiles
  // --------------------------------------------------------------------------
  app.post('/api/memory/search', async (req, res) => {
    const body = req.body || {};
    const result = await retrieveRelevantIncidentMemories({
      title: body.query || body.title || '',
      service: body.service || '',
      environment: body.environment || 'Production',
      severity: body.severity || 'SEV-1',
      error_message: body.error_message || body.query || '',
      symptoms: body.symptoms || '',
      logs: body.logs || '',
      recent_deployment: body.recent_deployment || ''
    });
    res.json(result);
  });

  app.get('/api/memory/timeline', (_req, res) => {
    res.json({ timeline: getMemoryTimeline() });
  });

  app.get('/api/memory/insights', async (_req, res) => {
    const stats = await getMemoryInsightsStats();
    res.json(stats);
  });

  app.get('/api/memory/services', (_req, res) => {
    res.json({ services: getServiceKnowledgeProfiles() });
  });

  // --------------------------------------------------------------------------
  // API: Before vs After Memory Comparison & Demo Seeding
  // --------------------------------------------------------------------------
  app.post('/api/demo/before-after', async (req, res) => {
    try {
      const body = req.body || DEMO_INCIDENT_PRESETS[0];
      const comparison = await generateBeforeAfterMemoryDemo({
        title: body.title || DEMO_INCIDENT_PRESETS[0].title,
        service: body.service || DEMO_INCIDENT_PRESETS[0].service,
        environment: body.environment || DEMO_INCIDENT_PRESETS[0].environment,
        severity: body.severity || DEMO_INCIDENT_PRESETS[0].severity,
        error_message: body.error_message || DEMO_INCIDENT_PRESETS[0].error_message,
        symptoms: body.symptoms || DEMO_INCIDENT_PRESETS[0].symptoms,
        logs: body.logs || DEMO_INCIDENT_PRESETS[0].logs,
        recent_deployment: body.recent_deployment || DEMO_INCIDENT_PRESETS[0].recent_deployment,
        metrics: body.metrics || DEMO_INCIDENT_PRESETS[0].metrics
      });
      res.json(comparison);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to run Before/After demo' });
    }
  });

  app.post('/api/demo/seed', async (req, res) => {
    try {
      const resetAll = Boolean(req.body?.reset);
      const { bankId } = getHindsightConfig();
      if (resetAll) {
        dbStore.clearAllIncidents();
        dbStore.clearBankMemories(bankId);
      }
      for (const inc of SEED_INCIDENTS) {
        dbStore.upsertIncident(inc);
      }
      const batchRes = await retainIncidentsBatchInHindsight(SEED_INCIDENTS);
      res.json({
        success: true,
        seeded_incidents: SEED_INCIDENTS.length,
        hindsight_retained: batchRes.itemsCount,
        bank_id: batchRes.bankId
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to seed demo data' });
    }
  });

  // Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Incident Memory OS running on http://localhost:${PORT}`);
    // Ensure seed incidents are loaded into SQLite and Hindsight Memory Bank on boot
    try {
      dbStore.ensureSeeded();
      const allIncidents = dbStore.getAllIncidents();
      const res = await retainIncidentsBatchInHindsight(allIncidents);
      console.log(
        `[Hindsight Memory Loop] Bank "${res.bankId}" initialized with ${res.itemsCount} resolved incident memories.`
      );
    } catch (err) {
      console.error('[Hindsight Boot Seed Warning]:', err);
    }
  });
}

startServer();
