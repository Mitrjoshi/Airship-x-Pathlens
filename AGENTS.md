# Agent Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo; install and run commands from the repository root. Use `pnpm --filter <package> <script>` for focused work.
- Product packages are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared code belongs in `@workspace/ui`, browser-safe `@workspace/contracts`, or server-only `@workspace/backend-types`.
- Keep product features in their owning app. Shared shadcn components belong in `packages/ui`; add one with `pnpm --filter @workspace/ui exec shadcn add <component>`. Read `apps/airship-web/AGENTS.md` before changing Airship web code.

## Commands

- `pnpm dev` starts all persistent tasks. Focused dev commands are `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, and `pnpm --filter @pathlens/api dev`.
- `pnpm verify` runs `lint`, `typecheck`, and `build`; focused checks are `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm format:check`.
- There is no general test suite. The only configured test is `pnpm --filter @pathlens/api test:geoip`.
- `@pathlens/snapshot-worker start` runs `dist/index.js`, so build it first. Install its browser dependency once with `pnpm --filter @pathlens/snapshot-worker install-browser`.

## Generated And Database Files

- Both web apps use TanStack file routes in `src/routes`; Vite generates `src/routeTree.gen.ts`. Never edit generated route trees.
- After changing `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Do not hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Pathlens API scripts load `apps/pathlens-api/.env` with `--env-file`; Drizzle CLI config uses `dotenv/config`, so database commands require `DATABASE_URL` there. Other required API settings include `JWT_SECRET`.

## Runtime Contracts

- Pathlens API runs from `apps/pathlens-api/src/server.ts` on port `8080`, with routes under `/api`. Vercel routes to `apps/pathlens-api/api/index.ts`.
- In `apps/pathlens-api/src/routes/index.ts`, `/events` and `/replay` must stay before `ApiKeyMiddleware`. All later routes require `x-api-key` equal to `INTERNAL_API_SECRET`; encrypted tracker payloads require `X-Project-Key` and matching payload project IDs.
- Pathlens web uses `VITE_API_BASE_URL`, `VITE_API_KEY`, and the `pathlens-token` bearer-token storage key. Preserve these names in auth/API changes.
- The tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; build emits minified IIFE `dist/tracker.global.js`. Its script requires `data-project-id`; `data-api-url` and `data-replay-api-url` override the local event and replay endpoints.
- The snapshot worker requires `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a pre-created private bucket. Optional settings are `SUPABASE_STORAGE_BUCKET`, `SNAPSHOT_POLL_INTERVAL_MS`, and `SNAPSHOT_SETTLE_DELAY_MS`.
- `@airship/api` exposes only `/health` and defaults to port `8081`; set `PORT` to override it.

## Style

- Local `.prettierrc` files override the root config: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons.
- Web apps, `packages/ui`, and the snapshot worker enable strict unused checks and `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission. Environment files are local and gitignored.
