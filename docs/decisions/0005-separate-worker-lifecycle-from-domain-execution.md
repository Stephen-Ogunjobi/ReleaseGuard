# ADR 0005: Separate worker lifecycle, queue validation, and execution logic

- Status: Accepted
- Recorded: 2026-11-10

## Context

The worker must manage PostgreSQL, Redis, signals, job validation, state transitions, and browser execution. Combining these responsibilities in one bootstrap file would make shutdown behavior and domain rules difficult to test independently.

## Decision

Organize the worker into:

- `bootstrap/` for process and resource lifecycle.
- `queue/` for BullMQ job-name and payload validation.
- `execution/` for `CheckRun` orchestration and runner contracts.
- Future `runners/` implementations for tools such as Playwright.

The bootstrap contains no Playwright verification logic. `SIGINT` and `SIGTERM` share one idempotent cleanup path.

## Alternatives considered

- Implement all work in the BullMQ processor callback.
- Use a NestJS application container for the worker immediately.
- Let the Playwright runner update Prisma records directly.

## Benefits

- Queue payloads fail before domain work when invalid.
- Runners can be tested without Redis.
- Persistence behavior can be tested with fake runners.
- Resource shutdown can be verified independently.
- A runner cannot bypass execution-state rules.

## Costs and risks

- Dependency composition requires factories or explicit wiring.
- More files and interfaces increase initial learning cost.
- Shutdown order must account for active jobs and runner-owned resources.

## Follow-up

When Playwright is added, stop BullMQ first, then close browser resources, then disconnect PostgreSQL.
