# Agent Guide

## Workspace

- This is a pnpm 10 (`pnpm@10.0.0`) Turborepo. Run `pnpm install` at the root; use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared packages are `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Keep product features in their owning app. `@workspace/ui` owns shared shadcn components/hooks/styles, `@workspace/contracts` owns browser-safe schemas/types, and `@workspace/backend-types` is server-only.
- Import shared UI from `@workspace/ui/components/*`. Add primitives from the root with `pnpm --filter @workspace/ui exec shadcn add <component>`.
- Follow `apps/airship-web/AGENTS.md` for Airship web-specific rules.

## Commands

- `pnpm dev` starts workspace dev tasks; `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm verify` are the root checks. `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; there is no test script or test framework.
- Useful focused commands: `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, `pnpm --filter @pathlens/api dev`, `pnpm --filter @pathlens/web lint`, `pnpm --filter @airship/web lint`, and `pnpm --filter @pathlens/tracker build`.
- Install the snapshot worker's browser once with `pnpm --filter @pathlens/snapshot-worker install-browser`. Its `dev` command runs source, while `start` expects `dist/index.js`, so build before `start`.
- After changing `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`. Use `push` only for deliberate direct synchronization; `studio` opens Drizzle Studio.
- Format with `pnpm format` or `pnpm format:check`. `pathlens-web` uses no semicolons/single quotes; `airship-web` and `packages/ui` use no semicolons/double quotes; `pathlens-api` and `pathlens-tracker` use semicolons/double quotes.

## Boundaries And Runtime

- Both web apps use file-based TanStack routes in `src/routes`; Vite generates `src/routeTree.gen.ts`. Never hand-edit that file or `apps/pathlens-api/drizzle/meta/**`.
- The Pathlens API is Express/PostgreSQL, mounted at `/api` on port `8080`; its `dev`/`start` scripts load `apps/pathlens-api/.env`. `DATABASE_URL` and `JWT_SECRET` are required at startup; `INTERNAL_API_SECRET` is required for protected requests.
- In `apps/pathlens-api/src/routes/index.ts`, keep `/events` and `/replay` before the global `ApiKeyMiddleware`. Ingestion POSTs use encrypted bodies and `X-Project-Key`, and reject payload `projectId` values that do not match that key. Other protected routes require `x-api-key` plus their JWT/permission middleware.
- Pathlens web uses `VITE_API_BASE_URL` and `VITE_API_KEY`, sends the latter as `x-api-key`, and stores the bearer token as `pathlens-token`; preserve these names in auth changes.
- The tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; its build emits the minified IIFE `dist/tracker.global.js`. `data-project-id` is required and is used as the project key; default endpoints are `http://localhost:8080/api/events` and `http://localhost:8080/api/replay/chunks`, using `X-Project-Key` rather than `x-api-key`.
- The snapshot worker requires `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`, and expects an existing private Supabase bucket (default `project-snapshots`). `@airship/api` only exposes `/health` and defaults to port `8081` unless `PORT` is set.
- `.env` and `.env.*` are ignored, and no `.env.example` files are currently checked in despite the README; never commit local secrets.
- Web apps, `packages/ui`, and the snapshot worker enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax that requires runtime emission.
