# Pathlens + Airship

This repository contains both products in one pnpm/Turborepo workspace.

## Apps

- `apps/pathlens-web`: Pathlens dashboard
- `apps/airship-web`: Airship frontend
- `apps/pathlens-api`: Pathlens Express/PostgreSQL API and Drizzle migrations
- `apps/airship-api`: Airship health-check placeholder
- `apps/pathlens-tracker`: browser analytics IIFE

## Shared Packages

- `packages/ui`: shared shadcn primitives, hooks, utilities, and styles
- `packages/contracts`: browser-safe API and event schemas/types
- `packages/backend-types`: server-only shared types

## Setup

```bash
pnpm install
```

Copy the relevant `.env.example` files to `.env` before running Pathlens locally.

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm verify
pnpm format
```

Use filters for focused work:

```bash
pnpm --filter @pathlens/web dev
pnpm --filter @airship/web dev
pnpm --filter @pathlens/api dev
pnpm --filter @pathlens/tracker build
```

Add or update shared shadcn components in `packages/ui`; keep product-specific layouts and features inside their owning app.
