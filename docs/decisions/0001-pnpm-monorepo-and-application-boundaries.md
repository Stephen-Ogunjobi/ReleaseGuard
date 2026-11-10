# ADR 0001: Use a pnpm monorepo with explicit application boundaries

- Status: Accepted
- Recorded: 2026-11-10

## Context

ReleaseGuard has independently running API, worker, and demo applications. They share database access, runtime configuration, and transport contracts, but must not become one tightly coupled process.

## Decision

Use a pnpm workspace with applications under `apps/` and reusable modules under `packages/`. Applications may import shared packages, but one application must not import another application directly.

## Alternatives considered

- Separate repositories for every process.
- One application containing API and background processing.
- Direct imports between application source trees.

## Benefits

- One lockfile and one root type-check command keep dependency versions consistent.
- Shared contracts avoid copying queue and API shapes.
- API and worker can still start, deploy, and fail independently.
- Atomic changes across applications and shared packages can be reviewed together.

## Costs and risks

- Repository-wide checks become more important because one package change can affect several consumers.
- Careless shared packages can create hidden coupling.
- A monorepo does not enforce runtime independence by itself; directory and import boundaries still require discipline.

## Follow-up

Keep application-specific orchestration inside its application. Promote code into `packages/` only when it represents a genuinely shared contract or capability.
