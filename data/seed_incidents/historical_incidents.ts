import { IncidentRecord } from '../../backend/models/types.ts';

const daysAgoIso = (days: number, hoursOffset = 0): string => {
  const d = new Date(Date.now() - (days * 86400000) - (hoursOffset * 3600000));
  return d.toISOString();
};

export const SEED_HISTORICAL_INCIDENTS: IncidentRecord[] = [
  // PATTERN A: Database connection pool exhaustion (4 incidents across Payment API, Order Service, User API)
  {
    id: 'INC-1012',
    title: 'Payment API Database Connection Timeout After Checkout Spike',
    service: 'Payment API',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'TimeoutError: Knex: Timeout acquiring a connection. The pool is probably full (max=50, active=50, waiting=142)',
    logs: `[ERROR] [payment-api-pod-7f8b9] KnexTimeoutError: Timeout while acquiring database connection from pg-pool
[WARN] [pg-bouncer] max_client_conn pool saturation on db-primary-01 (active=50/50)
[ERROR] [envoy-ingress] upstream request timeout 504 Gateway Timeout POST /v2/payments/authorize (duration=30001ms)`,
    symptoms: 'Checkout requests returning 504 Gateway Timeout; database connection acquisition latency > 30s',
    timestamp: daysAgoIso(28, 4),
    created_at: daysAgoIso(28, 4),
    updated_at: daysAgoIso(28, 3),
    recent_deployment: 'Payment API v2.4.0 deployed 35 minutes prior (added synchronous fraud-audit DB query per request)',
    metrics: 'db_pool_utilization=100%, http_504_rate=34.2%, p99_latency=30.1s, db_cpu=28%',
    affected_component: 'pg-connection-pool / payment-authorizer',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-A',
    pattern_name: 'Database Connection Pool Exhaustion After Deployment',
    resolution: {
      status: 'Resolved',
      root_cause: 'Database connection pool exhaustion (max_pool_size=50) triggered by unclosed transaction handles in the new synchronous fraud-audit middleware during deployment rollout.',
      resolution_steps: [
        'Inspected pg_stat_activity and confirmed 50 idle-in-transaction connections held by Payment API pods',
        'Increased DB_POOL_MAX from 50 to 100 and set acquireConnectionTimeout=5000ms with idleTimeoutMillis=10000ms',
        'Patched fraud-audit middleware to release connection handles inside a finally block and restarted Payment API pods'
      ],
      what_worked: 'Increasing DB_POOL_MAX from 50 to 100, adding strict connection release in finally block, and setting idle_in_transaction_session_timeout=15s.',
      what_did_not_work: 'Restarting Payment API pods alone without increasing pool size (connections re-saturated within 90 seconds).',
      preventive_action: 'Add CI/CD deployment check validating DB_POOL_MAX >= 100 and alert when db_pool_utilization > 80% for 2 minutes.',
      engineer_feedback: 'Root cause was pool exhaustion on the client side while Postgres CPU remained low at 28%.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(28, 3),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1012'
    }
  },
  {
    id: 'INC-1024',
    title: 'Payment API 504 Errors & Postgres Pool Saturation Post v2.6 Rollout',
    service: 'Payment API',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'Timeout while acquiring database connection: PoolExhaustedException (active=50, max=50, waitQueue=89)',
    logs: `[ERROR] [payment-api-v2.6] Timeout while acquiring database connection after 15000ms
[WARN] [hikari-pool-1] PoolStats (total=50, active=50, idle=0, waiting=89)
[ERROR] [api-gateway] 504 Gateway Timeout on /v2/payments/capture`,
    symptoms: 'Requests returning 504 errors; Payment API connection pool locked at 50/50 active connections while DB CPU is 24%',
    timestamp: daysAgoIso(21, 2),
    created_at: daysAgoIso(21, 2),
    updated_at: daysAgoIso(21, 1),
    recent_deployment: 'Payment API v2.6 deployed 20 minutes ago (Helm values overwrote DB_POOL_MAX back to default 50)',
    metrics: 'db_pool_active=50/50, http_504_rate=41.8%, db_cpu_utilization=24%',
    affected_component: 'payment-db-pool / helm-config',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-A',
    pattern_name: 'Database Connection Pool Exhaustion After Deployment',
    resolution: {
      status: 'Resolved',
      root_cause: 'Database connection pool exhaustion caused by Helm chart default config regression resetting DB_POOL_MAX from 100 to 50 during Payment API v2.6 deployment.',
      resolution_steps: [
        'Compared Payment API v2.6 ConfigMap against v2.4 and detected DB_POOL_MAX regression to 50',
        'Increased pool size from 50 to 100 and enabled statement_timeout=8000ms',
        'Added connection timeout handling and performed rolling restart of Payment API deployment'
      ],
      what_worked: 'Increasing pool size from 50 to 100, restoring connection timeout handling, and rolling restart of affected service.',
      what_did_not_work: 'Scaling RDS instance CPU (database CPU was only 24%; bottleneck was strictly application connection pool limit).',
      preventive_action: 'Lock DB_POOL_MAX=100 in production Helm values schema and add pre-deploy config diff gate.',
      engineer_feedback: 'Historical incident INC-1012 immediately pointed us to DB_POOL_MAX config regression instead of wasting time scaling Postgres.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(21, 1),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1024'
    }
  },
  {
    id: 'INC-1039',
    title: 'Order Service Database Pool Exhaustion During Flash Sale',
    service: 'Order Service',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'PrismaClientKnownRequestError: Timed out fetching a new connection from the connection pool (connection_limit=40)',
    logs: `[ERROR] [order-service] Timed out fetching a new connection from the connection pool (wait=10000ms, limit=40)
[WARN] [order-worker] Nested transaction holding connection while awaiting inventory webhook`,
    symptoms: 'Order creation latency spiked to 12s; 504 timeouts on /v1/orders/checkout',
    timestamp: daysAgoIso(14, 5),
    created_at: daysAgoIso(14, 5),
    updated_at: daysAgoIso(14, 4),
    recent_deployment: 'Order Service v1.19 deployed 40 minutes ago with synchronous webhook notification inside DB transaction',
    metrics: 'prisma_pool_utilization=100%, active_connections=40/40, webhook_latency_p95=1800ms',
    affected_component: 'order-db-pool / checkout-transaction',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-A',
    pattern_name: 'Database Connection Pool Exhaustion After Deployment',
    resolution: {
      status: 'Resolved',
      root_cause: 'Database connection pool exhaustion because external HTTP webhook call was placed inside an open Prisma interactive transaction.',
      resolution_steps: [
        'Identified long-lived transactions in pg_stat_activity waiting on external HTTP calls',
        'Moved webhook dispatch outside the database transaction boundary',
        'Raised connection_limit from 40 to 90 via PgBouncer transaction pooling'
      ],
      what_worked: 'Decoupling external HTTP calls from DB transaction scope and increasing connection pool limit to 90.',
      what_did_not_work: 'Increasing HTTP gateway timeout from 10s to 30s (worsened queue backlog).',
      preventive_action: 'Enforce lint rule banning external network calls inside database transaction blocks.',
      engineer_feedback: 'Matched the exact connection pool exhaustion pattern seen in Payment API.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(14, 4),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1039'
    }
  },
  {
    id: 'INC-1051',
    title: 'Payment API Connection Pool Starvation on EU-West-Prod',
    service: 'Payment API',
    environment: 'EU-West-Prod',
    severity: 'SEV-1',
    error_message: 'Timeout acquiring connection from pool: all 50 connections leased (Payment API v2.7)',
    logs: `[ERROR] [payment-api-eu] Timeout while acquiring database connection (leased=50/50, pending=114)
[ERROR] [ingress-eu] 504 Gateway Timeout on POST /v2/payments/charge`,
    symptoms: 'Requests returning 504 errors across EU-West region following regional Payment API rollout',
    timestamp: daysAgoIso(7, 6),
    created_at: daysAgoIso(7, 6),
    updated_at: daysAgoIso(7, 5),
    recent_deployment: 'Payment API v2.7 regional rollout 18 minutes ago (regional env file missing DB_POOL_MAX override)',
    metrics: 'db_pool_utilization=100%, http_504_rate=29.5%, pg_stat_idle_in_tx=38',
    affected_component: 'payment-api-eu-pool',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-A',
    pattern_name: 'Database Connection Pool Exhaustion After Deployment',
    resolution: {
      status: 'Resolved',
      root_cause: 'Database connection pool exhaustion in EU-West-Prod because regional Helm overlay lacked DB_POOL_MAX=100 and connection reaper settings.',
      resolution_steps: [
        'Checked payment_api_db_pool_active metric and confirmed 50/50 ceiling reached 12 minutes after v2.7 deploy',
        'Applied DB_POOL_MAX=100 and ACQUIRE_TIMEOUT_MS=5000 to EU-West-Prod ConfigMap',
        'Terminated leaked idle-in-transaction backends via pg_terminate_backend and restarted Payment API pods'
      ],
      what_worked: 'Updating EU-West ConfigMap to DB_POOL_MAX=100 and terminating leaked idle transactions.',
      what_did_not_work: 'Failing over RDS multi-AZ replica (new primary immediately hit the same 50-connection client cap).',
      preventive_action: 'Unify DB connection pool settings in base Helm template across all regions.',
      engineer_feedback: 'Third time this pattern occurred after deployment; resolved in under 8 minutes using INC-1024 runbook.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(7, 5),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1051'
    }
  },

  // PATTERN B: Redis connection timeout & eviction storm (4 incidents)
  {
    id: 'INC-1015',
    title: 'Authentication Service Redis Session Lookup Timeouts',
    service: 'Authentication Service',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'RedisCommandTimeoutException: Command timed out after 2000ms (GET session:token:*)',
    logs: `[ERROR] [auth-service] ioredis: Command GET timed out after 2000ms on redis-cluster-01:6379
[WARN] [redis-cluster-01] used_memory=15.9GB/16.0GB, maxmemory_policy=noeviction, blocked_clients=42`,
    symptoms: 'User logins and JWT validations failing with 503 Service Unavailable; p99 auth latency > 2000ms',
    timestamp: daysAgoIso(25, 2),
    created_at: daysAgoIso(25, 2),
    updated_at: daysAgoIso(25, 1),
    recent_deployment: 'Auth Service v3.1.0 deployed 2 hours ago (increased session payload size with audit metadata)',
    metrics: 'redis_memory_utilization=99.4%, redis_evicted_keys=0, auth_503_rate=22.4%',
    affected_component: 'redis-session-cluster',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-B',
    pattern_name: 'Redis Cache Saturation & Command Timeout',
    resolution: {
      status: 'Resolved',
      root_cause: 'Redis memory reached 99.4% with maxmemory-policy set to noeviction, causing write blocks and slow command stalls when Auth Service v3.1 stored larger session blobs without TTL.',
      resolution_steps: [
        'Inspected Redis INFO memory and slowlog; found OOM blocks and missing TTL on audit session keys',
        'Changed Redis maxmemory-policy from noeviction to allkeys-lru via CONFIG SET',
        'Patched Auth Service to enforce 3600s EXPIRE on all session keys and purged stale keys'
      ],
      what_worked: 'Switching Redis maxmemory-policy to allkeys-lru and enforcing strict TTL on session keys.',
      what_did_not_work: 'Increasing ioredis commandTimeout from 2000ms to 5000ms (caused thread pool starvation on Auth Service).',
      preventive_action: 'Alert when redis_memory_utilization > 80% and require TTL in Redis wrapper helper.',
      engineer_feedback: 'Redis slowlog + INFO memory immediately revealed noeviction lockup.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(25, 1),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1015'
    }
  },
  {
    id: 'INC-1028',
    title: 'Redis Cache Latency Spike Due to Unbounded KEYS * Scan in User API',
    service: 'Redis Cache',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'ReplyError: BUSY Redis is busy running a script or O(N) command; connection timeout 2000ms',
    logs: `[ERROR] [redis-primary] Slowlog entry #8841: KEYS user:profile:* (duration=1420ms, keyspace=4.8M keys)
[ERROR] [user-api] Redis connection timeout waiting for pipeline response`,
    symptoms: 'Periodic 1.5s freezes across User API and Authentication Service every 60 seconds',
    timestamp: daysAgoIso(19, 3),
    created_at: daysAgoIso(19, 3),
    updated_at: daysAgoIso(19, 2),
    recent_deployment: 'User API v1.14 deployed 45 minutes ago (added cache invalidation cron job)',
    metrics: 'redis_cpu=98%, redis_slowlog_len=128, p99_cache_latency=1450ms',
    affected_component: 'redis-primary / cache-invalidator',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-B',
    pattern_name: 'Redis Cache Saturation & Command Timeout',
    resolution: {
      status: 'Resolved',
      root_cause: 'Blocking O(N) KEYS * command executed every minute by the new User API cache invalidation job against a 4.8M key keyspace, blocking the single-threaded Redis event loop.',
      resolution_steps: [
        'Ran redis-cli SLOWLOG GET 10 and identified KEYS user:profile:* taking 1.42s per call',
        'Disabled the cache invalidation cron job via feature flag',
        'Replaced KEYS * with non-blocking cursor-based SCAN (COUNT 200) and UNLINK'
      ],
      what_worked: 'Replacing blocking KEYS + DEL with cursor-based SCAN + async UNLINK and disabling the offending cron via feature flag.',
      what_did_not_work: 'Restarting User API pods (cron job immediately resumed on new leader pod).',
      preventive_action: 'Rename/disable KEYS and FLUSHALL commands in production redis.conf.',
      engineer_feedback: 'Redis SLOWLOG was the smoking gun.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(19, 2),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1028'
    }
  },
  {
    id: 'INC-1042',
    title: 'Payment API Idempotency Key Redis Timeout',
    service: 'Payment API',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'RedisTimeoutError: Timed out checking idempotency key idemp:pay:* after 1500ms',
    logs: `[ERROR] [payment-api] RedisTimeoutError on SETNX idemp:pay:994812
[WARN] [redis-cache] maxclients connection limit (10000/10000) reached due to leaked pub/sub clients`,
    symptoms: 'Duplicate payment retries failing; elevated 502 errors on Payment API idempotency middleware',
    timestamp: daysAgoIso(12, 4),
    created_at: daysAgoIso(12, 4),
    updated_at: daysAgoIso(12, 3),
    recent_deployment: 'Payment API v2.6.4 deployed 50 minutes ago (added per-request Redis pub/sub listener)',
    metrics: 'redis_connected_clients=10000, payment_idempotency_errors=18.2%',
    affected_component: 'payment-idempotency-redis',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-B',
    pattern_name: 'Redis Cache Saturation & Command Timeout',
    resolution: {
      status: 'Resolved',
      root_cause: 'Payment API v2.6.4 instantiated a new Redis pub/sub client per HTTP request instead of sharing a singleton connection, exhausting Redis maxclients (10,000).',
      resolution_steps: [
        'Ran CLIENT LIST on Redis and saw 9,840 idle pub/sub connections from Payment API pods',
        'Rolled back Payment API v2.6.4 to v2.6.3 and killed idle connections > 300s via CLIENT KILL IDLE 300',
        'Refactored pub/sub listener to use a shared singleton multiplexer'
      ],
      what_worked: 'Rolling back v2.6.4, running CLIENT KILL IDLE 300, and moving to a singleton Redis connection.',
      what_did_not_work: 'Increasing Redis timeout in Payment API (connections were rejected at TCP accept level).',
      preventive_action: 'Enforce singleton Redis client instantiation and set Redis timeout=300 for idle clients.',
      engineer_feedback: 'Fast mitigation once we checked connected_clients metric.',
      feedback_rating: 'Useful',
      resolved_at: daysAgoIso(12, 3),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1042'
    }
  },
  {
    id: 'INC-1055',
    title: 'Authentication Service Token Blacklist Redis Eviction Storm',
    service: 'Authentication Service',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'Redis Command Timeout: latency spike 1850ms during mass key eviction',
    logs: `[WARN] [redis-cluster-01] Evicting 45,000 keys/sec after bulk OAuth refresh job
[ERROR] [auth-service] Timeout validating session token in Redis`,
    symptoms: 'Intermittent 503 errors on token refresh endpoints; Redis CPU at 96%',
    timestamp: daysAgoIso(5, 2),
    created_at: daysAgoIso(5, 2),
    updated_at: daysAgoIso(5, 1),
    recent_deployment: 'Auth Service v3.3.0 deployed 30 minutes ago (enabled verbose JWT debug caching)',
    metrics: 'redis_evicted_keys_per_sec=45000, redis_memory=99.8%, auth_latency_p99=1850ms',
    affected_component: 'redis-session-cluster',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-B',
    pattern_name: 'Redis Cache Saturation & Command Timeout',
    resolution: {
      status: 'Resolved',
      root_cause: 'Verbose JWT debug payloads filled Redis memory to 100%, triggering a synchronous LRU eviction storm on every write.',
      resolution_steps: [
        'Disabled AUTH_VERBOSE_DEBUG_CACHE flag in Auth Service ConfigMap',
        'Flushed debug:* prefix keys using SCAN + UNLINK batch script',
        'Enabled lazyfree-lazy-eviction yes in Redis config so evictions happen asynchronously'
      ],
      what_worked: 'Disabling verbose debug cache, async UNLINK cleanup, and enabling lazyfree-lazy-eviction.',
      what_did_not_work: 'Adding more Auth Service replicas (increased write pressure on Redis).',
      preventive_action: 'Keep lazyfree-lazy-eviction=yes enabled and cap maximum value size in Redis cache wrapper.',
      engineer_feedback: 'Historical incident INC-1015 helped us immediately check Redis memory and eviction rates.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(5, 1),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1055'
    }
  },

  // PATTERN C: Deployment configuration / secret / env regression (4 incidents)
  {
    id: 'INC-1018',
    title: 'Notification Service CrashLoopBackOff After ConfigMap Update',
    service: 'Notification Service',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'ZodValidationError: Invalid environment configuration: SMTP_PORT expected number, received "587-tls"',
    logs: `[FATAL] [notification-service] Startup validation failed: SMTP_PORT invalid format
[WARN] [kubelet] Back-off restarting failed container notification-worker in pod notification-6d4f`,
    symptoms: 'All email and push notifications queued; Notification Service pods in CrashLoopBackOff',
    timestamp: daysAgoIso(24, 5),
    created_at: daysAgoIso(24, 5),
    updated_at: daysAgoIso(24, 4),
    recent_deployment: 'Notification Service ConfigMap v1.8 applied 10 minutes ago',
    metrics: 'notification_queue_depth=14200, running_pods=0/6, crashloop_restarts=42',
    affected_component: 'notification-configmap',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-C',
    pattern_name: 'Deployment Configuration & Secret Drift',
    resolution: {
      status: 'Resolved',
      root_cause: 'Malformed SMTP_PORT="587-tls" value introduced in production ConfigMap without schema validation prior to kubectl apply.',
      resolution_steps: [
        'Checked kubectl logs --previous on crashing pod and saw ZodValidationError on SMTP_PORT',
        'Reverted ConfigMap to SMTP_PORT="587" and SMTP_TLS="true"',
        'Triggered rollout restart and verified queue drain of 14,200 pending messages'
      ],
      what_worked: 'Reverting ConfigMap via helm rollback and draining dead-letter queue.',
      what_did_not_work: 'Deleting pods manually without fixing the mounted ConfigMap.',
      preventive_action: 'Run env schema validation in CI against all environment Helm values files before merge.',
      engineer_feedback: 'Clear config validation failure.',
      feedback_rating: 'Useful',
      resolved_at: daysAgoIso(24, 4),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1018'
    }
  },
  {
    id: 'INC-1031',
    title: 'User API 401 Unauthorized Spike Following JWT Public Key Rotation',
    service: 'User API',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'JsonWebTokenError: invalid signature (kid="auth-key-2026-q3" not found in local JWKS cache)',
    logs: `[ERROR] [user-api] JWT verification failed: kid auth-key-2026-q3 missing from static JWKS_PUBLIC_KEY env
[ERROR] [api-gateway] 401 Unauthorized on /v1/users/me (rate=94%)`,
    symptoms: '94% of authenticated User API calls failing with 401 Unauthorized right after Auth key rotation',
    timestamp: daysAgoIso(17, 3),
    created_at: daysAgoIso(17, 3),
    updated_at: daysAgoIso(17, 2),
    recent_deployment: 'Auth Service rotated signing key to auth-key-2026-q3 15 minutes ago',
    metrics: 'http_401_rate=94.1%, jwks_cache_miss=100%',
    affected_component: 'user-api-jwt-verifier',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-C',
    pattern_name: 'Deployment Configuration & Secret Drift',
    resolution: {
      status: 'Resolved',
      root_cause: 'User API was pinned to a static JWKS_PUBLIC_KEY secret in Kubernetes instead of dynamically fetching from Auth Service /.well-known/jwks.json.',
      resolution_steps: [
        'Identified kid mismatch between newly issued Auth tokens and User API static secret',
        'Updated User API k8s secret with the dual-key JWKS bundle and restarted pods',
        'Enabled dynamic JWKS endpoint discovery with auto-refresh on unknown kid'
      ],
      what_worked: 'Updating k8s secret with both old and new public keys and switching to dynamic JWKS URI fetching.',
      what_did_not_work: 'Forcing users to log in again (newly issued tokens also used the new kid).',
      preventive_action: 'Deprecate static public key env vars across all microservices in favor of /.well-known/jwks.json.',
      engineer_feedback: 'Crucial lesson on dual-key overlap during rotation.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(17, 2),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1031'
    }
  },
  {
    id: 'INC-1046',
    title: 'Order Service Database SSL Handshake Failure After Cert Renewal',
    service: 'Order Service',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'Error: self signed certificate in certificate chain (PGSSLMODE=verify-full)',
    logs: `[ERROR] [order-service] Postgres TLS handshake failed: unable to get local issuer certificate
[WARN] [rds-ca-rotator] RDS CA bundle updated to rds-ca-rsa2048-g1`,
    symptoms: 'New Order Service pods failing readiness probes; cannot establish TLS connection to Postgres',
    timestamp: daysAgoIso(10, 6),
    created_at: daysAgoIso(10, 6),
    updated_at: daysAgoIso(10, 5),
    recent_deployment: 'Order Service v1.21 deployed 12 minutes ago with Alpine 3.20 base image update',
    metrics: 'readiness_probe_failures=100%, db_tls_handshake_errors=64/min',
    affected_component: 'order-service-dockerfile / rds-ca-bundle',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-C',
    pattern_name: 'Deployment Configuration & Secret Drift',
    resolution: {
      status: 'Resolved',
      root_cause: 'New Alpine base image in Order Service v1.21 omitted the RDS global CA certificate bundle required by PGSSLMODE=verify-full.',
      resolution_steps: [
        'Confirmed existing v1.20 pods remained healthy while v1.21 pods failed readiness checks on TLS verification',
        'Mounted the rds-combined-ca-bundle.pem ConfigMap and set PGSSLROOTCERT=/etc/ssl/rds/rds-combined-ca-bundle.pem',
        'Verified TLS verify-full connection and completed rollout'
      ],
      what_worked: 'Mounting rds-combined-ca-bundle.pem and setting PGSSLROOTCERT.',
      what_did_not_work: 'Disabling SSL on database (rejected by pg_hba.conf hostssl rule).',
      preventive_action: 'Bake RDS global CA bundle into shared organization base Docker image.',
      engineer_feedback: 'Saved us from weakening SSL posture.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(10, 5),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1046'
    }
  },
  {
    id: 'INC-1058',
    title: 'Notification Service Webhook Signing Secret Mismatch in US-East-Prod',
    service: 'Notification Service',
    environment: 'US-East-Prod',
    severity: 'SEV-3',
    error_message: 'WebhookSignatureVerificationError: HMAC-SHA256 digest mismatch on incoming SendGrid delivery event',
    logs: `[ERROR] [notification-webhook] HMAC signature mismatch (header=sha256=8f1a..., computed=sha256=3c9b...)
[WARN] [notification-webhook] Trailing newline detected in WEBHOOK_SIGNING_SECRET environment variable`,
    symptoms: 'Delivery status callbacks returning 403 Forbidden; email status stuck in "Sent"',
    timestamp: daysAgoIso(4, 3),
    created_at: daysAgoIso(4, 3),
    updated_at: daysAgoIso(4, 2),
    recent_deployment: 'External Secrets Operator synced rotated WEBHOOK_SIGNING_SECRET 25 minutes ago',
    metrics: 'webhook_403_rate=100%, callback_lag_sec=1500',
    affected_component: 'notification-webhook-verifier',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-C',
    pattern_name: 'Deployment Configuration & Secret Drift',
    resolution: {
      status: 'Resolved',
      root_cause: 'Secret value stored in secret manager contained a trailing newline (\\n) from echo without -n, causing HMAC-SHA256 signature verification to fail.',
      resolution_steps: [
        'Inspected secret byte length via kubectl get secret -o jsonpath and spotted trailing 0x0a newline byte',
        'Re-uploaded secret with printf "%s" and added .trim() to secret loader in Notification Service',
        'Replayed failed webhook events from SendGrid dashboard'
      ],
      what_worked: 'Stripping trailing whitespace/newline from secret and adding .trim() in config loader.',
      what_did_not_work: 'Regenerating the webhook key a second time using the same CLI script (re-introduced the trailing newline).',
      preventive_action: 'Trim all cryptographic key and secret strings on startup initialization.',
      engineer_feedback: 'Classic trailing newline in k8s secret.',
      feedback_rating: 'Useful',
      resolved_at: daysAgoIso(4, 2),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1058'
    }
  },

  // PATTERN D: API Gateway timeout & upstream retry amplification (4 incidents)
  {
    id: 'INC-1019',
    title: 'API Gateway 504 Cascade & Retry Storm Against Order Service',
    service: 'API Gateway',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'upstream request timeout (Envoy 504 UT) with x-envoy-attempt-count: 4',
    logs: `[ERROR] [api-gateway-envoy] 504 UT POST /v1/orders (attempt=4, upstream_timeout=3000ms)
[WARN] [order-service] Incoming request rate jumped 400% due to gateway retries`,
    symptoms: 'Traffic amplification 4x normal load; cascading 504 timeouts across API Gateway and Order Service',
    timestamp: daysAgoIso(23, 4),
    created_at: daysAgoIso(23, 4),
    updated_at: daysAgoIso(23, 3),
    recent_deployment: 'API Gateway route config v4.2 deployed 20 minutes ago (enabled num_retries: 3 on /v1/orders/*)',
    metrics: 'gateway_retry_rate=310%, order_service_rps=4800 (baseline 1200), http_504_rate=48%',
    affected_component: 'envoy-retry-policy',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-D',
    pattern_name: 'API Gateway Timeout & Retry Amplification Storm',
    resolution: {
      status: 'Resolved',
      root_cause: 'Aggressive Envoy retry policy (num_retries=3 with 3s per-try timeout) on non-idempotent POST /v1/orders endpoints amplified a minor latency blip into a 4x retry storm.',
      resolution_steps: [
        'Observed x-envoy-attempt-count=4 headers multiplying upstream RPS by 4x',
        'Disabled automatic retries on POST/PATCH routes and enabled Envoy retry_budget (max 15% active retries)',
        'Increased upstream route timeout from 3000ms to 8000ms to match Order Service p99'
      ],
      what_worked: 'Restricting retries to idempotent GET requests, adding a 15% retry budget circuit breaker, and aligning gateway timeout with upstream p99.',
      what_did_not_work: 'Horizontal pod autoscaling alone (new pods were immediately overwhelmed by the 4x retry multiplier).',
      preventive_action: 'Enforce Envoy retry_budget cap (15%) and prohibit retries on POST routes without idempotency guarantees.',
      engineer_feedback: 'Retry storm diagnosis saved the cluster from complete collapse.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(23, 3),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1019'
    }
  },
  {
    id: 'INC-1034',
    title: 'API Gateway Keep-Alive Race Condition Causing 502 Bad Gateway',
    service: 'API Gateway',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: '502 Bad Gateway: upstream prematurely closed connection while reading response header from upstream (reset reason: connection termination)',
    logs: `[ERROR] [api-gateway] 502 UC upstream_reset_before_response_started{connection_termination}
[INFO] [user-api-node] Node http.Server keepAliveTimeout=5000ms vs Envoy idle_timeout=60000ms`,
    symptoms: 'Intermittent 502 Bad Gateway errors on 3.5% of requests across User API and Order Service',
    timestamp: daysAgoIso(16, 2),
    created_at: daysAgoIso(16, 2),
    updated_at: daysAgoIso(16, 1),
    recent_deployment: 'Node.js 22 runtime upgrade on upstream services 1 hour ago',
    metrics: 'http_502_rate=3.5%, envoy_cx_destroy_remote_with_active_rq=142/min',
    affected_component: 'gateway-upstream-keepalive',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-D',
    pattern_name: 'API Gateway Timeout & Retry Amplification Storm',
    resolution: {
      status: 'Resolved',
      root_cause: 'TCP keep-alive race condition: Node.js default keepAliveTimeout (5s) closed idle sockets right as API Gateway (idle_timeout=60s) reused them to dispatch new requests.',
      resolution_steps: [
        'Correlated envoy_cx_destroy_remote_with_active_rq metric with Node.js 5000ms keepAliveTimeout',
        'Configured Node.js server.keepAliveTimeout = 65000ms and server.headersTimeout = 66000ms (> Envoy 60s idle_timeout)',
        'Rolled out updated HTTP server settings to User API and Order Service'
      ],
      what_worked: 'Setting upstream Node.js keepAliveTimeout (65s) higher than API Gateway idle_timeout (60s).',
      what_did_not_work: 'Disabling HTTP keep-alive entirely (caused 40ms TLS handshake overhead on every request).',
      preventive_action: 'Standardize server.keepAliveTimeout=65000ms in shared Node.js bootstrap library.',
      engineer_feedback: 'Classic Envoy + Node.js keepAliveTimeout mismatch.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(16, 1),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1034'
    }
  },
  {
    id: 'INC-1049',
    title: 'API Gateway Rate Limiter Redis Fail-Closed Outage',
    service: 'API Gateway',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: '500 Internal Server Error: envoy.filters.http.ratelimit descriptor service unreachable (failure_mode_deny=true)',
    logs: `[ERROR] [api-gateway] Rateelimit service gRPC call timed out after 20ms; failure_mode_deny=true rejecting request
[WARN] [ratelimit-service] Redis backend latency spike to 35ms`,
    symptoms: 'API Gateway rejecting 60% of all ingress traffic with 500 errors during brief Redis latency bump',
    timestamp: daysAgoIso(8, 5),
    created_at: daysAgoIso(8, 5),
    updated_at: daysAgoIso(8, 4),
    recent_deployment: 'API Gateway rate-limit filter v2.1 deployed 15 minutes ago (set failure_mode_deny: true)',
    metrics: 'gateway_500_rate=61.2%, ratelimit_grpc_timeout_rate=61.2%',
    affected_component: 'envoy-ratelimit-filter',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-D',
    pattern_name: 'API Gateway Timeout & Retry Amplification Storm',
    resolution: {
      status: 'Resolved',
      root_cause: 'API Gateway rate-limit filter was configured with failure_mode_deny=true (fail-closed) and an aggressive 20ms gRPC timeout, turning minor Redis jitter into a global ingress outage.',
      resolution_steps: [
        'Changed failure_mode_deny from true to false (fail-open) in Envoy rate-limit filter config',
        'Increased rate-limit gRPC timeout from 20ms to 100ms',
        'Verified immediate drop in gateway 500 errors to 0%'
      ],
      what_worked: 'Setting failure_mode_deny=false (fail-open) and relaxing rate-limit gRPC timeout to 100ms.',
      what_did_not_work: 'Restarting Envoy gateway pods (config remained fail-closed).',
      preventive_action: 'Mandate failure_mode_deny=false for non-DDoS global rate limit filters.',
      engineer_feedback: 'Fail-open configuration restored traffic in 90 seconds.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(8, 4),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1049'
    }
  },
  {
    id: 'INC-1060',
    title: 'API Gateway DNS Resolution Stall After CoreDNS Pod Eviction',
    service: 'API Gateway',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: '503 Service Unavailable: no healthy upstream (STRICT_DNS resolution timeout for order-service.prod.svc)',
    logs: `[ERROR] [api-gateway] STRICT_DNS cluster order-service failed to resolve within 5000ms
[WARN] [coredns] Pod coredns-7c65d evicted from node-14 due to ephemeral-storage pressure`,
    symptoms: '503 Service Unavailable errors for 2 minutes when routing to internal Kubernetes services',
    timestamp: daysAgoIso(3, 5),
    created_at: daysAgoIso(3, 5),
    updated_at: daysAgoIso(3, 4),
    recent_deployment: 'Gateway cluster config updated 30 minutes ago (respect_dns_ttl enabled with 5s TTL)',
    metrics: 'envoy_cluster_membership_healthy=0, dns_lookup_failures=88/min',
    affected_component: 'gateway-dns-resolver',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-D',
    pattern_name: 'API Gateway Timeout & Retry Amplification Storm',
    resolution: {
      status: 'Resolved',
      root_cause: 'Envoy STRICT_DNS cluster cleared healthy endpoints when a single DNS refresh timed out during CoreDNS pod eviction.',
      resolution_steps: [
        'Enabled dns_failure_refresh_rate and treat_empty_dns_as_failure=true so Envoy retains last-known-good endpoints on DNS timeout',
        'Deployed NodeLocal DNSCache DaemonSet across worker nodes',
        'Verified cluster endpoint stability during simulated CoreDNS restart'
      ],
      what_worked: 'Retaining last-known-good endpoints on DNS failure and deploying NodeLocal DNSCache.',
      what_did_not_work: 'Lowering DNS TTL further (increased CoreDNS query load).',
      preventive_action: 'Ensure Envoy clusters preserve last-known-good IPs when DNS lookups fail.',
      engineer_feedback: 'Prevented DNS blips from wiping upstream endpoint tables.',
      feedback_rating: 'Useful',
      resolved_at: daysAgoIso(3, 4),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1060'
    }
  },

  // PATTERN E: Memory leak & OOMKilled containers (4 incidents)
  {
    id: 'INC-1021',
    title: 'Order Service Pod OOMKilled Every 45 Minutes After PDF Invoice Upgrade',
    service: 'Order Service',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory (Exit Code 137 OOMKilled)',
    logs: `[ERROR] [order-service] FATAL ERROR: MarkCompactCollector: young object promotion failed - JavaScript heap out of memory
[WARN] [k8s-events] Container order-service in pod order-78f9b was OOMKilled (memory limit 1024Mi)`,
    symptoms: 'Order Service pods restarting with Exit Code 137 (OOMKilled) every 45 minutes; Sawtooth RSS memory growth',
    timestamp: daysAgoIso(22, 3),
    created_at: daysAgoIso(22, 3),
    updated_at: daysAgoIso(22, 2),
    recent_deployment: 'Order Service v1.17 deployed 2 hours ago (added in-memory PDF invoice buffer caching)',
    metrics: 'container_memory_rss=1024Mi/1024Mi, oom_kills_last_hour=8, heap_used_mb=980',
    affected_component: 'order-invoice-generator',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-E',
    pattern_name: 'Container Memory Leak & OOMKilled Crash Loop',
    resolution: {
      status: 'Resolved',
      root_cause: 'Unbounded global Map in invoiceGenerator.ts cached rendered PDF Buffer objects without eviction or max size limit.',
      resolution_steps: [
        'Captured V8 heap snapshot from staging replica and found 640MB retained in global invoiceBufferCache Map',
        'Replaced unbounded Map with bounded LRU cache (max 50 items) and streamed PDF buffers directly to S3',
        'Rolled out Order Service v1.17.1 and verified flat heap profile at 240MB'
      ],
      what_worked: 'Streaming PDF buffers to S3 instead of buffering in global Map and replacing Map with bounded LRU cache.',
      what_did_not_work: 'Increasing container memory limit from 1Gi to 2Gi (merely delayed OOMKill from 45m to 90m).',
      preventive_action: 'Ban unbounded module-scope Map/Array caches in code review and alert on monotonic RSS slope.',
      engineer_feedback: 'Heap snapshot made the Buffer leak unmistakable.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(22, 2),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1021'
    }
  },
  {
    id: 'INC-1037',
    title: 'Notification Service Worker OOMKilled Due to EventEmitter Listener Leak',
    service: 'Notification Service',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 1001 drain listeners added; Pod OOMKilled (137)',
    logs: `[WARN] [notification-worker] MaxListenersExceededWarning: 1001 drain listeners added to [TLSSocket]
[ERROR] [kubelet] Pod notification-worker-55b2 OOMKilled (rss=1536Mi)`,
    symptoms: 'Notification worker memory climbs linearly at 30MB/min until Kubernetes OOMKills the container',
    timestamp: daysAgoIso(15, 4),
    created_at: daysAgoIso(15, 4),
    updated_at: daysAgoIso(15, 3),
    recent_deployment: 'Notification Service v1.11 deployed 90 minutes ago (added per-message socket drain listener)',
    metrics: 'container_memory_working_set=1.5GB, event_loop_lag_ms=420, oom_kills=5',
    affected_component: 'notification-stream-dispatcher',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-E',
    pattern_name: 'Container Memory Leak & OOMKilled Crash Loop',
    resolution: {
      status: 'Resolved',
      root_cause: 'Per-message closure registered socket.on("drain", cb) inside sendPushBatch() without removing the listener or using socket.once("drain"), retaining message payloads in closure scope.',
      resolution_steps: [
        'Correlated MaxListenersExceededWarning in logs with linear Old Space heap growth',
        'Changed socket.on("drain") to socket.once("drain") with explicit cleanup in finally block',
        'Deployed v1.11.1 hotfix and verified heap stabilized at 195MB'
      ],
      what_worked: 'Replacing socket.on("drain") with socket.once("drain") and cleaning up listeners on error.',
      what_did_not_work: 'Calling setMaxListeners(0) (suppressed the warning but kept leaking closures).',
      preventive_action: 'Fail integration tests whenever Node emits MaxListenersExceededWarning.',
      engineer_feedback: 'Matched the OOMKilled closure retention pattern.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(15, 3),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1037'
    }
  },
  {
    id: 'INC-1052',
    title: 'User API GraphQL DataLoader Request-Scope Memory Leak',
    service: 'User API',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'JavaScript heap out of memory (Mark-sweep 1980.4 -> 1976.1 MB) in User API pod',
    logs: `[ERROR] [user-api] V8 GC thrashing: 88% CPU spent in Mark-Sweep GC
[ERROR] [k8s] Container user-api OOMKilled (Exit Code 137)`,
    symptoms: 'User API p99 latency degrades from 45ms to 3200ms over 2 hours followed by OOMKilled restarts',
    timestamp: daysAgoIso(6, 4),
    created_at: daysAgoIso(6, 4),
    updated_at: daysAgoIso(6, 3),
    recent_deployment: 'User API v1.18 deployed 2 hours ago (shared singleton DataLoader across requests)',
    metrics: 'gc_pause_time_ms=1400, heap_used_mb=1980, p99_latency_ms=3200',
    affected_component: 'user-graphql-dataloader',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-E',
    pattern_name: 'Container Memory Leak & OOMKilled Crash Loop',
    resolution: {
      status: 'Resolved',
      root_cause: 'GraphQL DataLoader instance was instantiated at module scope instead of per-request context, causing its internal memoization Map to grow forever and leak cross-user records in RAM.',
      resolution_steps: [
        'Identified singleton DataLoader instance in GraphQL context factory',
        'Moved DataLoader instantiation inside the per-request context() function so it is garbage-collected after each request',
        'Deployed User API v1.18.1 and verified memory dropped from 1.98GB to 210MB'
      ],
      what_worked: 'Instantiating DataLoader per request inside the GraphQL context factory.',
      what_did_not_work: 'Running node --expose-gc and manual gc() intervals (objects were still strongly referenced by the singleton).',
      preventive_action: 'Add unit test verifying GraphQL context creates fresh DataLoader instances per request.',
      engineer_feedback: 'Critical fix for both memory stability and cache isolation.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(6, 3),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1052'
    }
  },
  {
    id: 'INC-1062',
    title: 'Database Read Replica OOM due to Unbounded work_mem Sort Spills',
    service: 'Database',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'Out of memory: Killed process 4412 (postgres) total-vm:32849120kB, anon-rss:28412000kB',
    logs: `[CRITICAL] [kernel] Out of memory: Killed process 4412 (postgres) on db-replica-02
[LOG] [postgres] server process (PID 4412) was terminated by signal 9: Killed (reporting query with 8 parallel hash joins)`,
    symptoms: 'Postgres read replica crashed with Linux OOM killer Signal 9; analytics queries failing',
    timestamp: daysAgoIso(2, 6),
    created_at: daysAgoIso(2, 6),
    updated_at: daysAgoIso(2, 5),
    recent_deployment: 'Analytics reporting service v1.4 deployed 35 minutes ago (set work_mem = 512MB per session)',
    metrics: 'db_replica_free_mem_mb=12, parallel_workers_active=64, work_mem_session=512MB',
    affected_component: 'postgres-read-replica-02',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-E',
    pattern_name: 'Container Memory Leak & OOMKilled Crash Loop',
    resolution: {
      status: 'Resolved',
      root_cause: 'Reporting service set session work_mem=512MB across 32 concurrent queries with 4 parallel hash/sort nodes each (32 * 4 * 512MB = 64GB), exhausting the 32GB replica RAM.',
      resolution_steps: [
        'Inspected dmesg OOM killer log and Postgres query log on db-replica-02',
        'Removed session-level SET work_mem=512MB from reporting service and capped database role work_mem at 32MB',
        'Addedcomposite index on (merchant_id, created_at) to eliminate the in-memory sort'
      ],
      what_worked: 'Capping role work_mem to 32MB via ALTER ROLE and adding a covering index on (merchant_id, created_at).',
      what_did_not_work: 'Re-running the same reporting batch after replica reboot (immediately OOM-killed the replica again).',
      preventive_action: 'Restrict max work_mem per role and set hash_mem_multiplier=1.5.',
      engineer_feedback: 'Important distinction between per-session work_mem and per-plan-node memory multiplication.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(2, 5),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1062'
    }
  },

  // PATTERN F: Third-party payment gateway latency & missing circuit breaker (4 incidents)
  {
    id: 'INC-1016',
    title: 'Payment API Thread Pool Exhaustion During StripeEU Upstream Degradation',
    service: 'Payment API',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'UpstreamProviderTimeout: StripeEU /v1/payment_intents timed out after 25000ms; worker pool exhausted',
    logs: `[WARN] [payment-gateway-client] StripeEU p95 latency degraded from 320ms to 24000ms
[ERROR] [payment-api] All 200 HTTP worker threads blocked waiting on StripeEU socket read`,
    symptoms: 'All Payment API endpoints (including health checks and domestic non-EU cards) hanging and returning 504',
    timestamp: daysAgoIso(26, 4),
    created_at: daysAgoIso(26, 4),
    updated_at: daysAgoIso(26, 3),
    recent_deployment: 'No code deploy; external StripeEU gateway experiencing brownout',
    metrics: 'external_gateway_p99_ms=24800, payment_worker_saturation=100%, domestic_payment_success=12%',
    affected_component: 'payment-provider-adapter',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-F',
    pattern_name: 'Third-Party Payment Gateway Latency & Circuit Breaker Trip',
    resolution: {
      status: 'Resolved',
      root_cause: 'Missing circuit breaker and 25s socket timeout on StripeEU HTTP client allowed a single slow third-party provider to block all shared Payment API workers.',
      resolution_steps: [
        'Lowered external provider HTTP timeout from 25000ms to 4500ms',
        'Enabled Opossum circuit breaker (errorThresholdPercentage=40%, resetTimeout=15000ms) on StripeEU adapter',
        'Failed over EU card routing to secondary Adyen processor via feature flag'
      ],
      what_worked: 'Enabling circuit breaker with 4.5s timeout and routing traffic to secondary payment processor (Adyen).',
      what_did_not_work: 'Restarting Payment API pods (workers immediately re-blocked on slow StripeEU sockets).',
      preventive_action: 'Isolate each third-party payment provider into dedicated bulkhead connection pools with 4.5s hard timeouts.',
      engineer_feedback: 'Bulkhead + failover restored domestic checkout immediately.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(26, 3),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1016'
    }
  },
  {
    id: 'INC-1030',
    title: 'Payment API 3DS Verification Latency Spike & Checkout Drop',
    service: 'Payment API',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'ProviderTimeoutError: CardinalCommerce 3DS2 challenge endpoint exceeded 15000ms timeout',
    logs: `[ERROR] [payment-3ds] 3DS directory server response time 16.4s (timeout=15s)
[WARN] [payment-api] Synchronous 3DS verification holding HTTP connection open`,
    symptoms: 'Checkout conversion dropped 38%; 504 timeouts on /v2/payments/3ds-verify',
    timestamp: daysAgoIso(18, 5),
    created_at: daysAgoIso(18, 5),
    updated_at: daysAgoIso(18, 4),
    recent_deployment: 'Payment API v2.5.2 deployed 3 hours ago (switched 3DS timeout from 4s to 15s)',
    metrics: '3ds_verify_p95_ms=15200, checkout_drop_percent=38%, circuit_breaker_state=closed',
    affected_component: 'payment-3ds-verifier',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-F',
    pattern_name: 'Third-Party Payment Gateway Latency & Circuit Breaker Trip',
    resolution: {
      status: 'Resolved',
      root_cause: 'Payment API v2.5.2 raised 3DS provider timeout to 15s without circuit-breaking, causing upstream 3DS directory degradation to stall checkout connections.',
      resolution_steps: [
        'Restored 3DS provider socket timeout to 4000ms so circuit breaker trips on slow responses',
        'Activated async polling fallback for delayed 3DS challenges',
        'Rerouted 3DS verification through backup acquirer gateway'
      ],
      what_worked: 'Restoring 4s timeout to trip the circuit breaker and routing to backup acquirer.',
      what_did_not_work: 'Waiting 15s synchronously per request.',
      preventive_action: 'Never set synchronous external provider timeouts above 5000ms in user-facing API paths.',
      engineer_feedback: 'Directly related to INC-1016 third-party latency pattern.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(18, 4),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1030'
    }
  },
  {
    id: 'INC-1044',
    title: 'Order Service Tax Calculation API Latency Causing Cart Abandonment',
    service: 'Order Service',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'AxiosError: timeout of 10000ms exceeded calling https://tax-engine.external.io/v2/calculate',
    logs: `[ERROR] [order-tax-client] External Tax API timeout (10000ms) on cart preview
[WARN] [order-service] 82% of active requests waiting on external tax calculation`,
    symptoms: 'Cart summary page taking > 10s to load; high 504 rate on /v1/orders/quote',
    timestamp: daysAgoIso(11, 2),
    created_at: daysAgoIso(11, 2),
    updated_at: daysAgoIso(11, 1),
    recent_deployment: 'Order Service v1.20.1 deployed 1 hour ago (bypassed Redis tax rate cache on promo codes)',
    metrics: 'external_tax_api_p99=10000ms, tax_cache_hit_rate=12% (down from 96%)',
    affected_component: 'order-tax-adapter',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-F',
    pattern_name: 'Third-Party Payment Gateway Latency & Circuit Breaker Trip',
    resolution: {
      status: 'Resolved',
      root_cause: 'Order Service v1.20.1 bypassed the Redis postal-code tax cache whenever a promo code was present, sending 8x unthrottled traffic to the third-party Tax API and triggering upstream rate-limit throttling.',
      resolution_steps: [
        'Restored Redis tax-rate cache lookup normalized by (postal_code, tax_category) before applying promo discount',
        'Enabled circuit breaker fallback to deterministic regional tax table when external Tax API exceeds 2000ms',
        'Verified tax_cache_hit_rate returned to 96.4%'
      ],
      what_worked: 'Restoring Redis tax cache key normalization and enabling circuit breaker fallback to deterministic regional tax table.',
      what_did_not_work: 'Retrying timed-out Tax API requests (triggered stricter 429 throttling from vendor).',
      preventive_action: 'Maintain local fallback tax rate table and alert if external vendor cache hit rate drops below 85%.',
      engineer_feedback: 'Circuit breaker + cache normalization fixed the vendor bottleneck.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(11, 1),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1044'
    }
  },
  {
    id: 'INC-1057',
    title: 'Payment API Webhook Settlement Lag & Provider TLS Renegotiation Stall',
    service: 'Payment API',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'ETIMEDOUT: Socket stalled during outbound settlement batch to GlobalPay Gateway',
    logs: `[ERROR] [payment-settlement] Outbound HTTPS agent socket hang up after 20000ms to GlobalPay
[WARN] [payment-api] Ephemeral port exhaustion to GlobalPay IP (no HTTP keepAlive enabled on axios instance)`,
    symptoms: 'Settlement capture calls timing out at 20s; outbound NAT port exhaustion warnings',
    timestamp: daysAgoIso(4, 7),
    created_at: daysAgoIso(4, 7),
    updated_at: daysAgoIso(4, 6),
    recent_deployment: 'Payment API v2.7.2 deployed 35 minutes ago (new settlement reconciliation worker)',
    metrics: 'outbound_tls_handshakes_per_sec=850, gateway_timeout_rate=19.4%',
    affected_component: 'payment-settlement-http-agent',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-F',
    pattern_name: 'Third-Party Payment Gateway Latency & Circuit Breaker Trip',
    resolution: {
      status: 'Resolved',
      root_cause: 'Outbound HTTPS client to GlobalPay created a new TCP/TLS connection per request without keepAlive, exhausting SNAT ports and triggering upstream TLS handshake throttling.',
      resolution_steps: [
        'Configured shared https.Agent({ keepAlive: true, maxSockets: 64, timeout: 4000 }) on GlobalPay client',
        'Enabled circuit breaker with exponential backoff jitter on settlement worker',
        'Verified outbound TLS handshakes dropped by 98% and latency fell from 20s to 110ms'
      ],
      what_worked: 'Enabling HTTPS connection pooling (keepAlive: true, maxSockets: 64) and 4s circuit breaker timeout.',
      what_did_not_work: 'Increasing worker concurrency from 10 to 50 (accelerated SNAT port exhaustion).',
      preventive_action: 'Require pooled https.Agent(keepAlive: true) for all external payment gateway clients.',
      engineer_feedback: 'Pooling outbound HTTPS sockets resolved the gateway timeouts immediately.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(4, 6),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1057'
    }
  },

  // Additional realistic incidents across Database, Authentication Service, User API, Notification Service (total = 24)
  {
    id: 'INC-1014',
    title: 'Database Primary Lock Contention on Orders Table Migration',
    service: 'Database',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'ERROR: canceling statement due to lock timeout (AccessExclusiveLock waiting on orders table)',
    logs: `[ERROR] [postgres-primary] PID 19204 holding AccessExclusiveLock queue on table "orders" (ALTER TABLE ADD COLUMN ... DEFAULT)
[ERROR] [order-service] 412 queries blocked in lock queue waiting > 5000ms`,
    symptoms: 'All reads and writes to orders table blocked; 500 errors across Order Service and Payment API',
    timestamp: daysAgoIso(27, 3),
    created_at: daysAgoIso(27, 3),
    updated_at: daysAgoIso(27, 2),
    recent_deployment: 'Database migration 20260902_add_order_risk_score executed 5 minutes ago',
    metrics: 'pg_locks_waiting=412, db_active_queries=450, order_write_success=0%',
    affected_component: 'postgres-primary-migrations',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-A',
    pattern_name: 'Database Connection Pool Exhaustion After Deployment',
    resolution: {
      status: 'Resolved',
      root_cause: 'Migration ran ALTER TABLE orders ADD COLUMN with a volatile expression without lock_timeout, queuing an AccessExclusiveLock behind a long-running analytics query and blocking all subsequent reads/writes.',
      resolution_steps: [
        'Ran SELECT pg_cancel_backend(19204) to abort the blocked DDL migration immediately',
        'Verified all 412 queued application queries drained within 3 seconds',
        'Re-ran migration with SET lock_timeout = "2s" after terminating the long-running analytics query'
      ],
      what_worked: 'Canceling the blocking DDL PID via pg_cancel_backend and enforcing SET lock_timeout = "2s" on migrations.',
      what_did_not_work: 'Restarting Order Service pods (new connections immediately queued behind the same table lock).',
      preventive_action: 'Enforce SET lock_timeout = "2s" and SET statement_timeout = "10s" in migration runner wrapper.',
      engineer_feedback: 'pg_blocking_pids() identified the exact lock chain in seconds.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(27, 2),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1014'
    }
  },
  {
    id: 'INC-1026',
    title: 'Database Autovacuum Transaction ID Wraparound Warning on Audit Events',
    service: 'Database',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'WARNING: database "prod_core" must be vacuumed within 12,400,000 transactions to avoid XID wraparound',
    logs: `[WARN] [postgres-primary] autovacuum worker canceled on table audit_events due to conflicting lock
[WARN] [postgres-primary] age(relfrozenxid) on audit_events reached 1.88B transactions`,
    symptoms: 'Disk I/O saturation at 95%; autovacuum repeatedly interrupted on 400GB audit_events table',
    timestamp: daysAgoIso(20, 4),
    created_at: daysAgoIso(20, 4),
    updated_at: daysAgoIso(20, 2),
    recent_deployment: 'Audit archival job v1.2 deployed 3 days ago',
    metrics: 'max_xid_age=1.88B, disk_iops_utilization=95%, autovacuum_workers=3/3',
    affected_component: 'postgres-autovacuum',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-A',
    pattern_name: 'Database Connection Pool Exhaustion After Deployment',
    resolution: {
      status: 'Resolved',
      root_cause: 'Long-held idle-in-transaction reporting sessions and low autovacuum_vacuum_cost_limit prevented autovacuum from advancing relfrozenxid on high-churn audit_events table.',
      resolution_steps: [
        'Terminated 4 stale reporting sessions older than 6 hours via pg_terminate_backend',
        'Raised autovacuum_vacuum_cost_limit=2000 and ran manual VACUUM (FREEZE, VERBOSE) audit_events',
        'Partitioned audit_events by month so old partitions can be dropped instead of vacuumed'
      ],
      what_worked: 'Terminating stale open transactions and running VACUUM FREEZE with elevated cost_limit.',
      what_did_not_work: 'Running standard VACUUM without terminating the oldest open xid snapshot.',
      preventive_action: 'Alert when age(relfrozenxid) > 500M and enforce idle_in_transaction_session_timeout=5min.',
      engineer_feedback: 'Caught well before Postgres entered read-only protection mode.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(20, 2),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1026'
    }
  },
  {
    id: 'INC-1048',
    title: 'Authentication Service Bcrypt CPU Starvation During Credential Stuffing',
    service: 'Authentication Service',
    environment: 'Production',
    severity: 'SEV-1',
    error_message: 'RequestTimeoutError: /v1/auth/login event loop blocked > 3500ms (CPU 100%)',
    logs: `[WARN] [auth-service] libuv threadpool saturated by bcrypt rounds=14 hashing (rps=620)
[ERROR] [api-gateway] 504 Gateway Timeout on /v1/auth/login and /v1/auth/verify`,
    symptoms: 'Auth Service CPU pinned at 100%; token verification endpoints timing out alongside login requests',
    timestamp: daysAgoIso(9, 3),
    created_at: daysAgoIso(9, 3),
    updated_at: daysAgoIso(9, 2),
    recent_deployment: 'Auth Service v3.2.1 deployed 1 hour ago (increased bcrypt work factor from 10 to 14)',
    metrics: 'auth_cpu=100%, event_loop_lag_ms=3400, login_rps=620',
    affected_component: 'auth-password-hasher',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-C',
    pattern_name: 'Deployment Configuration & Secret Drift',
    resolution: {
      status: 'Resolved',
      root_cause: 'Bcrypt cost factor was raised from 10 (~65ms) to 14 (~1050ms per hash) in v3.2.1, saturating CPU cores and starving lightweight JWT verification endpoints.',
      resolution_steps: [
        'Reverted BCRYPT_COST_FACTOR from 14 to 11 via ConfigMap hot-reload',
        'Enabled pre-hash Redis sliding-window rate limiting per IP/email on /v1/auth/login',
        'Separated /v1/auth/login and /v1/auth/verify into isolated deployment pools'
      ],
      what_worked: 'Lowering BCRYPT_COST_FACTOR to 11 and enforcing pre-hash rate limiting.',
      what_did_not_work: 'Scaling pods from 6 to 10 while cost factor remained 14 (16x CPU multiplier per hash overwhelmed autoscaler).',
      preventive_action: 'Benchmark CPU cost per request in CI when changing cryptographic work factors.',
      engineer_feedback: '16x CPU jump from cost 10 to 14 was immediately obvious in flamegraphs.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(9, 2),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1048'
    }
  },
  {
    id: 'INC-1064',
    title: 'User API N+1 Query Regression on Organization Member List',
    service: 'User API',
    environment: 'Production',
    severity: 'SEV-2',
    error_message: 'QueryTimeoutError: SELECT * FROM user_roles WHERE user_id = $1 exceeded 5000ms budget (executed 850 times/req)',
    logs: `[WARN] [user-api] Endpoint GET /v1/orgs/:id/members issued 851 SQL queries in single request
[ERROR] [user-api] DB connection pool wait time spiked to 4200ms`,
    symptoms: 'Enterprise organization member page timing out (504); User API DB connection pool saturated',
    timestamp: daysAgoIso(1, 5),
    created_at: daysAgoIso(1, 5),
    updated_at: daysAgoIso(1, 4),
    recent_deployment: 'User API v1.19 deployed 30 minutes ago (added role permissions serializer per member row)',
    metrics: 'sql_queries_per_request=851, user_api_db_pool=100%, p99_latency_ms=6100',
    affected_component: 'user-org-members-controller',
    status: 'Resolved',
    is_seed_data: true,
    pattern_id: 'PATTERN-A',
    pattern_name: 'Database Connection Pool Exhaustion After Deployment',
    resolution: {
      status: 'Resolved',
      root_cause: 'Serializer in User API v1.19 lazily queried user_roles inside a .map() loop (N+1 query pattern), issuing 850 sequential queries per enterprise org request and exhausting the DB connection pool.',
      resolution_steps: [
        'Identified 851 SQL queries per request in OpenTelemetry trace for GET /v1/orgs/:id/members',
        'Replaced lazy loop query with a single eager WHERE user_id = ANY($1) batch query',
        'Deployed v1.19.1 hotfix; endpoint latency dropped from 6100ms to 38ms and DB pool utilization fell from 100% to 14%'
      ],
      what_worked: 'Replacing N+1 loop query with single batch WHERE user_id = ANY($1) query.',
      what_did_not_work: 'Increasing database pool size alone (850 queries/req still saturated IOPS).',
      preventive_action: 'Add integration test assertion failing any endpoint that executes > 15 SQL queries per request.',
      engineer_feedback: 'Shows how N+1 queries after deployment directly trigger connection pool exhaustion.',
      feedback_rating: 'Very Useful',
      resolved_at: daysAgoIso(1, 4),
      stored_in_hindsight: true,
      hindsight_document_id: 'inc-doc-INC-1064'
    }
  }
];
