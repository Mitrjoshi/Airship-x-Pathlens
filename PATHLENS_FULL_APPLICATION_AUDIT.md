# Pathlens Full Application Audit

**Audit date:** 2026-11-13  
**Repository revision inspected:** `da584bb`  
**Scope:** repository-driven, read-only review of source, contracts, schemas, workers, deployment templates, scripts, tests, and tracked artifacts. No application, configuration, dependency, database, migration, or infrastructure files were changed.

## 1. Executive Summary

Pathlens has a coherent multi-package architecture and several strong defensive controls: project API keys are hashed, tracking payloads are authenticated and encrypted, preview handles are random and stored hashed, OAuth state is persisted and consumed atomically, Stripe signatures are verified before JSON parsing, and the heatmap proxy has extensive SSRF/content-type/redirect tests.

The application is **not ready for production based on the inspected scope**. The most serious confirmed issues are:

1. User passwords are stored and compared in plaintext.
2. The tracked API environment example contains reusable secret material, and the actual local environment contains the same encryption key pattern; the key must be treated as exposed if it was ever used outside local development.
3. Several workspace mutation and administration routes rely on controller checks rather than route-level permission middleware, creating inconsistent authorization coverage and a high regression/IDOR risk.
4. JWTs are bearer tokens with seven-day lifetime and no database-backed revocation or security-event invalidation.
5. Authentication and public tracking endpoints have no repository-visible rate limiting or abuse throttling.
6. Analytics and event schemas accept arbitrary passthrough properties and persist client-supplied identifiers, timestamps, and metadata with limited semantic validation.
7. Project reset/deletion performs storage deletion before the database transaction and does not visibly cover every derived, queued, or external artifact.
8. Deployment configuration contains mutable `latest` image deployment commands and hardcoded AWS account/region/resource identifiers.
9. Web lint is failing, including React effect, ref, and type-safety violations in application code.

### Finding counts

| Classification | Count |
|---|---:|
| Confirmed | 42 |
| Probable | 11 |
| Potential / follow-up | 6 |
| Informational / cleanup | 5 |

| Severity | Confirmed | Probable or potential |
|---|---:|---:|
| Critical | 0 | 1 |
| High | 8 | 3 |
| Medium | 24 | 9 |
| Low | 10 | 5 |
| Informational | 5 | 0 |

The absence of a confirmed Critical finding is not evidence of production safety: live AWS IAM, S3 policies, database state, runtime headers, CI permissions, historical secrets, and deployed API Gateway/Lambda configuration were not available for verification.

## 2. Application Architecture

### Repository inventory

| Area | Location | Observed responsibility |
|---|---|---|
| Dashboard frontend | `apps/pathlens-web` | Vite/React 19, TanStack Router and Query, analytics dashboards, billing, settings, preview UI |
| HTTP API | `apps/pathlens-api` | Express 5 routes, JWT auth, workspace permissions, event ingestion, analytics, integrations, billing |
| Browser tracker | `apps/pathlens-tracker` | Event collection, replay recording, batching, encrypted delivery |
| Heatmap proxy | `apps/pathlens-heatmap-proxy` | Lambda-compatible preview proxy, URL authorization, HTML/CSS/JS rewriting, SSRF controls |
| Snapshot worker | `apps/pathlens-snapshot-worker` | SQS-driven Playwright/Chromium capture and private S3 upload |
| Contracts | `packages/contracts` | Shared Zod schemas, event/replay/permission contracts |
| Backend types | `packages/backend-types` | Server-only auth types |
| Shared UI | `packages/ui` | shadcn-style primitives and shared styles |
| Database | `apps/pathlens-api/src/db/schema.ts` | PostgreSQL schema via Drizzle; 64 migration snapshots were present |
| Deployment | `apps/*/Dockerfile`, `template.yaml`, root scripts | Lambda container builds, SQS, S3, ECR, scheduled notifications |

### Main data flows

1. Dashboard calls `/api/*` with `x-api-key: INTERNAL_API_SECRET` plus a Bearer JWT.
2. Protected API routes run JWT authentication and, inconsistently, workspace permission middleware or controller-level membership checks.
3. Tracker sends encrypted events/replay chunks with `X-Project-Key`; the API resolves a hashed project API key, checks expiry/scopes/domain origin, decrypts, injects the canonical project ID, and persists data.
4. Analytics queries scope by supplied workspace/project identifiers. Route middleware generally validates workspace membership, while model-level queries provide additional project scoping in many read paths.
5. Preview sessions are created by the API, stored with a hashed random handle, and consumed by the heatmap proxy through HMAC-authenticated validation.
6. Project snapshots and report files are stored in S3 and returned using presigned URLs.
7. Snapshot jobs use SQS and a Lambda/Playwright worker. Slack notifications use database delivery rows and SQS/Lambda handlers.
8. OAuth integrations use short-lived database state plus HttpOnly state cookies, then encrypt provider credentials with AES-256-GCM.

### Trust boundaries

- Arbitrary browser/customer websites -> public tracker ingestion.
- Browser dashboard -> API Gateway/API with bearer JWT and internal API key.
- API -> PostgreSQL, S3, SQS, Stripe, Slack, Google, GitHub, Resend.
- SQS messages -> snapshot and notification workers.
- Heatmap preview session -> proxy -> customer website resources.
- CI/developer workstation -> Docker/ECR/Lambda deployment.

## 3. Audit Coverage

### Inspected

- Root package, pnpm workspace, Turbo configuration, lockfile presence, scripts, README, and tracked artifacts.
- All API route files under `apps/pathlens-api/src/routes` (158 route/middleware matches inventoried).
- API entrypoint, CORS, parsing, auth, API-key, proxy-auth, encrypted-ingestion middleware.
- API controllers, models, contracts, schema, connection options, encryption helpers, S3/SQS helpers, OAuth, billing, notifications, and project deletion/reset paths.
- Tracker source, replay source, tracker contracts, tests, and bundle configuration.
- Heatmap proxy source, Dockerfile, SSRF controls, rewriting, authorization, and all available unit tests.
- Snapshot worker source, Dockerfile, SAM template, S3 policy, queue handler, message validation, browser and storage logic.
- Frontend routes/components/hooks by repository inventory, suspicious-pattern search, and lint execution.
- Environment examples without printing values from local environment files.
- Package manifests and available dependency lockfile; no external vulnerability database result was available.

### Not verified

- Live deployed AWS IAM, API Gateway, Lambda environment, S3 bucket policy/versioning, CloudWatch, WAF, DNS, database RLS, backups, and queue attributes.
- Production database contents, query plans, migration execution state, and historical Git secret exposure beyond current tracked-file inspection.
- Browser/runtime behavior against real customer websites, OAuth providers, Stripe, Slack, Google, GitHub, and Resend.
- CI/CD workflow files: no `.github` files were found by repository globbing.

## 4. Hardcoded Values

| ID | Type | Location | Hardcoded value description | Risk | Recommendation |
|---|---|---|---|---|---|
| HARD-001 | Secret in example | `apps/pathlens-api/.env.example:24,36` | Non-empty proxy shared secret and 32-byte integration encryption key are committed in an example file | **High** if used in any environment; anyone with repository access can decrypt or forge protected material | Replace with empty placeholders and rotate any corresponding deployed keys; add secret scanning and history review |
| HARD-002 | Endpoint | `apps/pathlens-tracker/src/utils.ts:21-25`, `tsup.config.ts:28-35` | Default API Gateway development endpoint is embedded in tracker source/build | Medium: development/staging traffic can be sent to an unintended account and configuration is difficult to audit | Require an explicit build-time endpoint for release artifacts; retain a local-only development default outside published code |
| HARD-003 | Cloud identity | `package.json:17-20`, `apps/pathlens-api/src/lib/snapshot-queue.ts:4`, `apps/pathlens-api/template.yaml:17`, deployment docs/scripts | AWS account, region, ECR, queue, and stack names are embedded | Low/Medium: environment coupling and accidental deployment to the wrong account | Centralize deployment target configuration and require explicit account/region confirmation |
| HARD-004 | Unsafe fallback | `apps/pathlens-api/src/app.ts:22`, `password-reset.controller.ts:57`, `preview-sessions.controller.ts:50` | Production-facing URLs fall back to localhost | Medium: malformed production configuration can produce unusable redirects, reset links, or iframe URLs | Fail startup for required production URLs; permit localhost only under an explicit development mode |
| HARD-005 | Business defaults | `apps/pathlens-api/src/lib/s3.ts:9-13`, `snapshot-worker/src/storage.ts:8`, `jwt.ts:11`, `preview-session.ts:14` | Bucket names, presign durations, token TTL, preview TTL are constants | Low/Medium: retention/access windows and infrastructure can drift from product policy | Document and validate policy-controlled values; keep constants only where intentionally invariant |

No active secret value from `.env` files is reproduced in this report. Local `.env` files were observed but were not treated as tracked source; their values require operational rotation if ever shared or deployed.

## 5. Missing Permissions and API Permission Matrix

### Confirmed and probable authorization findings

| ID | Endpoint/action | Current authorization | Missing/inconsistent check | Severity | Fix |
|---|---|---|---|---|---|
| AUTH-001 | `POST/PATCH/DELETE /api/workspaces/:workspace_id/*` in `workspaces.route.ts:34-77` | JWT only at router; some controllers perform their own checks | Permission enforcement is split between route and controller, and several reads/mutations have no route middleware. This is fragile and makes future controller reuse unsafe | **High**, confirmed inconsistency | Apply explicit permission middleware per action, retain controller ownership checks as defense in depth, and add denial tests for every route |
| AUTH-002 | `GET /api/notifications`, accept/read | JWT only; models scope recipient ID | No workspace permission is required, though recipient scoping makes direct cross-user access unlikely | Medium, probable | Keep recipient-only behavior for invitation acceptance, but enforce safe notification type/action rules and test revoked/deleted workspace cases |
| AUTH-003 | `POST /api/feedback` | JWT only | No workspace membership or product permission is required; user-wide feedback may be intentional but is undocumented | Low, potential | Document it as account-scoped or require a minimal authenticated account policy |
| TENANT-001 | Analytics/event/report query families | Middleware uses supplied workspace/project IDs; many models filter both | Contract and model layers do not consistently enforce that the workspace ID is the authenticated user’s workspace; they rely on route middleware. Any route reuse or middleware omission becomes an IDOR | **High**, probable | Centralize an authorization context containing authenticated user, workspace, and project; pass it to models instead of trusting request IDs |
| TENANT-002 | `apps/pathlens-api/src/models/projects.model.ts:552-559` and project reset/delete paths | Helper accepts only project ID | Resource helper does not itself verify workspace ownership. It is safe only when every caller has already checked access | Medium, confirmed design hazard | Add scoped model variants requiring workspace ID and make unscoped helper private or remove it |

### Complete route inventory

| Route group | Authentication | Permission coverage observed |
|---|---|---|
| `events` | Ingest: project key; reads: API key + JWT | Event reads require `analytics.events.view`; ingestion uses project key scopes |
| `replay` | Project key | Public ingestion uses project key and replay scope |
| `billing` | Webhook signature; checkout/entitlement JWT | No workspace permission; account-scoped by design |
| OAuth login/callbacks | Provider state / callback | OAuth state and provider checks; no dashboard JWT on callback |
| `/internal/heatmap-proxy/validate` | HMAC proxy auth | HMAC and payload validation |
| `/auth` | Public login/reset; JWT after router middleware | Account actions are controller-scoped; `GET /users/:user_id` requires workspace query and membership but no named permission |
| `/integrations` | JWT | Installed listing and Google connect have middleware; Slack/Stripe connect rely on controller `assertProjectAccess`; catalog endpoints are authenticated but not permission-gated |
| `/errors`, `/campaigns` | JWT | Named analytics permission |
| `/workspaces` | JWT | Mixed: several controller-level permission checks, several route-level checks, and several JWT-only routes |
| `/notifications` | JWT | Recipient-scoped model operations, no named permission |
| `/feedback` | JWT | Account-scoped, no named permission |
| `/projects` | JWT | Broad route coverage; some project-specific actions use `requireWorkspacePermission`, which derives workspace from project but does not accept a caller-provided workspace binding |
| `/dashboard`, `/analytics`, `/visitors`, `/session-replay`, `/user-journey`, `/heatmaps`, `/funnels`, `/goals`, `/performance` | JWT | Named permission middleware; query models must remain scoped to the same workspace/project pair |
| `/heatmaps/preview-sessions` | JWT | Project/session-aware middleware and tests |

The matrix establishes route inventory and static checks; it does not prove live authorization because no authenticated integration test against a database was run.

## 6. Security Vulnerabilities

### SEC-001 — Plaintext password storage and comparison

- **Category:** Authentication / credential security
- **Severity:** **High**; **Confidence:** Confirmed
- **Evidence:** `apps/pathlens-api/src/controllers/users.controller.ts:46-48` compares `user.password !== password`; `:181-185` writes the submitted password through `createUserModel`; `apps/pathlens-api/src/models/password-reset.model.ts:70-73` writes the reset password directly. `users.password` is a nullable text column at `schema.ts:278-281`.
- **Root cause:** Password hashing was not implemented; the source comment explicitly says to replace it with bcrypt.
- **Impact:** Database read access, backups, logs containing rows, or accidental data export exposes usable credentials. Password reuse can compromise external accounts.
- **Conditions:** Any account created with a password or reset through the password-reset endpoint.
- **Fix:** Use a memory-hard password hash such as Argon2id or a vetted bcrypt configuration; support a one-time migration-on-login/reset strategy, invalidate existing sessions after reset, and never return or log hashes.
- **Regression risk:** Existing plaintext accounts need a compatibility migration; login behavior changes only for credential verification, not UX.
- **Validation:** Unit-test hash creation, constant-time verification, reset invalidation, wrong-password rejection, and migration of legacy records without logging plaintext.
- **Deployment/rollback:** Deploy verification before changing writes; perform controlled hash migration. Rollback must not re-enable plaintext writes.

### SEC-002 — Committed reusable secret material

- **Severity:** **High**; **Confidence:** Confirmed
- **Evidence:** `apps/pathlens-api/.env.example:24` has a non-empty proxy secret and `:36` has a non-empty encryption key. The values are tracked by source context and are not placeholders.
- **Impact:** If deployed or reused, attackers with repository access can authenticate proxy validation or decrypt integration credentials; the encryption key compromises all credentials encrypted under it.
- **Fix:** Remove values from examples, rotate proxy/encryption keys, re-encrypt stored credentials, scan Git history and CI logs, and use AWS Secrets Manager/KMS.
- **Validation:** Secret scanner, key-version migration test, decrypt-old/re-encrypt-new test, and negative test proving old key no longer authenticates.

### SEC-003 — Bearer JWTs lack revocation and security-event invalidation

- **Severity:** **High**; **Confidence:** Confirmed
- **Evidence:** `apps/pathlens-api/src/lib/jwt.ts:9-16` signs seven-day JWTs and verification only checks the signature/standard expiry. No token ID, session table, revocation lookup, logout route, password-change invalidation, or account-disabled check was found.
- **Impact:** A stolen token remains usable for up to seven days after logout, password change, role downgrade, membership removal, or account deletion, subject to any other checks.
- **Fix:** Add short-lived access tokens plus rotating refresh sessions, or add a revocable session/version claim checked server-side. Invalidate on password/security changes and account/workspace membership changes.
- **Regression risk:** Multi-tab sessions and OAuth callbacks need coordinated refresh behavior.
- **Validation:** Revocation tests for logout, reset, password change, account deletion, role downgrade, and removed workspace membership.

### SEC-004 — No repository-visible rate limiting on auth, reset, or ingestion

- **Severity:** **High**; **Confidence:** Confirmed at repository scope
- **Evidence:** No rate-limit middleware/dependency was found. Public handlers include login/signup/reset (`users.route.ts:21-24`) and project-key ingestion (`events.route.ts:14-18`, `replay.route.ts:7-11`).
- **Impact:** Credential brute force, reset-email abuse, database amplification, event flooding, storage exhaustion, and provider-cost abuse.
- **Fix:** Add edge/WAF and application quotas keyed by IP, account, project key, and workspace; use bounded body/rate budgets and `Retry-After` responses. Preserve legitimate tracker batching.
- **Validation:** Load tests in isolated resources for burst limits, legitimate batch traffic, reset email throttling, and per-tenant fairness.

### SEC-005 — Trusted proxy configuration can spoof client IP

- **Severity:** Medium; **Confidence:** Confirmed
- **Evidence:** `apps/pathlens-api/src/app.ts:47` sets `app.set("trust proxy", true)` and event ingestion uses `getClientIp(req)` at `events.controller.ts:50`.
- **Impact:** If the API is reachable through an untrusted path, clients can forge `X-Forwarded-For`, corrupt geo attribution, bypass IP-based controls once added, and poison abuse telemetry.
- **Fix:** Configure exact trusted proxy hops/CIDRs for the deployed topology and make client-IP extraction reject untrusted forwarded headers.
- **Validation:** Requests through trusted and direct/untrusted paths with conflicting forwarding headers.

## 7. Authentication and Session Issues

- `AUTH-003` (High, confirmed): plaintext passwords as detailed in SEC-001.
- `AUTH-004` (Medium, confirmed): login and signup allow minimum six-character passwords (`users.controller.ts:22-31`, `86-103`), while password change requires eight (`:132-141`), producing inconsistent policy. Adopt one documented server-side policy during hash migration.
- `AUTH-005` (Medium, probable): JWT verification does not constrain issuer, audience, or accepted algorithm (`jwt.ts:15-16`). Signature verification by `jsonwebtoken` is present, but a fixed algorithm/issuer/audience policy is not explicit. Add explicit verification options and claims.
- `AUTH-006` (Medium, confirmed): no account lockout/backoff or login/reset throttling was found. See SEC-004.
- `AUTH-007` (Medium, confirmed): OAuth login returns the JWT in the URL fragment (`google-auth.controller.ts:202-205`, `github-auth.controller.ts:228-231`). Fragments are not sent in HTTP Referer, but they are accessible to page scripts and browser extensions and require careful callback token handling. Prefer an HttpOnly/SameSite session exchange or one-time code.
- `AUTH-008` (Potential): no email verification flow was found for password signup; applicability depends on product requirements.

## 8. Multi-Tenant Isolation Issues

### TENANT-003 — Denormalized workspace/project relationships are not database-enforced

- **Severity:** Medium; **Confidence:** Confirmed
- **Evidence:** `schema.ts:645-668` defines projects with `workspace_id`; `funnels`, `goals`, `events`, replay, snapshots, and attribution also store both project and workspace IDs, but the shown schema defines separate foreign keys rather than composite foreign keys proving the project belongs to that workspace.
- **Impact:** A bad write or migration can create cross-tenant rows. Queries that filter both IDs may silently return incomplete or inconsistent data rather than rejecting corruption.
- **Fix:** Add composite integrity constraints where supported, or remove redundant workspace IDs from derived tables and derive through project joins. Add consistency checks before migration.
- **Validation:** Database-level attempt to insert mismatched workspace/project pairs; cross-tenant query tests.

### TENANT-004 — Authorization context is request-ID driven

- **Severity:** High/probable; **Confidence:** Probable
- **Evidence:** `permission.middleware.ts:20-42` derives workspace from params/query/body, and analytics controllers pass `workspace_id`/`project_id` directly (`analytics.controller.ts:6-25`). Route middleware usually checks membership, but the model APIs accept raw IDs.
- **Impact:** A future route omission, controller reuse, or inconsistent middleware can expose another project in a workspace or cause cross-workspace joins.
- **Fix:** Resolve an authorization context once from authenticated user and canonical resource, then pass only authorized IDs to models. Add a negative test for every route family.

### TENANT-005 — Project reset/deletion cleanup is not transactionally atomic across storage

- **Severity:** High/probable; **Confidence:** Confirmed for ordering, probable for completeness
- **Evidence:** `projects.model.ts:561-575` reads S3 paths and calls `deleteStoredObjects` before the database transaction; `:578-615` then deletes rows. `:618-620` deletes the project directly. SQS messages, caches, notification deliveries, and all possible derived artifacts are not visible in this cleanup function.
- **Impact:** S3 deletion failure leaves database data intact but returns an error; database failure after storage deletion loses files; pending jobs can recreate data or process deleted projects; incomplete cleanup can retain personal analytics.
- **Fix:** Use a deletion state machine/outbox, idempotent worker cleanup, transactionally recorded object keys, queue cancellation/tombstones, and post-delete verification.
- **Validation:** Inject failures before/after S3 and DB steps; delete while ingestion/snapshot/notification jobs are pending.

## 9. API and Input Validation Issues

- **API-001** — `packages/contracts/src/events.ts:136-197` uses `.passthrough()` for incoming events. **Medium, confirmed.** Arbitrary keys are persisted in `events.payload` at `events.model.ts:508`, allowing unbounded semantic data collection and schema drift. Use an allowlist or bounded custom-property schema with depth/total-byte limits.
- **API-002** — Client timestamps and IDs are accepted with weak semantic bounds (`events.ts:138-142`). **Medium, confirmed.** Backdated/future events, forged visitor/session IDs, and duplicate batches can distort analytics and quotas. Bound timestamp skew, normalize identifiers, and add idempotency/deduplication semantics.
- **API-003** — `express.json({ limit: "5mb" })` at `app.ts:46` applies a relatively large global request limit. **Medium, potential.** It is needed for some payloads but increases memory/CPU exposure for auth and small endpoints. Use route-specific limits and reject unexpected content types.
- **API-004** — API responses expose raw `Error.message` in multiple controllers, for example `billing.controller.ts:69-75`, `workspace.controller.ts:132-140`, and report generation `:184-189`. **Medium, confirmed.** Provider/database/config details can leak to clients. Return stable public errors and log internal details with correlation IDs.
- **API-005** — No API-wide security-header middleware was found in `app.ts`. **Medium, confirmed at source scope.** CORS is configured, but HSTS, CSP where applicable, `X-Frame-Options`/frame-ancestors, and explicit cache policy for authenticated responses are not globally established. Add headers compatible with the embedded tracker and preview proxy.
- **API-006** — CORS tracker origin is `true` (`app.ts:26-31`). **Low/Medium, confirmed by design.** This is reasonable for public customer tracking but must not be used for dashboard routes; preserve the path allowlist and add tests proving `/api` dashboard routes never receive credentialed wildcard behavior.
- **API-007** — `HTMLInjecttion.middleware.ts` decodes arbitrary values with `decodeURIComponent` without catching malformed sequences (`:8-16`) and is not visibly mounted in `app.ts`. **Low, probable.** Do not rely on generic HTML blocking as validation; use route schemas and output encoding.

## 10. Tracking SDK and Analytics Issues

- **SDK-001** — Event listeners are registered as anonymous functions in `events.ts:204-347`; `PathLensTracker.destroy()` only clears its interval and stops replay (`tracker.ts:126-133`). **Medium, confirmed.** Reinitializing/destroying a tracker leaves document/window listeners active, causing duplicate events, memory retention, and host-page overhead. Store listener references and remove them on destroy; make initialization idempotent.
- **SDK-002** — `tracker.ts:66-90` assumes browser globals (`screen`, `window`, `navigator`, `document`) during init. **Low, confirmed.** If a host calls the SDK during unusual prerender/SSR/browser lifecycle conditions, exceptions can affect host code. Guard globals and contain all tracker exceptions.
- **SDK-003** — Replay masks all inputs but normal text requires customer opt-in selector (`replay.ts:71-78`). **Medium, potential/privacy review required.** Sensitive text outside inputs can be recorded. Confirm product privacy policy, default masking requirements, consent gating, and DOM snapshot sanitization against real sites.
- **SDK-004** — Event payload captures form `action`, URLs, error messages/stacks, arbitrary custom properties, and user agent (`events.ts:290-303`, contracts `:136-197`). **Medium, confirmed data-minimization concern.** Sensitive query/path data can enter storage. Apply field-level redaction, URL query stripping, stack scrubbing, and documented retention.
- **SDK-005** — Replay flush retries by reinserting the same events into memory (`replay.ts:138-143`) but has no maximum pending queue or offline expiry. **Medium, confirmed.** A failed network can grow memory indefinitely on long sessions. Add bounded queue/backoff/drop telemetry without blocking the host page.
- **SDK-006** — Project API-key origin authorization depends on Origin/Referer (`encrypted-tracking-payload.middleware.ts:66-78`). **Low, confirmed limitation.** These headers are absent or forgeable outside browsers; the API key remains the actual credential. Add abuse controls rather than treating origin as authentication.

## 11. Unused Code, Dependencies, and Resources

| ID | Resource | Location | Evidence | Confidence | Safe to remove |
|---|---|---|---|---|---|
| DEAD-001 | Generated/build artifacts in source tree | `apps/*/dist`, `packages/*/dist`, `.next`, `lambda-layers/.tmp` | Repository inventory shows compiled outputs and temporary deployment artifacts | Confirmed | Conditionally safe; verify release process and ignore rules first |
| DEAD-002 | `apps/pathlens-api/dist.zip` | repository root | Tracked artifact identified by `git ls-files` | Confirmed | Not without deployment-consumer verification |
| DEAD-003 | Generated route tree | `apps/pathlens-web/src/routeTree.gen.ts` | AGENTS.md identifies generated file | Confirmed generated | Unsafe to hand-delete; regenerate through router tooling |
| DEAD-004 | Duplicate/legacy API-key encryption fallback | `lib/api-key-encryption.ts:7-16` | API key encryption falls back to `INTERNAL_API_SECRET` | Confirmed design debt | Remove only after all records have a dedicated encryption key |
| DEAD-005 | Potentially unused packages | manifests | Static manifest inspection cannot prove dynamic/runtime use | Not verified | Do not remove without dependency graph and build verification |

Historical migrations were not recommended for deletion.

## 12. Frontend Issues

### Confirmed lint findings

`pnpm --filter @pathlens/web lint` failed with **39 errors and 11 warnings**. Important locations include:

- `apps/pathlens-web/src/components/common/live-preview-iframe.tsx:220,472,489,534` — synchronous state updates in effects and ref mutation during render.
- `apps/pathlens-web/src/components/common/search-over-app-dialog.tsx:470,682` — `any` and state update in effect.
- `apps/pathlens-web/src/components/common/heatmap-overlay-layer.tsx:27-381` — Fast Refresh export violations and unused `_viewport`.
- `apps/pathlens-web/src/hooks/use-modifier-key.tsx:9-10` — `any` and state update in effect.
- `apps/pathlens-web/src/hooks/use-relative-time.ts:22` — `Date.now()` during render violates purity rule.
- `apps/pathlens-web/src/routes/app/$workspaceId/$projectId/settings.tsx:133-135` — unsafe non-null assertions after optional chaining.
- `apps/pathlens-web/src/routes/app/$workspaceId/$projectId/goals/index.tsx:517,569,691,752,816,881` and `api-keys.tsx:738` — explicit `any`.
- `apps/pathlens-web/src/routes/app/$workspaceId/$projectId/funnels.tsx:213` — `@ts-ignore`.

These are **MEDIUM/LOW quality and regression risks**, not automatically security vulnerabilities. They should be fixed with focused changes preserving rendered behavior, then lint made a required CI gate.

TanStack Query key consistency and tenant cache isolation were inspected by source inventory but not fully traced for every query hook; mark runtime cache isolation **Not Verified** until query-key tests exist.

## 13. Backend and Business Logic Issues

- **REL-001** — Project snapshot/report persistence and external object storage are not atomic (`projects.model.ts:561-615`, report controller `:122-150`). **Medium, confirmed.** Partial failures create orphan files or broken database pointers. Use outbox/reconciliation and idempotent transitions.
- **REL-002** — Event usage checks occur before the insert transaction (`events.model.ts:512-525`). **Medium, confirmed race condition.** Concurrent batches can both pass quota checks and exceed limits. Enforce usage atomically with a database counter/locking strategy.
- **REL-003** — Replay session creation checks usage before transaction (`replay.model.ts:107-111`) and accepts concurrent first chunks. **Medium, confirmed race hypothesis.** Concurrent sessions can overshoot recording limits. Use atomic quota reservation.
- **REL-004** — Error handling frequently logs `console.error(error)` directly (`events.controller.ts:56`, analytics and several controllers). **Low/Medium, confirmed.** Structured correlation IDs, classification, and sensitive-data filtering are absent at API level.
- **REL-005** — OAuth integration callbacks log Stripe account identifiers and returned database rows (`project-integrations.controller.ts:730-781`). **Medium, confirmed logging concern.** Provider identifiers and connection state should be structured and minimized; never log tokens or credential objects.

## 14. Database Issues

- **DATA-001** — Events and replay tables have indexes on many low-selectivity columns but no demonstrated composite indexes matching dominant tenant/time query predicates (`schema.ts:1115-1140`, `1253-1258`, `1292-1298`). **Medium, potential performance issue.** Obtain safe `EXPLAIN (FORMAT JSON)` plans from a sanitized production-like database before changing indexes.
- **DATA-002** — No repository-visible event/replay retention job or archive strategy was found. **Medium, confirmed at repository scope.** High-volume analytics tables and JSONB payloads can grow without bound. Define retention, legal hold, deletion, and storage-cost policy.
- **DATA-003** — Foreign keys cascade from projects/workspaces into large event/replay data (`schema.ts:1041-1050`, `1209-1219`). **Medium, confirmed risk.** Large synchronous cascades can lock or time out deletion. Use staged deletion for large tenants.
- **DATA-004** — `users.email` is unique but normalization is not visible in signup/login (`users.controller.ts:35-37`, `159-185`). **Low/Medium, probable.** Case/Unicode variants may produce confusing duplicate behavior. Normalize canonical email consistently.
- **DATA-005** — Password reset tokens are single-use and hashed, which is good, but cleanup of expired rows is not visible. **Low, confirmed maintenance gap.** Add scheduled cleanup and monitoring.

No live query plans or migration execution state were available. Migration metadata was not edited.

## 15. Infrastructure and DevOps Issues

- **INFRA-001** — Root deployment scripts use mutable `:latest` image tags and direct Lambda updates (`package.json:17-19`). **High, confirmed.** Rollback and provenance are ambiguous; an image can change between build, push, and deploy. Deploy immutable digest-pinned artifacts, as the heatmap script already does.
- **INFRA-002** — Dockerfiles use public Lambda base images without visible digest pinning (`apps/*/Dockerfile:1`). **Medium, confirmed supply-chain risk.** Pin base image digests and scan images in CI.
- **INFRA-003** — Snapshot SAM template sets `DatabaseUrl` as a CloudFormation parameter and injects it into Lambda environment (`snapshot-worker/template.yaml:5-27`). **Medium, confirmed.** Even with `NoEcho`, database credentials are passed through deployment metadata. Use Secrets Manager/role-based retrieval.
- **INFRA-004** — Snapshot template’s worker IAM policy allows S3 write to the whole bucket path (`template.yaml:64-73`) rather than project/workspace prefixes. **Medium, confirmed least-privilege gap.** Scope object permissions to required prefixes if the deployment model permits.
- **INFRA-005** — SQS visibility timeout is 720 seconds while Lambda timeout is 120 seconds (`template.yaml:21`, `55`). **Low, likely intentional.** Confirm retry latency/cost and configure maximum event age/DLQ alarms explicitly.
- **INFRA-006** — Notification template has alarms but event-source and schedule are disabled by default (`apps/pathlens-api/template.yaml:107`, `142`). **Informational/operational:** activation must be an explicit deployment step with a post-enable health check.
- **INFRA-007** — No CI workflow files were found. **Medium, not verified.** Required lint/typecheck/security scanning, immutable build, secret scanning, migration checks, and deployment approvals cannot be confirmed.

## 16. Integration Issues

- **INT-001** — OAuth state is strong and cookie-bound for Slack/Stripe, and state is atomically consumed. However, state cleanup/expiry maintenance is not visible. **Low, confirmed maintenance gap.** Periodically delete expired consumed rows.
- **INT-002** — `SLACK_SCOPES` and `SLACK_USER_SCOPES` are checked against granted scopes (`project-integrations.controller.ts:497-514`), which is good. Scope minimization and provider-side rotation remain **Not Verified**.
- **INT-003** — Provider calls use `fetch` but no universal timeout/abort policy is visible for Slack/GitHub/Google/Resend. **Medium, probable.** A stalled provider can occupy API resources; wrap all calls with bounded timeouts and retry classification.
- **INT-004** — Integration credentials use AES-GCM, but key version is fixed at 1 (`credential-encryption.ts:4`, schema `:93-95`) and rotation workflow is not visible. **Medium, confirmed gap.** Introduce key versions and re-encryption tooling with failure-safe rollback.

## 17. Notification and Email Issues

- **REL-006** — Password reset email delivery logs the caught error (`password-reset.controller.ts:110-111`) and returns 503 when the provider fails. **Low/Medium, confirmed.** Ensure provider response bodies and recipient data are not logged; add a rate limit and provider retry/backoff.
- **REL-007** — Notification worker has a maximum attempt constant (`notification-worker.ts:27`) and queue lease logic, but live queue configuration, DLQ behavior, and duplicate delivery were not verified. **Potential/Not Verified.** Run isolated failure/retry tests and inspect deployed attributes.
- **REL-008** — Notification delivery rows contain both workspace and project IDs, but schema does not show a composite FK proving their relationship (`schema.ts:133-212`). **Medium, confirmed integrity risk.** Validate and constrain relationship before enqueue/delivery.

## 18. Billing and Usage Issues

- **BILL-001** — Stripe webhook signature verification and raw-body ordering are implemented correctly (`app.ts:44-46`, `billing.controller.ts:120-125`). Duplicate grants are described as repeat-safe, but webhook event IDs are not persisted. **Medium, probable.** Add event-idempotency records to make replay behavior explicit and auditable.
- **BILL-002** — Checkout and entitlement are account-scoped, while workspace creation checks `lifetimeAccess` (`workspace.controller.ts:238-250`). **Potential consistency issue:** plan/entitlement rules are spread across controllers and `usage.model.ts`; a complete entitlement matrix needs live product confirmation.
- **BILL-003** — Usage checks are preflight-only in event/replay paths (REL-002/003). **Medium, confirmed race risk.** Make quota reservation atomic and test concurrent ingestion.
- **BILL-004** — `getEntitlement` returns `stripe_customer_id` and `stripe_payment_id` (`billing.controller.ts:93-100`). **Low, confirmed data minimization issue.** Return only fields required by the UI.

## 19. Privacy and Retention Issues

- **PRIV-001** — Event schema explicitly accepts IP, user agent, location, URLs, referrers, error stacks, form metadata, and arbitrary passthrough fields (`contracts/src/events.ts:136-197`; `events.model.ts:489-508`). **Medium, confirmed.** Define minimization/redaction and configurable retention.
- **PRIV-002** — Replay privacy sanitizes URLs and masks inputs (`lib/replay-privacy.ts` and tracker replay), but default text masking depends on customer markup. **Medium, potential.** Validate against payment, email, address, and account pages; add privacy fixtures for DOM snapshots and text nodes.
- **PRIV-003** — Project reset deletes selected S3 objects but no account-wide deletion/backup/queue/cache procedure is visible. **High, probable for deletion guarantees.** Implement a deletion ledger and report residuals.
- **PRIV-004** — Presigned URLs last up to 24 hours for snapshots/reports (`lib/s3.ts:10`, `173-191`). **Low/Medium, confirmed exposure window.** Use shorter URLs for sensitive reports or an authorized streaming endpoint if product requirements allow.

## 20. Reliability and Edge Cases

| Scenario | Static result | Status |
|---|---|---|
| Duplicate Stripe webhook | Grant is repeat-safe by update intent; no event-id table | Potentially safe, replay audit not verified |
| Duplicate SQS snapshot message | DB claim functions likely deduplicate; worker tests not run | Not Verified live |
| Concurrent usage-limit checks | Preflight checks outside insert transactions | Confirmed race risk |
| Project deleted with pending snapshot | Queue message can arrive after deletion; claim behavior not fully traced | Potential data loss/retry noise |
| Role downgrade during active request | Each middleware query reads current DB access, but active JWT is not revoked | Probable stale request/session behavior |
| Slow provider API | Mixed timeout coverage | Probable resource exhaustion |
| Replay out-of-order chunks | Unique `(session, sequence)` and `GREATEST` are present | Partially handled; timestamp/sequence policy not fully validated |
| Tracker destroy/reinitialize | Timer cleared, DOM listeners not removed | Confirmed SDK leak/duplicate risk |
| S3 succeeds, DB fails | Storage deletion/upload and DB writes are separate | Confirmed partial-failure risk |
| Proxy DNS rebinding | Addresses resolved and pinned per request | Strong controls; live network behavior not verified |

## 21. Performance Improvements

| ID | Area | Issue | Expected benefit | Confidence | Implementation risk |
|---|---|---|---|---|---|
| PERF-001 | Ingestion | Per-batch usage checks plus event insert and attribution work are synchronous | Lower DB round trips and contention after atomic quota design | High | Medium |
| PERF-002 | Analytics | Repeated domain extraction via regex/string operations in models | Reduce CPU and improve indexability with normalized domain column | Medium | Medium/high due migration |
| PERF-003 | Replay | Complete replay loads all chunks (`replay.model.ts:215-236`) | Avoid large memory/serialization spikes with streaming/pagination | High | Medium |
| PERF-004 | Workspace reads | `getWorkspaces` calls `ensureWorkspacePermissionProfilesModel` for every membership and each opens a transaction (`workshop.model.ts:247-257`) | Reduce N transactions on workspace switch | High | Medium |
| PERF-005 | Frontend preview | Lint identifies cascading effect state updates in live preview | Fewer extra renders and less preview latency | High | Low/medium |
| PERF-006 | Events | JSONB payload search uses `LOWER(events.payload::text) LIKE` (`events.model.ts:570-578`) | Avoid full scans for large datasets | High | Medium/high; measure first |
| PERF-007 | Storage | No retention/archival job found for events/replays | Bound storage and analytics query cost | High | Product/data policy dependency |
| PERF-008 | Tracker | Mousemove/replay queue can grow during outages | Bound browser memory and host-page impact | High | Low |

No percentage improvement is claimed without measurement.

## 22. Testing and Coverage Gaps

### Executed

- `pnpm --filter @pathlens/api typecheck` — passed.
- `pnpm --filter @pathlens/web typecheck` — passed.
- `pnpm --filter @pathlens/tracker typecheck` — passed.
- `pnpm --filter @pathlens/heatmap-proxy typecheck` — passed.
- `pnpm --filter @pathlens/snapshot-worker typecheck` — passed.
- `pnpm --filter @pathlens/web lint` — failed: 39 errors, 11 warnings.
- `pnpm --filter @pathlens/heatmap-proxy test` — passed: 49 tests.

No database-backed API tests, live cloud tests, production builds, dependency advisory scan, or destructive tests were run.

### Missing tests

- Every API route: unauthenticated, wrong workspace, wrong project, downgraded role, removed member.
- Password hashing, session revocation, reset invalidation, login/reset rate limits.
- Concurrent event/replay quota enforcement and idempotency.
- Project deletion/reset across S3, queues, cache, notifications, and derived tables.
- Replay masking for realistic PII/payment/DOM fixtures.
- Tracker init/destroy/reinit and offline queue bounds.
- OAuth callback replay, provider timeout, token revocation, and credential key rotation.
- Stripe webhook event-id replay and malformed metadata.
- Cache/query-key tenant isolation.

## 23. Security Verification Matrix

| Area | Status | Evidence / reference |
|---|---|---|
| Authentication | Confirmed Issue | Plaintext passwords; `SEC-001` |
| Authorization | Confirmed Issue | Mixed route/controller enforcement; `AUTH-001` |
| Workspace isolation | Potential Issue | Membership middleware exists; request-ID-driven model context; `TENANT-004` |
| Project isolation | Potential Issue | Many scoped queries; unscoped helper hazard; `TENANT-002` |
| Ownership | Potential Issue | Model helpers accept raw IDs; cross-layer tests incomplete |
| Role security | Potential Issue | Permission profiles validated, but full mutation matrix not integration-tested |
| Permission revocation | Confirmed Issue | Long-lived JWTs without revocation; `SEC-003` |
| API validation | Confirmed Issue | Passthrough event schema and weak timestamp semantics; `API-001/002` |
| Data exposure | Confirmed Issue | Raw error messages and entitlement identifiers; `API-004`, `BILL-004` |
| Public ingestion | Confirmed Issue | No rate limiting; `SEC-004` |
| Tracking privacy | Potential Issue | Broad event/replay capture; `SDK-003/004`, `PRIV-001/002` |
| Session replay | Potential Issue | Access queries scoped; masking needs realistic runtime verification |
| Integrations | Potential Issue | Encryption exists; rotation and all failure modes unverified |
| OAuth | Potential Issue | State controls present; callback token delivery and cleanup need hardening |
| Webhooks | Potential Issue | Stripe signature verified; event-id persistence absent |
| Queues | Potential Issue | DLQ/templates exist; live duplicate/visibility settings unverified |
| Billing | Potential Issue | Server-side webhook entitlement exists; concurrency/idempotency incomplete |
| Database | Confirmed Issue | Denormalized relationships/retention and large cascades; `DATA-*` |
| Storage | Potential Issue | Presigned URLs and deletion ordering; `TENANT-005`, `PRIV-004` |
| Infrastructure | Confirmed Issue | Mutable deployment tags and parameterized DB secret; `INFRA-001/003` |
| Deployment | Confirmed Issue | No CI workflow evidence and mutable root deploy scripts |
| Deletion | Confirmed Issue | Partial cross-system cleanup; `TENANT-005`, `PRIV-003` |
| Caching | Not Verified | Query-key and cache invalidation audit incomplete |
| Logging | Confirmed Issue | Raw errors/provider identifiers logged |
| Error handling | Confirmed Issue | Internal error messages returned in several controllers |

## 24. Recommended Fixes

1. **Credential foundation:** hash all passwords, migrate legacy records, rotate committed/example secrets, move secrets to Secrets Manager/KMS, and add secret scanning.
2. **Session foundation:** introduce revocable sessions/refresh tokens, fixed JWT algorithm plus issuer/audience, and invalidation on password and membership changes.
3. **Authorization foundation:** create a single authorization-context helper; apply explicit route middleware to all workspace/project actions; require canonical workspace/project pairs in models.
4. **Abuse controls:** rate-limit login, signup, reset, public ingestion, replay, preview creation, and expensive report/provider operations at edge and application layers.
5. **Ingestion safety:** replace passthrough with bounded schemas, timestamp skew checks, payload/depth budgets, idempotency keys, and atomic quota reservation.
6. **Privacy:** establish default masking/redaction, consent behavior, URL query stripping, stack scrubbing, retention, and deletion verification.
7. **Deletion reliability:** use an outbox/deletion state machine for DB, S3, queues, cache, and derived data; make all steps idempotent.
8. **Error/headers:** add structured safe error envelopes, correlation IDs, security headers, explicit cache controls, and trusted proxy configuration.
9. **Deployment:** replace `latest` with digest-pinned images, pin base image digests, add CI gates and deployment approvals, and validate AWS account/region.
10. **Frontend/SDK quality:** fix lint violations, listener cleanup, bounded tracker queues, and preview effect/ref issues without changing UI behavior.

Each fix should ship with negative authorization tests, failure injection where applicable, and rollback-safe deployment sequencing.

## 25. Prioritized Roadmap

### P0 — Critical

No confirmed Critical finding. Treat any discovery of an active exposed production encryption/proxy key as an immediate incident: revoke, rotate, assess historical access, and re-encrypt credentials.

### P1 — High

1. SEC-001 plaintext passwords — immediate credential migration.
2. SEC-002 committed secret material — rotate and remove from examples/history.
3. SEC-003 revocable authentication sessions.
4. SEC-004 authentication and ingestion abuse controls.
5. AUTH-001/TENANT-004 centralized permission context and complete route enforcement.
6. TENANT-005 deletion/reset state machine and queue/storage cleanup.
7. INFRA-001 immutable deployment artifacts.

### P2 — Medium

1. API-001/002 bounded ingestion semantics and idempotency.
2. PRIV-001/002 privacy masking and retention.
3. REL-002/003 atomic usage reservations.
4. API-004 safe error envelopes and API-005 security headers.
5. DATA-002 retention/archival and DATA-003 staged cascades.
6. INT-003 provider timeouts and INT-004 encryption key rotation.
7. INFRA-003 secret-manager retrieval and INFRA-004 least-privilege object access.
8. Fix frontend lint and preview state/ref issues.

### P3 — Low / informational

1. Normalize email and document password policy.
2. Clean expired OAuth/password-reset rows.
3. Remove or verify generated build artifacts and `dist.zip`.
4. Centralize stable deployment constants.
5. Optimize measured analytics indexes/domain normalization.

## 26. Safe Cleanup Plan

- Do not remove migrations.
- Remove generated `dist`, `.next`, temporary Lambda layer, and `dist.zip` artifacts only after confirming the deployment pipeline does not consume them and adding appropriate ignore/build rules.
- Replace duplicated defaults with configuration only after documenting development behavior.
- Remove unused dependencies only after package-level build, typecheck, lint, and runtime import checks.
- Do not remove generated `routeTree.gen.ts`; regenerate it through the router tool.

## 27. UX and Backward Compatibility Preservation

- Password hashing must preserve login, signup, reset, and OAuth UI responses; only credential verification and security state should change.
- Authorization middleware should return the existing 401/403 envelope and preserve route URLs and response shapes.
- Rate limiting should return explicit retry responses and allow current tracker batch sizes.
- Tracker listener cleanup must preserve event semantics while preventing duplicate registration.
- Privacy masking should be covered with before/after replay fixtures and customer opt-in compatibility tests.
- Deletion changes should preserve success responses while exposing progress only if already supported; background cleanup must be idempotent.
- Frontend lint fixes must be validated with route navigation, loading, animation, preview, replay, billing, and form regression tests.

## 28. Top 10 Critical Findings

There are fewer than ten confirmed Critical findings. The ten highest-priority confirmed or strongly evidenced risks are:

1. SEC-001 — plaintext passwords.
2. SEC-002 — reusable secret material in tracked example configuration.
3. SEC-003 — no JWT/session revocation.
4. SEC-004 — no auth/public-ingestion rate limiting.
5. AUTH-001 — inconsistent workspace mutation authorization.
6. TENANT-004 — request-ID-driven tenant authorization context.
7. TENANT-005 — non-atomic, incomplete project deletion/reset.
8. INFRA-001 — mutable `latest` deployment artifacts.
9. API-001/002 — permissive and weakly bounded event ingestion.
10. PRIV-001/002 — broad analytics/replay data capture without fully verified minimization.

## 29. Top 10 Safe Improvements

1. Add secret scanning and empty all example secret values.
2. Add safe structured error envelopes and correlation IDs.
3. Configure exact trusted proxy hops.
4. Add route-level authorization tests without changing contracts.
5. Add tracker listener teardown and reinitialization tests.
6. Add bounded tracker offline queues.
7. Add expired token/OAuth state cleanup.
8. Pin deployment images by digest.
9. Reduce entitlement response fields to UI-required fields.
10. Make web lint a CI check after resolving current violations.

## 30. Top 10 Performance Opportunities

1. Atomic, batched event quota accounting.
2. Avoid per-workspace permission-profile transaction fan-out.
3. Paginate/stream complete replay retrieval.
4. Bound tracker/replay memory during outages.
5. Measure and optimize JSONB payload search.
6. Add tenant/time composite indexes only after query plans.
7. Normalize domain extraction if analytics plans confirm CPU scans.
8. Stage large tenant deletion instead of synchronous cascades.
9. Add provider timeouts to prevent occupied API workers.
10. Remove frontend cascading effect updates in live preview.

## 31. Unverified Risks and Required Follow-up

- Verify Git history and CI logs for exposure of the example/local encryption and proxy keys; rotate regardless if used.
- Inspect deployed API Gateway/Lambda CORS, WAF, throttling, environment variables, IAM, and API-key placement.
- Inspect S3 bucket policies, versioning, lifecycle, object ownership, access logs, and presigned URL usage.
- Run authorization integration tests against isolated PostgreSQL for every route group.
- Obtain sanitized production-like query plans and table cardinalities.
- Inspect queue visibility timeout, max receive count, DLQs, event age, and duplicate delivery metrics.
- Confirm product/legal decisions for consent, PII masking, recording retention, visitor identifiers, and deletion scope.
- Run browser tests against representative customer frameworks and SSR/prerender environments.
- Run dependency advisory scanning against `pnpm-lock.yaml`; no advisory tool result was available in this audit.
- Confirm whether email verification, account disablement, logout, and session revocation are product requirements.
- Confirm all frontend TanStack Query keys include workspace/project scope and invalidation occurs after role changes.

## 32. Final Production Readiness Assessment

**Not ready due to confirmed blocking issues.**

The blocking issues are plaintext credential handling, secret-material exposure risk, incomplete revocation, missing abuse controls, inconsistent authorization architecture, and non-atomic deletion/usage behavior. The heatmap proxy’s local test suite and several cryptographic/authorization utilities are positive evidence, but they do not compensate for the confirmed account-security and multi-tenant production risks. Production readiness should be reassessed after P1 remediation and isolated integration verification against the deployed architecture.

## Appendix A — Finding Index

| ID | Severity | Confidence | Short title |
|---|---|---|---|
| HARD-001 | High | Confirmed | Secret material in env example |
| HARD-002 | Medium | Confirmed | Hardcoded tracker endpoint |
| HARD-003 | Low/Medium | Confirmed | Hardcoded cloud targets |
| HARD-004 | Medium | Confirmed | Localhost production fallbacks |
| HARD-005 | Low/Medium | Confirmed | Policy constants |
| AUTH-001 | High | Confirmed | Inconsistent workspace permission enforcement |
| AUTH-002 | Medium | Probable | Notifications lack named permission |
| AUTH-003 | High | Confirmed | Plaintext passwords |
| AUTH-004 | Medium | Confirmed | Inconsistent password policy |
| AUTH-005 | Medium | Probable | JWT claims/algorithm policy not explicit |
| AUTH-006 | Medium | Confirmed | No auth throttling |
| AUTH-007 | Medium | Confirmed | JWT in OAuth URL fragment |
| SEC-001 | High | Confirmed | Plaintext password storage |
| SEC-002 | High | Confirmed | Committed reusable secrets |
| SEC-003 | High | Confirmed | No bearer-token revocation |
| SEC-004 | High | Confirmed | No rate limiting |
| SEC-005 | Medium | Confirmed | Trust proxy true |
| TENANT-001 | High | Probable | Request identifiers drive scope |
| TENANT-002 | Medium | Confirmed | Unscoped project helper |
| TENANT-003 | Medium | Confirmed | Denormalized relationship integrity |
| TENANT-004 | High | Probable | Authorization context hazard |
| TENANT-005 | High | Probable | Non-atomic deletion/reset |
| API-001 | Medium | Confirmed | Passthrough event schema |
| API-002 | Medium | Confirmed | Weak event timestamp/ID semantics |
| API-003 | Medium | Potential | Global 5 MB JSON limit |
| API-004 | Medium | Confirmed | Raw error messages |
| API-005 | Medium | Confirmed | Missing global security headers |
| API-006 | Low/Medium | Confirmed | Broad tracker CORS |
| API-007 | Low | Probable | Generic HTML middleware hazard |
| SDK-001 | Medium | Confirmed | Listener leak on destroy |
| SDK-002 | Low | Confirmed | Browser-global assumptions |
| SDK-003 | Medium | Potential | Replay text masking dependency |
| SDK-004 | Medium | Confirmed | Broad event capture |
| SDK-005 | Medium | Confirmed | Unbounded replay retry queue |
| SDK-006 | Low | Confirmed | Origin is not authentication |
| REL-001 | Medium | Confirmed | Split storage/database writes |
| REL-002 | Medium | Confirmed | Concurrent event quota race |
| REL-003 | Medium | Probable | Concurrent replay quota race |
| REL-004 | Low/Medium | Confirmed | Unstructured raw logging |
| REL-005 | Medium | Confirmed | Provider identifier logging |
| DATA-001 | Medium | Potential | Query/index mismatch |
| DATA-002 | Medium | Confirmed | No visible retention job |
| DATA-003 | Medium | Confirmed | Large cascade deletion risk |
| DATA-004 | Low/Medium | Probable | Email normalization |
| DATA-005 | Low | Confirmed | Reset-token cleanup gap |
| INFRA-001 | High | Confirmed | Mutable deployment tags |
| INFRA-002 | Medium | Confirmed | Unpinned base images |
| INFRA-003 | Medium | Confirmed | DB URL as deployment parameter |
| INFRA-004 | Medium | Confirmed | Broad snapshot S3 write scope |
| INFRA-005 | Low | Potential | Queue/Lambda timeout alignment |
| INFRA-007 | Medium | Not Verified | No CI workflow evidence |
| INT-003 | Medium | Probable | Provider timeout gaps |
| INT-004 | Medium | Confirmed | Credential key rotation gap |
| BILL-001 | Medium | Probable | No persisted webhook event IDs |
| BILL-003 | Medium | Confirmed | Concurrent quota bypass risk |
| BILL-004 | Low | Confirmed | Excess entitlement fields |
| PRIV-001 | Medium | Confirmed | Broad personal-data capture |
| PRIV-002 | Medium | Potential | Replay privacy verification gap |
| PRIV-003 | High | Probable | Incomplete deletion guarantee |
| PRIV-004 | Low/Medium | Confirmed | Long presigned URL lifetime |
