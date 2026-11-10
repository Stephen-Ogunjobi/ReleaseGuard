# ADR 0003: Put identifiers, not execution configuration, in Redis jobs

- Status: Accepted
- Recorded: 2026-11-10

## Context

BullMQ jobs cross a process and persistence boundary. Embedding URLs, check instructions, or credentials in a job would duplicate authoritative state and increase the amount of sensitive data retained in Redis.

## Decision

Verification jobs contain only a schema version, `checkRunId`, and `correlationId`. The worker validates the job and reloads trusted execution context from PostgreSQL.

## Alternatives considered

- Put the complete check configuration in each job.
- Put a partially resolved execution context in Redis.
- Let the worker accept arbitrary job fields and ignore unknown ones.

## Benefits

- PostgreSQL remains the source of truth.
- Credentials and runner configuration do not enter Redis job payloads.
- Job payloads stay small and easy to version.
- Strict parsing catches producer/consumer drift and accidental extra fields.

## Costs and risks

- Every execution requires database reads.
- Database availability is required after dequeue.
- The worker must distinguish missing, stale, duplicate, and terminal work correctly.
- Correlation IDs must be checked against the database record rather than trusted from the job.

## Follow-up

Keep new job fields exceptional. Add one only when the value cannot safely or correctly be resolved from authoritative storage.
