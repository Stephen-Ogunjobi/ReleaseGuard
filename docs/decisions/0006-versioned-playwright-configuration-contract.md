# ADR 0006: Validate versioned Playwright configuration at runtime with Zod

- Status: Accepted
- Recorded: 2026-11-10

## Context

`CheckVersion.configurationJson` is runtime JSON from PostgreSQL. TypeScript types disappear at runtime and cannot prevent malformed or hostile configuration from reaching a browser runner. The existing `CheckVersion.schemaVersion` already provides an independent version discriminator.

## Decision

Define the Playwright configuration parser in `@release-guard/contracts` using Zod 4. Pass `schemaVersion` and `configurationJson` separately to the parser, support version 1 explicitly, and infer the TypeScript type from the runtime schema.

Version 1 is deliberately a narrow login journey with start path, demo credentials, success path, and success test ID. Objects are strict, and paths must be same-origin application paths rather than URLs.

## Alternatives considered

### TypeScript interface only

Rejected because database JSON is untrusted at runtime.

### Continue with handwritten validation

Reasonable for a few flat environment variables, but increasingly repetitive and error-prone for nested, versioned runner configuration.

### Duplicate `schemaVersion` inside the JSON

Rejected because the database column is already authoritative. Two version values could disagree.

### Accept full URLs

Rejected because `Environment.baseUrl` defines the target. Allowing configuration to replace the host creates an unnecessary server-side request-forgery boundary.

### Build a generic browser-action DSL now

Rejected for the first vertical slice. A generic sequence of clicks, fills, waits, and assertions would expand the validation and security surface before one real journey works end to end.

### Introduce a production secret manager now

Deferred. The checked-in demo credentials are deterministic test fixtures, not real secrets. Production check credentials must eventually use references resolved by a dedicated secret provider.

## Benefits

- API and worker can share one runtime contract.
- Invalid configuration fails before browser launch.
- Strict objects catch misspelled and unexpected fields.
- Validation errors report field paths without printing submitted credential values.
- New schema versions can be introduced without reinterpreting immutable old versions.

## Costs and risks

- Zod becomes a runtime dependency of the contracts package.
- Version dispatch must be maintained as schemas evolve.
- The version-one model is intentionally specific and may be replaced by a broader model later.
- Credentials currently live in configuration for the local demo only; this is not a production secret strategy.
- Rejecting query strings and hashes limits some future navigation cases and may require an intentional schema extension.

## Security constraints

Application paths must begin with one `/` and reject hosts, backslashes, query strings, hashes, whitespace, and traversal segments. Error construction must never interpolate the raw configuration object.

## Follow-up

- Parse configuration again when the worker loads trusted execution context.
- Reuse the same parser when a check-version write endpoint is introduced.
- Add a secret-reference schema before accepting real credentials.
- Add a new ADR if a generic action DSL replaces the dedicated login schema.
