# Pathlens — Full Application & Production Readiness Audit

**Date:** 2026-11-20  
**Revision:** `cfd0b1e1e51cfdebdedd82d04e3a387eb07487f3`  
**Branch:** `mitr/pathlens`  
**Assessment target:** the current working tree, including pre-existing uncommitted changes, not a clean release artifact.  
**Mode:** read-only application audit; this report is the only repository file changed.

## 1. Executive Summary

**Verdict: NOT READY FOR PRODUCTION.**

Two independently reproducible authorization defects break tenant isolation:

1. A user can authorize against their own workspace while reading keys or changing/deleting a project belonging to another workspace.
2. A mutation can authorize a workspace supplied in the query string while operating on a different workspace supplied in its body. Report export is a concrete cross-tenant data disclosure path.

These are code-level confirmed defects, not merely missing middleware recommendations. An in-memory verification executed the real permission middleware with mocked repositories: both inconsistent requests reached `next()`, while the strict workspace/project middleware rejected the mismatch with 403. No actual tenant resources or databases were accessed.

Other important problems include plaintext passwords, non-revocable seven-day bearer tokens, account pre-hijacking through unverified email registration and automatic social-account linking, reactivation of revoked tracking keys, sensitive URL/DOM capture, malformed performance events capable of breaking analytics queries, and a domain-format mismatch that suppresses goal-dashboard results.

There are also meaningful strengths: shared browser-safe Zod contracts; encrypted integration credentials; hashed, expiring reset tokens consumed transactionally; project-scoped event deduplication; bounded tracker retries; strict heatmap project authorization; opaque preview handles; HMAC-authenticated proxy validation; extensive proxy SSRF tests; private snapshot-bucket safeguards; and durable notification-send fencing.

| Application findings | Count |
|---|---:|
| CRITICAL | 2 |
| HIGH | 12 |
| MODERATE | 23 |
| LOW | 3 |
| **Total** | **40** |

Dependency advisories are **not** counted as 104 additional application findings. F-29 groups their remediation, and section 16 records their separate package-level assessment.

**Validation:** 248 existing test cases executed: **246 passed, 2 failed**. Nine meaningful TypeScript checks passed. Web lint failed with **37 errors and 11 warnings**. Formatting failed on **229 files**, including generated artifacts and the previous report. The tracked-file secret scanner passed. Production dependency auditing returned **104 advisories: 1 critical, 38 high, 57 moderate, 8 low**. No production build, database integration test, cloud deployment, payment, or email delivery was executed.

## 2. Audit Scope and Methodology

### Method

1. Inventoried tracked files, workspace manifests, runtime entrypoints, routes, test scripts, migrations, generated artifacts, deployment scripts, and documentation.
2. Traced authentication, permissions, ownership, collectors, analytics queries, reports, integrations, snapshots, and notification delivery through their actual implementations.
3. Cross-referenced dashboard query/mutation modules with route registrations and examined representative route components and shared UI infrastructure.
4. Reviewed all 67 migration files at statement/inventory level and the current 1,380-line schema; examined recent migrations and runtime schema-maintenance code in detail.
5. Ran only reviewed, non-mutating validators and isolated tests with mocked services or local in-memory HTTP servers.
6. Consolidated findings by root cause and distinguished static defects from deployment assumptions.

The API-engineer workflow was consulted. No local OpenAPI/Postman contract or repository workspace binding was discovered in the tracked-file search. No Postman initialization, import, external workspace mutation, or live request was appropriate for this restricted audit.

### Evidence classes

- **Confirmed defect:** directly established by source/control flow, a validator failure, or an isolated execution. This does not mean exploitation against production was attempted.
- **Probable risk:** a realistic failure mechanism whose environmental preconditions are not established.
- **Missing safeguard:** absent in the inspected repository; an external control may exist.
- **Architectural improvement:** scalability or maintainability concern rather than demonstrated outage.
- **Unverified concern:** needs isolated runtime or infrastructure evidence.

Finding confidence uses **Confirmed**, **High confidence**, **Medium confidence**, or **Requires runtime verification**. Relative effort: **S** roughly up to two engineer-days; **M** several days; **L** cross-cutting work of a week or more. These are planning estimates, not commitments.

### Limits on completeness

All relevant apps and packages were examined through repository-wide discovery, targeted source review, type checking, and feature tracing. This is not a claim that every line of every component, generated bundle, dependency, or historical commit received manual review. Public-site visual/accessibility behavior, deployed infrastructure, actual database schema/data, load behavior, provider configuration, and full browser compatibility remain unverified. The report inventories every discovered Express route, but does not certify every endpoint as functionally correct.

## 3. Repository and Technology Inventory

| Component | Actual role and evidenced stack | Evidence |
|---|---|---|
| `apps/pathlens-web` | Active React SPA; Vite, TanStack Router/Query/Form, Axios, Tailwind, charts, rrweb playback, maps/globes | `src/main.tsx:1-39`, `vite.config.ts:8-24`, query/mutation imports |
| `apps/pathlens-api` | Active Express 5 API, PostgreSQL via `pg`/Drizzle, Zod, JWT; AWS Lambda adapter and standalone listener | `src/app.ts:1-80`, `src/db/client.ts:1-10`, `src/index.ts:1-14`, `src/server.ts:1-7` |
| `apps/pathlens-tracker` | Browser IIFE SDK; DOM events, rrweb recording, encrypted batched ingestion | `src/index.ts:12-32`, `src/tracker.ts:46-135`, `src/replay.ts:140-174`, `tsup.config.ts` |
| `apps/pathlens-heatmap-proxy` | Active preview service; custom HTTP/DNS transport, parse5/css-tree/Babel rewriting; local HTTP and Lambda handlers | `src/upstream-fetch.ts:1-13`, `src/app.ts`, `src/handler.ts`, `src/local.ts` |
| `apps/pathlens-snapshot-worker` | Playwright/Chromium screenshot processing; PostgreSQL claims, SQS dispatcher/consumer, private S3 storage | `src/handler.ts:7-31`, `src/index.ts:53-137`, `src/dispatcher.ts:12-43` |
| `apps/pathlens-heatmap-proxy-fixtures` | React/Vite/animation and Next.js **test fixtures**, not the Pathlens dashboard | `package.json:7-23`, fixture source and proxy browser tests |
| `packages/contracts` | Browser-safe event, replay, heatmap, preview, integration, permission and analytics schemas/types; runtime exports from `dist` | `package.json:10-116`, `src/index.ts`, `src/events.ts:136-205` |
| `packages/backend-types` | Small server-only shared auth type package | `src/index.ts`, `package.json:5-15` |
| `packages/ui` | Active shared Base UI/shadcn-style primitives and CSS, consumed directly from source | `package.json:9-20`, web component imports |
| Root orchestration | pnpm 11.22.0; Turborepo; one pnpm lockfile; Prettier; tracked-file secret scanner | `package.json:4-21`, `pnpm-workspace.yaml:1-7`, `turbo.json:3-24` |

Observed local runtimes: Node **v24.15.0**, pnpm **11.22.0**. Manifest ranges are not installed versions: for example the lock resolves Axios 1.19.0 and shadcn 4.16.2.

**External systems actually referenced:** PostgreSQL, S3, SQS, Secrets Manager for notification runtime secrets, Stripe billing/Connect, Slack OAuth/API, Google identity/Search Console/PageSpeed, GitHub identity, Resend reset/reminder email. No active Airship apps were found despite root documentation.

**Active versus obsolete/generated:**

- No active chat or custom-dashboard CRUD service: old chat/dashboard/SEO tables are created and later removed by migrations.
- AI Insights is a visible coming-soon placeholder, not an AI backend.
- `src/routeTree.gen.ts` is generated TanStack routing, not a hand-maintained API.
- Tracked artifacts include **182 `.next` files, 30 fixture `out` files, 4 `.tanstack` temporary files, and `apps/pathlens-api/dist.zip`**. The ZIP has 222 entries; filename inspection did not identify an `.env`/private-key entry.
- `.env` files exist locally but were not dumped. Only tracked example variable names/value lengths were inspected. Current secret assignments in the API example are blank.
- No tracked `.github` workflow was found. There is no root test script.

## 4. Application Architecture

```text
Dashboard SPA
  -> Axios: public VITE_API_KEY + localStorage bearer JWT
  -> /api router
      -> JWT validation
      -> workspace permission lookup / controller checks
      -> controllers -> models/services -> PostgreSQL
                                 -> S3 report/snapshot signed URLs
                                 -> Google / Stripe / Slack / Resend

Customer browser
  -> tracker config with public project tracking key
  -> DOM/rrweb -> bounded in-memory queues -> encrypted events/chunks
  -> collector resolves key + origin + scope; replaces projectId
  -> PostgreSQL events / replay sessions / replay chunks
  -> SQL aggregates -> dashboard

Snapshot path:
  API + scheduled dispatcher -> SQS -> Chromium worker -> S3 + DB status

Preview path:
  authorized dashboard -> opaque session handle
  -> isolated-origin proxy -> HMAC API validation -> customer static resources

Slack schedule:
  dispatcher -> durable DB delivery -> SQS -> fenced worker -> Slack
```

Ordinary event ingestion is **synchronous to PostgreSQL**, not an SQS event pipeline. SQS is used for snapshots and scheduled notification deliveries.

The controller/model layering is recognizable, but responsibilities overlap: models enforce usage limits and perform storage cleanup; permission reads repair schema-adjacent permission data; controllers orchestrate committed database changes followed by audit/SQS/provider calls. There is no general outbox or idempotency framework for these multi-system mutations.

Primary trust boundaries are tenant ownership, untrusted customer DOM/payloads, public browser keys versus server secrets, provider OAuth callbacks, message queues, and server-side outbound network access. The largest architectural problem is inconsistent canonical authorization context: strict middleware exists, but many routes use the weaker variant.

Shared contracts improve event and feature consistency, but several frontend types remain manually duplicated. Example: `src/queries/projects.ts:12-15` declares removed project capture flags and an API key not returned by the project-list model. This is contract drift, not proof those unused fields currently break a page.

## 5. Feature Inventory and Completion Status

Paths below are relative to the relevant app's `src/`; frontend project pages live under `routes/app/$workspaceId/$projectId/`.

| Feature / frontend entry | Backend/storage/dependencies | Classification and assessment |
|---|---|---|
| Registration/login; `(auth)/sign-up.tsx`, `login.tsx` | `users.controller.ts`, `users.model.ts`, users/default workspace, JWT | **Partially implemented** as secure authentication: functional paths exist, F-03–F-06/F-19 block assurance |
| Password reset; `(auth)/password-reset.tsx` | reset controller/model, hashed token table, Resend | **Partially implemented**; atomic single-use consumption, but two current tests fail; F-14 |
| Google/GitHub login; callback pages and auth helpers | provider callbacks, users, default workspace | **Implemented but insufficiently tested**; verified provider emails, frontend state check, pre-hijacking risk F-05 |
| Profile/password/account deletion; `(entry)/settings.tsx`, `security.tsx` | self-account endpoints, user model, cascading FKs | **Implemented but insufficiently tested**; session invalidation and deletion/re-auth shortcomings |
| Workspaces/team/invitations/permissions | workspace controller, `workshop.model.ts`, profiles, direct permissions, notifications | **Implemented but insufficiently tested**; server checks exist; F-17/F-18/F-22 |
| Projects/domains/API keys/setup | project controllers/models, snapshot enqueue, project tables | **Broken security boundary**; F-01, F-07, F-20/F-21 |
| Dashboard/traffic analytics/reports | dashboard and analytics models; XLSX/S3 reports | **Implemented but insufficiently tested**; reports expose F-02; expensive raw aggregates |
| Visitors and visitor locations | visitors controller/model; events and local GeoIP | **Implemented but insufficiently tested**; pagination exists; client IP trust requires hardening |
| Events and chart | collector/list/chart, events table | **Implemented but insufficiently tested**; isolated idempotency tests pass; privacy/schema problems remain |
| Campaigns | UTM SDK capture, campaign attribution upsert, campaign queries | **Implemented but insufficiently tested**; earliest timestamp attribution; untrusted client identities |
| Goals and goal dashboard | goals/domain/event queries and matching | **Broken** goal-dashboard domain filtering; F-11 |
| Funnels | funnel definitions + ordered per-session event processing | **Implemented but insufficiently tested**; F-02 and unbounded per-definition reads |
| User journey | journey page and graph, journey aggregation from events | **Implemented but insufficiently tested**; heuristic conversion labels, not verified business outcomes |
| Performance and error dashboards | performance/errors collectors and models | **Implemented but insufficiently tested**; F-10; error strings may contain personal data |
| Heatmap list/detail/overlays | normalized coordinates, bounded event reads, snapshots/preview identities | **Implemented but insufficiently tested end-to-end**; strong unit and route tests, explicit truncation metadata |
| Live heatmap preview | preview session model + proxy rewriting/resource authorization | **Implemented but insufficiently tested in deployment**; 49 proxy tests pass; browser suites not executed |
| Historical session replay | rrweb recorder/chunks/detail/player | **Partially implemented** for long recordings; bounded first page lacks continuation, F-25 |
| Live session replay | SSE, process-local emitter, dashboard streaming reader | **Unable to verify in production; high-confidence architecture failure risk**, F-24 |
| Project/heatmap screenshots | SQS dispatcher/worker, Chromium, S3 | **Implemented but insufficiently tested**; only three security tests run; F-26–F-28 |
| Integration catalog and installation UI | catalog and project integration models | **Implemented but insufficiently tested**; F-16 status disclosure |
| Slack connection/channel/settings/test/disconnect | encrypted credentials, OAuth state, Slack API | **Implemented but insufficiently tested live**; no real provider calls during audit |
| Slack daily/weekly reports | DB delivery queue, SQS, schedule, fenced sends | **Partially operationalized**; schedule and worker event source disabled in supplied staging template; 33 selected tests pass |
| Google Search Console | OAuth refresh token, registered domain/property reports | **Implemented but insufficiently tested live**; mocked service tests pass; F-15/F-39 |
| PageSpeed Insights | domain-bound point-in-time external audit | **Implemented but insufficiently tested live**; timeout handling and null metrics tested |
| Stripe connected dashboard | account-bound paginated Stripe reads, multiple currencies | **Implemented but insufficiently tested live**; mocked service test passes; read-write scope broader than read use |
| Lifetime billing | Checkout, signed Stripe webhook, account entitlement | **Implemented but insufficiently tested**; repeatable entitlement update, missing commercial lifecycle safeguards F-36 |
| Notifications/audit logs/feedback | recipient-scoped notifications, workspace audit logs, unique per-user feedback | **Implemented but insufficiently tested**; audit insertion defect F-20; feedback is one submission per account |
| AI Insights | `ai-insights.tsx:34-47` | **Placeholder or mock-only**; explicit coming soon, no backend discovered |
| Marketing, careers, legal, documentation pages | static SPA routes/components; no career application API | **Unable to verify** publishing accuracy/accessibility; docs mismatch F-38 |
| Chat, old SEO crawler/custom dashboards | historical migration artifacts, not mounted services | **Deprecated or unused**; do not advertise as active functionality |

“Complete and verified” is deliberately not assigned to any entire feature based only on compilation or mocks.

## 6. Frontend Audit

- File-based routing, nested workspace layouts, Query server state, Form/Zod validation, and shared UI primitives are active. Router code splitting is explicitly enabled (`vite.config.ts:10-13`).
- Root not-found/error handling exists (`routes/__root.tsx:13-23`). App loading UI exists; project pages commonly render permission/empty/error states rather than relying only on navigation hiding.
- Authentication uses localStorage JWTs and `/auth/me` in `beforeLoad`; token storage is readable by any same-origin script. Logout reloads the page, so a blanket claim that normal logout preserves the in-memory Query cache would be incorrect (`nav-user.tsx:243-245`).
- Most feature query keys include filters and workspace/project identifiers. Self queries use fixed keys (`ME`, `WORKSPACES`, `BILLING_ENTITLEMENT`). Account deletion clears Query state; normal logout reloads.
- Upstream provider 401 responses incorrectly trigger global logout (F-15). There is no Axios timeout (`lib/apiClient.ts:8-11`).
- JSX/types compile under both actual web projects, but web config does not establish strict null checking by itself. Lint has concrete failures; these should not all be called runtime bugs. The 37 errors include fast-refresh export conventions, unused symbols, `any`, and React effect/ref/purity rules.
- Evidence examples: `live-preview-iframe.tsx:220,472,489,534`; `search-over-app-dialog.tsx:470,682`; `hooks/use-relative-time.ts:22`; `funnels.tsx:213`. Browser verification is needed to determine user-visible effect problems.
- Heavy map/globe/animation/highlighter dependencies are actually imported in product/marketing features, but no new bundle was generated. No bundle-size, rendering-time, memory, CLS, or accessibility scores are claimed.
- Shared UI offers accessible primitives, but product-specific icon controls still need labels. Example: `nav-user.tsx:58-77` supplies an icon-only account trigger without an explicit text label. This is a follow-up accessibility check, not a full WCAG assessment.
- SPA marketing/SEO metadata and crawl behavior were not browser/crawler tested. No SSR hydration defect is asserted: the dashboard is Vite SPA, not Next.js.

## 7. Backend and API Audit

### Routing and contract conventions

There are **120 explicitly registered Express method/path pairs** under `/api`. The table is exhaustive for those registrations, not for gateway-generated OPTIONS handling. The proxy has its own health/page/resource/runtime handlers outside Express.

All rows inherit the mount evidence at `apps/pathlens-api/src/routes/index.ts:44-86` and app prefix at `src/app.ts:80`. Route locations use `routes/<name>.route.ts:<line>`, relative to API `src/`.

**Inventory notation**

- **K**: `x-api-key` equals `INTERNAL_API_SECRET`; this value is shipped to the dashboard, not a confidential authorization boundary.
- **J**: bearer JWT. **P(permission)**: weak workspace permission middleware. **SP(permission)**: strict workspace/project ownership middleware. **C**: controller/model membership/permission check. **Self**: authenticated user only. **PK**: public browser project key + origin + scope.
- **Z**: Zod request schema; **M**: manual/type checks; **O**: OAuth state/code checks; **Sig**: raw-body Stripe signature.
- Database operations: **R**, **W**, **RW**; `—` no primary database operation.
- Default error contract **E**: mostly `{success:false,message}` with validation 400, unauthorized 401, forbidden 403, missing 404, internal/provider 5xx; some older handlers map internal errors to 400. **PE**: structured preview error. **Provider**: upstream-specific mapping. **SSE**: stream messages after headers.
- Status **U**: implementation traced, live behavior unverified. **D**: identified defect. **T**: targeted isolated tests passed, not live certification.
- Frontend files in “Consumer” are under `apps/pathlens-web/src/`; `q/` means `queries/`, `m/` means `mutations/`. Listed modules are actual request consumers; callback entries are browser redirect flows.

| Method | Complete route | Purpose | Auth / permission | Validation | DB / external | Errors | Consumer | Status / route evidence |
|---|---|---|---|---|---|---|---|---|
| POST | `/api/events/` | Collect batch | PK events/type scope | encrypted + Z | W events/attribution/usage | E,204 | tracker | T/D; events:14 |
| GET | `/api/events/chart` | Event chart | K,J,P(events.view) | Z | R events | E | q/events.ts | U; events:19 |
| GET | `/api/events/` | Event list | K,J,P(events.view) | Z | R events/replay | E | q/events.ts | U; events:26 |
| POST | `/api/replay/chunks` | Collect replay | PK replay | encrypted + Z | RW replay tables | E,204 | tracker/replay.ts | U; replay:7 |
| GET | `/api/tracking/config` | Resolve scopes | PK/origin | M | RW key last-use/domains | E | tracker/utils.ts | U; index:46 |
| POST | `/api/billing/webhook` | Grant paid entitlement | Sig | Sig/M | W users; Stripe | 200/400 | Stripe webhook, no SPA call | U; billing:11 |
| POST | `/api/billing/lifetime/checkout` | Start purchase | J,Self | M | R users; Stripe W | E | m/billing.ts | U; billing:14 |
| GET | `/api/billing/entitlement` | Account access | J,Self | M | R users | E | q/billing.ts | U; billing:15 |
| GET | `/api/auth/github` | Start GitHub login | public | O | —; GitHub redirect | redirect/503 | lib/github-auth.ts | U; index:48 |
| GET | `/api/auth/github/callback` | Finish GitHub login | signed state | O | RW users/workspaces; GitHub | redirect | (auth)/github-callback.tsx | U/D; index:49 |
| GET | `/api/auth/google` | Start Google login | public | O | —; Google redirect | redirect/503 | lib/google-auth.ts | U; index:50 |
| GET | `/api/auth/google/callback` | Finish Google login | signed state | O | RW users/workspaces; Google | redirect | (auth)/google-callback.tsx | U/D; index:51 |
| GET | `/api/integrations/slack/callback` | Connect Slack | cookie-bound one-use state,C | O | RW integration/state; Slack | redirect | provider callback | U; index:54 |
| GET | `/api/integrations/stripe/callback` | Connect Stripe | cookie-bound one-use state,C | O | RW integration/state; Stripe | redirect | provider callback | U; index:55 |
| GET | `/api/integrations/google-search-console/callback` | Connect GSC | signed state + cookie | O | RW integration; Google | redirect | provider callback | D; index:56 |
| POST | `/api/internal/heatmap-proxy/validate` | Validate handle | HMAC | Z/HMAC | R preview/domain/project | PE | proxy authorization service | T; index:60 |
| GET | `/api/projects/active` | Public-site domain count | K only, intentional aggregate | M | R events/domains | E | q/projects.ts | U; index:68 |
| POST | `/api/auth/sign-up` | Create user/default workspace | K, no J | Z | W users/workspaces/profiles | E,409 | m/auth.ts | D; users:21 |
| POST | `/api/auth/login` | Password login | K, no J | Z | R users/workspaces | E | m/auth.ts | D; users:22 |
| POST | `/api/auth/password-reset/request` | Send reset/reminder | K, no J | Z | RW reset/user; Resend | E,503 | m/auth.ts | D; users:23 |
| POST | `/api/auth/password-reset/confirm` | Consume reset | K, token | Z | W users/reset | E | m/auth.ts | T/D; users:24 |
| GET | `/api/auth/avatars` | Avatar options | K,J | M | R avatars; S3 signing | E | q/avatars.ts | U; users:28 |
| GET | `/api/auth/me` | Current account | K,J,Self | M | R users/usage/workspace | E | q/user.ts | U; users:29 |
| GET | `/api/auth/users/:user_id` | Workspace public profile | K,J,C membership | Z | R memberships/users | E | q/user.ts | U; users:30 |
| PATCH | `/api/auth/me` | Change profile/email | K,J,Self | Z | W user | E,409 | m/account.ts | D; users:31 |
| PATCH | `/api/auth/me/password` | Change password | K,J,Self/current password if set | Z | RW users | E | m/account.ts | D; users:32 |
| DELETE | `/api/auth/me` | Delete account | K,J,Self/password if set | Z | delete users/cascades | E | m/account.ts | U/D; users:33 |
| GET | `/api/auth/workspaces` | Membership workspace list | K,J,Self | M | RW permission repair; R workspaces | E | legacy parallel to q/workspace.ts `/workspaces`; external consumers unknown | U; users:34 |
| GET | `/api/workspaces/` | Workspace list | K,J,Self | M | RW profiles + R memberships | E | q/workspace.ts | U/D; workspaces:37 |
| POST | `/api/workspaces/` | Create workspace | K,J,Self/entitlement | Z | W workspace/profiles/membership/audit | E,409 | m/workspace.ts | U; workspaces:38 |
| GET | `/api/workspaces/:workspace_id` | Workspace details | K,J,C membership | Z | RW profile repair, R workspace | E | q/workspace.ts | D; workspaces:39 |
| GET | `/api/workspaces/:workspace_id/permissions` | Current permissions | K,J,C membership | Z | RW profile repair; R direct grants | E | q/workspace.ts | U; workspaces:40 |
| PATCH | `/api/workspaces/:workspace_id` | Rename | K,J,C(settings.update) | Z | W workspace/audit | E | m/workspace.ts | U; workspaces:41 |
| DELETE | `/api/workspaces/:workspace_id` | Delete non-default | K,J,C(workspace.delete) | Z | delete/cascades | E,409 | m/workspace.ts | U/D; workspaces:42 |
| GET | `/api/workspaces/:workspace_id/members` | Team | K,J,C(members.view) | Z | R members/profile/user | E | q/workspace.ts | U; workspaces:43 |
| GET | `/api/workspaces/:workspace_id/usage` | Workspace/project usage | K,J,strict workspace-or-project permission,C | Z | R usage aggregates | E | q/usage.ts | U; workspaces:44 |
| GET | `/api/workspaces/:workspace_id/invitations` | Pending invitations | K,J,C(members.view) | Z | R notifications | E | q/workspace.ts | U; workspaces:52 |
| GET | `/api/workspaces/:workspace_id/permission-profiles` | Profile list | K,J,C(profile permissions) | Z | RW repair/R profiles | E | q/workspace.ts | U; workspaces:53 |
| GET | `/api/workspaces/:workspace_id/permission-profiles/:profile_id` | Profile details | K,J,C(profile permissions) | Z | R scoped profile/counts | E | q/workspace.ts | U; workspaces:54 |
| GET | `/api/workspaces/:workspace_id/audit-logs` | Audit history | K,J,strict workspace-or-project permission | Z | R audit/users | E | q/audit-logs.ts | U; workspaces:58 |
| POST | `/api/workspaces/:workspace_id/permission-profiles` | Create profile | K,J,C(profiles.create) | Z | W profile/audit | E | m/workspace.ts | U; workspaces:66 |
| PATCH | `/api/workspaces/:workspace_id/permission-profiles/:profile_id` | Edit non-system profile | K,J,C(profiles.update) | Z | RW profile/audit | E,409 | m/workspace.ts | U; workspaces:67 |
| DELETE | `/api/workspaces/:workspace_id/permission-profiles/:profile_id` | Delete unused profile | K,J,C(profiles.delete) | Z | RW profile/usage/audit | E,409 | m/workspace.ts | U; workspaces:71 |
| PATCH | `/api/workspaces/:workspace_id/members/:user_id` | Assign profile | K,J,C(members.update),owner protected | Z | W membership/audit | E | m/workspace.ts | D; workspaces:75 |
| DELETE | `/api/workspaces/:workspace_id/members/:user_id` | Remove member | K,J,C(members.remove),owner protected | Z | delete membership/W audit | E | m/workspace.ts | D; workspaces:76 |
| POST | `/api/workspaces/:workspace_id/invitations` | Invite registered users | K,J,C(members.invite) | Z | RW notifications/users/profile/audit | E,409 | m/workspace.ts | U; workspaces:77 |
| POST | `/api/workspaces/:workspace_id/permission-requests` | Request view access | K,J,C membership in model | Z | RW request/notifications/audit | E,409 | m/workspace.ts | U; workspaces:78 |
| GET | `/api/workspaces/:workspace_id/permission-requests/status` | Own request status | K,J,C membership | Z | R request | E | q/workspace.ts | U; workspaces:79 |
| POST | `/api/workspaces/:workspace_id/permission-requests/:request_id/:decision` | Approve/deny | K,J,C(members.update) | Z | RW request/direct grant/notifications/audit | E,409 | m/workspace.ts | U; workspaces:83 |
| DELETE | `/api/workspaces/:workspace_id/invitations/:invitation_id` | Revoke invitation | K,J,C(members.invite) | Z | delete notification/W audit | E | m/workspace.ts | U; workspaces:87 |
| GET | `/api/projects/` | Project list/detail | K,J,P(projects.view) | Z | R projects/keys/domains/events; S3 | E | q/projects.ts | U; projects:50 |
| GET | `/api/projects/:project_id/dashboard-integrations` | Connected widgets | K,J,SP(dashboard.view) | Z | R integration/project | E | q/dashboard-integrations.ts | U; projects:51 |
| GET | `/api/projects/:project_id/dashboard-integrations/google-search-console` | GSC widget | K,J,SP(dashboard.view) | Z | R integration/domain; Google | Provider | q/dashboard-integrations.ts | T; projects:56 |
| GET | `/api/projects/:project_id/dashboard-integrations/pagespeed-insights` | PSI widget | K,J,SP(dashboard.view) | Z | R integration/domain; Google | Provider | q/dashboard-integrations.ts | T; projects:61 |
| GET | `/api/projects/:project_id/dashboard-integrations/stripe` | Stripe widget | K,J,SP(dashboard.view) | Z | R integration; Stripe | Provider | q/dashboard-integrations.ts | T; projects:66 |
| POST | `/api/projects/:project_id/integrations/pagespeed-insights` | Install PSI | K,J,SP(settings.update) | Z/M | W integration | E | m/integrations.ts | U; projects:71 |
| POST | `/api/projects/:project_id/integrations/pagespeed-insights/check` | Run PSI | K,J,SP(settings.view) | Z | R domain/integration; Google | Provider | m/integrations.ts | T; projects:76 |
| POST | `/api/projects/:project_id/integrations/google-search-console/check` | Run GSC | K,J,SP(settings.view) | Z | R domain/integration; Google | Provider | m/integrations.ts | T; projects:81 |
| GET | `/api/projects/:project_id/integrations/slack/channels` | List channels | K,J,SP(settings.view) | Z/M | R integration; Slack | Provider | q/integrations.ts | U; projects:86 |
| GET | `/api/projects/:project_id/integrations/slack/notifications` | Delivery history | K,J,SP(settings.view) | Z cursor | R deliveries | E | q/integrations.ts | U; projects:91 |
| POST | `/api/projects/:project_id/integrations/slack/channels/:channel_id/invite` | Invite bot | K,J,SP(settings.update) | Z/M | R integration; Slack W | Provider | m/integrations.ts | U; projects:96 |
| GET | `/api/projects/:project_id/integrations/slack/settings` | Slack settings | K,J,SP(settings.view) | Z/M | R integration | Provider | q/integrations.ts | U; projects:101 |
| PUT | `/api/projects/:project_id/integrations/slack/settings` | Save schedule/channel | K,J,SP(settings.update) | Z | W integration/audit; Slack checks | Provider | m/integrations.ts | U; projects:106 |
| POST | `/api/projects/:project_id/integrations/slack/test` | Send test | K,J,SP(settings.update) | Z | R integration; Slack W | Provider | m/integrations.ts | U; projects:111 |
| DELETE | `/api/projects/:project_id/integrations/slack` | Disconnect | K,J,SP(settings.update) | Z/M | W integration/deliveries; Slack revoke | Provider | m/integrations.ts | U; projects:116 |
| GET | `/api/projects/:project_id/integrations/stripe/overview` | Stripe overview | K,J,SP(settings.view) | Z | R integration; Stripe | Provider | q/integrations.ts | U; projects:121 |
| POST | `/api/projects/create` | Create project/key/domain | K,J,P(projects.create) | Z | W project/key/domain/snapshot/audit; SQS | E | m/projects.ts | D; projects:126 |
| GET | `/api/projects/:project_id/api-keys` | List/reveal keys | K,J,P(api_keys.view) | Z | R keys; decrypt | E | q/api-keys.ts | D; projects:131 |
| POST | `/api/projects/:project_id/api-keys` | Create key | K,J,P(api_keys.create) | Z | W key/audit | E | m/api-keys.ts | D; projects:136 |
| GET | `/api/projects/:project_id/domains` | List domains | K,J,P(domains.view) | Z | R domains | E | q/domains.ts | D; projects:141 |
| POST | `/api/projects/:project_id/domains` | Add domain | K,J,P(domains.manage) | Z | W domain | E | m/domains.ts | D; projects:146 |
| PATCH | `/api/projects/:project_id/domains/:domain_id` | Change domain | K,J,P(domains.manage) | Z | W scoped domain | E | m/domains.ts | D; projects:151 |
| DELETE | `/api/projects/:project_id/domains/:domain_id` | Remove non-default | K,J,P(domains.manage) | Z | RW domains | E,409 | m/domains.ts | D; projects:156 |
| PATCH | `/api/projects/:project_id/api-keys/:key_id` | Edit active key | K,J,P(api_keys.update) | Z | W key/audit | E | direct key-page request; controller exists | D; projects:161 |
| POST | `/api/projects/:project_id/api-keys/:key_id/revoke` | Revoke key | K,J,P(api_keys.revoke) | Z | RW keys/audit | E,409 | key management; DELETE alias used by mutation | D; projects:166 |
| DELETE | `/api/projects/:project_id/api-keys/:key_id` | Soft revoke, not hard delete | K,J,P(api_keys.revoke) | Z | RW keys/audit | E,409 | m/api-keys.ts | D; projects:171 |
| PATCH | `/api/projects/:project_id` | Update project/domain | K,J,P(settings.update) | Z | W project/domain/audit | E | m/projects.ts | D; projects:176 |
| POST | `/api/projects/:project_id/pause` | Disable keys | K,J,P(settings.update) | Z | W keys/audit | E | m/projects.ts | D; projects:181 |
| POST | `/api/projects/:project_id/resume` | Re-enable keys | K,J,P(settings.update) | Z | W keys/audit | E | m/projects.ts | D; projects:186 |
| POST | `/api/projects/:project_id/reset` | Reset analytics/files | K,J,P(settings.update) | Z | delete analytics; S3 deletes; audit | E | m/projects.ts | D; projects:191 |
| DELETE | `/api/projects/delete/:project_id` | Delete project | K,J,P(projects.delete) | Z | delete/cascades; audit insert | E | m/projects.ts | D; projects:196 |
| GET | `/api/dashboard/` | Dashboard aggregates | K,J,P(dashboard.view) | Z | R events | E | q/dashboard.ts | U; dashboard:9 |
| GET | `/api/analytics/` | General analytics | K,J,P(analytics.view OR reports.view) | Z | R events | E | q/analytics.ts | U; analytics:34 |
| GET | `/api/analytics/reports` | Report history/signed links | K,J,P(reports.view) | Z | R reports; S3 signing | E | q/reports.ts | U; analytics:18 |
| POST | `/api/analytics/reports` | Generate XLSX report | K,J,P(reports.export) | Z | RW reports/audit; S3 W | E | m/reports.ts | D; analytics:23 |
| GET | `/api/analytics/reports/:report_id/download` | Signed download | K,J,P(reports.export) | Z | R scoped report; S3 signing | E | report download UI/query URL | U; analytics:28 |
| GET | `/api/visitors/` | Visitor list | K,J,P(visitors.view) | Z | R events | E | q/visitors.ts | U; visitors:17 |
| GET | `/api/visitors/locations` | Visitor geography | K,J,P(visitors.view) | Z | R events; local GeoIP | E | q/visitors.ts | U; visitors:12 |
| GET | `/api/session-replay/` | Recording list | K,J,P(session_replay.view) | Z | R events/replay | E | q/session-replay.ts | U; session-replay:18 |
| GET | `/api/session-replay/:sessionId` | Recording detail | K,J,P(session_replay.view) | Z | R scoped replay/events | E | q/session-replay.ts | D; session-replay:23 |
| GET | `/api/session-replay/:sessionId/stream` | Live chunks | K,J,P(session_replay.view) | Z | R scoped session/chunks; process emitter | SSE | q/session-replay.ts | D; session-replay:13 |
| GET | `/api/user-journey/` | Journey graph | K,J,P(user_journey.view) | Z | R events | E | q/user-journey.ts | U; user-journey:9 |
| GET | `/api/heatmaps/` | Heatmap list | K,J,SP(heatmaps.view) | Z | RW snapshot metadata; R events; SQS/S3 | E | q/heatmaps.ts | T; heatmaps:17 |
| GET | `/api/heatmaps/detail` | Heatmap detail | K,J,SP(heatmaps.view) | Z | RW snapshot metadata; R events; SQS/S3 | E | q/heatmaps.ts | T; heatmaps:12 |
| POST | `/api/heatmaps/preview-sessions/` | Create preview | K,J,SP(heatmaps.view) | Z | RW identity/session | E | q/preview-sessions.ts | T; preview-sessions:16 |
| DELETE | `/api/heatmaps/preview-sessions/` | Revoke own preview | K,J,session-derived permission + owner | Z | W session | E | q/preview-sessions.ts | T; preview-sessions:21 |
| POST | `/api/heatmaps/preview-sessions/supersede` | Supersede own preview | K,J,session-derived permission + owner | Z | W session | E | live-preview lifecycle support; direct caller not established | T; preview-sessions:26 |
| GET | `/api/funnels/` | Funnel stats | K,J,P(funnels.view) | Z | R definitions/events | E | q/funnels.ts | U; funnels:14 |
| POST | `/api/funnels/` | Create funnel | K,J,P(funnels.manage) | Z | W funnel/audit | E,409 | m/funnels.ts | D; funnels:19 |
| PATCH | `/api/funnels/:funnel_id` | Update funnel | K,J,P(funnels.manage) | Z | W scoped funnel/audit | E | m/funnels.ts | D; funnels:24 |
| DELETE | `/api/funnels/:funnel_id` | Delete funnel | K,J,P(funnels.manage) | Z | delete scoped funnel/W audit | E | m/funnels.ts | U; funnels:29 |
| GET | `/api/goals/` | Goals/stats | K,J,P(goals.view) | Z | R goals/domain/events | E | q/goals.ts | U/D; goals:20 |
| GET | `/api/goals/:goal_id/dashboard` | Goal dashboard | K,J,P(goals.view) | Z | R scoped goal/domain/events | E | q/goals.ts | D; goals:15 |
| POST | `/api/goals/` | Create domain-bound goal | K,J,P(goals.manage) | Z | W goal/audit | E,409 | m/goals.ts | D; goals:21 |
| PATCH | `/api/goals/:goal_id` | Update goal | K,J,P(goals.manage) | Z | W scoped goal/audit | E | m/goals.ts | D; goals:26 |
| DELETE | `/api/goals/:goal_id` | Delete goal | K,J,P(goals.manage) | Z | delete scoped goal/W audit | E | m/goals.ts | U; goals:31 |
| GET | `/api/performance/` | Performance metrics | K,J,P(performance.view) | Z filters, weak stored payload | R events | E | q/performance.ts | D; performance:9 |
| GET | `/api/errors/` | Error groups | K,J,P(errors.view) | Z | R events | E | q/errors.ts | U; errors:9 |
| GET | `/api/campaigns/` | Campaign stats | K,J,P(campaigns.view) | Z | R goals/events/attribution | E | q/campaigns.ts | U; campaigns:9 |
| GET | `/api/notifications/` | Own notifications | K,J,Self | M/Z | R recipient rows | E | q/workspace.ts | U; notifications:14 |
| POST | `/api/notifications/:notification_id/accept` | Accept invitation | K,J,recipient | Z | RW notification/membership | E | m/workspace.ts | U; notifications:15 |
| PATCH | `/api/notifications/:notification_id/read` | Mark read | K,J,recipient | Z | W recipient notification | E | notifications popover | U; notifications:16 |
| GET | `/api/feedback/status` | Has submitted feedback | K,J,Self | M | R feedback | E | q/feedback.ts | U; feedback:12 |
| POST | `/api/feedback/` | Submit one feedback | K,J,Self | Z | W feedback | E,409 | m/feedback.ts | U; feedback:13 |
| GET | `/api/integrations/categories` | Catalog categories | K,J | M | R catalog | E | q/integrations.ts | U; integrations:21 |
| GET | `/api/integrations/` | Catalog/installed state | K,J; strict permission only for installed filter | Z | R catalog/project connections; S3 signing | E | q/integrations.ts | D; integrations:22 |
| GET | `/api/integrations/slack/connect` | Start Slack OAuth | K,J,C settings.update/project ownership | M | W state; Slack redirect | E/redirect | m/integrations.ts | U; integrations:37 |
| GET | `/api/integrations/stripe/connect` | Start Stripe OAuth | K,J,C settings.update/project ownership | M | W state; Stripe redirect | E/redirect | m/integrations.ts | U; integrations:38 |
| GET | `/api/integrations/google-search-console/connect` | Start GSC OAuth | K,J,SP(settings.update) | M/signed state | —; Google redirect | E/redirect | m/integrations.ts | U; integrations:39 |
| GET | `/api/integrations/:integrationId` | Catalog detail/connected flag | K,J, no project ownership check | M | R catalog/connection; S3 signing | E | q/integrations.ts | D; integrations:44 |

Permission names abbreviated in the table retain their real namespaces: analytics entries are `analytics.<feature>.<action>`, project entries `project.<resource>.<action>`, and workspace administrative entries `workspace.<resource>.<action>`. Full literal strings are in the cited route files.

**Proxy surface:** local/Lambda health plus session-bound page, resource, and controlled runtime endpoints are implemented in `apps/pathlens-heatmap-proxy/src/app.ts`; page/resource paths are `/v1/session/:handle/page...` and `/v1/session/:handle/resource?...`. Only GET/HEAD-style fetch behavior is allowed for website resources; session validation is delegated to the internal API. These are not extra Express routes.

**Integration observations:** no clear missing backend route was found among the central query/mutation consumers. Several aliases/internal endpoints have no established direct SPA caller; that is not proof of dead code. No API version prefix exists for Express; preview proxy uses `/v1`.

## 8. Authentication and Authorization Audit

| Lifecycle | Observed implementation | Assessment |
|---|---|---|
| Registration | Validates email/password confirmation; inserts user, signs JWT, separately creates workspace | Passwords plaintext, no email verification, non-atomic account creation |
| Login | Exact email lookup and direct password equality; seven-day JWT | Generic bad-password response is good; no hash/brute-force control |
| Logout | Deletes localStorage token and reloads | No server invalidation |
| Validation/expiry | `jwt.verify` and JWT `exp` | Expiry enforced cryptographically; no user/session revocation lookup |
| Refresh | No refresh-token lifecycle discovered | Seven-day bearer is the sole session credential |
| Reset request | Generic success for unknown user; eligible password users get random token email; social-only accounts get provider reminder | Provider guidance is now implemented in uncommitted work; configuration/test inconsistency remains |
| Reset confirmation | SHA-256 token hash, 30-minute TTL, atomic unused/unexpired update and password update in a transaction | Single-use claim is positive; plaintext replacement and no session revocation |
| Email verification/recovery | No email verification route/table or recovery-factor flow found | Do not treat syntax validation as proof of email ownership |
| Google/GitHub | Provider code exchange, verified email, signed state, frontend sessionStorage state comparison, JWT fragment redirect | Better than query-string bearer redirect; backend state is not persisted/consumed; automatic linking enables F-05 |
| Delete account | Password check when password exists; deletes user with cascading/restrict FKs | Social-only account deletion lacks recent provider reauthentication; connected integration restrict may prevent deletion |

Primary source: `users.controller.ts:22-225,351-527`, `password-reset.model.ts:13-87`, `jwt.ts:9-16`, `auth.middleware.ts:19-46`, provider controllers, frontend auth helpers/callbacks.

CSRF: dashboard authorization is supplied in a bearer header, not an ambient session cookie, so lack of a general CSRF token alone is not classified as an exploit. OAuth state cookies are relevant separately. Slack/Stripe use HttpOnly SameSite=Lax cookies and atomic database state consumption; Secure depends on `NODE_ENV=production`. Google login/GitHub state checks occur partly in the frontend. GSC uses a signed cookie-bound JWT state, not the same persistent mechanism.

## 9. Multi-Tenant Security Audit

Tenant boundary is **workspace membership**, with projects beneath workspaces. Roles include owner/member plus legacy admin handling. Permission profiles and direct per-user grants are workspace-scoped; permissions are generally workspace-wide rather than true per-project ACLs.

**Correct patterns found**

- `requireWorkspaceProjectPermission` validates UUIDs, membership/permission, and the persisted project's workspace (`permission.middleware.ts:157-239`).
- Workspace-or-project usage/audit middleware checks ownership (`permission.middleware.ts:90-155`).
- Workspace controllers use real permission checks; missing route-level middleware is **not by itself evidence of missing authorization**.
- Replay reads constrain session, workspace and project (`replay.model.ts:190-203,268-281`).
- Invitation acceptance and notification reads constrain recipient (`workshop.model.ts:1036-1113`).
- Preview creation resolves persisted heatmap/domain identities and uses strict route checks.

**Broken patterns**

- Weak middleware trusts `workspace_id` before resolving `project_id`. Project-key/domain/mutation handlers then operate using project ID alone: F-01.
- Middleware reads query before body; report/funnel/goal mutations use the body: F-02. Even strict middleware should not allow independent, conflicting sources.
- Foreign keys validate existence, not that paired workspace/project/profile IDs belong together: F-17 and database section.
- Membership deletion leaves direct grants: F-18.
- Catalog connected flags lack project authorization outside `filter=installed`: F-16.
- `getWorkspaceByIdModel` repairs permission data before proving membership: F-22.

**Safe verification results:** real weak middleware accepted `(authorized workspace A, victim project B)` without even calling the project lookup; accepted `(query workspace A, body workspace B)`; strict middleware rejected A/B with 403. The model/action continuations were inspected, not executed against any database.

## 10. Database Audit

### Schema and integrity

The current schema has 27 `pgTable` definitions covering users/avatars, workspaces/members/profiles/direct permissions/requests/notifications, projects/domains/keys, events/attribution/replay, reports/audits, previews/snapshots, integration catalog/connections/OAuth states/deliveries.

Positive constraints include unique user email/provider IDs, membership primary keys, scoped event IDs, replay sequence uniqueness, one default domain per project, unique project/domain combinations, pending invitation uniqueness, and notification delivery-period uniqueness.

Important gaps:

- A workspace/project pair can each exist but refer to different tenants; no composite FK ties events/goals/funnels/reports/snapshots/deliveries to their parent project's workspace. API defenses are therefore essential.
- A membership profile FK is not paired with workspace; F-17 demonstrates a write path.
- Direct grants lack composite membership FK/cascade (F-18).
- `workspaces.isDefault` has no partial unique per-owner constraint (`schema.ts:344-382`); account bootstrap assumes exactly one.
- Project-domain rows are owned by their creating user with `ON DELETE CASCADE`, even though the project can belong to another owner. Deleting a member account can delete domains on a shared project (`schema.ts:741-773`). Treat this as a data-ownership concern within F-21.
- `projectIntegrations.connectedByUserId` uses RESTRICT (`schema.ts:110-112`); account deletion can be blocked by integrations even when a workspace owner expects the account to be deletable.
- Audit actor deletion cascades audit evidence; project deletion uses set-null for existing audit project references, which does not permit inserting a new audit referencing a deleted project (F-20).

### Transactions and migrations

Project bootstrap, replay insert/counters, reset consumption, and several membership operations use transactions. Signup plus default workspace is not one transaction. Usage read/check/write is not an atomic reservation and can overshoot concurrently; invitation limits are checked at invitation creation but not acceptance.

Migration names span `0000`–`0066`; history includes deliberate table removals, repair migrations, and notification migration reconciliation. `0062_pale_rhodey.sql:1-15` removes chat tables. No migration was generated, applied, or tested against a database. No schema-drift claim about the live database is made.

Runtime workers execute DDL independently of migration history (F-26). `0053` alters snapshots before `0054` repairs/creates them; that repair cannot rescue a preceding failed migration in an arbitrary drifted installation. It is a deployment-state verification requirement, not proof a clean install fails.

### Query/storage assessment

Database calls generally use parameterized Drizzle SQL or `$1` worker queries. The `sql.raw` helpers at `heatmaps.model.ts:335-357` are internal column-expression helpers; no user-controlled raw SQL path was established.

Events have numerous single-column indexes but no main `(workspace_id, project_id, occurred_at)` index (`schema.ts:1188-1217`). Hot reads use tenant/time predicates and regex host extraction. Raw JSONB payload duplicates many first-class event columns. Usage checks scan historical counts, and per-goal/funnel logic loads potentially large event arrays.

API and worker `pg.Pool` instances do not specify aggregate Lambda concurrency budgets, query timeouts, or statement timeouts. TLS verification is supported when a CA is supplied, but production TLS is configuration-dependent. No backups, PITR, restore drill, database roles/RLS, actual query plans, or production pool limits were verified.

## 11. Tracking and Analytics Audit

### End-to-end trace

1. Script discovers `data-api-key`, fetches allowed tracking scopes, instantiates tracker.
2. Persistent visitor ID is stored in localStorage; session ID in sessionStorage.
3. DOM navigation/click/scroll/movement/form metadata/error/performance events are captured. Inputs do **not** send raw input values; password-input change events are skipped.
4. Events receive stable UUIDs before queueing. Analytics queue caps count/bytes and retries transient failures, handles 413 splits and 429 Retry-After.
5. rrweb masks all inputs and supports explicit DOM block/mask selectors; recordings are chunked separately.
6. API resolves hashed unrevoked/unexpired project key, domain origin and scopes; decrypts and overwrites project ID.
7. Events are stored transactionally with unique `(project_id,event_id)` conflict handling; attribution uses earliest client timestamp.
8. Replay has unique session/sequence chunks and atomic counters; analytics reads aggregate PostgreSQL data.

**Integrity/privacy issues:** F-07–F-13, F-23–F-25, F-34. Project browser keys are public by design; payload encryption using that key is not protection against forged analytics by someone possessing the published key and spoofing Origin outside a browser. No bot filtering or server-attested event authenticity was established. Client timestamp bounds are not enforced beyond parseability (`events.model.ts:430-434`).

**Accuracy limitations:**

- Tracking `history.replaceState` as page view can overcount route metadata-only replacements (`events.ts:380-386`).
- Tracker `session_end.duration` is page-instance lifetime (`events.ts:420-425`), not necessarily the full reused session lifetime.
- Analytics page duration uses LEAD over page-view events, last page becomes zero (`analytics.model.ts:308-339`); this is a measurement definition, not accurate engagement time.
- Session grouping by unqualified `session_id` can merge SDK sessions if identifiers collide/reuse across projects in workspace-wide reports.
- User-journey conversions include form submission and heuristic labels (`user-journey.model.ts:147-150,173-179`); submission is not proof of business success.
- Heatmaps explicitly preserve geometry/device groups and truncation coverage; do not describe bounded samples as all activity.
- No measured data-loss rate or analytics reconciliation against an independent dataset was performed.

## 12. Third-Party Integration Audit

| Integration | Controls present | Remaining concerns / verification |
|---|---|---|
| Stripe billing | Raw body before JSON; signature verification; paid/mode/price metadata checks; account-bound entitlement update | F-36; no refund/dispute handling; checkout lacks idempotency; webhook errors collapse to 400; no live test |
| Stripe Connect dashboard | Persisted one-use OAuth state, cookie binding, permission recheck; account-bound data; 15s shared client timeout; 5,000-record cap; currency separation | Requests `read_write` while observed dashboard consumption is read-only; no general Stripe disconnect endpoint found; no total multi-page wall-clock budget |
| Slack OAuth/API | Random hashed one-use state, cookie binding, current ownership recheck, encrypted bot/user tokens; API timeout and rate-limit error handling | No live scope/rotation verification; upstream 401 signs dashboard user out; disconnect revocation result needs operational monitoring |
| Slack schedules | Durable unique delivery rows, locks/tokens, strict send reservation, unknown outcomes not blindly resent, partial batch failures; DST tests | Template disabled intentionally; unknown outcome requires reconciliation; F-40 shard starvation; broad README duplicate warning predates send-fencing behavior |
| GSC | Encrypted refresh token; property/domain checks; read-only scope; provider errors mapped; ordinary data fetch timeout | Callback does not recheck current permissions or consume state persistently; token refresh lacks explicit timeout; F-15/F-39 |
| PageSpeed | Registered project domain lookup; bounded fetch timeout; missing data remains null | No persistent server cache; repeated page views can spend upstream quota; deployment quotas/cost unverified |
| Google/GitHub login | Verified provider email and signed state; frontend state checks; token in fragment | F-05; exchange/profile fetches lack explicit timeouts; backend one-use state not enforced |
| Resend | Escaped HTML; generic unknown-account request response; token not stored raw | F-14; no timeout/idempotency/retry delivery layer; API example lacks email settings; no actual email sent |
| S3 | Signed downloads; worker checks bucket public-access block; template encryption/public block | Cleanup/retention defects; signed URLs remain bearer capabilities after membership removal until expiry |
| SQS | Batches, DLQs and partial failure reporting; persisted job claims | Snapshot handlers swallow some processing failures after recording DB state; DB retry scheduling, not SQS redelivery alone, must be monitored |
| Secrets Manager | Notification-specific runtime bootstrap support | Actual IAM/secret versions/rotation and other app secrets unverified |

Credential encryption uses random-IV AES-256-GCM (`credential-encryption.ts:19-56`), but key rotation supports only the current fixed version, not a keyring. Secret values were not printed or validated against external services.

## 13. Security Findings

This is the authoritative finding register. Sections elsewhere reference these IDs rather than creating duplicate findings. Each entry includes category, evidence, root cause/impact, verification, recommendation, effort and confidence.

### F-01 — CRITICAL — Cross-tenant project/key access via workspace override

**Class/category:** Confirmed defect; authorization/tenant isolation.  
**Evidence/functions:** `apps/pathlens-api/src/middleware/permission.middleware.ts:20-41,48-83` (`getWorkspaceId`, `requireAnyWorkspacePermission`); `routes/projects.route.ts:131-199`; `controllers/project-api-keys.controller.ts:95-105`; `controllers/projects.controller.ts:267-277,416-428,468-476`; `models/projects.model.ts:236-244,618-619`.

**Root cause/impact:** Middleware trusts query/body workspace before deriving the actual project's workspace. Key listing decrypts victim keys; project update/reset/delete uses the project ID without the authorized workspace. A valid user with permissions in their own workspace and knowledge of a victim project UUID can read keys or mutate/delete victim data.

**Verification:** Isolated actual-middleware execution accepted victim project plus own workspace query with zero project lookups. Follow-through is established statically; no victim API was called. Example future isolated regression: `DELETE /api/projects/delete/<B-project>?workspace_id=<A-workspace>` authenticated as A must return 403, not reach deletion.

**Resolution:** Derive immutable authorization context from persisted project; use strict middleware everywhere and tenant predicates in models. Reject contradictory identifiers. **Effort:** M/L. **Confidence:** Confirmed.

### F-02 — CRITICAL — Query/body authorization mismatch permits victim-workspace mutations and exports

**Class/category:** Confirmed defect; authorization/data disclosure.  
**Evidence/functions:** `middleware/permission.middleware.ts:20-26,58-83`; `routes/analytics.route.ts:23-26`; `controllers/report-generations.controller.ts:82-120,138-174`; `controllers/funnels.controller.ts:81-90,131-142`; `controllers/goals.controller.ts:158-184`.

**Root cause/impact:** Authorization chooses query `workspace_id=A`; mutation parses body `workspace_id=B`. A report with B workspace and B project passes the controller's internal project/workspace comparison, then queries B analytics and returns an S3 download. Similar body-based writes can target B definitions.

**Verification:** Actual middleware accepted a request with A query and B body in memory. Database model/action reviewed only. Isolated future regression: POST report with A query and B body must fail before report creation, analytics query, or S3 call.

**Resolution:** Parse once into canonical validated input and authorization context; disallow duplicate tenant identifiers with different values; pass authorized IDs to models. **Effort:** M/L, shared with F-01. **Confidence:** Confirmed.

### F-03 — HIGH — Passwords stored, reset and compared in plaintext

**Class/category:** Confirmed defect; credential protection.  
**Evidence/functions:** `controllers/users.controller.ts:46-47,181-185,451-460`; `models/users.model.ts:24-40,237-245`; `models/password-reset.model.ts:62-69`.

**Root cause/impact:** Raw password values are persisted; equality checks replace password hashing. Database/backup/log exposure reveals reusable credentials.

**Verification:** Trace signup, login, change and reset assignments; no hashing library/function occurs on these paths. No actual user password was read.

**Resolution:** Argon2id or equivalent adaptive hashing, consistent verification, migration/reset strategy for existing accounts, safe logging and password policy. **Effort:** M. **Confidence:** Confirmed.

### F-04 — HIGH — Logout/password reset cannot revoke seven-day sessions

**Class/category:** Missing safeguard; session security.  
**Evidence/functions:** `lib/jwt.ts:9-16`; `middleware/auth.middleware.ts:38-42`; `controllers/users.controller.ts:458-465`; `models/password-reset.model.ts:62-86`; web `components/common/nav-user.tsx:243-245`.

**Root cause/impact:** JWT verification has no session/user security-version lookup; password changes/reset do not revoke old tokens. A stolen bearer remains usable after apparent recovery/logout.

**Verification:** Source trace of all lifecycle paths; not tested against a live token. **Resolution:** short-lived sessions plus server-backed revocation/security version, recent-auth checks, logout endpoint and reset/change invalidation. Validate deleted-account handling too. **Effort:** L. **Confidence:** Confirmed.

### F-05 — HIGH — Unverified email registration plus automatic linking enables account pre-hijacking

**Class/category:** Confirmed design defect; account identity.  
**Evidence/functions:** `controllers/users.controller.ts:159-204,351-385`; `controllers/google-auth.controller.ts:159-183`; `controllers/github-auth.controller.ts:180-209`; `models/users.model.ts:58-72,84-98`.

**Root cause/impact:** Anyone can register an unverified victim email with an attacker-known password. A later legitimate provider login matches that email and links the verified provider without removing/revalidating the pre-existing password. The attacker can still password-login to the now-used account. Profile email changes likewise have no email proof/recent-auth requirement.

**Verification:** Static sequence through signup -> email match/link -> unchanged password -> login. Requires controlled identity-provider test for runtime confirmation, not attempted.

**Resolution:** Verify email before enabling account ownership; require proof/reauthentication for linking and email change; handle pre-existing unverified accounts safely. **Effort:** L. **Confidence:** High confidence.

### F-06 — HIGH — No repository-level abuse controls for authentication or public collectors

**Class/category:** Missing safeguard; abuse resistance.  
**Evidence:** `app.ts:60-80`; `routes/users.route.ts:21-24`; `routes/events.route.ts:14-18`; `routes/replay.route.ts:7-11`; `lib/project-api-keys.ts:35-61`.

**Root cause/impact:** No request throttler/bot control appears on these mounted paths. Password attempts, reset-email floods and published-key ingestion can consume DB/provider resources. Key resolution even updates last-use before origin/payload validation.

**Verification:** App/route/middleware-wide search; gateway/WAF controls unverified. **Resolution:** per-IP/account/project budgets, email cooldowns, tenant ingestion quotas and gateway protection with bounded bodies. **Effort:** M. **Confidence:** High confidence.

### F-07 — HIGH — Resuming a project resurrects intentionally revoked keys

**Class/category:** Confirmed defect; key lifecycle.  
**Evidence/functions:** `models/project-api-keys.model.ts:101-121` (`pauseProjectApiKeysModel`, `resumeProjectApiKeysModel`).

**Root cause/impact:** Pause represents disabled state using `revokedAt`; resume clears it on **all** project keys, including previously compromised/revoked keys. Expired keys remain expired, but unexpired compromised keys become valid again.

**Verification:** Follow revoke -> pause -> resume SQL predicates; no DB writes performed. **Resolution:** Separate project-paused state from irreversible key revocation; preserve revocation provenance. **Effort:** M. **Confidence:** Confirmed.

### F-08 — HIGH — Analytics collects full URLs and unmasked sensitive DOM text

**Class/category:** Confirmed collection behavior; privacy.  
**Evidence:** tracker `src/utils.ts:164-174`, `src/events.ts:71-80,149-175,333-365`; API `models/events.model.ts:482-513`; tracker `src/replay.ts:143-153`; API `lib/replay-privacy.ts:3-31`.

**Root cause/impact:** Analytics sends `location.href`, including query/fragment reset tokens or other secrets. Click text and replay DOM text are not blanket-masked; email masking does not mask card numbers, names, addresses or health/financial text. The collector stores the whole event payload.

**Verification:** Static serialization and persistence trace. Raw form-input values are not asserted to be captured: rrweb masks inputs and input-change events contain metadata only. Rendered personal/payment text and sensitive URL content are concrete exposure classes.

**Resolution:** strip query/fragment by default, allowlist metadata, default-deny sensitive DOM capture, server redaction and privacy tests using representative checkout/account pages. **Effort:** L. **Confidence:** Confirmed.

### F-09 — MODERATE — SDK lacks consent/revocation lifecycle

**Class/category:** Missing safeguard; privacy/integration.  
**Evidence:** tracker `src/index.ts:12-32`, `src/tracker.ts:67-91,128-135`, `src/events.ts:185-197,369-390`.

**Root cause/impact:** Bootstrap starts identifiers/replay/events without a consent-state API. `destroy()` stops timers/recording but leaves registered listeners/history wrappers active. Integrators cannot reliably withdraw capture through that method.

**Verification:** init/destroy and event-registration trace. Legal applicability depends on deployment jurisdiction/consent model; no legal violation is presumed.

**Resolution:** explicit consent/init/stop API, reversible listeners/history instrumentation, no storage or capture before approval when required. **Effort:** M. **Confidence:** High confidence.

### F-10 — HIGH — Malformed performance events poison dashboard queries

**Class/category:** Confirmed defect; validation/availability.  
**Evidence:** contracts `src/events.ts:136-198`; API `models/events.model.ts:468-513`; `models/performance.model.ts:148-163`; `models/projects.model.ts:470-480`.

**Root cause/impact:** A `performance` event's `ttfb/dns/load/...` fields pass through without numeric validation. Subsequent SQL casts `(payload->>'ttfb')::float`; a stored nonnumeric string causes query failure until excluded or removed.

**Verification:** Schema accepts the event shape and source SQL uses unchecked casts. SQL execution not attempted. **Resolution:** discriminated per-event schemas with finite bounded metrics; safe legacy casts/backfill and rejection tests. **Effort:** M. **Confidence:** High confidence.

### F-11 — HIGH — Goal dashboard compares hostname with stored origin

**Class/category:** Confirmed defect; analytics correctness.  
**Evidence/functions:** API `lib/project-domain.ts:46-71`; `models/project-domains.model.ts:41-50`; `models/goals.model.ts:353-371,502-506`.

**Root cause/impact:** Domains are stored as `https://example.com`; goal dashboard passes `definition.domain` directly to a SQL predicate extracting `example.com`. Normal domain-bound goals return zero matching events. Goal-list counting also does not consistently impose the goal's own domain when no filter is supplied.

**Verification:** Compare canonical value representations along write/read path; isolated database fixture still needed to establish output against PostgreSQL.

**Resolution:** normalize to one hostname identity before every goal query; use the same domain scope for numerator/denominator/list/detail. **Effort:** M. **Confidence:** High confidence.

### F-12 — MODERATE — Long-lived pages never rotate idle sessions

**Class/category:** Confirmed defect; analytics identity.  
**Evidence:** tracker `src/utils.ts:54-78`; `src/tracker.ts:32-34,49-53,94-112`.

**Root cause/impact:** Timeout is checked only during construction. After a long idle period in the same page, `track()` only touches last-active and retains readonly session ID; distinct visits merge.

**Verification:** Constructor -> idle -> track control flow. **Resolution:** activity-time session lifecycle and replay rollover; test same-tab idle and page reload behavior. **Effort:** M. **Confidence:** Confirmed.

### F-13 — MODERATE — Unavailable localStorage aborts SDK bootstrap

**Class/category:** Confirmed defect; browser reliability.  
**Evidence:** tracker `src/utils.ts:43-51`; `src/tracker.ts:46-51`; `src/index.ts:20-29`.

**Root cause/impact:** Visitor-ID storage has no try/catch or in-memory fallback, unlike session/campaign storage. Restricted storage can throw during construction, outside the configuration-fetch catch, preventing tracking.

**Verification:** Static exception path; no browser context altered. **Resolution:** storage abstraction with safe ephemeral IDs; test throwing storage implementations. **Effort:** S. **Confidence:** Confirmed.

### F-14 — MODERATE — Password-reset URL configuration is inconsistent and tests fail

**Class/category:** Confirmed defect under tested configuration; recovery.  
**Evidence:** API `controllers/password-reset.controller.ts:54-66,264-268,335-351`; test `password-reset.controller.test.ts:106-109,245-246`; `.env.example:1-37`.

**Root cause/impact:** Reset links require `FRONTEND_URL`; reminder links instead use `WEB_APP_URL` with localhost fallback. Tests configure only WEB_APP_URL. Two tests fail with Invalid URL and 503; current examples also omit Resend settings. A deployment setting FRONTEND_URL correctly may still deliver resets, so universal reset failure is not claimed.

**Verification:** `pnpm --filter @pathlens/api test:password-reset`: 13 pass/2 fail. **Resolution:** one validated single application URL, explicit email settings and hermetic test config. **Effort:** S/M. **Confidence:** Confirmed.

### F-15 — MODERATE — Provider credential failures log out the Pathlens user

**Class/category:** Confirmed defect; frontend/backend error semantics.  
**Evidence:** web `lib/apiClient.ts:38-44`; API `controllers/project-integrations.controller.ts:246-251`; `services/google-search-console-dashboard.service.ts:86-93`; `lib/google-search-console.ts:104-109,154-158`.

**Root cause/impact:** Shared client treats every non-login HTTP 401 as an expired Pathlens session. Slack/Google use 401 for provider reconnect errors; a valid dashboard user is logged out.

**Verification:** Match server status branches to client interceptor. **Resolution:** distinguish upstream auth failures from application auth using stable error codes/502 or scoped handling. **Effort:** S/M. **Confidence:** Confirmed.

### F-16 — LOW — Integration connected-state disclosure across projects

**Class/category:** Confirmed defect; tenant metadata.  
**Evidence:** API `routes/integrations.route.ts:22-44`; `controllers/integrations.controller.ts:22-35,89-97`; `models/integrations.model.ts:75-89,143-158`.

**Root cause/impact:** Only `filter=installed` triggers project ownership checks; all/default catalog and detail can report `isConnected` for an arbitrary project ID. Provider credentials are not returned.

**Verification:** Compare route conditional and project-scoped select. **Resolution:** authorize every supplied project context; leave truly global catalog fields unscoped. **Effort:** S. **Confidence:** Confirmed.

### F-17 — MODERATE — Member assignment accepts another workspace's permission profile

**Class/category:** Confirmed defect; tenant integrity.  
**Evidence:** API `controllers/workspace.controller.ts:554-574`; `models/workshop.model.ts:712-734,389-402`; `db/schema.ts:448-453`.

**Root cause/impact:** Assignment checks actor/target membership but not profile ownership. FK only checks the profile ID exists; permission lookup joins by profile ID alone. Roles in one tenant can become coupled to another tenant's profile.

**Verification:** Static path; future fixture should assign a B profile to an A member and expect rejection. **Resolution:** workspace-scoped profile lookup plus composite DB integrity and explicit assignable-permission policy. **Effort:** M. **Confidence:** Confirmed.

### F-18 — MODERATE — Direct permission grants survive membership removal

**Class/category:** Confirmed defect; authorization lifecycle.  
**Evidence:** API `models/workshop.model.ts:412-419,739-756,1089-1097`; `db/schema.ts:471-497`.

**Root cause/impact:** Removing a member deletes only membership, not direct grants. Reinvitation with a restricted profile revives previous direct privileges. A grant references workspace/user, not membership.

**Verification:** Remove -> reaccept -> access-union source trace. **Resolution:** transactionally delete grants on removal, composite membership FK, rejoin lifecycle tests. **Effort:** M. **Confidence:** Confirmed.

### F-19 — MODERATE — Account bootstrap can leave an unusable partial account

**Class/category:** Confirmed failure path; transactions/recovery.  
**Evidence:** API `controllers/users.controller.ts:181-197,59-65`; `controllers/google-auth.controller.ts:185-199`; `models/users.model.ts:118-124`; `db/schema.ts:344-382`.

**Root cause/impact:** User creation and default workspace creation are separate commits. A workspace failure leaves an email/provider user but no default; login dereferences `workspace.id`, profile model destructures a nullable join, and later signup rejects duplicate email.

**Verification:** Static injected-failure reasoning, not a DB test. **Resolution:** atomic user/workspace bootstrap, idempotent recovery and unique default-workspace constraint. **Effort:** M. **Confidence:** High confidence.

### F-20 — HIGH — Project deletion succeeds, then fails its audit insert

**Class/category:** Confirmed defect; destructive mutation correctness.  
**Evidence:** API `controllers/projects.controller.ts:468-493,500-514`; `models/projects.model.ts:618-619`; `db/schema.ts:555-557`.

**Root cause/impact:** Project is deleted before `createAuditLog` inserts `projectId` equal to the deleted UUID. The FK rejects that new reference. The client receives an error although data is gone; audit evidence is absent and retries are misleading.

**Verification:** Order of operations and FK definition. Existing rows' ON DELETE SET NULL does not make new invalid inserts legal. **Resolution:** retain resourceId/metadata with null projectId, or write audit before deletion in one transaction and allow set-null. Test real PostgreSQL behavior. **Effort:** S/M. **Confidence:** High confidence.

### F-21 — MODERATE — Data deletion is incomplete and storage cleanup is non-atomic

**Class/category:** Confirmed design defect; privacy/data lifecycle.  
**Evidence:** API `models/projects.model.ts:561-615,618-619`; `models/workshop.model.ts:202-208`; `models/users.model.ts:250-256`; `db/schema.ts:750-752`; `lib/s3.ts:136-169`.

**Root cause/impact:** Reset removes S3 files before DB commit; rollback leaves broken references. Project/workspace/account deletion mainly cascades DB rows without S3/provider cleanup. Creator-account cascade can remove domains from shared projects. Concurrent jobs may recreate orphan objects.

**Verification:** Static deletion graph; actual orphan counts not measured. **Resolution:** durable deletion/outbox workflow, tombstones/job fencing, explicit ownership, prefix lifecycle and provider disconnection policy. **Effort:** L. **Confidence:** High confidence.

### F-22 — MODERATE — Permission reads perform writes, including before authorization

**Class/category:** Confirmed defect/architectural issue; authorization side effects.  
**Evidence:** API `models/workshop.model.ts:63-153,295-300,366-387`.

**Root cause/impact:** A workspace detail read seeds/updates built-in profiles and members/invitations before checking caller membership. Even permitted requests repeatedly update full-access profiles and inspect/repair whole-workspace rows. Unauthorized requests can trigger work in a known foreign workspace.

**Verification:** Function order/queries. **Resolution:** move repair to reviewed migrations/explicit maintenance; make authorization reads side-effect free. **Effort:** M. **Confidence:** Confirmed.

### F-23 — MODERATE — Hot analytics/usage paths scale with retained event history

**Class/category:** Architectural improvement/probable capacity risk; performance.  
**Evidence:** API `models/usage.model.ts:99-115,251-265`; `models/events.model.ts:517-525`; `controllers/projects.controller.ts:209-220`; `models/projects.model.ts:424-444`; `models/funnels.model.ts:153-175,261-273`; `models/goals.model.ts:163-201`; `db/schema.ts:1188-1217`; `db/client.ts:8`.

**Root cause/impact:** Collector quota checks repeat multiple lifetime counts; listing projects adds per-project raw aggregates; goals/funnels load large historical arrays; tenant/time composite index and pool/query budgets are absent. CPU, I/O and connection pressure grow with history.

**Verification:** Static query counts/shapes only; no latency/TPS invented. **Resolution:** measured plans, composite indexes, preaggregated counters, bounded pagination/concurrency, DB pool/statement budgets and retention. **Effort:** L. **Confidence:** High confidence.

### F-24 — HIGH — Live replay is incompatible with horizontally scaled/buffered delivery

**Class/category:** Probable production failure; reliability/architecture.  
**Evidence:** API `lib/replay-live.ts:13-33`; `controllers/session-replay-stream.controller.ts:68-107,127-130`; `src/index.ts:1-13`; web `components/common/session-replay-player.tsx:292-333`.

**Root cause/impact:** Chunks publish only to a process-local EventEmitter; stream does one DB catch-up then listens locally. Different Lambda/container instances cannot relay updates. The classic Lambda proxy adapter does not establish a deployed response-streaming path. Streams can also outlive permission changes.

**Verification:** Static architecture; actual gateway streaming behavior unverified. **Resolution:** distributed broker or cursor-based DB polling, supported streaming runtime/protocol, bounded lifetimes, reconnect and authorization revalidation. **Effort:** L. **Confidence:** High confidence.

### F-25 — MODERATE — Long/out-of-order replay chunks can become unreachable in the player

**Class/category:** Confirmed design defect; replay completeness.  
**Evidence:** API `models/replay.model.ts:215-243,294-308`; `models/session-replay.model.ts:547-551`; web `components/common/session-replay-player.tsx:295-320`; `queries/session-replay.ts:159-171`.

**Root cause/impact:** Initial detail returns first 250 chunks but advertises session-wide highest sequence. Player streams from that high watermark, skipping truncated middle chunks; no historical continuation route exists. Later out-of-order chunks at a sequence below the highest observed watermark are ignored.

**Verification:** Compare pagination/watermark semantics; no long-recording runtime test run. **Resolution:** last-delivered cursor, continuation API, contiguous sequencing/gap recovery and explicit incomplete metadata. **Effort:** M/L. **Confidence:** High confidence.

### F-26 — MODERATE — Snapshot workers execute DDL during routine processing

**Class/category:** Confirmed issue; least privilege/migrations.  
**Evidence:** worker `src/db.ts:113-175`; `src/handler.ts:7-8`; `src/dispatcher.ts:17`.

**Root cause/impact:** Runtime creates/alters tables and drops/recreates indexes outside Drizzle migration history. Read/write runtime credentials need DDL authority; repeated index/schema locks and drift complicate rollout.

**Verification:** Source only; entrypoints intentionally not executed. **Resolution:** remove runtime DDL after a controlled migration rollout; separate migrator/runtime roles and schema readiness checks. **Effort:** M. **Confidence:** Confirmed.

### F-27 — HIGH — Snapshot URL checks do not pin the validated DNS destination

**Class/category:** Probable risk; SSRF.  
**Evidence:** worker `src/security.ts:232-250,328-343`; proxy comparison `src/upstream-fetch.ts:237-279` and pinned transport tests.

**Root cause/impact:** Node resolves/checks a hostname, then Chromium independently connects on `route.continue()`/WebSocket connect. A changing DNS answer can bypass the check if worker egress reaches private services. Network-layer protections are unverified.

**Verification:** Static TOCTOU analysis; no DNS-rebinding exploit or private network probe executed. **Resolution:** enforce public-only egress/proxy with destination pinning for all requests, or equivalent network sandbox. Add controlled rebinding browser tests. **Effort:** L. **Confidence:** Requires runtime verification.

### F-28 — MODERATE — Heatmap scrolling loop can exceed its deadline

**Class/category:** Confirmed defect; worker reliability.  
**Evidence:** worker `src/screenshot.ts:137-180,182-188`; worker template `template.yaml:20-21,79`.

**Root cause/impact:** The 15-second deadline is checked only by the outer loop. Inner scrolling over an arbitrarily tall document sleeps 150ms per viewport step; size limits are checked afterwards. A page can consume the 120-second Lambda budget before rejection, particularly with five sequential SQS records.

**Verification:** Control-flow analysis, not an adversarial browser run. **Resolution:** deadline/height checks inside inner loop; per-job wall-clock cancellation; align batch size and function timeout. **Effort:** S/M. **Confidence:** High confidence.

### F-29 — HIGH — Reachable runtime dependencies have an untriaged advisory backlog

**Class/category:** Confirmed dependency state, exploitation unverified; supply chain.  
**Evidence:** `pnpm-lock.yaml:2968,4126,5333,6361`; API `app.ts:70-72`; contracts `src/events.ts:200-203`; successful registry audit output.

**Root cause/impact:** 104 production-graph advisories include body-parser compressed-body DoS, Zod validation memory exhaustion, and IP-related parser/trust issues. Some are reachable classes at the public collector. The registry's critical proxy-addr rating is not a proven critical exploit here: this app trusts all proxies, not specifically the affected subnet predicate.

**Verification:** `pnpm audit --prod --json`, exit 1. Section 16 distinguishes browser/tooling/fixture exposure. **Resolution:** patch reachable runtime packages first, review transitive graph/tooling placement, regression-test payloads and integrations; no automatic upgrade. **Effort:** M/L. **Confidence:** High confidence.

### F-30 — MODERATE — Release validation is not an enforced comprehensive gate

**Class/category:** Confirmed failing checks/missing safeguard; testing.  
**Evidence:** root `package.json:8-13`; `turbo.json:3-20`; web `package.json:8-11`, `tsconfig.json`; executed lint/reset results; no tracked CI workflows.

**Root cause/impact:** Root verify runs lint/typecheck/build concurrently, not tests. Web's nominal typecheck is solution-only and misses referenced projects. Actual lint fails; reset tests fail; tenant authorization tests cover strict heatmap routes but not weak project/report paths.

**Verification:** Explicit project type checks passed; lint 37 errors/11 warnings; reset 2 failures. **Resolution:** reviewed PR/release gates, real web project checking, isolated tenant/billing/recovery/database tests. **Effort:** M/L. **Confidence:** Confirmed.

### F-31 — LOW — Generated artifacts and formatting noise pollute review

**Class/category:** Confirmed issue; repository hygiene.  
**Evidence:** tracked `.next`, `out`, `.tanstack`, `apps/pathlens-api/dist.zip`; root `.gitignore:1-20`; `package.json:12`; formatting output.

**Root cause/impact:** Generated fixture/runtime artifacts and temporary routing files are versioned and not sufficiently excluded. Prettier checks generated files, contributing to 229 failures and noisy diffs. ZIP deployment drift is possible; ZIP is not confirmed used.

**Verification:** `git ls-files` grouping and safe ZIP filename inventory. **Resolution:** establish artifact policy, targeted ignores/reviewed cleanup, exclude generated output from formatting; preserve reproducible fixture builds. **Effort:** S/M. **Confidence:** Confirmed.

### F-32 — MODERATE — Root Docker context can copy ignored local secrets into build layers

**Class/category:** Probable risk; secret hygiene.  
**Evidence:** `scripts/deploy-image.mjs:71-80`; API `Dockerfile:7-12`; worker `Dockerfile:8-16`; `apps/pathlens-snapshot-worker/.dockerignore`; no root `.dockerignore` discovered.

**Root cause/impact:** Deploy builds from repo root. An app-local `.dockerignore` is not applied to that context; `COPY apps/pathlens-api ...` includes local ignored `.env` unless Docker-specific exclusions exist. Final image copies selected outputs, so final-image credential leakage is not established; builder/cache exposure remains plausible.

**Verification:** Static context/COPY semantics; no Docker build run. **Resolution:** root or Dockerfile-specific exclusion, minimal contexts, BuildKit secret mounts, inspect image/build caches. **Effort:** S/M. **Confidence:** High confidence.

### F-33 — MODERATE — Release/deployment safeguards are only partially represented

**Class/category:** Missing safeguard; operations.  
**Evidence:** `scripts/deploy-image.mjs:121-132`; API `template.yaml:7-10,99-109,137-142`; API `server.ts:3-7`; worker `template.yaml:52-111`.

**Root cause/impact:** General deployment updates function code without visible publish/alias/canary, readiness smoke test or automated rollback. API/frontend infrastructure and production network controls are not fully declared. Notification template is staging-only/disabled by design, not production activation proof.

**Verification:** Source/templates only. **Resolution:** explicit environment manifests, digest-pinned release promotion, alias/canary/rollback, health/readiness, TLS/WAF/capacity checks and approved notification activation. **Effort:** L. **Confidence:** Requires runtime verification.

### F-34 — MODERATE — No evidenced retention/backup/restore policy for captured personal data

**Class/category:** Missing safeguard; data operations/privacy.  
**Evidence:** API `db/schema.ts:1172-1186,1339-1378`; worker `template.yaml:36-50`; API deletion paths in F-21.

**Root cause/impact:** IP/full event payload/replay rows accumulate; no repository retention cleanup or S3 lifecycle/backup/PITR/restore configuration was found. Growth and erasure/recovery obligations are not operationally demonstrated.

**Verification:** Repository-wide retention/deletion/config searches; infrastructure outside repo could supply controls. **Resolution:** retention policy by data class, lifecycle/purge jobs, backups with encrypted access and measured restore drills/RPO/RTO. **Effort:** M/L. **Confidence:** Requires runtime verification.

### F-35 — MODERATE — API error/logging pipeline lacks consistent redaction and recovery signals

**Class/category:** Missing safeguard/probable disclosure; observability.  
**Evidence:** API `app.ts:74-82`; `controllers/users.controller.ts:68-81,206-223`; `controllers/projects.controller.ts:137-158`; `db/client.ts:8`; `server.ts:1-7`.

**Root cause/impact:** Controllers often log whole errors and return `error.message`; database errors can carry SQL/parameters. There is no mounted final structured/redacting error handler, general request correlation, DB timeout budgeting or standalone graceful shutdown. Query-string logging itself is correctly redacted by `getSafeRequestPath`.

**Verification:** Static error paths; no production logs inspected, no claim actual passwords are in logs. **Resolution:** safe error envelope, redacting logger, correlation IDs, typed upstream errors, health and shutdown handlers. **Effort:** M. **Confidence:** High confidence.

### F-36 — MODERATE — Billing lifecycle lacks duplicate-payment and reversal safeguards

**Class/category:** Missing safeguard; business integrity.  
**Evidence:** API `controllers/billing.controller.ts:49-63,120-163`; `models/billing.model.ts:19-34`.

**Root cause/impact:** Multiple checkout sessions can be created before entitlement is granted; no idempotency key/pending purchase record prevents duplicate charges. Webhook handles completion but not refunds/disputes and labels processing errors as signature failures. Repeated boolean entitlement updates themselves are idempotent.

**Verification:** Static paths, no payment/webhook sent. Refund entitlement policy is a product decision, not asserted fraud. **Resolution:** durable purchase/payment ledger, checkout idempotency, reconciliation/reversal policy and database-failure retry responses. **Effort:** M/L. **Confidence:** High confidence.

### F-37 — MODERATE — API-key encryption can fall back to the dashboard's public shared key

**Class/category:** Conditional weakness; cryptographic key separation.  
**Evidence:** API `lib/api-key-encryption.ts:6-16`; `middleware/apiKey.middleware.ts:8-18`; web `lib/apiClient.ts:15-17`.

**Root cause/impact:** If the dedicated encryption secret is absent, stored key ciphertext uses a hash of `INTERNAL_API_SECRET`, which is distributed as VITE_API_KEY. A ciphertext/database leak then has a publicly recoverable decryption key.

**Verification:** Static fallback; actual deployment configuration not read. **Resolution:** require independent high-entropy encryption key, separate scopes/rotation and fail startup if absent. **Effort:** S/M. **Confidence:** High confidence.

### F-38 — LOW — Setup documentation describes an incompatible tracker interface

**Class/category:** Confirmed defect; documentation/developer experience.  
**Evidence:** web `routes/docs/-constants/quick-start.md:25-35`; tracker `src/utils.ts:753-770`; root `README.md:1-11,40-43`.

**Root cause/impact:** Guide demonstrates `data-project-id` and says `data-api-url` is supported, but SDK requires `data-api-key` and uses build-time API URLs. Root README advertises nonexistent Airship apps. Following the example prevents initialization.

**Verification:** Docs/readConfig comparison. **Resolution:** generate setup examples from supported configuration, document build-time targets and actual workspace. **Effort:** S. **Confidence:** Confirmed.

### F-39 — MODERATE — Search Console callback omits current authorization recheck

**Class/category:** Confirmed missing safeguard; OAuth authorization lifecycle.  
**Evidence:** API `controllers/google-search-console.controller.ts:101-127,173-193,226-253`; contrast Slack `controllers/project-integrations.controller.ts:457-481`.

**Root cause/impact:** GSC checks permissions when initiating, then accepts signed cookie-bound state without checking current membership/permissions on callback. A removed/downgraded user may complete installation during the ten-minute window. Unlike Slack/Stripe, state is not durably consumed.

**Verification:** Static start/callback comparison; provider code reuse itself is not claimed possible. **Resolution:** persistent one-use OAuth state and revalidate user/workspace/project permission immediately before saving credentials. **Effort:** M. **Confidence:** High confidence.

### F-40 — MODERATE — Notification sharding can permanently starve later integrations

**Class/category:** Probable scale risk; scheduling reliability.  
**Evidence:** API `notifications/notification-dispatcher.ts:19-24,42-64,98-104`.

**Root cause/impact:** Each of eight shards selects the oldest 500 integrations by a stable updated-at order without a pagination cursor or rotation. If a shard exceeds 500 eligible rows, later rows remain excluded on every pass. Time-based shard selection alone does not ensure fairness.

**Verification:** Static query/iteration; current tenant volume unknown. **Resolution:** durable shard cursor/keyset pagination or fair last-processed scheduling, metrics for unseen/backlogged integrations and >500-per-shard tests. **Effort:** M. **Confidence:** High confidence.

## 14. Performance and Scalability

**Measured:** only validation/test counts and failures in section 17. No request latency, query plans, TPS, memory load, bundle size or cloud spend was measured.

**Static predictions**

- F-23 is the main ingestion/dashboard scaling concern: several lifetime aggregate queries per batch, last-use writes per key lookup, repeated raw-event aggregation and unbounded goal/funnel source arrays.
- Many single-column event indexes increase write amplification without directly matching the most common tenant/project/time predicate.
- JSONB event payload duplicates metadata columns; replay chunks are stored as JSONB, so retention and compression strategy will strongly affect growth.
- Domain regex extraction on every row is unlikely to benefit from ordinary URL/path indexes. Persisting a canonical domain/host field would simplify queries and fix representation drift.
- Stripe widget reads up to 5,000 records per collection, can issue many sequential pages per refresh, and deliberately has no shared cache. PageSpeed/GSC similarly spend upstream quota per request.
- Heatmap reads are bounded at 20,000 samples and expose completeness; this is safer than claiming exact all-volume coverage.
- Proxy has explicit request, DNS, transform, response-byte and concurrency limits; worker screenshot loop needs the missing inner deadline.
- Route splitting exists; large globe/animation/highlighter modules are expected bundle risks but need actual bundle inspection before optimization priorities are set.

Recommended performance proof: isolated representative event volume, `EXPLAIN (ANALYZE, BUFFERS)` only in approved disposable datasets, bounded concurrency tests, p50/p95/p99 service budgets, queue-age/DB connection alarms, and frontend bundle/render profiling. Do not run these against production without explicit approval.

## 15. Infrastructure and Deployment

### Positive evidence

- Container base images are pinned by digest.
- Docker builds use frozen lockfiles; deployment resolves ECR digest before Lambda update (`deploy-image.mjs:100-131`). The old report's blanket mutable-`latest` deployment claim is not current for this path.
- Snapshot template includes encrypted, public-blocked, retained S3 bucket, SQS DLQ, 720-second visibility and partial batch response support.
- Notification staging template includes queue/DLQ/error/throttle/unknown-outcome/heartbeat metrics and alarms. Alarm actions can be empty pending an approved topic; activation is explicitly disabled.
- Proxy requires a separate origin from API/dashboard, default static-only execution, bounded requests and HMAC session validation.

### Risks and missing external evidence

F-26–F-28 and F-32–F-35 apply. Also verify API Gateway trust boundaries because `app.set("trust proxy", true)` trusts all forwarded chains (`app.ts:72`), affecting IP/GeoIP and callback URL inference. Do not rely on this IP for throttling or identity without a trusted ingress policy.

No audited evidence establishes production DNS/TLS, WAF/rate limits, API health/readiness, response security headers, frontend CSP, production DB network isolation, RDS/pooler settings, least-privilege grants, IAM actual attachments, snapshot alarms, container scanning, rollback drills, backup restoration, or on-call response.

Notification deployment tooling is more guarded than general image deployment; do not infer those protections cover the main API or frontend. The supplied notification template is intentionally staging-only, not evidence that scheduled reports are active in production.

## 16. Dependency and Supply-Chain Findings

`pnpm audit --prod --json` completed against the registry, exit 1. It reported 104 advisories across a graph with 854 regular and 122 optional dependencies. This sends dependency metadata to the registry but performs no installation/fix.

### Reachability and remediation groups

| Package / resolved version | Relationship / workspace | Actual exposure assessment | Minimum target covering reported set / upgrade risks |
|---|---|---|---|
| `body-parser` 2.3.0 | transitive Express, API; also tooling | JSON parser processes public requests before route auth; compressed-body DoS class plausible | >=2.4.0 via compatible Express update; verify raw Stripe body, compression and malformed-body handling |
| `zod` 4.4.3 / tooling 3.25.76 | direct API/web/contracts; transitive UI CLI | Public collector validates bounded arrays after 5MB parser; memory-exhaustion advisory relevant but exploit not tested | advisory reports >=4.6.6; review v3 separate compatible fix/migration, schema/error behavior |
| `proxy-addr` 2.0.7 | transitive Express/API | Imported at runtime; critical advisory depends on trust-subnet configuration; current `true` trust is separately unsafe, exact advisory exploit unproved | >=2.0.8; proxy/IP regression tests |
| `ip-address` 10.4.0 | transitive geoip-lite/API; UI CLI | GeoIP path exists; API does preliminary IP validation; specific oversized-string reachability unproved | >=10.7.4; IPv4/IPv6 and malformed-input tests |
| `qs` 6.15.3 | transitive Express/API; UI CLI | Parser library present; reported stringify/comma paths not established in app | >=6.16.1; query parsing compatibility |
| `uuid` 8.3.2 | transitive API dependencies | App's sensitive IDs mostly use Node/browser crypto; advisory-specific call unverified | >=11.1.1 according to registry; major CommonJS/ESM/caller compatibility risk |
| `axios` 1.19.0 | direct web | Browser adapter used; many advisory paths are adapter/config-dependent, not automatically server SSRF | >=1.20.0; auth header/CORS/cancellation/error tests |
| `follow-redirects` 1.16.0 | transitive web Axios and worker Chromium | Browser Axios normally does not use Node adapter; worker package path exists, credential-bearing redirect usage unverified | >=1.16.2; browser-download/redirect compatibility |
| `seroval` 1.6.2 | transitive TanStack Router/web | SPA has no discovered SSR deserialization service; untrusted deserializer reachability unproved | >=1.6.11; Router compatibility |
| `source-map-js` 1.2.1 | transitive proxy/css-tree, rrweb, fixtures and UI tooling | Untrusted CSS processing makes parser/tool usage worth tracing; no indexed-map exploit established | >=1.2.2; rewriting/build/rrweb regression |
| `nanoid` 3.3.17 | transitive CSS/build/rrweb paths | Specific vulnerable API invocation not established | >=3.3.18; low expected API risk |
| `vite` 8.2.1 | transitive Tailwind plugin in web production graph | Build/dev dependency behavior, not static deployed dashboard server; direct Vite resolution may differ | >=8.2.4 for affected resolution; Windows dev-server tests |
| `next` 16.4.2 | direct fixture app only | Not active product runtime; static-export fixture config reduces several server-feature paths | >=16.4.5; framework preview compatibility |
| `@modelcontextprotocol/sdk` 1.30.0 | transitive `packages/ui > shadcn` | Development generator CLI dependency, no Pathlens MCP server found | >=1.32.0; CLI compatibility and move generator to dev tooling |
| `hono` 4.13.1 / `@hono/node-server` 2.1.0 | transitive shadcn MCP tooling | No mounted Pathlens server uses these | >=4.13.16 / >=2.1.6; tooling tests |
| `undici` 7.29.0 | transitive shadcn/dotenvx | Not equivalent to Node's built-in fetch version; no product import path established | >=7.30.1; CLI/network behavior |
| `fast-uri` 3.1.5 | transitive shadcn/ajv | Tooling URI validation, no product path established | >=3.1.9; validator compatibility |
| `brace-expansion` 5.0.9 / `minimatch` 10.2.6 | transitive shadcn tooling | Generator glob patterns, not demonstrated unauthenticated app input | >=5.0.12 / >=11.0.1; major minimatch compatibility |
| `js-yaml` 4.3.1 | transitive UI tooling | Untrusted YAML processing not established in product | >=4.3.2; generator parsing |
| `postcss-selector-parser` 7.1.4 | transitive shadcn | Tooling CSS parsing; not established product route | >=7.1.6; CSS tooling regressions |
| `systeminformation` 5.33.1 | transitive dotenvx/shadcn | Local tooling/system inspection, not active product service | >=5.33.16; platform-specific CLI regressions |

Manifest production classification overstates deployed reachability because UI generator/build tools are regular dependencies. Conversely, do not dismiss collector parser vulnerabilities just because an SDK normally sends small valid requests.

**Supply-chain observations:** only esbuild is allowlisted for dependency builds in workspace config; frozen lockfiles are used in containers; multiple TypeScript/React/Vite resolutions exist across fixtures and product; no lockfile mutation/install was performed. Deprecated/unsupported status of every dependency and base-image runtime support were not exhaustively checked against vendor lifecycle databases.

The complete advisory identifier ledger is in the appendix. Each ledger row inherits resolved version, direct/transitive/workspace, reachability and upgrade-risk assessment from this table.

## 17. Testing and Validation Results

All commands below used the existing installed dependencies. Exit **0** means command completed successfully; it does not prove live functionality.

Root working directory **R** = `D:\Mitr Joshi\Personal\BDSMN`; **A** = `R\apps\pathlens-api`; **W** = `R\apps\pathlens-web`; **T** = `R\apps\pathlens-tracker`.

| Exact command | CWD | Exit | Result / limitations |
|---|---|---:|---|
| `node --version` | R | 0 | v24.15.0 |
| `pnpm --version` | R | 0 | 11.22.0 |
| `pnpm --filter @pathlens/web lint` | R | 1 | 37 errors, 11 warnings; no fix/cache flag |
| `pnpm --filter @pathlens/api typecheck` | R | 0 | Existing source type checks |
| `pnpm --filter @pathlens/heatmap-proxy typecheck` | R | 0 | No emit |
| `pnpm --filter @pathlens/snapshot-worker typecheck` | R | 0 | No emit |
| `pnpm --filter @pathlens/tracker typecheck` | R | 0 | No emit |
| `pnpm --filter @workspace/contracts typecheck` | R | 0 | No emit |
| `pnpm --filter @workspace/backend-types typecheck` | R | 0 | No emit |
| `pnpm --filter @workspace/ui typecheck` | R | 0 | No emit |
| `pnpm exec tsc -p tsconfig.app.json --noEmit --incremental false` | W | 0 | Checks actual web app without build-info writes |
| `pnpm exec tsc -p tsconfig.node.json --noEmit --incremental false` | W | 0 | Checks Vite configuration without build-info writes |
| `pnpm --filter @pathlens/api test:authorization` | R | 0 | 10 tests pass; strict heatmap/preview mocked routes, not all authorization |
| `pnpm --filter @pathlens/api test:events` | R | 0 | 4 tests pass; stub DB/idempotency, not real unique-index concurrency |
| `pnpm --filter @pathlens/api test:password-reset` | R | 1 | 13 pass, 2 fail; Invalid URL at controller line 65; mocked DB/fetch |
| `pnpm exec tsx --test src/lib/*.test.ts` | A | 0 | 88 pass; local/mock helper, privacy, geometry, providers, GeoIP tests |
| `pnpm --filter @pathlens/heatmap-proxy test` | R | 0 | 49 pass; fake transports/fixtures, no live customer fetch |
| `pnpm --filter @pathlens/snapshot-worker test` | R | 0 | 3 pass; IP/scheme/blocked-host checks before external DNS |
| `pnpm --filter @pathlens/tracker test:queue` | R | 0 | 10 pass; mocked delivery and bounded retry/splitting |
| `pnpm --filter @pathlens/tracker test:replay` | R | 0 | 8 pass; mocked chunk delivery |
| `pnpm exec tsx --test src/events.test.ts src/element-anchor.test.ts` | T | 0 | 13 pass; fake DOM/pointer tests |
| `pnpm exec tsx --test src/notifications/scheduling.test.ts src/notifications/notification-settings.test.ts src/notifications/notification-send-safety.test.ts` | A | 0 | 33 pass; pure scheduling and mocked Slack send safety |
| `node --experimental-test-module-mocks --import tsx --test src/services/stripe-dashboard.service.test.ts src/services/page-speed-dashboard.service.test.ts src/services/google-search-console-dashboard.service.test.ts` | A | 0 | 5 pass; DB/provider mocks |
| `pnpm secrets:scan` | R | 0 | No high-confidence current tracked-file matches; not full history scanning |
| `pnpm audit --prod --json` | R | 1 | 104 advisories; registry successful, not a network failure |
| `pnpm format:check` | R | 1 | 229 files flagged; includes generated artifacts and previous report; not rerun after report update |
| PowerShell here-string piped to `node --experimental-test-module-mocks --import tsx --input-type=module` | A | 0 | Real middleware accepted both mismatches; strict variant 403; exact script in appendix |

**Test total:** 10 + 4 + 15 + 88 + 49 + 3 + 10 + 8 + 13 + 33 + 5 = **248**, with **246 pass / 2 fail / 0 skipped**. The ad hoc three-case middleware probe is not counted as an existing test suite.

### Intentionally not executed

- `pnpm verify`, root/app builds, Vite builds, tsup and fixture builds: create `dist`, generated route files/build info or Turbo caches.
- Full notification wildcard suite: includes external/disposable database integration tests, fixture writes and potential send/canary paths. In particular `notification-send-safety.local.test.ts:39-64` creates tables and truncates a table; not safe for this audit.
- Browser/framework proxy suites: require browser/context and some rebuild fixtures; not run under the strict no-artifact constraint.
- DB migration/generate/push/studio, seed, backfill, reconciliation, notification fixtures/canary/deployed smoke, worker entrypoints, cloud/deploy scripts: side effects.
- Live OAuth, emails, payments, webhooks, public-site SSRF probes, production load tests, cloud/IAM inspection and database connections: not authorized.
- No assertion that the existing `dist` outputs match this working tree; source tests importing workspace package runtime may use pre-existing compiled shared output.

### Critical missing coverage

Real PostgreSQL tenant-ID mismatch tests; weak project/key/domain routes; query/body conflicts; signup failure recovery; email verification/linking/pre-hijacking; session revocation; reset expiry/concurrency with actual SQL; entitlement/refund/retry states; project deletion/audit FK; S3 erasure and job races; long/out-of-order replay; distributed live delivery; blocked storage/consent lifecycle; Chromium DNS rebinding; >500-per-shard scheduling; production-adapter response streaming; full product browser/accessibility E2E.

## 18. Dead Code and Technical Debt

Confirmed cleanup candidates, not automatic deletion recommendations:

- Root README's Airship paths do not exist (F-38).
- `lib/jwt.ts:19-20` contains unused cachedToken/tokenExpiry; no refresh implementation follows.
- `middleware/HTMLInjecttion.middleware.ts` exports HTML rejection middleware, but mounting/import searches did not establish active use. It should not be cited as an active XSS defense.
- `/api/auth/workspaces` duplicates the main workspace list API; external consumers were not established, so removal needs usage evidence.
- Project frontend types still include dropped project flags/API-key fields (`queries/projects.ts:12-15`).
- Legacy chat/dashboard/SEO migration history is necessary historical evidence, not code to delete merely because runtime features were removed.
- API/tracker formatting differs from root; root formatting currently flags much of API as well as generated code.
- Large product pages, heatmap projection/rewrite code, duplicated hostname SQL and date/format helpers increase regression cost. Shared canonical hostname/time/filter primitives should follow correctness fixes, not a speculative rewrite.
- `shadcn` is a production dependency of UI although observed use is generation tooling.
- `.next/out/.tanstack/dist.zip` artifacts need an explicit source-versus-release policy (F-31).

No export/dependency was declared unused solely because a text search found no direct caller. Dynamic routes, external API clients, build hooks and generated imports can make such conclusions unsafe. No comprehensive unused-export or circular-dependency tool was installed/run.

## 19. Production Readiness Scorecard

| Category | Result | Evidence/rationale |
|---|---|---|
| Architecture | At Risk | Coherent services/contracts, but mutable authorization context, raw-event query growth and process-local live delivery |
| Authentication | Fail | Plaintext passwords, pre-hijacking, non-revocable bearer recovery |
| Authorization | Fail | F-01/F-02 confirmed middleware/context mismatch |
| Tenant Isolation | Fail | Cross-tenant project mutation/key read and report export |
| API Integrity | Fail | Destructive operation false failure, goal zero-results, malformed performance poisoning |
| Database Integrity | At Risk | Useful constraints, missing tenant-pair invariants, runtime DDL, partial bootstrap |
| Tracking Accuracy | At Risk | Stable event dedup/geometry tests, but session/goal/replay/privacy defects |
| External Integrations | At Risk | Mocked tests and credential encryption, lifecycle/timeouts/status semantics incomplete |
| Frontend Quality | At Risk | Actual project compilation passes; lint fails; visual/accessibility E2E unverified |
| Security | Fail | Two critical authorization defects and plaintext passwords |
| Performance | At Risk | Unbounded/historical aggregate patterns; no load measurements |
| Reliability | At Risk | Live replay scaling, worker deadlines, multi-system partial failures |
| Testing | Fail | Missing critical boundary tests, failing recovery/lint, no evidenced CI gate |
| Deployment | Unverified | Pinned builds/digests, but actual production topology/controls/rollback unverified |
| Observability | At Risk | Strong notification-specific metrics, inconsistent general API telemetry/redaction |

No numerical readiness percentage is assigned: it would imply a precision not supported by evidence.

## 20. Prioritized Remediation Roadmap

### P0 — Release Blockers

| IDs | Objective / implementation approach | Components / dependencies | Effort | Regression risks / required validation |
|---|---|---|---|---|
| F-01,F-02 | Canonical tenant input once; derive project ownership from DB; apply strict checks to every tenant-scoped mutation/read; pass authorized context into models | Permission middleware, routes/controllers/models; inventory used as checklist | L | Legitimate workspace/project requests may break; run every endpoint as owner/viewer/nonmember with cross-tenant, query/body/params conflicts and missing/invalid IDs; assert zero writes/provider calls on denial |
| F-03,F-05 | Protect passwords and email ownership/linking; migrate or reset existing plaintext credentials; require recent proof for sensitive identity operations | User/reset/provider models, frontend forms, email infrastructure | L | Existing/social users lockout; test migration, duplicate email/case normalization, linking/pre-hijacking, verification and recovery without sending real emails in tests |
| F-04,F-07 | Revocable sessions and irreversible key revocation; separate paused state | Auth/schema/SDK project state | L | Unintended logout/collector stoppage; old JWT rejection after recovery/logout/deletion, revoke->pause->resume invariant tests |

Do not deploy the vulnerable API while building a broad architecture refactor. If this revision was previously exposed, scope a separate authorized incident review of tenant mutations/key reads and password exposure; this audit does not establish exploitation occurred.

### P1 — Must Fix Before Launch

| IDs | Objective / approach | Components / dependencies | Effort | Regression risks / validation |
|---|---|---|---|---|
| F-06,F-08,F-09,F-37 | Public ingestion/auth budgets; private encryption keys; URL/DOM minimization and consent lifecycle | Gateway/API/SDK/config; product privacy policy | L | Under-counting, customer-site breakage; sensitive-data canaries, consent withdrawal, rate/byte limits, server-client key separation tests |
| F-10,F-11,F-12,F-13,F-14,F-15 | Restore analytics/recovery reliability with typed events, canonical domains, rotating sessions, storage fallback, one URL config, provider error codes | Contracts/API/SDK/web; P0 canonical context first | M/L | Historic data/backward compatibility; corrupted-payload fixtures, cross-domain goals, idle/storage tests, hermetic reset suite and valid-session provider failure E2E |
| F-17,F-18,F-19,F-20,F-21,F-22 | Tenant relational invariants, grant lifecycle, atomic bootstrap/audit and durable erasure; stop repair-on-read | Schema/migrations/account/workspace/project/storage | L | Cascades and old permission behavior; disposable PostgreSQL migration/rollback, removed/rejoined user cases, project delete/audit/S3 failures and queued-job races |
| F-24,F-25 | Supported production replay transport and contiguous cursor recovery, or explicitly disable live/long-recording claims until implemented | API adapter/broker/web replay | L | Duplicate/out-of-order rendering; multi-instance deployment, gateway streaming, 251+ chunks, reconnect/missing chunks and permission removal tests |
| F-26,F-27,F-28 | Migrator-only DDL and bounded network-isolated screenshot processing | Worker/container/network/IAM; approved environment | L | Snapshot compatibility; rebinding/redirect/WebSocket sandbox fixtures, tall/infinite pages, batch timeout/partial failures |
| F-29,F-30,F-32,F-33,F-34,F-35,F-36 | Patch reachable advisory paths, enforce release gates, exclude secrets from builds, verify deploy/restore/monitoring, finish billing ledger/retries | Dependency owners, CI, infrastructure, billing, operations | L | Broad compatibility; frozen install/build in approved CI, contract suites, image scan, no-secret image proof, staged rollback/restore and payment-state tests |

These are prerequisite engineering groups, not permission to execute changes or external tests now.

### P2 — Early Post-Launch Improvements

| IDs | Objective / approach | Components / dependencies | Effort | Regression risks / validation |
|---|---|---|---|---|
| F-23 | Replace repeated historical counts with measured counters/rollups, add targeted indexes and query budgets | Analytics DB/ingestion; clean tenant/event semantics first | L | Counter drift and migration load; independent reconciliation, representative query plans/load tests |
| F-40 | Fair notification shard iteration with durable keyset cursor and backlog metrics | Dispatcher/delivery schema; scheduling invariants | M | Missing/duplicate report periods; >500/shard, restarts, DST and catch-up tests |
| F-16 | Close minor integration-status metadata leak | Catalog route/controller | S | Global catalog compatibility; arbitrary foreign project tests |
| F-31,F-38 | Source-only repository policy, formatting exclusions and accurate docs | Root/tooling/docs/fixtures | S/M | Fixture breakage/external consumers; clean build and documented snippet smoke test |

F-16/F-40 should move to P1 if tenant metadata sensitivity or launch integration volume makes their preconditions relevant.

### P3 — Long-Term Improvements

Associated architectural portions of F-22/F-23/F-30/F-35: central server-safe API contracts/error taxonomy, shared hostname/date semantics, incremental extraction of complex pages, bundle/accessibility profiling, provider cache/quota budgets, SLO dashboards and continuous compatibility tests. Dependencies: stabilize P0/P1 behavior first. **Effort:** L ongoing. **Risks:** broad rewrites obscure correctness regressions; validate parity with golden analytics datasets and contract/E2E suites.

## 21. Final Production Readiness Verdict

**NOT READY FOR PRODUCTION.**

The verdict does not depend on advisory severity inflation or missing tests alone. Confirmed tenant-authorization mismatches permit unauthorized resource actions and analytics export; plaintext passwords and irreversible-key/session lifecycle failures materially worsen exposure. High-confidence functional defects also affect goals, deletion and live replay.

Reconsider production only after:

1. All P0 boundaries have isolated and real-database regression tests and reviewed fixes.
2. P1 controls are implemented or explicitly excluded behind safe feature gates, with documented product scope.
3. Lint/recovery failures are cleared and reproducible source builds/tests succeed in approved CI.
4. Deployment/network/secrets/backup/monitoring/rollback evidence is reviewed for the actual environment.
5. Tenant-aware erasure, billing state transitions and independent analytics reconciliation are demonstrated.

No application, test, environment, schema, dependency, cloud resource or Git branch was changed for this audit. Only this report was updated.

## 22. Appendix — Evidence, Commands, and Limitations

### A. Repository-state evidence

Starting revision/branch are recorded above. Starting state had **13 modified tracked files** and **one untracked test**, all preserved:

```text
AGENTS.md
apps/pathlens-api/package.json
apps/pathlens-api/src/controllers/password-reset.controller.ts
apps/pathlens-api/src/models/password-reset.model.ts
apps/pathlens-web/src/mutations/auth.ts
apps/pathlens-web/src/routes/(auth)/password-reset.tsx
apps/pathlens-web/src/routes/(open)/-components/header.tsx
apps/pathlens-web/src/routes/app/$workspaceId/$projectId/heatmaps/$heatmapId.tsx
apps/pathlens-web/src/routes/app/$workspaceId/$projectId/session-replay.tsx
apps/pathlens-web/src/routes/docs/-components/header.tsx
package.json
pnpm-lock.yaml
turbo.json
untracked: apps/pathlens-api/src/controllers/password-reset.controller.test.ts
```

The pre-existing report described revision `1531852` and was replaced by this current-state assessment. Its old assertions about populated example secrets, mutable-latest general deployment, and workspace-controller checks were not repeated as current facts.

### B. Read-only discovery commands

Executed at root unless noted. Git inspection and shell inventory commands completed successfully; some compound shell calls return the final subcommand exit, not independent per-command status. No failing discovery command was used as proof of absence.

```powershell
git status --short
git rev-parse HEAD
git branch --show-current
git ls-files
git log -5 --format="%h %ad %s" --date=short
git diff --stat
git diff --numstat
git ls-files '*AGENTS.md' '*CLAUDE.md' '.github/*' '*openapi*' '*postman*' '*collection*' '*.env*'
git ls-files '*.test.*' '*e2e*'
git ls-files '*zip' '*pem' '*.key' '*crt'
git log -3 --format="%h %ad %s" --date=short -- apps/pathlens-api/.env.example
```

Additional non-mutating PowerShell/Node inspections enumerated directories and package manifests, selected migration statements, redacted `.env.example` variable-name/length metadata, archive entry names, tracked artifact counts, route registrations, query/mutation request paths and validator output. Dedicated file read/grep tools supplied the numbered evidence references. No local `.env` contents, credential values or historical secret values were printed.

Registry audit full output was retained automatically by the harness outside the repository. Its JSON was parsed read-only to enumerate advisory identifiers/versions. No package-manager fix was invoked.

### C. Exact isolated permission-middleware probe

CWD: `D:\Mitr Joshi\Personal\BDSMN\apps\pathlens-api`. Passed as a PowerShell here-string to `node --experimental-test-module-mocks --import tsx --input-type=module`; exit 0. No files created and no database/provider import instantiated.

```javascript
import { mock } from 'node:test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const url = p => pathToFileURL(resolve('src',p)).href;
const own = '11111111-1111-4111-8111-111111111111';
const victim = '22222222-2222-4222-8222-222222222222';
let projectLookups = 0;
mock.module(url('models/projects.model.ts'), { namedExports: {
  getProjectWorkspaceIdModel: async () => { projectLookups++; return victim; }
} });
mock.module(url('models/workshop.model.ts'), { namedExports: {
  getWorkspaceAccessModel: async id => id === own
    ? { permissions: ['projects.delete'] } : null,
  hasWorkspacePermission: () => true
} });
mock.module(url('models/preview-sessions.model.ts'), { namedExports: {
  getPreviewSessionAuthorizationModel: async () => null
} });
const { requireWorkspacePermission, requireWorkspaceProjectPermission } =
  await import(url('middleware/permission.middleware.ts'));
const res = {
  status(code) { this.code=code; return this; },
  json(body) { this.body=body; return this; }
};
let allowed = false;
await requireWorkspacePermission('projects.delete')({
  user:{id:'test-user'}, params:{project_id:victim},
  query:{workspace_id:own}, body:{}
},res,()=>{allowed=true});
console.log(JSON.stringify({
  case:'project in other workspace with own workspace query',
  allowed,projectLookups
}));
allowed=false;
await requireWorkspacePermission('analytics.reports.export')({
  user:{id:'test-user'}, params:{}, query:{workspace_id:own},
  body:{workspace_id:victim}
},res,()=>{allowed=true});
console.log(JSON.stringify({
  case:'authorized query workspace differs from report body workspace',allowed
}));
allowed=false;
await requireWorkspaceProjectPermission('projects.delete')({
  user:{id:'test-user'}, params:{project_id:victim},
  query:{workspace_id:own}, body:{}
},res,()=>{allowed=true});
console.log(JSON.stringify({
  case:'strict workspace-project middleware comparison',allowed,status:res.code
}));
```

Observed results: weak-project `allowed=true, projectLookups=0`; weak-query/body `allowed=true`; strict-project `allowed=false,status=403`. Permission evaluation was mocked as granted for the caller's own workspace; the experiment establishes **context selection and missing ownership lookup**, not real DB permissions or actual unauthorized mutation.

### D. Advisory identifier ledger

Each advisory ID below is a GitHub Security Advisory identifier; its canonical URL is `https://github.com/advisories/<ID>`. “H/M/L/C” in the ledger means registry high/moderate/low/critical, not independently established application exploit severity. Versions, dependency relationship, affected workspace, reachability, remediation and upgrade risk inherit section 16.

<!-- ADVISORY_LEDGER -->

### E. Evidence not obtained

- Live database/schema state, production row ownership, actual password population, migration application status, query plans and RLS/grants.
- Live AWS/Gateway/Lambda/VPC/IAM/S3/SQS/Secrets Manager state, production security headers, TLS/certificates, rate-limit controls, alarms/subscriptions, backups/PITR and recovery drills.
- Real provider scopes/approval, emails, payments/refunds, OAuth consent, webhook delivery or live notification sends.
- Newly built release bundles/images, image provenance/scan output, browser visual/accessibility tests, private-network or DNS-rebinding exploitation.
- Complete historical secret scan or forensic evidence of compromise. Current secret scanner covers selected high-confidence patterns in tracked files; a pass is not a guarantee that no secret exists.
- Exhaustive unused-export/cycle analysis or every generated/dependency line.

### F. Completion checklist

- [x] All discovered relevant apps and packages inventoried and examined.
- [x] Critical auth, reset, provider, authorization and tenant ownership paths traced.
- [x] Every major discovered feature classified; placeholders/legacy separated.
- [x] All 120 explicit Express endpoints inventoried with consumers and controls.
- [x] Database schema, migration statement history and storage/job lifecycle reviewed.
- [x] Actual third-party integrations and credential/error paths inspected.
- [x] Dependency advisory state reviewed without installing/upgrading.
- [x] Safe validation commands/results and skipped unsafe execution recorded.
- [x] Findings carry IDs, severity, evidence lines, causes, impact, verification, resolution, effort and confidence.
- [x] Speculation/environmental limits labeled; no invented performance measurements.
- [x] Explicit production verdict and prioritized grouped remediation provided.
- [x] Application source/config/tests/dependencies unchanged; only report updated.
