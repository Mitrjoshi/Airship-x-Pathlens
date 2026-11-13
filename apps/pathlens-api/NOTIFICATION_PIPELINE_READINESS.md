# Phase 7G: scheduled notification readiness

Automatic triggers must remain disabled. The successful real Slack canary did
not exercise scheduled dispatch, SQS consumption, leases, or scheduled retries.

## Local fix

- A shared smoke-scope validator rejects missing or invalid fixture UUIDs.
- Integration selection, enqueue selection, worker claims, context reads, and
  related delivery writes enforce the scope. Selection and claims filter in SQL.
- Retry-date OR conditions are parenthesized so they cannot escape scope, lease,
  or status predicates. This also corrects retry eligibility in production.
- Production mode has no fixture predicate. Existing conflict targets,
  SKIP LOCKED claims, lock-token fencing, and backoff remain in place.
- Smoke workers require mocked transport. Unrelated mixed-batch records return
  individual failures instead of being acknowledged without processing.

Unit tests capture real Drizzle-generated SQL with a mocked PostgreSQL client.
Concurrency tests use isolated in-memory storage. These do not establish real
PostgreSQL contention behavior; run isolated database integration tests separately.

## Deployment gate (separate approval required)

The verified local image is `pathlens-notification-isolation:phase7g`.
Use a new ECR tag, for example `notifications-isolation-phase7g`, rather than
overwriting the previous staging tag. After approval:

1. Authenticate Docker, tag and push only the corrected notification image.
2. Verify the ECR manifest digest against the local build.
3. Deploy `apps/pathlens-api/template.yaml` to
   `pathlens-notifications-staging` in account `176246209215`, `ap-south-1`,
   with `ResourcePrefix=pathlens-notification-staging` and an immutable
   `ImageUri=176246209215.dkr.ecr.ap-south-1.amazonaws.com/pathlens/api@sha256:...`.
   Use `CAPABILITY_IAM` and `CAPABILITY_AUTO_EXPAND`.
4. Confirm both resolved Lambda image URIs match the pushed digest.
5. Recheck manually managed environments without printing values. Do not add
   Lambda Environment properties to the template. Confirm both triggers disabled.

No push, deployment, environment update, or invocation is authorized by this file.

## Deterministic manual pipeline plan

1. Confirm account, region, immutable image, smoke mode, disabled triggers, TLS,
   and empty visible/in-flight/delayed queue and DLQ counts. Also check pending
   delivery ownership; an empty queue does not prove the database is empty.
2. Verify database targeting independently using both pooler hostname and the
   project-qualified PostgreSQL username against the deployed staging target.
   A shared pooler hostname alone is not proof of Supabase project identity.
3. Create a fresh `phase5c3-phase7g-*` test user/workspace/project/integration
   using reviewed setup/cleanup tooling, explicit staging opt-in, mock token,
   mock channel, UTC daily/weekly settings, and a recorded cleanup manifest.
   Record IDs before writes and baseline nonfixture IDs/counts. Do not reuse the
   real canary integration or change any customer settings. Use zero analytics
   for the new project as a deterministic empty report, or seed only its data.
4. With separate operator authorization, set only the new fixture ID on both
   Lambdas using revision-checked environment updates; preserve all other values.
   Verify successful updates and smoke mode before invoking either function.
5. Query PostgreSQL read-only for
   `MOD(ABS(HASHTEXT($1::text)), 8)` using the fixture integration ID. The
   dispatcher chooses `floor(epoch_milliseconds / 60000) % 8`. Invoke once
   during the matching minute, away from minute boundaries. Daily midnight UTC
   plus grace and the weekly schedule must already be due. Keep the default
   grace period. Zero selected integrations in another minute is expected;
   do not change existing records to compensate.
6. Verify exactly the expected daily/weekly deliveries for this fixture, and no
   nonfixture changes. Read messages with exactly one SQS receive call, saving
   its complete response and receipts before parsing. Treat absent Messages as
   an empty list, not a one-element list containing null. Do not repeatedly
   receive: the queue redrives after three receives.
7. Validate every received delivery ID against the fixture in PostgreSQL before
   worker invocation. For an unexpected message, stop; never delete it. Build
   a complete SQS event with the saved message IDs, bodies, receipts, queue ARN,
   and region. Manually invoke the worker once; keep its mapping disabled.
8. Require no function error, no batch item failures, persisted `succeeded`,
   and provider IDs containing the smoke mock timestamp. Verify summary and
   Block Kit generation locally; the mock response alone is not payload capture.
   Delete only successfully processed fixture messages with their saved receipts.
   Failures remain unacknowledged. No real Slack calls are permitted.
9. Check duplicate prevention and lease fencing in isolated mocked/DB tests,
   not against customer deliveries. Compare nonfixture baselines again.
10. Clear both fixture IDs while preserving smoke mode and all other environment
    values. Delete only rows owned by this run's manifest. Confirm zero remaining
    fixture rows, empty queue/DLQ, disabled triggers, safe logs, and alarm states.

Stop on any mismatch. This plan is prepared, not executed. Automatic scheduled
notifications require a successful deployed pipeline test, verified retry/lease
behavior, operational review, and separate activation approval.
