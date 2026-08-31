# Agent Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo; install and run commands from the repository root. Use `pnpm --filter <package> <script>` for focused work.
- Product packages are `@pathlens/web` (dashboard), `@airship/web` (frontend), `@pathlens/api` (Express/PostgreSQL), `@airship/api` (health placeholder), `@pathlens/tracker` (browser IIFE), and `@pathlens/snapshot-worker` (Playwright worker).
- Shared code belongs in `@workspace/ui`, browser-safe `@workspace/contracts`, or server-only `@workspace/backend-types`; keep product features in their owning app.
- Add shared shadcn components in `packages/ui` with `pnpm --filter @workspace/ui exec shadcn add <component>` and import them from `@workspace/ui/components/*`. Read `apps/airship-web/AGENTS.md` before changing Airship web code.

## Commands

- Run `pnpm dev` for all persistent tasks; focused examples are `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, and `pnpm --filter @pathlens/api dev`.
- `pnpm verify` runs the repository `lint`, `typecheck`, and `build` tasks. Use `pnpm lint`, `pnpm typecheck`, `pnpm build`, or `pnpm format:check` for focused workspace-wide checks.
- No general test suite is configured; the only test command is `pnpm --filter @pathlens/api test:geoip`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`; do not hand-edit `apps/pathlens-api/drizzle/meta/**`. Use `push` only for deliberate direct synchronization; `studio` opens Drizzle Studio.
- The snapshot worker's `start` script runs `dist/index.js`, so build it first. Install Chromium once with `pnpm --filter @pathlens/snapshot-worker install-browser`; it also needs a pre-created private Supabase bucket.
- `pnpm layer <package-name>` creates a production dependency Lambda layer under gitignored `lambda-layers/`.

## Boundaries

- Both web apps use TanStack file routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Never edit that generated file.
- Pathlens API local development uses `apps/pathlens-api/src/server.ts` on port `8080`, with routes under `/api`; Vercel uses `apps/pathlens-api/api/index.ts`.
- Pathlens API `dev`, `start`, and `backfill:campaigns` load `apps/pathlens-api/.env` explicitly. Drizzle CLI uses `dotenv/config`, so database commands need `DATABASE_URL`; API startup also requires `JWT_SECRET`.

## Runtime Contracts

- Keep `/events` and `/replay` before the global `ApiKeyMiddleware` in `apps/pathlens-api/src/routes/index.ts`: tracker ingestion is unauthenticated by `x-api-key`, while dashboard/API routes require `x-api-key` equal to `INTERNAL_API_SECRET`.
- Encrypted tracker requests require `X-Project-Key`, and every decrypted payload project ID must equal that key.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` bearer-token storage key.
- Tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; `build` emits the minified IIFE `dist/tracker.global.js`. `BASE_API_URL` is injected at build time for default `/api/events` and `/api/replay/chunks`; script tags require `data-project-id`, with `data-api-url` and `data-replay-api-url` overrides.
- Snapshot worker requires `DATABASE_URL`, `AWS_REGION`, and `S3_BUCKET`; local AWS credentials use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, while Lambda uses its IAM role. Optional settings include `SNAPSHOT_SETTLE_DELAY_MS`.
- `@airship/api` exposes only `/health` and defaults to port `8081`; `PORT` overrides it.

## Style

- Local `.prettierrc` files override the root: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons.
- Web apps, `packages/ui`, and the snapshot worker enforce unused checks and `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
