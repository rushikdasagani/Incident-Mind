import { HindsightClient, HindsightError } from '@vectorize-io/hindsight-client';

const DEFAULT_PORT = process.env.PORT || 3000;
const DEFAULT_BASE_URL = `http://localhost:${DEFAULT_PORT}/hindsight-engine`;

let simulatedOutage = false;

export function getHindsightConfig() {
  const baseUrl = (process.env.HINDSIGHT_BASE_URL || DEFAULT_BASE_URL).trim();
  const apiKey = (process.env.HINDSIGHT_API_KEY || '').trim() || undefined;
  const bankId = (process.env.HINDSIGHT_BANK_ID || 'sre-production-incident-memory').trim();
  return {
    baseUrl,
    apiKey,
    bankId,
    isSimulatedOutage: simulatedOutage
  };
}

export function setSimulatedHindsightOutage(enabled: boolean): void {
  simulatedOutage = enabled;
}

export function isSimulatedHindsightOutage(): boolean {
  return simulatedOutage;
}

/**
 * Creates an official @vectorize-io/hindsight-client HindsightClient instance.
 * When simulatedOutage is enabled (Test D), throws a HindsightError to test
 * graceful degradation when Hindsight is unreachable.
 */
export function getHindsightClient(): HindsightClient {
  if (simulatedOutage) {
    throw new HindsightError(
      'Hindsight connection refused (Simulated Hindsight Outage active for Resilience Test D)',
      503,
      { reason: 'simulated_outage' }
    );
  }

  const { baseUrl, apiKey } = getHindsightConfig();
  return new HindsightClient({
    baseUrl,
    apiKey,
    maxAttempts: 2
  });
}

export async function verifyHindsightConnection(): Promise<{
  connected: boolean;
  version: string;
  baseUrl: string;
  bankId: string;
  outageSimulated: boolean;
  error?: string;
}> {
  const cfg = getHindsightConfig();
  if (simulatedOutage) {
    return {
      connected: false,
      version: 'unavailable',
      baseUrl: cfg.baseUrl,
      bankId: cfg.bankId,
      outageSimulated: true,
      error: 'Historical memory currently unavailable (Hindsight outage simulated).'
    };
  }

  try {
    const client = getHindsightClient();
    const versionInfo = await client.getVersion();
    return {
      connected: true,
      version: versionInfo.api_version || '0.10.2',
      baseUrl: cfg.baseUrl,
      bankId: cfg.bankId,
      outageSimulated: false
    };
  } catch (err: any) {
    return {
      connected: false,
      version: 'unreachable',
      baseUrl: cfg.baseUrl,
      bankId: cfg.bankId,
      outageSimulated: false,
      error: err?.message || 'Hindsight service unreachable'
    };
  }
}

export { HindsightClient, HindsightError };
