# Agent Guide

## Workspace

- This is a pnpm 10 workspace (`apps/*`, `packages/*`) orchestrated by Turborepo. Run `pnpm install` at the root; use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, and `@pathlens/tracker`. The live backend is `apps/pathlens-api`; `apps/airship-api` is currently only `GET /health` on port `8081` by default.
- Shared packages are `@workspace/ui` (shadcn primitives, hooks, utilities, and styles), `@workspace/contracts` (browser-safe wire schemas/types), and `@workspace/backend-types` (server-only shared types).

## Commands

- `pnpm dev` starts every persistent dev task in parallel. Prefer `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, `pnpm --filter @pathlens/api dev`, or `pnpm --filter @pathlens/tracker dev` for one app; use only scripts declared by that package.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` run the repository Turborepo tasks. `pnpm verify` runs lint, typecheck, and build; `pnpm format` and `pnpm format:check` run Prettier.
- Only the two web apps declare `lint`; APIs, the tracker, and shared packages expose different subsets of `build` and `typecheck`, so do not assume every package has every script.
- No test script or test framework is configured. Do not invent a test command; use the available lint, typecheck, and build checks.
- Add shared shadcn components from the root with `pnpm --filter @workspace/ui exec shadcn add <component>`; this writes to `packages/ui/src/components/ui` for both web apps.
- For Pathlens DB work, copy `apps/pathlens-api/.env.example` to `apps/pathlens-api/.env`, edit `apps/pathlens-api/src/db/schema.ts`, then run `pnpm --filter @pathlens/api generate` followed by `pnpm --filter @pathlens/api migrate`. Use `push` only for intentional direct schema synchronization; `studio` opens Drizzle Studio.

## Architecture And Runtime

- Both web apps use file-based TanStack Router routes under `src/routes`; the Vite plugin regenerates `src/routeTree.gen.ts`. Never edit either generated route tree.
- Keep product-specific layouts, navigation, themes, and features in the owning app. Add shared shadcn primitives in `packages/ui` using `packages/ui/components.json`; put shared wire schemas in `packages/contracts`.
- The Pathlens API entrypoint is `apps/pathlens-api/src/index.ts`; it listens on `8080` and mounts routes under `/api`. Its `DATABASE_URL`, `JWT_SECRET`, and `INTERNAL_API_SECRET` come from `apps/pathlens-api/.env`.
- Preserve API route order: `POST /api/events` is before the global `x-api-key` middleware and validates the event `projectId` against project API keys; the other route groups require `x-api-key` and some also require `Authorization: Bearer`.
- Pathlens web uses `VITE_API_BASE_URL` and `VITE_API_KEY`, sends the latter as a browser-visible `x-api-key`, and stores its bearer token as `pathlens-token` in localStorage.
- The tracker is a minified IIFE at `apps/pathlens-tracker/dist/tracker.global.js`; its script requires `data-project-id`, defaults to `http://localhost:8080/api/events`, and batches events before sending them.

## Generated Files And Style

- Do not edit `dist/**`, `src/routeTree.gen.ts`, or generated Drizzle output. Drizzle migrations belong in `apps/pathlens-api/drizzle/` and are excluded from Prettier.
- Follow the nearest `.prettierrc`: `apps/airship-web` and `packages/ui` use double quotes without semicolons; `apps/pathlens-api` and `apps/pathlens-tracker` use double quotes with semicolons; other apps/packages use the root single-quote/no-semicolon style. Tailwind class sorting is enabled.
- `.env` files, dependencies, `dist`, and Turborepo cache are ignored. Commit only `.env.example` files, never local environment values.
- Declare every workspace import in the consumer `package.json` with `workspace:*`; do not rely on transitive dependencies.
- When editing `apps/airship-web`, also follow its local `AGENTS.md`.
