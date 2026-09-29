import fs from 'fs';
import path from 'path';
import type { IncidentRecord, IncidentAnalysis, IncidentResolution } from '../../src/types/incident.ts';
import { SEED_INCIDENTS } from '../../data/seed_incidents.ts';

export interface StoredHindsightMemory {
  id: string;
  bank_id: string;
  document_id: string;
  text: string;
  type: 'world' | 'experience' | 'observation';
  context: string;
  metadata: Record<string, string>;
  entities: string[];
  tags: string[];
  occurred_start: string;
  mentioned_at: string;
  created_at: string;
}

export interface StoredHindsightBank {
  bank_id: string;
  name: string;
  mission: string;
  reflect_mission: string;
  retain_mission: string;
  disposition: {
    skepticism: number;
    literalism: number;
    empathy: number;
  };
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'incident_memory_os.sqlite');
const JSON_FALLBACK_FILE = path.join(DATA_DIR, 'incident_memory_os_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Try Node 22 built-in node:sqlite DatabaseSync first, with automatic fallback
let sqliteDb: any = null;
try {
  // Dynamic import or require of node:sqlite
  const nodeSqlite = await import('node:sqlite').catch(() => null);
  if (nodeSqlite && nodeSqlite.DatabaseSync) {
    sqliteDb = new nodeSqlite.DatabaseSync(DB_FILE);
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        service TEXT NOT NULL,
        environment TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT NOT NULL,
        logs TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        recent_deployment TEXT NOT NULL,
        metrics TEXT,
        affected_component TEXT,
        is_synthetic_seed INTEGER DEFAULT 0,
        pattern_id TEXT,
        pattern_name TEXT,
        analysis_json TEXT,
        resolution_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hindsight_banks (
        bank_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mission TEXT NOT NULL,
        reflect_mission TEXT NOT NULL,
        retain_mission TEXT NOT NULL,
        disposition_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hindsight_memories (
        id TEXT PRIMARY KEY,
        bank_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        context TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        entities_json TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        occurred_start TEXT NOT NULL,
        mentioned_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
} catch {
  sqliteDb = null;
}

interface FallbackState {
  incidents: Record<string, IncidentRecord>;
  banks: Record<string, StoredHindsightBank>;
  memories: Record<string, StoredHindsightMemory>;
}

let memoryFallbackState: FallbackState = {
  incidents: {},
  banks: {},
  memories: {}
};

function loadFallbackState(): void {
  if (fs.existsSync(JSON_FALLBACK_FILE)) {
    try {
      const raw = fs.readFileSync(JSON_FALLBACK_FILE, 'utf-8');
      memoryFallbackState = JSON.parse(raw);
    } catch {
      memoryFallbackState = { incidents: {}, banks: {}, memories: {} };
    }
  }
}

function saveFallbackState(): void {
  try {
    fs.writeFileSync(JSON_FALLBACK_FILE, JSON.stringify(memoryFallbackState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write fallback store:', err);
  }
}

if (!sqliteDb) {
  loadFallbackState();
}

function rowToIncident(row: any): IncidentRecord {
  return {
    id: row.id,
    title: row.title,
    service: row.service,
    environment: row.environment,
    severity: row.severity,
    status: row.status,
    error_message: row.error_message,
    logs: row.logs,
    symptoms: row.symptoms,
    timestamp: row.timestamp,
    recent_deployment: row.recent_deployment,
    metrics: row.metrics || undefined,
    affected_component: row.affected_component || undefined,
    is_synthetic_seed: Boolean(row.is_synthetic_seed),
    pattern_id: row.pattern_id || undefined,
    pattern_name: row.pattern_name || undefined,
    analysis: row.analysis_json ? JSON.parse(row.analysis_json) : null,
    resolution: row.resolution_json ? JSON.parse(row.resolution_json) : null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export const dbStore = {
  isSqliteNative(): boolean {
    return Boolean(sqliteDb);
  },

  getAllIncidents(): IncidentRecord[] {
    if (sqliteDb) {
      const stmt = sqliteDb.prepare('SELECT * FROM incidents ORDER BY timestamp DESC');
      const rows = stmt.all();
      return rows.map(rowToIncident);
    }
    return Object.values(memoryFallbackState.incidents).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  getIncidentById(id: string): IncidentRecord | null {
    if (sqliteDb) {
      const stmt = sqliteDb.prepare('SELECT * FROM incidents WHERE id = ?');
      const row = stmt.get(id);
      return row ? rowToIncident(row) : null;
    }
    return memoryFallbackState.incidents[id] || null;
  },

  upsertIncident(incident: IncidentRecord): IncidentRecord {
    if (sqliteDb) {
      const stmt = sqliteDb.prepare(`
        INSERT INTO incidents (
          id, title, service, environment, severity, status,
          error_message, logs, symptoms, timestamp, recent_deployment,
          metrics, affected_component, is_synthetic_seed, pattern_id, pattern_name,
          analysis_json, resolution_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          service = excluded.service,
          environment = excluded.environment,
          severity = excluded.severity,
          status = excluded.status,
          error_message = excluded.error_message,
          logs = excluded.logs,
          symptoms = excluded.symptoms,
          timestamp = excluded.timestamp,
          recent_deployment = excluded.recent_deployment,
          metrics = excluded.metrics,
          affected_component = excluded.affected_component,
          is_synthetic_seed = excluded.is_synthetic_seed,
          pattern_id = excluded.pattern_id,
          pattern_name = excluded.pattern_name,
          analysis_json = excluded.analysis_json,
          resolution_json = excluded.resolution_json,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        incident.id,
        incident.title,
        incident.service,
        incident.environment,
        incident.severity,
        incident.status,
        incident.error_message,
        incident.logs,
        incident.symptoms,
        incident.timestamp,
        incident.recent_deployment,
        incident.metrics ?? null,
        incident.affected_component ?? null,
        incident.is_synthetic_seed ? 1 : 0,
        incident.pattern_id ?? null,
        incident.pattern_name ?? null,
        incident.analysis ? JSON.stringify(incident.analysis) : null,
        incident.resolution ? JSON.stringify(incident.resolution) : null,
        incident.created_at,
        incident.updated_at
      );
      return incident;
    }
    memoryFallbackState.incidents[incident.id] = incident;
    saveFallbackState();
    return incident;
  },

  updateIncidentAnalysis(id: string, analysis: IncidentAnalysis): IncidentRecord | null {
    const existing = this.getIncidentById(id);
    if (!existing) return null;
    existing.analysis = analysis;
    existing.updated_at = new Date().toISOString();
    return this.upsertIncident(existing);
  },

  updateIncidentResolution(id: string, resolution: IncidentResolution): IncidentRecord | null {
    const existing = this.getIncidentById(id);
    if (!existing) return null;
    existing.status = resolution.status;
    existing.resolution = resolution;
    existing.updated_at = new Date().toISOString();
    return this.upsertIncident(existing);
  },

  // Hindsight Engine Storage Methods
  upsertBank(bank: StoredHindsightBank): StoredHindsightBank {
    if (sqliteDb) {
      const stmt = sqliteDb.prepare(`
        INSERT INTO hindsight_banks (
          bank_id, name, mission, reflect_mission, retain_mission,
          disposition_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(bank_id) DO UPDATE SET
          name = excluded.name,
          mission = excluded.mission,
          reflect_mission = excluded.reflect_mission,
          retain_mission = excluded.retain_mission,
          disposition_json = excluded.disposition_json,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        bank.bank_id,
        bank.name,
        bank.mission,
        bank.reflect_mission,
        bank.retain_mission,
        JSON.stringify(bank.disposition),
        bank.created_at,
        bank.updated_at
      );
      return bank;
    }
    memoryFallbackState.banks[bank.bank_id] = bank;
    saveFallbackState();
    return bank;
  },

  getBank(bankId: string): StoredHindsightBank | null {
    if (sqliteDb) {
      const stmt = sqliteDb.prepare('SELECT * FROM hindsight_banks WHERE bank_id = ?');
      const row = stmt.get(bankId);
      if (!row) return null;
      return {
        bank_id: row.bank_id,
        name: row.name,
        mission: row.mission,
        reflect_mission: row.reflect_mission,
        retain_mission: row.retain_mission,
        disposition: JSON.parse(row.disposition_json),
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    }
    return memoryFallbackState.banks[bankId] || null;
  },

  upsertHindsightMemory(mem: StoredHindsightMemory): StoredHindsightMemory {
    if (sqliteDb) {
      // If document_id already exists in this bank, upsert by id or replace old document_id
      if (mem.document_id) {
        const delStmt = sqliteDb.prepare(
          'DELETE FROM hindsight_memories WHERE bank_id = ? AND document_id = ? AND id = ?'
        );
        delStmt.run(mem.bank_id, mem.document_id, mem.id);
      }
      const stmt = sqliteDb.prepare(`
        INSERT INTO hindsight_memories (
          id, bank_id, document_id, text, type, context,
          metadata_json, entities_json, tags_json, occurred_start, mentioned_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          text = excluded.text,
          type = excluded.type,
          context = excluded.context,
          metadata_json = excluded.metadata_json,
          entities_json = excluded.entities_json,
          tags_json = excluded.tags_json,
          occurred_start = excluded.occurred_start,
          mentioned_at = excluded.mentioned_at
      `);
      stmt.run(
        mem.id,
        mem.bank_id,
        mem.document_id,
        mem.text,
        mem.type,
        mem.context,
        JSON.stringify(mem.metadata),
        JSON.stringify(mem.entities),
        JSON.stringify(mem.tags),
        mem.occurred_start,
        mem.mentioned_at,
        mem.created_at
      );
      return mem;
    }
    memoryFallbackState.memories[mem.id] = mem;
    saveFallbackState();
    return mem;
  },

  getHindsightMemories(bankId: string): StoredHindsightMemory[] {
    if (sqliteDb) {
      const stmt = sqliteDb.prepare(
        'SELECT * FROM hindsight_memories WHERE bank_id = ? ORDER BY mentioned_at DESC'
      );
      const rows = stmt.all(bankId);
      return rows.map((r: any) => ({
        id: r.id,
        bank_id: r.bank_id,
        document_id: r.document_id,
        text: r.text,
        type: r.type,
        context: r.context,
        metadata: JSON.parse(r.metadata_json || '{}'),
        entities: JSON.parse(r.entities_json || '[]'),
        tags: JSON.parse(r.tags_json || '[]'),
        occurred_start: r.occurred_start,
        mentioned_at: r.mentioned_at,
        created_at: r.created_at
      }));
    }
    return Object.values(memoryFallbackState.memories)
      .filter((m) => m.bank_id === bankId)
      .sort((a, b) => new Date(b.mentioned_at).getTime() - new Date(a.mentioned_at).getTime());
  },

  clearBankMemories(bankId: string): void {
    if (sqliteDb) {
      sqliteDb.prepare('DELETE FROM hindsight_memories WHERE bank_id = ?').run(bankId);
      return;
    }
    for (const key of Object.keys(memoryFallbackState.memories)) {
      if (memoryFallbackState.memories[key].bank_id === bankId) {
        delete memoryFallbackState.memories[key];
      }
    }
    saveFallbackState();
  },

  clearAllIncidents(): void {
    if (sqliteDb) {
      sqliteDb.prepare('DELETE FROM incidents').run();
      return;
    }
    memoryFallbackState.incidents = {};
    saveFallbackState();
  },

  ensureSeeded(): { seededCount: number; alreadySeeded: boolean } {
    const existing = this.getAllIncidents();
    if (existing.length > 0) {
      return { seededCount: existing.length, alreadySeeded: true };
    }
    for (const inc of SEED_INCIDENTS) {
      this.upsertIncident(inc);
    }
    return { seededCount: SEED_INCIDENTS.length, alreadySeeded: false };
  }
};
