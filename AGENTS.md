# Agent Guide

## Workspace

- This is a pnpm 10 (`pnpm@10.0.0`) Turborepo with `apps/*` and `packages/*` workspaces. Install from the root and use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web` (dashboard), `@airship/web` (frontend), `@pathlens/api` (Express/PostgreSQL), `@airship/api` (health endpoint), `@pathlens/tracker` (browser IIFE), and `@pathlens/snapshot-worker` (Playwright/Supabase worker).
- Shared packages are `@workspace/ui` (shadcn components, hooks, and styles), `@workspace/contracts` (browser-safe schemas/types), and `@workspace/backend-types` (server-only types). Keep product features in their owning app.
- Import shared UI from `@workspace/ui/components/*`; add primitives from the root with `pnpm --filter @workspace/ui exec shadcn add <component>`.
- Read `apps/airship-web/AGENTS.md` for Airship-specific frontend rules.

## Commands

- Root checks are `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm verify`; `verify` runs Turbo `lint`, `typecheck`, and `build`. There is no test runner or test suite. Use `pnpm format` or `pnpm format:check` for formatting.
- `pnpm dev` runs all persistent dev tasks; use filters such as `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, `pnpm --filter @pathlens/api dev`, and `pnpm --filter @pathlens/tracker build` when working on one package.
- Only the two web apps define `lint`; use the target package's `typecheck` or `build` for APIs, the tracker, the worker, and shared packages.
- Install Chromium once with `pnpm --filter @pathlens/snapshot-worker install-browser`. The worker's `dev` runs source while `start` runs `dist/index.js`, so build before `start`; its Supabase bucket must already exist and be private.
- After changing `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`. Use `push` only for deliberate direct synchronization; `studio` opens Drizzle Studio.

## Generated Files

- Both web apps use file-based TanStack routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Do not hand-edit route trees or `apps/pathlens-api/drizzle/meta/**`.

## Runtime Gotchas

- The Pathlens API mounts under `/api` on port `8080`; its `dev` and `start` scripts load `apps/pathlens-api/.env`. `JWT_SECRET` is required at module load, database access needs `DATABASE_URL`, and protected routes compare `x-api-key` with `INTERNAL_API_SECRET`.
- Keep `/events` and `/replay` before the global `ApiKeyMiddleware` in `apps/pathlens-api/src/routes/index.ts`. Tracker POSTs are encrypted, use `X-Project-Key`, and are rejected when payload project IDs do not match that key.
- Pathlens web uses `VITE_API_BASE_URL` and `VITE_API_KEY`, sends the latter as `x-api-key`, and stores the bearer token as `pathlens-token`; preserve these names in auth changes.
- The tracker entrypoint is `apps/pathlens-tracker/src/index.ts` and builds to the minified IIFE `dist/tracker.global.js`. `data-project-id` is required and is the project key; default endpoints are `http://localhost:8080/api/events` and `http://localhost:8080/api/replay/chunks`, using `X-Project-Key`.
- The snapshot worker requires `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`; `SUPABASE_STORAGE_BUCKET` defaults to `project-snapshots`. `@airship/api` only exposes `/health` and defaults to port `8081` unless `PORT` is set.
- `.env` and `.env.*` are ignored except for `.env.example`, but no example files are checked in despite the README wording. Do not commit local secrets.

## Conventions

- API and tracker files use semicolons/double quotes; Airship web and `packages/ui` use no semicolons/double quotes; other packages inherit root no-semicolon/single-quote formatting.
- Web apps, `packages/ui`, and the snapshot worker enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax that requires runtime emission.
