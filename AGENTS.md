# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the repository root; use `pnpm --filter <package> <script>` for focused work.
- Product apps are `pathlens-web`, `airship-web`, `pathlens-api`, `airship-api`, `pathlens-tracker`, `pathlens-snapshot-worker`, and `pathlens-heatmap-proxy`; `pathlens-heatmap-proxy-fixtures` supplies its browser fixtures.
- `packages/ui` owns shared shadcn primitives, `packages/contracts` owns browser-safe schemas/types, and `packages/backend-types` is server-only. Keep product-specific UI in its owning app.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`.

## Commands

- Install with `pnpm install`. `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; use `pnpm format:check` for formatting validation.
- There is no workspace-wide test command. Focused tests are `pnpm --filter @pathlens/api test:geoip`, `pnpm --filter @pathlens/api test:heatmaps`, `pnpm --filter @pathlens/snapshot-worker test`, and `pnpm --filter @pathlens/heatmap-proxy test`.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; its browser bundle is `apps/pathlens-tracker/dist/tracker.global.js`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.
- Snapshot local runs require `apps/pathlens-snapshot-worker/.env`, a private S3 bucket, LocalStack on port `4566`, and Chromium installed with `pnpm --filter @pathlens/snapshot-worker install-browser`. Create the queue with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, then run `pnpm --filter @pathlens/snapshot-worker local`.

## Boundaries

- Copy the relevant `apps/*/.env.example` to that package's `.env` before local development. API, worker, and heatmap-proxy scripts read package-local `.env` files.
- TanStack Router generates `apps/pathlens-web/src/routeTree.gen.ts` and `apps/airship-web/src/routeTree.gen.ts`; never edit them. Add routes under the owning app's `src/routes`.
- The Pathlens API Lambda entrypoint is `apps/pathlens-api/src/index.ts`; local `src/server.ts` mounts routes under `/api` on port `8080`. The heatmap proxy defaults to `8082`; Airship API uses `PORT` or `8081`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep event/replay ingestion, tracking config, billing, OAuth, and internal heatmap validation before `ApiKeyMiddleware`; later top-level routes require `x-api-key` matching `INTERNAL_API_SECRET`.
- Keep Stripe's raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`; middleware validates the key, origin, and scopes before injecting the project ID. JWT operations require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.

## Style

- Root and Pathlens web use Prettier single quotes/no semicolons; `packages/ui` overrides this to double quotes/no semicolons. Preserve the existing app-local style elsewhere; Tailwind class sorting is enabled.
- Web apps, snapshot worker, and shared UI reject unused locals/parameters and use `erasableSyntaxOnly`; avoid TypeScript syntax that requires runtime emission.
