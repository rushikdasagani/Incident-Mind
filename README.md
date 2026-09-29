# Incident Memory OS

### An AI Incident Response Agent That Learns From Every Production Incident
Built for **Hack with Hyderabad 3.0** — Powered by **Vectorize Hindsight** (`@vectorize-io/hindsight-client`).

---

## 1. Product Philosophy

> **Every production incident makes the organization smarter.**

Stateless AI incident tools treat every outage like the first time it has ever happened—offering generic textbook guesses ("check network, check CPU, restart pods"). **Incident Memory OS** turns every resolved production incident into persistent organizational memory in **Hindsight**.

When a new outage strikes, the agent:
1. Parses incident signals, logs, and recent deployment context.
2. Queries **Hindsight** (`HindsightClient.recall()` and `HindsightClient.reflect()`) across historical incidents.
3. Identifies recurring systemic patterns across services (`Pattern Detected: 4 incidents in the past 30 days...`).
4. Ranks root causes backed by historical evidence and highlights **What Worked** vs **What Did Not Work** (Negative Memory Guardrails).
5. Synthesizes an executable **Dynamic Runbook** grounded in verified past fixes.
6. Closes the learning loop when resolved via `HindsightClient.retain()`, immediately improving future incident response.

---

## 2. Hindsight Architecture & Real SDK Integration

All memory operations live in `/backend/hindsight/`:
- `backend/hindsight/client.ts`: Initializes the official `@vectorize-io/hindsight-client` (`HindsightClient`), verifies bank health (`incident-memory-os-prod`), and supports live outage simulation (`Test D`).
- `backend/hindsight/memory_store.ts`: Formats structured incident records and calls `client.retain()` and `client.retainBatch()`.
- `backend/hindsight/memory_retrieval.ts`: Executes hybrid semantic + BM25 keyword + entity graph retrieval via `client.recall()` and contextual consolidation via `client.reflect()`.
- `backend/hindsight/engine_router.ts`: OpenAPI v1-compliant Hindsight engine mounted at `/hindsight-engine` so `@vectorize-io/hindsight-client` executes real HTTP REST calls out-of-the-box on port 3000, or connects seamlessly to an external Hindsight daemon/cloud URL via `HINDSIGHT_BASE_URL`.

---

## 3. Running & Verifying the Closed Learning Loop

```bash
# Start full-stack server (Express + Hindsight Engine + Vite UI on port 3000)
npm run dev

# Seed 24 realistic historical production incidents into SQLite & Hindsight
npm run seed

# Run the 4 automated Hindsight Verification Tests (Tests A, B, C, D)
npm run test:hindsight
```

---

## 4. 3-Minute Hackathon Judge Walkthrough Script

1. **Scene 1 — Submit a Production Incident (`New Incident` -> Preset 1)**:
   - Click **"Launch Scene 1: Payment API DB Timeout"** on the Command Center.
   - Submit the incident (`Payment API v2.8 deployed 25 minutes ago`, `Timeout while acquiring database connection`, `504 errors`).
   - Observe Hindsight recalling 4 prior pool exhaustion incidents (`INC-1024`, `INC-1018`, `INC-1009`, `INC-1001`), displaying an **84%+ Memory Confidence Indicator**, surfacing the **Systemic Pattern Detection Banner**, and generating a **Dynamic Runbook**.
2. **Scene 2 — Resolve & Store in Hindsight (`Active Investigation` -> Step 8)**:
   - Scroll to **Step 8 — Closed-Loop Organizational Learning**.
   - Click **"Resolve Incident & Store in Hindsight Memory"** (`HindsightClient.retain()`).
3. **Scene 3 — Prove Closed-Loop Learning (`Trigger Follow-Up Incident`)**:
   - Click **"Scene 3: Trigger Follow-Up Incident to Prove Learning"**.
   - Submit the canary follow-up outage and confirm the incident you just resolved in Scene 2 is retrieved at the top of Hindsight's matches!
4. **Scene 4 — Side-by-Side Before vs After Memory (`Before vs After Memory`)**:
   - Show judges the stark contrast between a stateless LLM's generic guesswork and the Hindsight-grounded SRE agent.
5. **Scene 5 — Service Knowledge Graph (`Service Knowledge Graph`)**:
   - Inspect accumulated per-service failure modes, verified fixes, and negative memories across all 8 production microservices.
