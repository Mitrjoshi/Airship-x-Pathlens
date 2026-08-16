# Agent Guide

## Workspace

- This is a pnpm 10 (`pnpm@10.0.0`) Turborepo. Run `pnpm install` at the root; use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared packages are `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Keep product features in their owning app. `@workspace/ui` owns shared shadcn components, hooks, and styles; `@workspace/contracts` is browser-safe; `@workspace/backend-types` is server-only.
- Import shared UI from `@workspace/ui/components/*`. Add primitives from the root with `pnpm --filter @workspace/ui exec shadcn add <component>`.
- Read `apps/airship-web/AGENTS.md` for Airship frontend-specific rules.

## Commands

- Root commands are `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm verify`, `pnpm format`, and `pnpm format:check`. `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; no test script or test suite is configured.
- Useful focused commands are `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, `pnpm --filter @pathlens/api dev`, and `pnpm --filter @pathlens/tracker build`. Only the web apps define `lint`; use package `typecheck` or `build` for server/worker checks.
- Install Chromium once with `pnpm --filter @pathlens/snapshot-worker install-browser`. The worker's `dev` runs source and `start` runs `dist/index.js`, so build before `start`.
- After changing `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`. Use `push` only for deliberate direct synchronization; `studio` opens Drizzle Studio.
- Formatter settings are package-local: the API and tracker use semicolons/double quotes; Airship web and `packages/ui` use no semicolons/double quotes; Pathlens web, the snapshot worker, and packages without overrides inherit root no-semicolon/single-quote settings.

## Generated Files

- Both web apps use file-based TanStack routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Do not hand-edit route trees or `apps/pathlens-api/drizzle/meta/**`.

## Runtime And Environment

- The Pathlens API is Express/PostgreSQL at `/api` on port `8080`; its `dev` and `start` scripts load `apps/pathlens-api/.env`. `JWT_SECRET` is required at module load, `DATABASE_URL` is needed for database access, and protected routes use `INTERNAL_API_SECRET` via `x-api-key`.
- Keep `/events` and `/replay` before the global `ApiKeyMiddleware` in `apps/pathlens-api/src/routes/index.ts`. Tracker POSTs use encrypted bodies and `X-Project-Key`, and the API rejects payload project IDs that do not match that key.
- Pathlens web uses `VITE_API_BASE_URL` and `VITE_API_KEY`, sends the latter as `x-api-key`, and stores the bearer token as `pathlens-token`; preserve these names in auth changes.
- The tracker entrypoint is `apps/pathlens-tracker/src/index.ts` and its build emits the minified IIFE `dist/tracker.global.js`. `data-project-id` is required and is the project key; defaults are `http://localhost:8080/api/events` and `http://localhost:8080/api/replay/chunks`, using `X-Project-Key` rather than `x-api-key`.
- The snapshot worker requires `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`, and an existing private Supabase bucket (default `project-snapshots`). `@airship/api` only exposes `/health` and defaults to port `8081` unless `PORT` is set.
- `.env` and `.env.*` are ignored except for `.env.example`, but no example files are checked in even though the README mentions them. Do not commit local secrets.
- The web apps, `packages/ui`, and the snapshot worker enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax that requires runtime emission.
