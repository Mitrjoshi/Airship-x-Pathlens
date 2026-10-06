# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- Product apps are under `apps/`; shared UI is `packages/ui`, browser-safe contracts are `packages/contracts`, and server-only types are `packages/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Add shared shadcn primitives with `pnpm --filter @workspace/ui exec shadcn add <component>` and import them from `@workspace/ui/components/*`.

## Commands

- `pnpm install` installs the workspace. `pnpm verify` runs lint, typecheck, and build; `pnpm format:check` checks formatting.
- Run all dev processes with `pnpm dev`, or focus on a package such as `@pathlens/web`, `@airship/web`, `@pathlens/api`, or `@airship/api` with its `dev` script.
- The only configured test script is `pnpm --filter @pathlens/api test:geoip`.
- Build the browser tracker with `pnpm --filter @pathlens/tracker build`; its bundle is `apps/pathlens-tracker/dist/tracker.global.js`.
- For Pathlens schema changes, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.
- Snapshot local runs require `apps/pathlens-snapshot-worker/.env`, a private S3 bucket, LocalStack on port `4566`, the queue created with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`.

## Boundaries

- TanStack Router generates `src/routeTree.gen.ts` in both web apps; never edit it. Edit routes under `src/routes` (Pathlens also has legacy `src/-routes`).
- Pathlens API starts at `apps/pathlens-api/src/server.ts` and serves under `/api`; its dev/start scripts load `apps/pathlens-api/.env`. Airship API starts at `apps/airship-api/src/index.ts` and exposes `/health`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep `/events`, `/replay`, `/billing`, and GitHub OAuth routes before `ApiKeyMiddleware`; all later routes require `x-api-key === INTERNAL_API_SECRET`.
- Keep the Stripe webhook raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`, and every decrypted `projectId` must equal it. JWT operations require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.

## Style

- Local Prettier configs override the root: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons. Tailwind classes are sorted where configured.
- Web apps and shared UI enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
