# Agent Guide

## Workspace Boundaries

- This is one `pnpm` workspace orchestrated by Turborepo. Run `pnpm install` at the root; use `pnpm --filter <package> <command>` for focused work.
- Deployable apps live under `apps/`: `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, and `@pathlens/tracker`.
- `apps/airship-api` is currently a health-check placeholder. `apps/pathlens-api` owns the live Express API, PostgreSQL connection, Drizzle schema, and migration history.
- Shared packages live under `packages/`: `@workspace/ui` contains shadcn primitives and browser utilities; `@workspace/contracts` contains browser-safe API/event schemas and DTOs; `@workspace/backend-types` contains server-only shared types.

## Commands

- `pnpm dev` starts all persistent development tasks. Prefer `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, `pnpm --filter @pathlens/api dev`, or `pnpm --filter @pathlens/tracker dev` when working on one app.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm verify` run the repository-wide Turborepo tasks. `pnpm format` and `pnpm format:check` run the root formatter.
- Pathlens API database commands must run from its package context: `pnpm --filter @pathlens/api generate`, `migrate`, `push`, or `studio`. After schema changes, generate then migrate; use push only for intentional direct synchronization.
- The tracker builds the minified global IIFE at `apps/pathlens-tracker/dist/tracker.global.js` with `pnpm --filter @pathlens/tracker build`.
- No test framework is configured yet. Do not invent a test command; verify with lint, typecheck, and build until tests are added.

## Application Architecture

- Pathlens web is a file-based TanStack Router app. Edit routes under `apps/pathlens-web/src/routes`; the Vite plugin regenerates `src/routeTree.gen.ts`. Never edit that generated file.
- Airship web follows the same file-based route setup. Its app-specific instructions are in `apps/airship-web/AGENTS.md`.
- Both web apps import shared primitives as `@workspace/ui/components/*`, `@workspace/ui/lib/utils`, and `@workspace/ui/hooks/use-mobile`. Keep product navigation, layouts, themes, and feature components inside the owning app.
- Add or update shadcn primitives in `packages/ui`, using `packages/ui/components.json`; do not recreate them inside an app.
- Put wire-level schemas and DTOs in `packages/contracts`. Keep Drizzle models, database types, authentication implementation, and server-only logic inside the owning API unless both APIs genuinely share them.

## Runtime And Data

- The Pathlens API entrypoint is `apps/pathlens-api/src/index.ts`; it listens on port `8080` and mounts routes under `/api`.
- Pathlens API dev/start and Drizzle config load `apps/pathlens-api/.env`. Required values are `DATABASE_URL`, `JWT_SECRET`, and `INTERNAL_API_SECRET`.
- Authentication is intentionally split: `POST /api/events` validates the project key in the event payload before the global internal API-key middleware; protected dashboard handlers use `x-api-key` and, where applicable, bearer JWT.
- Pathlens web reads `VITE_API_BASE_URL` and `VITE_API_KEY`; its bearer token is stored in localStorage as `pathlens-token`. `VITE_API_KEY` is browser-visible, not a server secret.
- The tracker defaults to `http://localhost:8080/api/events` and requires `data-project-id` on its script tag. It batches browser events before sending them.

## Generated Files And Style

- Backend TypeScript builds to each API's `dist`; do not edit generated output. The Pathlens Drizzle migrations remain under `apps/pathlens-api/drizzle`.
- Build artifacts, Turborepo cache, dependencies, and local env files are ignored at the root. Commit `.env.example`, never local `.env` values.
- Pathlens web uses no semicolons, single quotes, two-space indentation, and Tailwind class sorting. Airship web keeps its local double-quote Prettier style. Shared UI files use the package formatter configuration.
- Keep package dependencies explicit. If code imports a workspace package, declare it with `workspace:*` in that app's `package.json`; do not rely on transitive dependencies.
