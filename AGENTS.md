# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- Apps: `@pathlens/web` and `@airship/web` are Vite frontends; `@pathlens/api` is the Express/PostgreSQL API; `@airship/api` serves `/health`; `@pathlens/tracker` builds the browser IIFE; `@pathlens/snapshot-worker` captures sites with Playwright and SQS/S3.
- Shared boundaries: `packages/ui` owns shared shadcn primitives, `packages/contracts` owns browser-safe schemas/types, and `packages/backend-types` is server-only. Read `apps/airship-web/AGENTS.md` before changing Airship web code.
- Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it as `@workspace/ui/components/*`; keep product-specific UI in its app.

## Commands

- Install with `pnpm install`; `pnpm verify` runs Turbo `lint`, `typecheck`, then `build`; use `pnpm format:check` for formatting validation.
- The only configured test is `pnpm --filter @pathlens/api test:geoip`; there is no workspace-wide test runner.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; its artifact is `apps/pathlens-tracker/dist/tracker.global.js`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Do not hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.
- Snapshot local runs require `apps/pathlens-snapshot-worker/.env`, a private S3 bucket, LocalStack on port `4566`, the queue created with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`.

## Boundaries

- Copy the relevant `.env.example` before local development. Pathlens API `dev` and `start` load `apps/pathlens-api/.env` via `--env-file`; the snapshot worker uses its own `.env`.
- TanStack Router generates `apps/pathlens-web/src/routeTree.gen.ts` and `apps/airship-web/src/routeTree.gen.ts`; never edit them. Add routes under the owning app's `src/routes`.
- Pathlens API starts at `apps/pathlens-api/src/server.ts`, mounts routes under `/api`, and listens on `8080`. Airship API starts at `apps/airship-api/src/index.ts` and defaults to port `8081`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep event/replay ingestion, tracking config, billing, and OAuth routes before `ApiKeyMiddleware`; later top-level routes require `x-api-key === INTERNAL_API_SECRET`.
- Keep Stripe's raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`; middleware validates the key, origin, and scopes before injecting the project ID. JWT operations require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.

## Style

- Root and Pathlens web Prettier use single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons. Tailwind class sorting is enabled where configured.
- Web apps, snapshot worker, and shared UI enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
