# Agent Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo with `apps/*` and `packages/*` workspaces. Install and run commands from the repository root; use `pnpm --filter <package> <script>` for focused work.
- Product boundaries are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared code belongs in `@workspace/ui`, browser-safe `@workspace/contracts`, or server-only `@workspace/backend-types` as appropriate.
- Keep product-specific features in the owning app. Import shared UI from `@workspace/ui/components/*`; add shadcn primitives in `packages/ui` with `pnpm --filter @workspace/ui exec shadcn add <component>`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code.

## Commands

- `pnpm dev` starts all persistent tasks. Focused entrypoints are `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, and `pnpm --filter @pathlens/api dev`.
- `pnpm verify` runs Turbo lint, typecheck, and build; use `pnpm lint`, `pnpm typecheck`, `pnpm build`, or `pnpm format:check` for focused root checks.
- There is no general test runner. The configured test is `pnpm --filter @pathlens/api test:geoip`.
- The tracker build is `pnpm --filter @pathlens/tracker build`; the snapshot worker must be built before `pnpm --filter @pathlens/snapshot-worker start`, since start runs `dist/index.js`.

## Generated And Database Files

- Both web apps use TanStack file routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Never edit generated route trees.
- For changes to `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`. Do not hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Drizzle loads `DATABASE_URL` via `dotenv/config`, so database commands need `apps/pathlens-api/.env`. The API also exposes `backfill:campaigns` for its one-off backfill and `studio` for Drizzle Studio.

## Runtime Contracts

- Local Pathlens API is `apps/pathlens-api/src/server.ts` on port `8080`; routes are mounted under `/api`. Vercel deploys `apps/pathlens-api/api/index.ts` via `vercel.json`.
- Pathlens API startup requires `JWT_SECRET`. Middleware-protected routes require `x-api-key` matching `INTERNAL_API_SECRET`; `/events` and `/replay` ingestion routes must remain before the router-level API-key middleware. Encrypted tracker ingestion requires `X-Project-Key` and the payload project ID must match it.
- Pathlens web reads `VITE_API_BASE_URL` and `VITE_API_KEY` and stores the bearer token as `pathlens-token`; preserve these names in auth/API changes.
- Tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; `build` emits the minified IIFE `dist/tracker.global.js`. `data-project-id` is required. Override `data-api-url` and `data-replay-api-url` when testing against local `/api/events` and `/api/replay/chunks`.
- Snapshot worker requires `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a pre-created private Supabase bucket. Install Chromium once with `pnpm --filter @pathlens/snapshot-worker install-browser`; `SUPABASE_STORAGE_BUCKET`, polling, and settle-delay variables are optional.
- `@airship/api` only exposes `/health` and defaults to port `8081` unless `PORT` is set.

## Style

- Package `.prettierrc` files override the root config: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons.
- Web apps, `packages/ui`, and the snapshot worker reject unused locals/parameters and use `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission. Environment files are local and gitignored; no checked-in `.env.example` files exist.
