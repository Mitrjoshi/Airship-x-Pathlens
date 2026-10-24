# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the repository root; use `pnpm --filter <package> <script>` for focused work.
- `apps/pathlens-web` and `apps/airship-web` are Vite/TanStack Router frontends; `apps/pathlens-api` is the Pathlens Express/PostgreSQL API; `apps/pathlens-tracker` is the browser IIFE; the snapshot worker and heatmap proxy are separate AWS-oriented services.
- `packages/ui` owns shared shadcn primitives, `packages/contracts` owns browser-safe schemas/types, and `packages/backend-types` is server-only. Keep product-specific UI in its owning app.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`.

## Commands

- Install with `pnpm install`. `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; use `pnpm format:check` for formatting validation.
- There is no workspace-wide test script. Focused commands include `pnpm --filter @pathlens/api test:geoip`, `pnpm --filter @pathlens/api test:heatmaps`, `pnpm --filter @pathlens/api test:preview-sessions`, `pnpm --filter @pathlens/api test:authorization`, `pnpm --filter @pathlens/snapshot-worker test`, and `pnpm --filter @pathlens/heatmap-proxy test`.
- Heatmap proxy browser checks are separate: use `test:browser`, `test:browser:js`, or `test:framework`; the framework check builds `@pathlens/heatmap-proxy-fixtures` first.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; its output is `apps/pathlens-tracker/dist/tracker.global.js`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.
- Snapshot local runs require `apps/pathlens-snapshot-worker/.env`, PostgreSQL/AWS values, LocalStack on port `4566`, a queue created with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and Chromium from `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`.

## Boundaries

- Copy the relevant `apps/*/.env.example` to that package's `.env` before local development. API, worker, and heatmap-proxy commands load package-local environment files.
- TanStack Router generates `apps/pathlens-web/src/routeTree.gen.ts` and `apps/airship-web/src/routeTree.gen.ts`; never edit them. Add routes under the owning app's `src/routes`.
- Pathlens API Lambda entrypoint is `apps/pathlens-api/src/index.ts`; local `src/server.ts` mounts routes under `/api` on port `8080`. The heatmap proxy defaults to `8082`; Airship API defaults to `8081` and honors `PORT`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep event/replay ingestion, tracking config, billing, OAuth, and internal heatmap validation before `ApiKeyMiddleware`; later top-level routes require `x-api-key` matching `INTERNAL_API_SECRET`.
- Keep Stripe's raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`; middleware validates the key, origin, and scopes before injecting the project ID. JWT operations require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.

## Style

- Root and Pathlens web use Prettier single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons. Tailwind class sorting is enabled; preserve other app-local style.
- Airship web, Pathlens web, snapshot worker, and shared UI reject unused locals/parameters and use `erasableSyntaxOnly`; avoid TypeScript syntax that requires runtime emission.
