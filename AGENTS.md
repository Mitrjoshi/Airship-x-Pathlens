# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the repository root; use `pnpm --filter <package> <script>` for focused work.
- `apps/pathlens-web` and `apps/airship-web` are Vite/TanStack Router frontends. `apps/pathlens-api` is the Express/PostgreSQL API; `apps/airship-api` is a separate Express service. The tracker, snapshot worker, and heatmap proxy are independently built services.
- `packages/ui` owns shared shadcn primitives, `packages/contracts` owns browser-safe schemas/types, and `packages/backend-types` is server-only. Keep product-specific UI in its app. For Airship work, read `apps/airship-web/AGENTS.md`.
- Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`.

## Commands

- `pnpm install` installs dependencies. `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; use `pnpm format:check` to validate formatting.
- There is no root test script. Available focused tests are `pnpm --filter @pathlens/api test:geoip`, `test:heatmaps`, `test:preview-sessions`, `test:authorization`, `pnpm --filter @pathlens/snapshot-worker test`, and `pnpm --filter @pathlens/heatmap-proxy test`.
- Heatmap proxy browser checks are `pnpm --filter @pathlens/heatmap-proxy test:browser`, `test:browser:js`, or `test:framework`; `test:framework` builds `@pathlens/heatmap-proxy-fixtures` first.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; it emits the IIFE at `apps/pathlens-tracker/dist/tracker.global.js`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.

## Boundaries

- Copy the relevant `apps/*/.env.example` to that package's `.env` before local development. The API, heatmap proxy, and snapshot worker rely on package-local environment values.
- TanStack Router generates `src/routeTree.gen.ts` in both web apps; never edit it. Add routes under the owning app's `src/routes`.
- Pathlens API Lambda entrypoint is `apps/pathlens-api/src/index.ts`; local `src/server.ts` serves `/api` on port `8080`. The heatmap proxy defaults to `8082`; Airship API defaults to `8081` and honors `PORT`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep event/replay ingestion, tracking config, billing, OAuth, and internal heatmap validation before `ApiKeyMiddleware`; later top-level routes require `x-api-key` matching `INTERNAL_API_SECRET`.
- Keep Stripe's raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`; JWT operations require `JWT_SECRET`.

## Snapshot Worker

- Local capture needs PostgreSQL/AWS values, LocalStack on port `4566`, the queue created with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, Chromium from `pnpm --filter @pathlens/snapshot-worker install-browser`, then `pnpm --filter @pathlens/snapshot-worker local`.

## Style

- Root, Pathlens web, and most packages use Prettier single quotes/no semicolons. Pathlens API and tracker use double quotes/semicolons; Airship web and `packages/ui` use double quotes/no semicolons. Tailwind class sorting is enabled.
