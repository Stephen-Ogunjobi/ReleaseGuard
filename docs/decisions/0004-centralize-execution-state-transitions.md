# ADR 0004: Centralize atomic execution rules in services backed by PostgreSQL

- Status: Accepted
- Recorded: 2026-11-10

## Context

The API and worker operate concurrently. If controllers, job handlers, and runners each perform their own reads and writes, duplicate delivery and interleaved updates can create duplicate attempts or invalid terminal-state changes.

## Decision

Place persistence invariants and execution orchestration in explicit services. Use conditional database updates, transactions, unique constraints, and row locking for claims, attempt creation, terminal transitions, and aggregate finalization.

## Alternatives considered

- Put reads and writes directly in API controller and BullMQ callbacks.
- Rely on in-memory locks in one worker process.
- Depend only on BullMQ’s normal delivery behavior to prevent duplicates.

## Benefits

- The database arbitrates concurrent writers across processes.
- Duplicate job delivery does not create duplicate attempts.
- Claim and attempt creation succeed or roll back together.
- Terminal attempts cannot be rewritten through application services.
- The rules can be integration-tested independently of HTTP and Redis.

## Costs and risks

- Services and transaction boundaries add code and concepts.
- Row locks require consistent acquisition order to avoid deadlocks.
- A process crash after claiming still needs a future stale-run recovery policy.
- Aggregate status precedence is a product decision encoded in backend logic.

## Follow-up

Add recovery for abandoned `RUNNING` attempts and document retry policy before enabling automatic retries.
