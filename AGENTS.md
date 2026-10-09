# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- Product apps are under `apps/`: Pathlens web/API/tracker/snapshot worker and Airship web/API. Shared UI is `packages/ui`, browser-safe contracts are `packages/contracts`, and server-only types are `packages/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Shared shadcn primitives belong in `packages/ui`; add them with `pnpm --filter @workspace/ui exec shadcn add <component>` and import `@workspace/ui/components/*`.

## Commands

- Install with `pnpm install`. `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; `pnpm format:check` validates formatting.
- Use `pnpm dev` for all persistent dev processes, or `pnpm --filter <package> dev` for one package. Only the web apps define `lint`; server, worker, tracker, and shared packages use focused `typecheck` or `build` scripts.
- The only configured test is `pnpm --filter @pathlens/api test:geoip`; there is no workspace-wide test runner.
- Build the browser tracker with `pnpm --filter @pathlens/tracker build`; the output is `apps/pathlens-tracker/dist/tracker.global.js`.
- For Pathlens schema changes, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.
- Snapshot local runs need `apps/pathlens-snapshot-worker/.env`, a private S3 bucket, LocalStack on port `4566`, the queue created with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`.

## Boundaries

- Copy the relevant `.env.example` files before local development. Pathlens API `dev`/`start` explicitly load `apps/pathlens-api/.env`.
- TanStack Router generates `src/routeTree.gen.ts` in both web apps; never edit it. Edit routes under `src/routes` (Pathlens also has legacy `src/-routes`).
- Pathlens API starts at `apps/pathlens-api/src/server.ts` on port `8080` and mounts `/api`; Airship API starts at `apps/airship-api/src/index.ts` and exposes `/health` on port `8081` by default.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep `/events`, `/replay`, `/billing`, tracking config, and GitHub OAuth routes before `ApiKeyMiddleware`; later top-level routes require `x-api-key === INTERNAL_API_SECRET`.
- Keep the Stripe webhook raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`; middleware validates the key, origin, and scopes, then injects the project ID. JWT operations require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.

## Style

- Root Prettier uses single quotes and no semicolons with Tailwind sorting. Overrides are: Pathlens web single/no-semicolon, Airship web double/no-semicolon, and Pathlens API/tracker double/semicolon.
- Web apps, the snapshot worker, and shared UI enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
