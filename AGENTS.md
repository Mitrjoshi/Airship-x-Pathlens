# Agent Guide

## Workspace

- This is a pnpm 10 (`pnpm@10.0.0`) Turborepo workspace. Install from the root with `pnpm install`; use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, and `@pathlens/tracker`. Shared packages are `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Keep product features in their owning app. `packages/ui` owns shared shadcn UI/hooks/styles, `packages/contracts` owns browser-safe schemas/types, and `packages/backend-types` owns server-only types.
- Import shared UI through `@workspace/ui/components/*`; add shadcn primitives to `packages/ui` with `pnpm --filter @workspace/ui exec shadcn add <component>`, not to an app.

## Commands

- Root scripts are `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm verify`, `pnpm format`, and `pnpm format:check`; `pnpm verify` runs Turborepo `lint`, `typecheck`, and `build`.
- Only the two web apps define `lint`; no test script or test framework is configured. Focused checks include `pnpm --filter @pathlens/web lint`, `pnpm --filter @airship/web lint`, `pnpm --filter @pathlens/api typecheck`, and `pnpm --filter @pathlens/tracker build`.
- After editing `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`. Use `push` only for intentional direct synchronization and `studio` for Drizzle Studio.

## Runtime And Env

- `apps/pathlens-api` mounts the Express/PostgreSQL API at `/api` on port `8080`; `apps/airship-api` currently exposes only `/health` on `PORT` or `8081`.
- Preserve Pathlens route order: `/events` and `/replay` are mounted before the global `ApiKeyMiddleware`. Their ingestion POSTs use encrypted payloads, require `X-Project-Key`, and verify each payload `projectId` matches it; routes after that middleware require `x-api-key` matching `INTERNAL_API_SECRET`, with JWT and workspace-permission middleware where declared.
- Pathlens API `dev` and `start` load `apps/pathlens-api/.env` via `tsx --env-file=.env`; provide `DATABASE_URL`, `JWT_SECRET`, and `INTERNAL_API_SECRET`, with PostgreSQL reachable at `DATABASE_URL`. Pathlens web requires `VITE_API_BASE_URL` and `VITE_API_KEY`, which must match the API secret for protected requests.
- No `.env.example` files are checked in despite the README reference. Create ignored local env files and never commit their values.
- Pathlens web sends `VITE_API_KEY` as `x-api-key` and stores the bearer token in localStorage as `pathlens-token`; preserve both names in auth changes.

## Generated And Style

- Both web apps use file-based TanStack Router routes under `src/routes`; the Vite plugin generates `src/routeTree.gen.ts`. Do not edit generated route trees, `dist/**`, or `apps/pathlens-api/drizzle/meta/**`.
- Generate Drizzle migrations under `apps/pathlens-api/drizzle/`; root Prettier ignores that directory and generated route trees.
- The tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; its build is the minified IIFE `dist/tracker.global.js`. The script requires `data-project-id`, defaults event and replay ingestion to `http://localhost:8080/api/events` and `http://localhost:8080/api/replay/chunks`, encrypts both payloads with that project key, and sends it as `projectId` plus `X-Project-Key`, not `x-api-key`.
- The web apps and `packages/ui` reject unused locals/parameters and use `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
- Follow the nearest `.prettierrc`: root, Pathlens web, Airship API, contracts, and backend types use single quotes/no semicolons; Airship web and UI use double quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons.
- When editing `apps/airship-web`, also follow `apps/airship-web/AGENTS.md`.
