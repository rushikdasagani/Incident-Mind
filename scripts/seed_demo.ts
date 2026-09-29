import 'dotenv/config';
import { dbStore } from '../backend/db/sqlite.ts';
import { getHindsightConfig } from '../backend/hindsight/client.ts';
import { retainIncidentsBatchInHindsight } from '../backend/hindsight/memory_store.ts';
import { SEED_INCIDENTS } from '../data/seed_incidents.ts';

async function runSeed() {
  console.log('=== Incident Memory OS: Seeding Synthetic Historical Incidents ===');
  const { bankId, baseUrl } = getHindsightConfig();
  console.log(`Target Hindsight Bank: ${bankId} (${baseUrl})`);

  dbStore.clearAllIncidents();
  dbStore.clearBankMemories(bankId);

  for (const incident of SEED_INCIDENTS) {
    dbStore.upsertIncident(incident);
  }
  console.log(`Inserted ${SEED_INCIDENTS.length} synthetic incidents into SQLite.`);

  try {
    const batchResult = await retainIncidentsBatchInHindsight(SEED_INCIDENTS);
    console.log(
      `Hindsight Retain Batch Result: success=${batchResult.success}, items=${batchResult.itemsCount}, bank=${batchResult.bankId}`
    );
  } catch (err: any) {
    console.warn('Note: Hindsight server not listening on external port during CLI seed; SQLite bank pre-populated.', err?.message);
  }

  console.log('=== Seed Complete ===');
}

runSeed();
