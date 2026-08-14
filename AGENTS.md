# Agent Guide

## Workspace

- This is a pnpm 10 (`pnpm@10.0.0`) Turborepo. Run `pnpm install` from the root, then use `pnpm --filter <package> <script>` for focused work.
- Apps: `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, and `@pathlens/tracker`. Shared packages: `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Keep product features in the owning app. `packages/ui` owns shared shadcn UI/hooks/styles, `packages/contracts` owns browser-safe schemas/types, and `packages/backend-types` is server-only.
- Import shared UI from `@workspace/ui/components/*`. Add shadcn primitives from the root with `pnpm --filter @workspace/ui exec shadcn add <component>`, not inside an app.

## Commands

- Use `pnpm dev` to start all development tasks in parallel. Root checks are `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm verify`; `pnpm verify` runs Turborepo `lint`, `typecheck`, and `build`. There is no test script or test framework.
- Useful focused commands are `pnpm --filter @pathlens/web lint`, `pnpm --filter @airship/web lint`, `pnpm --filter @pathlens/api typecheck`, and `pnpm --filter @pathlens/tracker build`.
- After changing `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`. Use `push` only for deliberate direct synchronization and `studio` for Drizzle Studio.
- Formatting uses `pnpm format` or `pnpm format:check`; the root config is no semicolons/single quotes, while `packages/ui/.prettierrc` overrides to no semicolons/double quotes. Read `apps/airship-web/AGENTS.md` for that app's additional rules.

## Runtime And Boundaries

- `apps/pathlens-api` is an Express/PostgreSQL API mounted at `/api` on port `8080`; its `dev`/`start` scripts load `apps/pathlens-api/.env` and require `DATABASE_URL`, `JWT_SECRET`, and `INTERNAL_API_SECRET`.
- `apps/airship-api` only exposes `/health` and listens on `PORT` or `8081`. No `.env.example` files are checked in even though the README mentions them; local `.env` files are ignored and must not be committed.
- Pathlens web uses `VITE_API_BASE_URL` and `VITE_API_KEY`, sends the latter as `x-api-key`, and stores its bearer token as `pathlens-token`; preserve these names in auth changes.
- In `apps/pathlens-api/src/routes/index.ts`, keep `/events` and `/replay` before the global `ApiKeyMiddleware`. Ingestion POSTs use encrypted bodies with `X-Project-Key` and must reject mismatched payload `projectId` values; protected requests use `x-api-key` plus route-declared JWT/permission middleware.
- Both web apps use file-based TanStack Router routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Do not edit that file or `apps/pathlens-api/drizzle/meta/**` by hand.
- The tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; `pnpm --filter @pathlens/tracker build` creates a minified IIFE at `dist/tracker.global.js`. It requires `data-project-id`, encrypts payloads with that project key, defaults to `/api/events` and `/api/replay/chunks` on localhost port `8080`, and uses `X-Project-Key`, not `x-api-key`.
- Web apps and `packages/ui` enforce `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`; avoid TypeScript constructs that require runtime emission.
