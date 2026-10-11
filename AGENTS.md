# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- `apps/` owns the Pathlens dashboard/API/tracker/snapshot worker and the Airship frontend/API. `packages/ui` owns shared shadcn UI, `packages/contracts` owns browser-safe schemas, and `packages/backend-types` owns server-only types.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Add shared shadcn primitives in `packages/ui` with `pnpm --filter @workspace/ui exec shadcn add <component>` and import `@workspace/ui/components/*`.

## Commands

- Install with `pnpm install`. `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; use `pnpm format:check` for formatting validation.
- Use `pnpm dev` for all persistent processes, or `pnpm --filter <package> dev` for one package.
- The only configured test command is `pnpm --filter @pathlens/api test:geoip`; there is no workspace-wide test runner.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; its generated IIFE is `apps/pathlens-tracker/dist/tracker.global.js`.
- For database changes, update the Pathlens schema, then run `pnpm --filter @pathlens/api generate` followed by `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Snapshot local runs need `apps/pathlens-snapshot-worker/.env`, a private S3 bucket, LocalStack on port `4566`, the queue from `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`.

## Boundaries

- Copy the relevant `.env.example` files before local development. Pathlens API `dev` and `start` explicitly load `apps/pathlens-api/.env`.
- TanStack Router generates `src/routeTree.gen.ts`; never edit it. Add current routes under `src/routes`. Pathlens also has legacy routes under `src/-routes`.
- Pathlens API starts at `apps/pathlens-api/src/server.ts` on port `8080` and mounts `/api`; Airship API starts at `apps/airship-api/src/index.ts` and exposes `/health` on port `8081`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep `/events`, `/replay`, tracking config, billing, and OAuth callback routes before `ApiKeyMiddleware`; later top-level routes require `x-api-key === INTERNAL_API_SECRET`.
- Keep Stripe's raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`; middleware validates the key, origin, and scopes before injecting the project ID. JWT operations require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.

## Style

- Root Prettier uses single quotes, no semicolons, and Tailwind class sorting. Airship web and `packages/ui` use double quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons.
- The web apps, snapshot worker, and shared UI enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax that requires runtime emission.
