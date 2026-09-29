import express from 'express';
import { dbStore, type StoredHindsightMemory } from '../db/sqlite.ts';

export const hindsightEngineRouter = express.Router();

// Tokenize and normalize text for BM25 and cosine similarity
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'while', 'during'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// Compute BM25 keyword score and semantic token-overlap/synonym cosine similarity
const DOMAIN_SYNONYM_GROUPS: string[][] = [
  ['timeout', 'timed', '504', 'gateway', 'latency', 'slow', 'hang', 'deadline', 'acquiretimeoutmillis'],
  ['pool', 'connection', 'connections', 'exhausted', 'exhaustion', 'saturation', 'saturated', 'pg_pool_max', 'db_max_pool_size', 'max_connections', 'knex', 'prisma', 'pgbouncer'],
  ['database', 'postgres', 'postgresql', 'db', 'sql', 'rds', 'replica', 'deadlock', 'lock'],
  ['redis', 'ioredis', 'cache', 'eviction', 'maxmemory', 'session', 'setex', 'lru', 'lfu', 'keys'],
  ['oom', 'oomkilled', '137', 'memory', 'leak', 'heap', 'gc', 'allocation', 'maxlistenersexceededwarning'],
  ['deploy', 'deployment', 'deployed', 'release', 'helm', 'configmap', 'secret', 'kustomize', 'argocd', 'canary'],
  ['502', 'keepalive', 'keepalivetimeout', 'reset', 'peer', 'envoy', 'upstream', 'circuit', 'breaker', '503'],
  ['stripe', 'adyen', 'webhook', '429', 'retry', 'acquirer', '3ds', '3dsecure', 'duplicate']
];

function expandWithDomainConcepts(tokens: string[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const tok of tokens) {
    weights.set(tok, (weights.get(tok) || 0) + 1.0);
    for (let g = 0; g < DOMAIN_SYNONYM_GROUPS.length; g++) {
      if (DOMAIN_SYNONYM_GROUPS[g].includes(tok)) {
        const conceptKey = `__concept_${g}`;
        weights.set(conceptKey, (weights.get(conceptKey) || 0) + 0.85);
      }
    }
  }
  return weights;
}

function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [k, v] of vecA.entries()) {
    normA += v * v;
    const bVal = vecB.get(k);
    if (bVal) {
      dot += v * bVal;
    }
  }
  for (const v of vecB.values()) {
    normB += v * v;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function computeBM25(queryTokens: string[], docTokens: string[], avgDocLen: number): number {
  const k1 = 1.5;
  const b = 0.75;
  const docFreq = new Map<string, number>();
  for (const t of docTokens) {
    docFreq.set(t, (docFreq.get(t) || 0) + 1);
  }
  let score = 0;
  const uniqueQuery = Array.from(new Set(queryTokens));
  for (const qt of uniqueQuery) {
    const tf = docFreq.get(qt) || 0;
    if (tf > 0) {
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docTokens.length / Math.max(1, avgDocLen)));
      score += numerator / denominator;
    }
  }
  return Number(score.toFixed(4));
}

// GET /version
hindsightEngineRouter.get('/version', (_req, res) => {
  res.json({
    api_version: '0.10.2',
    features: {
      observations: true,
      mcp: true,
      worker: true,
      bank_config_api: true,
      bank_llm_health: true,
      file_upload_api: true,
      document_export_api: true,
      document_import_api: true,
      audit_log: true,
      llm_trace: true,
      store_document_text: true
    }
  });
});

// GET /health & /health/live & /health/ready
hindsightEngineRouter.get(['/health', '/health/live', '/health/ready'], (_req, res) => {
  res.json({
    status: 'alive',
    version: '0.10.2',
    uptime_seconds: Math.floor(process.uptime())
  });
});

// PUT /v1/default/banks/:bank_id (createOrUpdateBank)
hindsightEngineRouter.put('/v1/default/banks/:bank_id', (req, res) => {
  const bankId = req.params.bank_id;
  const body = req.body || {};
  const now = new Date().toISOString();
  const existing = dbStore.getBank(bankId);

  const bank = dbStore.upsertBank({
    bank_id: bankId,
    name: body.name || existing?.name || bankId,
    mission: body.reflect_mission || body.mission || existing?.mission || 'SRE Organizational Incident Memory Bank',
    reflect_mission: body.reflect_mission || body.mission || existing?.reflect_mission || 'Synthesize root causes, verified fixes, and failed approaches from historical production incidents.',
    retain_mission: body.retain_mission || existing?.retain_mission || 'Extract service names, error signatures, root causes, resolution steps, and deployment correlations.',
    disposition: body.disposition || existing?.disposition || {
      skepticism: body.disposition_skepticism ?? 4,
      literalism: body.disposition_literalism ?? 4,
      empathy: body.disposition_empathy ?? 3
    },
    created_at: existing?.created_at || now,
    updated_at: now
  });

  res.json({
    bank_id: bank.bank_id,
    name: bank.name,
    disposition: bank.disposition,
    mission: bank.mission
  });
});

// GET /v1/default/banks/:bank_id/config
hindsightEngineRouter.get('/v1/default/banks/:bank_id/config', (req, res) => {
  const bankId = req.params.bank_id;
  const bank = dbStore.getBank(bankId);
  res.json({
    bank_id: bankId,
    config: {
      reflect_mission: bank?.reflect_mission || 'Synthesize production incident root causes and runbooks.',
      retain_mission: bank?.retain_mission || 'Extract incident telemetry, root causes, and outcomes.',
      enable_observations: true,
      enable_text_search: true,
      enable_temporal_retrieval: true,
      enable_graph_retrieval: true,
      enable_reranking: true
    },
    overrides: {}
  });
});

// POST /v1/default/banks/:bank_id/memories (retain / retainBatch)
hindsightEngineRouter.post('/v1/default/banks/:bank_id/memories', (req, res) => {
  const bankId = req.params.bank_id;
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  const docTags: string[] = Array.isArray(body.document_tags) ? body.document_tags : [];
  const now = new Date().toISOString();

  let storedCount = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const contentText =
      typeof item.content === 'string'
        ? item.content
        : Array.isArray(item.content)
          ? item.content.map((c: any) => c.text || '').join('\n')
          : String(item.content || '');

    const docId = item.document_id || `doc-${Date.now()}-${i}`;
    const memId = `mem-${docId.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}`;
    const timestamp = item.timestamp || now;
    const itemTags = Array.from(new Set([...(item.tags || []), ...docTags]));
    const entities: string[] = Array.isArray(item.entities)
      ? item.entities.map((e: any) => (typeof e === 'string' ? e : e.text))
      : [];

    const mem: StoredHindsightMemory = {
      id: memId,
      bank_id: bankId,
      document_id: docId,
      text: contentText,
      type: item.metadata?.memory_type === 'observation' ? 'observation' : 'experience',
      context: item.context || 'Production incident resolution record',
      metadata: item.metadata || {},
      entities,
      tags: itemTags,
      occurred_start: timestamp,
      mentioned_at: timestamp,
      created_at: now
    };
    dbStore.upsertHindsightMemory(mem);
    storedCount++;
  }

  res.json({
    success: true,
    bank_id: bankId,
    items_count: storedCount,
    async: Boolean(body.async),
    operation_id: body.async ? `op-${Date.now()}` : null
  });
});

// DELETE /v1/default/banks/:bank_id/memories
hindsightEngineRouter.delete('/v1/default/banks/:bank_id/memories', (req, res) => {
  const bankId = req.params.bank_id;
  dbStore.clearBankMemories(bankId);
  res.json({
    success: true,
    bank_id: bankId,
    deleted_count: 0
  });
});

// GET /v1/default/banks/:bank_id/memories/list (listMemories)
hindsightEngineRouter.get('/v1/default/banks/:bank_id/memories/list', (req, res) => {
  const bankId = req.params.bank_id;
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const q = typeof req.query.q === 'string' ? req.query.q.toLowerCase() : '';

  let memories = dbStore.getHindsightMemories(bankId);
  if (q) {
    memories = memories.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.context.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const paged = memories.slice(offset, offset + limit);
  res.json({
    items: paged.map((m) => ({
      id: m.id,
      text: m.text,
      type: m.type,
      context: m.context,
      document_id: m.document_id,
      entities: m.entities,
      tags: m.tags,
      metadata: m.metadata,
      occurred_start: m.occurred_start,
      mentioned_at: m.mentioned_at,
      created_at: m.created_at
    })),
    total: memories.length,
    limit,
    offset
  });
});

// POST /v1/default/banks/:bank_id/memories/recall (recall)
hindsightEngineRouter.post('/v1/default/banks/:bank_id/memories/recall', (req, res) => {
  const bankId = req.params.bank_id;
  const body = req.body || {};
  const query: string = body.query || '';
  const filterTags: string[] = Array.isArray(body.tags) ? body.tags : [];
  const tagsMatch: string = body.tags_match || 'any';

  let memories = dbStore.getHindsightMemories(bankId);
  if (memories.length === 0) {
    res.json({
      results: [],
      trace: { strategy: 'multi-arm-hybrid', total_candidates: 0 },
      entities: {}
    });
    return;
  }

  // Optional strict tag filtering
  if (filterTags.length > 0 && (tagsMatch === 'any_strict' || tagsMatch === 'all_strict')) {
    memories = memories.filter((m) => {
      if (tagsMatch === 'all_strict') {
        return filterTags.every((ft) => m.tags.includes(ft));
      }
      return filterTags.some((ft) => m.tags.includes(ft));
    });
  }

  const queryTokens = tokenize(query);
  const queryVec = expandWithDomainConcepts(queryTokens);

  const docTokenLists = memories.map((m) =>
    tokenize(`${m.text} ${m.context} ${m.entities.join(' ')} ${m.tags.join(' ')}`)
  );
  const avgDocLen =
    docTokenLists.reduce((acc, list) => acc + list.length, 0) / Math.max(1, docTokenLists.length);

  const scoredResults = memories.map((m, idx) => {
    const docTokens = docTokenLists[idx];
    const docVec = expandWithDomainConcepts(docTokens);

    const semanticScore = Number(cosineSimilarity(queryVec, docVec).toFixed(4));
    const keywordScore = computeBM25(queryTokens, docTokens, avgDocLen);

    // Entity & service match boost
    let entityBoost = 0;
    const queryLower = query.toLowerCase();
    if (m.metadata?.service && queryLower.includes(m.metadata.service.toLowerCase())) {
      entityBoost += 0.25;
    }
    if (m.metadata?.environment && queryLower.includes(m.metadata.environment.toLowerCase())) {
      entityBoost += 0.06;
    }
    if (m.metadata?.feedback_rating === 'Very Useful') {
      entityBoost += 0.05;
    }

    // Normalize keyword score to 0..1 range for fusion
    const normKeyword = Math.min(1, keywordScore / 10);
    const rerankerScore = Number(
      Math.min(0.99, semanticScore * 0.55 + normKeyword * 0.3 + entityBoost).toFixed(4)
    );
    const finalScore = Number(
      Math.min(0.99, rerankerScore * 0.85 + semanticScore * 0.15).toFixed(4)
    );

    return {
      memory: m,
      scores: {
        final: finalScore,
        reranker: rerankerScore,
        semantic: semanticScore,
        keyword: keywordScore
      }
    };
  });

  // Sort by final score descending and filter out low-relevance noise
  const filtered = scoredResults
    .filter((item) => item.scores.final >= 0.14 || item.scores.keyword >= 1.2)
    .sort((a, b) => b.scores.final - a.scores.final)
    .slice(0, body.budget === 'high' ? 8 : 5);

  res.json({
    results: filtered.map(({ memory, scores }) => ({
      id: memory.id,
      text: memory.text,
      type: memory.type,
      entities: memory.entities,
      context: memory.context,
      occurred_start: memory.occurred_start,
      occurred_end: memory.occurred_start,
      mentioned_at: memory.mentioned_at,
      document_id: memory.document_id,
      metadata: memory.metadata,
      tags: memory.tags,
      scores
    })),
    trace: {
      arms_executed: ['semantic', 'bm25_keyword', 'entity_graph', 'temporal'],
      candidates_evaluated: memories.length,
      matches_returned: filtered.length
    },
    entities: {}
  });
});

// POST /v1/default/banks/:bank_id/reflect (reflect)
hindsightEngineRouter.post('/v1/default/banks/:bank_id/reflect', (req, res) => {
  const bankId = req.params.bank_id;
  const body = req.body || {};
  const query: string = body.query || '';

  const memories = dbStore.getHindsightMemories(bankId);
  const queryTokens = tokenize(query);
  const queryVec = expandWithDomainConcepts(queryTokens);

  const ranked = memories
    .map((m) => {
      const docTokens = tokenize(`${m.text} ${m.context} ${m.entities.join(' ')}`);
      const sim = cosineSimilarity(queryVec, expandWithDomainConcepts(docTokens));
      return { m, sim };
    })
    .filter((x) => x.sim > 0.15)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5);

  if (ranked.length === 0) {
    res.json({
      text: 'No strong historical incident observations matched in this Hindsight memory bank.',
      based_on: { memories: [], mental_models: [], directives: [] }
    });
    return;
  }

  const top = ranked[0].m;
  const patternMatches = ranked.filter(
    (r) => r.m.metadata?.pattern_id && r.m.metadata?.pattern_id === top.metadata?.pattern_id
  );

  const synthesisLines = [
    `Hindsight Reflection across ${ranked.length} recalled incident memories in bank "${bankId}":`,
    `- Strongest historical match: ${top.metadata?.incident_id || top.document_id} (${top.metadata?.service || 'Service'}) — Root Cause: ${top.metadata?.root_cause || 'See memory text'}.`,
    `- Verified Resolution that worked: ${top.metadata?.what_worked || top.metadata?.resolution || 'Applied targeted fix'}.`,
    `- Approaches that failed in history: ${top.metadata?.what_did_not_work || 'Generic restarts did not resolve root cause'}.`
  ];

  if (patternMatches.length >= 2) {
    synthesisLines.push(
      `- Systemic Pattern Observed: "${top.metadata?.pattern_name || 'Recurring Failure'}" occurred across ${patternMatches.map((p) => p.m.metadata?.incident_id).join(', ')}. Preventive recommendation: ${top.metadata?.preventive_action || 'Add automated deployment guardrails'}.`
    );
  }

  res.json({
    text: synthesisLines.join('\n'),
    based_on: {
      memories: ranked.map(({ m }) => ({
        id: m.id,
        text: m.text,
        type: m.type,
        context: m.context,
        occurred_start: m.occurred_start,
        mentioned_at: m.mentioned_at,
        document_id: m.document_id,
        tags: m.tags,
        metadata: m.metadata
      })),
      mental_models: [],
      directives: []
    }
  });
});
