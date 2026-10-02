# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo; run commands from the repository root and use `pnpm --filter <package> <script>` for focused work.
- Product apps are under `apps/`; shared UI, browser contracts, and backend-only types are `packages/ui`, `packages/contracts`, and `packages/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Shared shadcn components belong in `packages/ui`; add them with `pnpm --filter @workspace/ui exec shadcn add <component>` and import them from `@workspace/ui/components/*`.

## Commands

- Install with `pnpm install`. `pnpm verify` runs `lint`, `typecheck`, and `build`; use `pnpm format:check` for formatting verification.
- Run all development processes with `pnpm dev`, or target `@pathlens/web`, `@airship/web`, `@pathlens/api`, or `@airship/api` with their `dev` scripts.
- The only configured test command is `pnpm --filter @pathlens/api test:geoip`.
- Build the browser tracker with `pnpm --filter @pathlens/tracker build`; it emits `dist/tracker.global.js`.
- For Pathlens API schema changes, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Do not hand-edit `apps/pathlens-api/drizzle/meta/**`; `push` is only for deliberate direct synchronization.
- Local snapshot capture requires `.env`, a private S3 bucket, LocalStack on port `4566`, the queue created with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then use `pnpm --filter @pathlens/snapshot-worker local`.

## Boundaries

- TanStack Router generates `src/routeTree.gen.ts` in both web apps; never edit it directly. Product routes live under each app's `src/routes` (Pathlens also contains legacy `src/-routes`).
- Pathlens API starts at `apps/pathlens-api/src/server.ts`, serves under `/api`, and loads `apps/pathlens-api/.env` in its scripts. Airship API starts at `apps/airship-api/src/index.ts` and exposes `/health`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep `/events`, `/replay`, `/billing`, and GitHub OAuth routes before `ApiKeyMiddleware`; routes after it require `x-api-key === INTERNAL_API_SECRET`.
- Keep the Stripe webhook raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`, and every decrypted `projectId` must equal that key. JWT operations require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.

## Style

- Local Prettier configs override the root: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons. Tailwind classes are sorted where the plugin is configured.
- Web apps and shared UI enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax that requires runtime emission.
