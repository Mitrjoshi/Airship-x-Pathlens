# Phase 7K: scheduled notification safety

Local preparation only. No approval to deploy, change quotas, modify staging
data, or activate triggers is implied by this document.

## Durable provider-attempt protocol

The existing delivery table is sufficient; no schema migration is required.
Its existing status constraint allows `permanent_failed`. The combination
`status='permanent_failed' AND last_error_code='provider_outcome_unknown'`
represents an unresolved provider attempt, **not a confirmed Slack rejection**.

1. Claim a due delivery with its existing lease token and SQL fixture scope.
2. Prepare analytics, format blocks, and decrypt credentials before send start.
3. In a transaction, require the current unexpired processing lease, change the
   row to the terminal UNKNOWN combination, retain the token, and clear retry
   timing. Use synchronous commit; wait for COMMIT and read back the guard
   outside the transaction before any HTTP request.
4. Send once with redirects disabled and no HTTP/application retry loop.
5. A matching channel, numeric Slack timestamp, and explicit Slack `ok:true`
   response permit a fenced transition to succeeded. Smoke mode additionally
   permits the synthetic `smoke-*` timestamp installed by the entrypoint.
6. Only a proven HTTP 429 rate-limit rejection or an explicitly classified
   permanent rejection on a non-5xx response permits a fenced failure transition.
7. All other outcomes retain UNKNOWN. This includes lost responses, timeouts,
   resets, 5xx, malformed successes, lost success-persistence responses, and
   process death after reservation. Claim/enqueue never select these rows,
   even after lease expiration. SQS redelivery acknowledges them without posting.

A commit/read-back failure never sends and never clears a possibly committed
guard. Failures proven to precede provider reservation can still retry through
the existing processing-state transition. Unique period keys and lease fencing
remain unchanged. This favors avoiding duplicate posts over guaranteed delivery:
a crash between reservation and HTTP may require manual reconciliation despite
no message having been posted.

### Manual reconciliation

Read-only operator query (no credentials involved):

```sql
SELECT id, project_integration_id, report_type, channel_id,
       reporting_period_start, reporting_period_end, last_attempt_at,
       provider_message_id
FROM integration_notification_deliveries
WHERE status = 'permanent_failed'
  AND last_error_code = 'provider_outcome_unknown'
ORDER BY last_attempt_at;
```

Inspect Slack read-only using approved scopes or the destination UI. A matching
message must be tied to the integration, channel, report period, and attempt.
Do not automatically reset, clear, or requeue UNKNOWN. Record any reconciliation
through a separately reviewed operator procedure. Absence from an incomplete
history response is not proof that Slack rejected the send. A new send after an
unknown outcome requires explicit operator authorization and duplicate-risk review.

Do not roll back to older unsafe sending code while triggers are active. Stop
EventBridge, stop the worker mapping, assess in-flight calls, and retain delivery
rows before any rollback. Existing UNKNOWN rows remain terminal to old claim SQL.

## Monitoring prepared in SAM

- Existing Lambda Errors, DLQ visible-count, and queue-age alarms retained.
- Both Lambda Throttles alarms added.
- Log metric filters cover caught dispatcher failures, enqueue partial failures,
  worker delivery/record failures, UNKNOWN events, and dispatcher completion.
- Each dispatcher run counts unresolved guards older than the 120-second worker
  timeout. This detects worker crashes that could not log an UNKNOWN event.
- UNKNOWN alarm uses Maximum >= 1 per 5 minutes. Application errors/throttles
  use Sum >= 1 per 5 minutes. Existing queue age remains >= 900 seconds.
- All error/backlog alarms explicitly use missing data = notBreaching.
- Heartbeat alarm uses two 5-minute windows with Sum < 1 and missing data =
  breaching. It is conditional on `EnableHeartbeatAlarm=true` to avoid reporting
  deliberately disabled schedules as incidents. Enable it with activation.
- Both log groups retain 14 days. Logs use stable event/error codes, not tokens
  or raw database errors.

**Deployment prerequisite:** supply an operator-approved existing SNS topic via
`AlertTopicArn`, verify its publish policy and confirmed subscriptions, and test
end-to-end receipt through a separately authorized alert test. No recipient is
invented and no topic/subscription is created by the template. Empty ARN leaves
alarm actions unset and means activation remains blocked.

UNKNOWN backlog queries are observational; they never repair or retry rows.
Application alarms supplement Lambda Errors because partial-batch failures and
terminal application failures need not increment Lambda's invocation error metric.

## Concurrency and timeouts

Read-only inspection found regional quota 10, unreserved limit 10, no reserved
concurrency on the six existing functions, and a 24-hour account peak of 8.
There is no assured capacity for both notification functions at current quota.

Smallest proposed initial configuration:

- Dispatcher reserved concurrency: 1 (limits overlapping executions).
- Worker reserved concurrency: 2; SQS maximum concurrency: 2; batch size: 1.
- Worker timeout: 120 seconds; SQS visibility: 720 seconds; lease: 600 seconds.
- Dispatcher timeout remains 60 seconds. Monitor throttles/heartbeat; retries
  and unique delivery keys must handle boundary overlap, not concurrent posting.

**Required request:** AWS Lambda regional `Concurrent executions` quota in
`ap-south-1`, account `176246209215`, from 10 to **at least 13**. Three reserved
executions plus AWS's observed minimum unreserved floor of 10 require 13.
Quota 20 is a reasonable optional operational cushion, not a prerequisite.
Only set `ReserveNotificationConcurrency=true` after the quota is approved.
The template defaults this flag false so a disabled staging deployment can be
prepared without consuming unavailable reservations. Activation with it false
is not the recommended safe configuration.

SQS maxReceiveCount remains 3 and application maximum attempts remains 8. These
count different things: dispatcher republishing creates new SQS messages. Review
DLQ records against delivery state; never blindly replay them or UNKNOWN rows.

## First activation approval / no unexpected catch-up

Normal mode now requires `NOTIFICATION_SCHEDULE_NOT_BEFORE` as a canonical UTC
ISO timestamp, identically configured on both functions. Do not remove the smoke
mode variable: set it explicitly to `false` only under activation authorization.
Mock transport must not be enabled in normal mode.

Choose a **fixed future scheduled instant** after the planned rollout window.
Review integration/channel ownership, reporting timezone, report period, grace
window, shard polling delay, and expected metrics/preview for the first actual
report. Obtain approval for that first report, destination, and fixed cutoff.
Keep that cutoff stable across updates/restarts; never use a moving `now` value.

The cutoff filters candidate `scheduled_for` times, enqueue SQL, and claim SQL.
Schedules older than the approved cutoff are excluded. Existing historical
delivery rows are retained for explicit operator review, not silently deleted or
cancelled. The approved first report may naturally summarize the previous local
day/week; exclusion is based on schedule time, not analytics event age.

Preference changes are read by the dispatcher on each run. A delivery already
created with the old channel, timezone, enabled state, or scheduled instant is
cancelled by worker revalidation rather than sent or automatically replaced.
The reporting-period uniqueness constraint prevents a second delivery for that
same period, so changing preferences after creation can intentionally result in
a skipped period. Do not replay that period automatically; future periods use
the new preferences and UNKNOWN outcomes remain terminal until reconciliation.

For a project's configured local schedule, approve a specific future instant
and its reporting period. The eight-shard dispatcher may process it several
minutes later. Do not alter daily/weekly preferences as part of cutoff approval.

## Validation and deployment boundary

PostgreSQL integration tests require an explicit
`PATHLENS_NOTIFICATION_LOCAL_DATABASE_URL` pointing only to `127.0.0.1` and the
disposable `pathlens_notification_phase7k` database. They reuse the existing
delivery table DDL in local test storage, never staging or migration history.

After review: approve the SNS destination and quota request; approve image push
and an inspected CloudFormation update separately; repeat deployed mocked tests
on the new immutable digest; approve first-report cutoff and production-mode
environment updates. Verify no unresolved outcomes before enabling the worker
mapping, then EventBridge last, with heartbeat monitoring enabled. No part of
this local task authorizes those actions.
