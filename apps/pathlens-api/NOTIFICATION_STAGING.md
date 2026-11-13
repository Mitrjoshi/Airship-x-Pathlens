# Notification staging configuration

The notification Lambdas use direct Lambda environment variables. The SAM
template intentionally does not declare an `Environment` property for either
function. This keeps CloudFormation from replacing manually managed
credentials during later code or alarm updates.

## Configure after stack creation

After deploying the stack with the schedule and SQS event source disabled,
read `NotificationQueueUrl` from the stack outputs and configure the following
variables manually on both functions in AWS Lambda. Enter values through the
AWS Console or an approved secure operator workflow; never put values in this
repository, a CloudFormation parameter, a shell command, or logs.

### Dispatcher

- `DATABASE_URL` — existing staging Supabase session-pooler URL
- `DATABASE_SSL_REQUIRED=true`
- `DATABASE_SSL_CA=/var/task/certs/supabase-ca.crt`
- `NOTIFICATION_QUEUE_URL` — the staging queue output
- `NOTIFICATION_GRACE_PERIOD_MS=900000`
- `PATHLENS_NOTIFICATION_SMOKE_TEST=true`
- `PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID=` (empty until a fixture exists)

### Worker

- `DATABASE_URL` — the same existing staging Supabase session-pooler URL
- `DATABASE_SSL_REQUIRED=true`
- `DATABASE_SSL_CA=/var/task/certs/supabase-ca.crt`
- `INTEGRATION_ENCRYPTION_KEY` — the existing 32-byte key used for current Slack credentials
- `FRONTEND_URL` — staging dashboard URL
- `PATHLENS_NOTIFICATION_SMOKE_TEST=true`
- `PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID=` (empty until a fixture exists)

The worker and dispatcher fail closed if required variables are missing. Smoke
mode also fails closed when the fixture integration ID is empty. The worker's
mock Slack transport is enabled only in smoke mode, so smoke processing cannot
call Slack.

## CloudFormation update rule

Do not add an `Environment` block to `template.yaml`. Because CloudFormation
does not own the Lambda environment property, normal stack updates to code,
alarms, queues, or disabled triggers preserve manually configured variables.
After every stack update, verify the variables still exist before enabling any
trigger. A replacement or deletion of a function requires reapplying the
variables manually.
