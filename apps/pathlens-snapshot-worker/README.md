# Project Snapshot Worker

The worker captures public project domains with Playwright and stores the latest JPEG in a private AWS S3 bucket. Production runs as an AWS Lambda subscribed to SQS. A scheduled Lambda dispatcher queues pending, retryable, and daily-refresh jobs.

## Local

Copy `.env.example` to `.env`, fill in the database and AWS values, create the private S3 bucket, and install Chromium once:

```bash
pnpm install
pnpm --filter @pathlens/snapshot-worker install-browser
pnpm --filter @pathlens/snapshot-worker local
```

The local runner preserves the database polling behavior. To build the production code locally, use `pnpm --filter @pathlens/snapshot-worker build`.

## AWS Deployment

Build and push the Lambda container from the repository root. Replace the account, region, and repository values with the deployment account:

```bash
docker build -f apps/pathlens-snapshot-worker/Dockerfile -t pathlens-snapshot-worker .
docker tag pathlens-snapshot-worker <account>.dkr.ecr.<region>.amazonaws.com/pathlens-snapshot-worker:latest
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker push <account>.dkr.ecr.<region>.amazonaws.com/pathlens-snapshot-worker:latest
```

Deploy the queue, dead-letter queue, worker Lambda, and scheduled dispatcher with SAM:

```bash
sam deploy \
  --template-file apps/pathlens-snapshot-worker/template.yaml \
  --stack-name pathlens-snapshot-worker \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    ImageUri=<account>.dkr.ecr.<region>.amazonaws.com/pathlens-snapshot-worker:latest \
    DatabaseUrl='<database-url>' \
    SnapshotBucketName='<globally-unique-s3-bucket-name>'
```

The SQS message contract is:

```json
{ "projectId": "project-uuid" }
```

The worker validates and claims the project transactionally, so duplicate SQS deliveries are safe. Failed captures are recorded in PostgreSQL with backoff; malformed or infrastructure-failed SQS records are retried and eventually sent to the dead-letter queue.

Required environment values are `DATABASE_URL`, `AWS_REGION`, and `S3_BUCKET`. AWS credentials use the standard `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables locally; Lambda uses its IAM role. Optional value is `SNAPSHOT_SETTLE_DELAY_MS` (default `750`).

Rotate any credentials that have been committed or shared before deploying them to Lambda.
