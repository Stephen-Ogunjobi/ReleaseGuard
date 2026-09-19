# ReleaseGuard

Node.js/TypeScript monorepo managed with pnpm. It intentionally contains no web application.

## Setup

```sh
corepack enable
pnpm install
pnpm typecheck
```

## Applications

Each application is an independent process and only consumes shared code from `packages/`.

```sh
pnpm start:api       # HTTP API on http://localhost:3000
pnpm start:worker    # BullMQ verification worker
pnpm start:demo      # HTTP demo application on http://localhost:3100/login
```

Environment variables are parsed and validated by `@release-guard/config` before each application starts. Supported values are documented in [.env.example](.env.example).
