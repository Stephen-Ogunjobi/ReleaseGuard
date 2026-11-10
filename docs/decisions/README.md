# ReleaseGuard architecture decisions

This directory records decisions that materially shape ReleaseGuard. The records are written for two audiences:

- Contributors who need to understand why the code is structured this way.
- A future case study explaining the constraints, alternatives, and engineering tradeoffs behind the project.

An accepted decision is not permanent. If the context changes, add a new record that supersedes the old one instead of rewriting history.

## Decision index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](./0001-pnpm-monorepo-and-application-boundaries.md) | Use a pnpm monorepo with explicit application boundaries | Accepted |
| [0002](./0002-immutable-versioned-check-definitions.md) | Snapshot immutable check versions into verification runs | Accepted |
| [0003](./0003-identifier-only-verification-jobs.md) | Put identifiers, not execution configuration, in Redis jobs | Accepted |
| [0004](./0004-centralize-execution-state-transitions.md) | Centralize atomic execution rules in services backed by PostgreSQL | Accepted |
| [0005](./0005-separate-worker-lifecycle-from-domain-execution.md) | Separate worker lifecycle, queue validation, and execution logic | Accepted |
| [0006](./0006-versioned-playwright-configuration-contract.md) | Validate versioned Playwright configuration at runtime with Zod | Accepted |

## What to record next

Create or update an ADR when a change introduces a meaningful choice such as:

- A new persistence or concurrency rule.
- A public or cross-package contract.
- A security boundary.
- A dependency with long-term architectural impact.
- A deployment, retry, timeout, or failure-classification policy.
- A deliberate limitation that a future contributor might otherwise “fix” accidentally.

Each record should capture context, the chosen approach, alternatives, benefits, costs, risks, and follow-up work.
