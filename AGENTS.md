# Agent Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo; workspaces are `apps/*` and `packages/*`. Install from the root and use `pnpm --filter <package> <script>` for focused work.
- Product apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared packages are `@workspace/ui`, browser-safe `@workspace/contracts`, and server-only `@workspace/backend-types`.
- Keep product features in their owning app. Import shared UI from `@workspace/ui/components/*`; add shadcn primitives with `pnpm --filter @workspace/ui exec shadcn add <component>`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code.

## Commands

- `pnpm dev` runs all persistent tasks. Focused commands: `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, `pnpm --filter @pathlens/api dev`, and `pnpm --filter @pathlens/tracker build`.
- Run `pnpm verify` for the full Turbo `lint`, `typecheck`, and `build` check. Individual root checks are `pnpm lint`, `pnpm typecheck`, and `pnpm build`; formatting is `pnpm format` or `pnpm format:check`.
- There is no general test runner. The API's focused test is `pnpm --filter @pathlens/api test:geoip`.
- `@workspace/contracts` and `@workspace/backend-types` emit CommonJS files and declarations to `dist`; the API build invokes both shared-package builds before compiling.
- The snapshot worker needs `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a pre-created private Supabase bucket. Run `pnpm --filter @pathlens/snapshot-worker install-browser` once for Chromium; build before `start`, which runs `dist/index.js`. `SUPABASE_STORAGE_BUCKET` and polling/settle intervals are optional.

## Generated And Database Files

- Both web apps use TanStack file routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Do not edit generated route trees.
- For schema changes in `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Do not hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Drizzle commands load `DATABASE_URL` through `dotenv/config` in `apps/pathlens-api/drizzle.config.ts`; provide `apps/pathlens-api/.env` for them. `backfill:campaigns` is a one-off API backfill script; `studio` opens Drizzle Studio.

## Runtime Contracts

- Local Pathlens API development runs `apps/pathlens-api/src/server.ts` on port `8080`; Vercel routes the deployed API through `apps/pathlens-api/api/index.ts`. The Express routes are mounted under `/api`.
- `JWT_SECRET` is required when the Pathlens API loads. Routes after `ApiKeyMiddleware` require `x-api-key` matching `INTERNAL_API_SECRET`; keep `/events` and `/replay` before that middleware. Tracker ingestion is encrypted, requires `X-Project-Key`, and validates the payload project ID against that key.
- Pathlens web uses `VITE_API_BASE_URL` and `VITE_API_KEY`, and stores the bearer token as `pathlens-token`; preserve these names in auth/API changes.
- The tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; its build emits the minified IIFE `dist/tracker.global.js`. `data-project-id` is required. Its default event and replay endpoints are deployed API URLs; set the script's `data-api-url` and `data-replay-api-url` attributes when testing against local `http://localhost:8080/api` routes.
- `@airship/api` exposes only `/health` and defaults to port `8081` unless `PORT` is set.

## Style

- Per-package `.prettierrc` files override the root config. API/tracker use semicolons and double quotes; Airship web and `packages/ui` use double quotes without semicolons; Pathlens web uses the root no-semicolon/single-quote style.
- Web apps, `packages/ui`, and the snapshot worker enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript constructs that require runtime emission. Keep `.env` files local; they are gitignored, and no `.env.example` files are currently checked in.
