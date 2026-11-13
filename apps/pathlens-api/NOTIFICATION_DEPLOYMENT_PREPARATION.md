# Phase 7L deployment preparation

Prepared for account `176246209215`, region `ap-south-1`. No change set was
executed, image pushed, quota changed, topic/subscription created, or notification
activated. No database or Slack request was made in this preparation task.

## Inspection change set

`phase7l-inspection-1794472586` on `pathlens-notifications-staging` is
`CREATE_COMPLETE` / `AVAILABLE`, **unexecuted**. It deliberately uses the previous
`ImageUri`, empty `AlertTopicArn`, `ReserveNotificationConcurrency=false`, and
`EnableHeartbeatAlarm=false`. It is an infrastructure preview, not a complete
safety-image deployment and not an activation-ready alert configuration.

### Every proposed effective change in this preview

Add five metric filters:

- `DispatcherFailureMetric`
- `WorkerFailureMetric`
- `UnknownOutcomeMetric`
- `UnknownBacklogMetric`
- `DispatcherHeartbeatMetric`

Add five alarms:

- `DispatcherThrottleAlarm`
- `WorkerThrottleAlarm`
- `DispatcherApplicationAlarm`
- `WorkerApplicationAlarm`
- `UnknownOutcomeAlarm`

Modify four existing alarms, in place, adding `TreatMissingData=notBreaching`:

- `NotificationDeadLetterAlarm`
- `NotificationQueueAgeAlarm`
- `NotificationWorkerErrorAlarm`
- `NotificationDispatcherErrorAlarm`

Modify `NotificationWorkerFunctionNotificationQueueEvent` in place:

- BatchSize: 5 -> 1
- ScalingConfig.MaximumConcurrency: absent -> 2
- Enabled stays false; ReportBatchItemFailures stays configured.

There are no removals or replacements. Queue/DLQ, names, log retention (14 days),
roles, environment properties, and EventBridge are unchanged. Neither Lambda
changes in this preview because its image and resolved reservation settings are
unchanged. A final change set after image push must add in-place image updates
for both functions. Reservation approval adds dispatcher=1 and worker=2 in-place
configuration changes. Supplying the approved alert topic adds alarm actions.
Enabling heartbeat monitoring later adds `DispatcherHeartbeatAlarm` conditionally.

Do not execute this incomplete inspection change set. Create and review a fresh
one with the actual pushed digest and approved operational parameters.

Read-only inspection command:

```powershell
aws cloudformation describe-change-set --region ap-south-1 `
  --stack-name pathlens-notifications-staging `
  --change-set-name phase7l-inspection-1794472586 --include-property-values
```

## Monitoring review

| Signals                            | Metric/statistic         | Threshold/evaluation | Missing data |
| ---------------------------------- | ------------------------ | -------------------- | ------------ |
| Both Lambda Errors                 | AWS/Lambda, Sum          | >=1, 1 x 300s        | notBreaching |
| Both Lambda Throttles              | AWS/Lambda, Sum          | >=1, 1 x 300s        | notBreaching |
| DLQ visible messages               | AWS/SQS, Maximum         | >=1, 1 x 300s        | notBreaching |
| Queue oldest age                   | AWS/SQS, Maximum         | >=900s, 1 x 300s     | notBreaching |
| Dispatcher application failures    | DispatcherFailures, Sum  | >=1, 1 x 300s        | notBreaching |
| Worker application failures        | DeliveryFailures, Sum    | >=1, 1 x 300s        | notBreaching |
| UNKNOWN events / unresolved guards | UnknownOutcomes, Maximum | >=1, 1 x 300s        | notBreaching |
| Successful dispatcher heartbeat    | DispatcherHeartbeat, Sum | <1, 2 x 300s         | breaching    |

Custom namespace: `Pathlens/pathlens-notification-staging/Notifications`, without
dimensions. Namespace is stack-specific. Native Lambda metrics use FunctionName;
SQS metrics use QueueName. Filters use the exact structured event fields in the
Phase 7K code. Crash-left guards older than 120 seconds are counted by dispatcher
logs; UNKNOWN responses also produce immediate worker events. Metric filters
require no Lambda `cloudwatch:PutMetricData` or `sns:Publish` permissions.

**Alert destination remains unconfigured.** An operator must approve an existing
standard SNS topic in this account/region, supply its ARN as `AlertTopicArn`,
verify the CloudWatch service can publish under the topic policy, and confirm
at least one intended subscription (not PendingConfirmation). Scope publish
policy to this source account and appropriate alarm ARNs. If customer-managed
KMS encryption is used, verify the required CloudWatch service permissions on
that key as well. Do not invent a recipient. An end-to-end alert receipt test
requires separate authorization.

Read-only inspection found no SNS topics in `ap-south-1` for this account, so
`AlertTopicArn` cannot be filled from an existing resource. Topic creation or
subscription confirmation is an external approval prerequisite.

The deployment identity needs CloudFormation change-set/update access, Lambda
code/configuration/event-source/concurrency updates, CloudWatch alarm management,
and CloudWatch Logs metric-filter management. Existing function roles are used;
the new metrics themselves require no additional runtime IAM grants. Actual
deployment authorization is not established merely by successful change-set creation.

### Worker least-privilege correction

`template.yaml` now gives the worker an explicit
`NotificationWorkerExecutionRole`, preventing SAM from reattaching the broad
AWS-managed `AWSLambdaSQSQueueExecutionRole`. Its inline policy grants only:

- `sqs:ReceiveMessage`
- `sqs:DeleteMessage`
- `sqs:GetQueueAttributes`
- `sqs:ChangeMessageVisibility`

on the staging notification queue ARN, plus the three required CloudWatch Logs
actions scoped to the worker log-group ARN. The dispatcher remains queue-scoped
for `sqs:SendMessage`. The correction is local only; the currently deployed role
is unchanged.

The inspection change set `phase7m-iam-inspection-1794482390` shows the expected
in-place worker function role reference update, addition of the explicit role,
and removal of the old SAM-generated role. It has no replacements and remains
unexecuted. The old role's managed SQS policy is removed only as part of replacing
that worker role; unrelated roles and queues are untouched.

The proposed role was checked in the change set's `AfterContext`: it contains no
`AWSLambdaSQSQueueExecutionRole`, no wildcard SQS resource, and all four required
queue actions. The mapping remains `Enabled=false`.

## Quota / capacity

Live regional quota and unreserved concurrency: 10. No reserved concurrency was
reported for any of the six functions. Maximum account concurrency observed in
the last 24 hours: 8. No quota-increase request was listed for this quota.

The previously prepared mapping maximum concurrency 2 and batch size 1 are not
included in this deployment; the current deployment template preserves the live
batch size 5 and does not set `ScalingConfig`. Dispatcher reservation 1
prevents concurrent dispatcher execution. Applying all three reserved executions
at quota 10 violates the account's previously observed minimum-unreserved floor
of 10. Minimum quota is therefore **13**. Do not set the reservation flag true
until the effective quota increase is verified.

Prepared request, **do not run without quota-change approval**:

```powershell
aws service-quotas request-service-quota-increase `
  --region ap-south-1 --service-code lambda `
  --quota-code L-B99A9384 --desired-value 13
```

Worker timeout 120s, delivery lease 600s, and SQS visibility 720s remain unchanged.
The dispatcher timeout stays 60s; boundary overlap can cause throttling rather
than concurrent execution when reserved concurrency is enabled. Monitor heartbeat
and throttling; scheduled delivery uniqueness still matters.

## Local image

- `pathlens-notification-safety:phase7k`
- Linux amd64, local manifest/image ID
  `sha256:32ceeb4c495c9d9a44432608f43f1a12f1da98157cdcd0f45addac1a10da1fc2`
- Compiled send-safety, activation, delivery, and worker modules present.
- Correct callable dispatcher and worker entrypoints; public Supabase CA included.
- No `.env` files found. Final image packaging copies compiled code, dependencies,
  package metadata, and the public certificate; no live credentials are supplied
  by this task. Image configuration contains no credential environment values.

No rebuild was necessary. Do not assume this ID is the future ECR digest: obtain
the manifest digest from ECR after an authorized push.

The shared ECR repository is currently MUTABLE without exclusions. A new release
tag must never be reused, but that alone does not enforce immutability. Deploy by
digest regardless. If protected release tags are required, obtain approval for
a narrowly scoped ECR immutability policy first; do not change shared repository
policy or other products' tags as part of this preparation.

## Exact next steps, gated by separate approval

### Environment preservation guard

Before creating or executing a future change set, run the local guard against
the live functions:

```powershell
pnpm --filter @pathlens/api verify:notification-environment -- --before
```

After the stack update reaches `UPDATE_COMPLETE`, run:

```powershell
pnpm --filter @pathlens/api verify:notification-environment -- --after
```

The guard validates required non-secret configuration, smoke mode, absent fixture
ID, the expected Supabase pooler host/port/path, CA path, and valid frontend URL.
It stores only SHA-256 fingerprints in an OS temporary file; it never stores,
prints, or rewrites environment values. It fails closed if a required value is
missing or any variable is added, removed, or changed. If it fails, do not invoke
or activate either function; restore the worker through the approved AWS Console
workflow and rerun the guard. The guard does not use Secrets Manager or silently
change the secret-management model.

The deployed Phase 7K smoke entrypoint currently supports only a successful
synthetic Slack response. `PATHLENS_NOTIFICATION_MOCK_OUTCOME` is implemented
locally for a future reviewed image with `timeout`, `connection_reset`, and
`unreadable_response` modes. It is rejected in normal mode and is not present in
the deployed environment. Do not claim a deployed ambiguous-outcome test until
an image containing this mechanism is separately reviewed and deployed.

This baseline is process-local deployment evidence, not a source-controlled
secret backup. It cannot recover values. A secure operator recovery remains
required when a value is lost.

Resolve the approved alert topic, effective quota, IAM review, and release-tag
protection policy first. Keep smoke mode true, fixture IDs absent, and both triggers
disabled. These commands are a future plan, not authorization to run them:

```powershell
$region = 'ap-south-1'
$stack = 'pathlens-notifications-staging'
$registry = '176246209215.dkr.ecr.ap-south-1.amazonaws.com'
$repository = 'pathlens/api'
$tag = 'notifications-phase7k-safety'

# Check that this new tag is unused; if it exists, STOP rather than overwriting.
aws ecr describe-images --region $region --repository-name $repository `
  --image-ids "imageTag=$tag"

# Only ImageNotFoundException is the expected result above.
aws ecr get-login-password --region $region |
  docker login --username AWS --password-stdin $registry
docker tag pathlens-notification-safety:phase7k "${registry}/${repository}:$tag"
docker push "${registry}/${repository}:$tag"

$digest = aws ecr describe-images --region $region `
  --repository-name $repository --image-ids "imageTag=$tag" `
  --query 'imageDetails[0].imageDigest' --output text
$imageUri = "${registry}/${repository}@$digest"
docker pull $imageUri
docker image inspect $imageUri --format '{{.Os}}/{{.Architecture}}'

# Set only after approval and topic/subscription/publish-policy verification.
$alertTopicArn = '<operator-approved-existing-SNS-topic-ARN>'
$changeSet = "phase7k-safety-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
aws cloudformation create-change-set --region $region --stack-name $stack `
  --change-set-name $changeSet --change-set-type UPDATE `
  --template-body file://apps/pathlens-api/template.yaml `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND `
  --parameters ParameterKey=ResourcePrefix,UsePreviousValue=true `
    "ParameterKey=ImageUri,ParameterValue=$imageUri" `
    "ParameterKey=AlertTopicArn,ParameterValue=$alertTopicArn" `
    ParameterKey=ReserveNotificationConcurrency,ParameterValue=true `
    ParameterKey=EnableHeartbeatAlarm,ParameterValue=false
aws cloudformation wait change-set-create-complete --region $region `
  --stack-name $stack --change-set-name $changeSet
aws cloudformation describe-change-set --region $region --stack-name $stack `
  --change-set-name $changeSet --include-property-values
```

Stop on any CLI failure. The quota must be effective before using `true` above.
The IAM least-privilege correction is included in the local template and must be
reviewed in the fresh final change set. Do not execute the final change set until separately approved. Inspect
for replacements, environment changes, trigger enablement, unexpected IAM or
queue changes. After approval and execution, wait for UPDATE_COMPLETE and verify
both immutable resolved image URIs, environment fingerprints, smoke mode, absent
fixture IDs, disabled triggers, empty queues, and retained resource identities.

Only after separate approval of that **fresh final** change set:

```powershell
aws cloudformation execute-change-set --region $region --stack-name $stack `
  --change-set-name $changeSet
aws cloudformation wait stack-update-complete --region $region --stack-name $stack
```

Then separately authorize deployed mocked tests on the new digest. Normal mode,
the fixed future NOTIFICATION_SCHEDULE_NOT_BEFORE timestamp, heartbeat activation,
and the first real scheduled report remain separate approval gates.

## Rollback

Before execution, leave or delete only the unexecuted inspection change set.
There is no runtime deployment to undo. After a future update, preserve disabled
triggers and smoke mode. If rollback is required, review a new change set using
the previous immutable Phase 7G digest:
`sha256:b963a00e1647b78f71d11624646665bc045c14b240bfd447f5c7a51f2c1705eb`.
Retain environments, queues, and delivery rows. UNKNOWN guard rows must never be
cleared or replayed as part of rollback. Never reactivate older code with the
known ambiguous-post retry behavior. If execution has already been activated
in a later phase, disable EventBridge then the worker mapping and assess in-flight
calls before any rollback.
