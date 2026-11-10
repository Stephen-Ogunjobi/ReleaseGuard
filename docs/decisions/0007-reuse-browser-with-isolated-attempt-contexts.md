# ADR 0007: Reuse one browser process with an isolated context per attempt

- Status: Accepted
- Recorded: 2026-11-10

## Context

Every browser check needs isolated cookies, local storage, permissions, and pages. Launching Chromium is substantially more expensive than creating an isolated browser context, while sharing one context would allow state to leak between unrelated checks.

The worker can process more than one job concurrently and must shut down browser resources predictably after BullMQ stops accepting work.

## Decision

Launch one headless Chromium process for each worker process and reuse it across attempts. Create a fresh non-persistent `BrowserContext` through a `withContext()` lifecycle for every attempt and close that context in `finally`.

The browser lifecycle is independent of Redis, Prisma, check state, and journey logic. It starts explicitly and provides an idempotent `close()` operation. Shutdown attempts to close all active contexts and the browser even if one cleanup operation fails.

## Alternatives considered

### Launch Chromium for every attempt

Simpler resource ownership, and a browser crash affects only one attempt. Rejected for the first implementation because repeated process startup adds substantial latency and resource usage.

### Share one browser context across attempts

Fastest option, but rejected because cookies, sessions, storage, permissions, and service workers could leak between checks.

### Maintain a pool of browser processes

Provides stronger crash isolation and may improve high-concurrency throughput. Deferred because current worker concurrency defaults to one and a pool adds scheduling, health checking, and replacement complexity before measurements justify it.

### Use persistent browser profiles

Rejected because ReleaseGuard checks should begin from deterministic state unless a future check type explicitly models stored state.

## Benefits

- Fresh contexts provide incognito-like isolation between attempts.
- Browser startup cost is paid once per worker lifecycle.
- Several attempts can use independent contexts when worker concurrency increases.
- `withContext()` makes cleanup the default rather than relying on every runner implementation to remember it.
- Browser lifecycle tests do not require PostgreSQL or Redis.

## Costs and risks

- An unexpected browser-process crash can affect every active attempt.
- The worker must own another long-lived resource and close it in the correct order.
- Browser memory can grow over time even when contexts are short-lived.
- Browser binaries are version-coupled to Playwright and must be installed after dependency upgrades.
- The first implementation does not automatically restart a disconnected browser.

## Shutdown order

When the browser is wired into the live worker, shutdown should:

1. Close BullMQ and wait for active jobs.
2. Close remaining browser contexts.
3. Close Chromium.
4. Disconnect Prisma from PostgreSQL.

## Follow-up

- Add browser restart or worker-fail-fast behavior for unexpected disconnection.
- Measure memory and launch latency before deciding whether a browser pool is warranted.
- Ensure deployment images install the Playwright browser revision matching the package version.
- Add operational metrics for active contexts and browser restarts when observability is introduced.
