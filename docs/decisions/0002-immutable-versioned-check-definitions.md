# ADR 0002: Snapshot immutable check versions into verification runs

- Status: Accepted
- Recorded: 2026-11-10

## Context

A verification result must remain explainable after a check definition changes. Reading the current configuration during execution or result display could make historical runs appear to have used instructions that did not exist when they were queued.

## Decision

Treat `CheckDefinition` as the logical check and `CheckVersion` as an immutable execution specification. A `VerificationRun` creates one `CheckRun` for each selected version, and every `CheckRun` references exactly one `CheckVersion`.

## Alternatives considered

- Update check configuration in place.
- Store a copy of arbitrary configuration on every `CheckRun`.
- Resolve the latest version when the worker begins execution.

## Benefits

- Runs are reproducible and auditable.
- Queue delays cannot silently change which instructions execute.
- Result pages can show the exact selected version.
- Version numbers provide a clear configuration history.

## Costs and risks

- Configuration changes create more rows instead of updates.
- Correct “current version” selection must be centralized.
- Old versions require retention and eventual lifecycle policies.
- Immutability needs database enforcement, not only application convention.

## Follow-up

Define retention and archival policy only when real usage provides enough information to choose one responsibly.
