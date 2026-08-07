# Agent Guide

## Workspace

- This is a pnpm 10 workspace (`apps/*`, `packages/*`) managed by Turborepo; run `pnpm install` at the root and use `pnpm --filter <package> <script>` for focused work.
- App filters are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, and `@pathlens/tracker`; shared packages are `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Keep product-specific UI and behavior in its app. Put shared shadcn primitives in `packages/ui`, browser-safe wire schemas in `packages/contracts`, and server-only types in `packages/backend-types`.
- Declare workspace imports in the consumer `package.json` with `workspace:*`; do not rely on transitive dependencies.

## Commands

- `pnpm dev` starts all declared dev tasks in parallel. Root `pnpm verify` runs the Turborepo `lint`, `typecheck`, and `build` tasks; `pnpm format` and `pnpm format:check` run Prettier.
- Only the two web apps declare `lint`; APIs, the tracker, and shared packages expose different subsets of `build` and `typecheck`. Use only scripts declared by the filtered package.
- No test script or test framework is configured; use the available lint, typecheck, and build checks instead of inventing a test command.
- Add a shared shadcn component from the root with `pnpm --filter @workspace/ui exec shadcn add <component>`; it writes to `packages/ui/src/components/ui` for both web apps.
- After editing `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`; use `push` only for intentional direct synchronization and `studio` for Drizzle Studio.

## Runtime Boundaries

- `apps/pathlens-api/src/index.ts` is the Express/PostgreSQL API on port `8080`, mounted under `/api`; `apps/airship-api/src/index.ts` currently exposes only `/health` and defaults to port `8081` (or `PORT`).
- Preserve Pathlens route order: `/events` is mounted before the global `ApiKeyMiddleware`; `POST /api/events` validates each payload `projectId` as a project API key, while later route groups require `x-api-key` and protected handlers may also require Bearer JWT and permissions.
- Pathlens API and Drizzle commands load `apps/pathlens-api/.env`; provide `DATABASE_URL`, `JWT_SECRET`, and `INTERNAL_API_SECRET`, with PostgreSQL reachable through `DATABASE_URL`. Pathlens web requires `VITE_API_BASE_URL` and `VITE_API_KEY` in its Vite environment.
- Pathlens web sends `VITE_API_KEY` as `x-api-key` and stores its bearer token under `pathlens-token` in localStorage; preserve that key when changing auth flows.
- Both web apps use file-based TanStack Router routes under `src/routes`; the Vite plugin generates `src/routeTree.gen.ts`.
- Tracker source is `apps/pathlens-tracker/src`; its build is a minified IIFE at `dist/tracker.global.js`, requires `data-project-id`, defaults to `http://localhost:8080/api/events`, and batches events before posting.

## Boundaries And Style

- Do not edit `dist/**`, either `src/routeTree.gen.ts`, or `apps/pathlens-api/drizzle/meta/**`. Generate migrations into `apps/pathlens-api/drizzle/` from the schema; Drizzle output is excluded from Prettier.
- Follow the nearest `.prettierrc`: root/pathlens-web/airship-api/contracts/backend-types use single quotes without semicolons; airship-web/ui use double quotes without semicolons; pathlens-api/tracker use double quotes with semicolons.
- Never commit local `.env` values.
- When editing `apps/airship-web`, also follow `apps/airship-web/AGENTS.md`.
