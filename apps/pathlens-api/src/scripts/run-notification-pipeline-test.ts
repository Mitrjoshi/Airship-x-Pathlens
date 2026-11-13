import assert from "node:assert/strict";
import fs from "node:fs";

import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { Pool } from "pg";

import {
  setSlackMessageTransportForTests,
  SlackApiError,
} from "../lib/slack-api";
import { runNotificationDispatcher } from "../notifications/notification-dispatcher";
import { handler as notificationWorker } from "../notifications/notification-worker";
import {
  createNotificationTestPool,
  getNotificationTestTarget,
} from "../notifications/notification-test-target";

type Fixture = {
  label: string;
  workspaceId: string;
  projectId: string;
  projectIntegrationId: string;
};

const fixturePath = process.env.PATHLENS_NOTIFICATION_FIXTURE_FILE;
const queueUrl = process.env.NOTIFICATION_QUEUE_URL;
const dlqUrl = process.env.NOTIFICATION_DLQ_URL;
if (!fixturePath || !queueUrl || !dlqUrl) {
  throw new Error(
    "Fixture file, NOTIFICATION_QUEUE_URL, and NOTIFICATION_DLQ_URL are required."
  );
}
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Fixture;
const target = getNotificationTestTarget();
if ("reason" in target) throw new Error(target.reason);
if (process.env.PATHLENS_ALLOW_STAGING_NOTIFICATION_TESTS !== "true") {
  throw new Error("The staging notification opt-in is required.");
}

const sqs = new SQSClient({ region: process.env.AWS_REGION || "ap-south-1" });
const pool = createNotificationTestPool();

async function attributes(url: string) {
  const result = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: url,
      AttributeNames: [
        "ApproximateNumberOfMessages",
        "ApproximateNumberOfMessagesNotVisible",
        "ApproximateNumberOfMessagesDelayed",
      ],
    })
  );
  return result.Attributes ?? {};
}

async function receive(url: string) {
  const result = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: url,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
      VisibilityTimeout: 30,
    })
  );
  return result.Messages ?? [];
}

async function deleteMessage(url: string, receiptHandle: string) {
  await sqs.send(
    new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: receiptHandle })
  );
}

async function main() {
  const before = await attributes(queueUrl);
  assert.equal(
    before.ApproximateNumberOfMessages,
    "0",
    "The test queue must start empty."
  );
  assert.equal(
    before.ApproximateNumberOfMessagesNotVisible,
    "0",
    "The test queue must have no in-flight messages."
  );
  assert.equal(
    before.ApproximateNumberOfMessagesDelayed,
    "0",
    "The test queue must have no delayed messages."
  );

  const client = await pool.connect();
  let deliveryIds: string[] = [];
  try {
    await client.query(
      `DELETE FROM integration_notification_deliveries WHERE project_integration_id = $1`,
      [fixture.projectIntegrationId]
    );
    const initialIds = new Set<string>();

    process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID =
      fixture.projectIntegrationId;
    process.env.NOTIFICATION_QUEUE_URL = queueUrl;
    let created = 0;
    for (let offset = 0; offset < 8 && created === 0; offset += 1) {
      const now = new Date(Date.now() + offset * 60_000);
      await runNotificationDispatcher(now);
      const current = await client.query<{ id: string }>(
        `SELECT id FROM integration_notification_deliveries WHERE project_integration_id = $1`,
        [fixture.projectIntegrationId]
      );
      created = current.rows.filter((row) => !initialIds.has(row.id)).length;
    }
    assert.ok(
      created > 0,
      "The isolated dispatcher did not create a delivery."
    );

    const messages = await receive(queueUrl);
    assert.ok(
      messages.length > 0,
      "The dispatcher did not publish an SQS message."
    );
    deliveryIds = messages.map((message) => {
      const parsed = JSON.parse(message.Body ?? "{}");
      assert.equal(typeof parsed.deliveryId, "string");
      return parsed.deliveryId as string;
    });
    const transientId = deliveryIds[0];
    let failedOnce = false;
    const calls: Array<{
      channelId: string;
      text: string;
      blocks?: ReadonlyArray<Record<string, unknown>>;
    }> = [];
    process.env.PATHLENS_NOTIFICATION_MOCK_SLACK = "true";
    setSlackMessageTransportForTests(
      async (_token, channelId, text, blocks) => {
        calls.push({ channelId, text, blocks });
        assert.ok(
          blocks && blocks.length > 0,
          "The worker did not generate Block Kit blocks."
        );
        if (!failedOnce && deliveryIds.includes(transientId)) {
          failedOnce = true;
          throw new SlackApiError("timeout");
        }
        return { channel: channelId, ts: `${fixture.label}-${calls.length}` };
      }
    );

    const firstResult = await notificationWorker({
      Records: messages.map((message) => ({
        messageId: message.MessageId!,
        body: message.Body!,
      })),
    });
    assert.equal(
      firstResult.batchItemFailures.length,
      1,
      "Exactly one transient failure was expected."
    );
    const failedMessage = messages.find(
      (message) =>
        message.MessageId === firstResult.batchItemFailures[0]?.itemIdentifier
    )!;
    await sqs.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: failedMessage.ReceiptHandle!,
        VisibilityTimeout: 0,
      })
    );
    await client.query(
      `UPDATE integration_notification_deliveries
       SET next_attempt_at = NOW() - INTERVAL '1 second'
       WHERE id = $1 AND project_integration_id = $2`,
      [transientId, fixture.projectIntegrationId]
    );
    for (const message of messages) {
      if (message !== failedMessage)
        await deleteMessage(queueUrl, message.ReceiptHandle!);
    }

    const redelivered = await receive(queueUrl);
    assert.equal(
      redelivered.length,
      1,
      "The failed notification was not redelivered."
    );
    const retryResult = await notificationWorker({
      Records: [
        { messageId: redelivered[0].MessageId!, body: redelivered[0].Body! },
      ],
    });
    assert.deepEqual(retryResult.batchItemFailures, []);
    await deleteMessage(queueUrl, redelivered[0].ReceiptHandle!);

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ deliveryId: transientId }),
      })
    );
    const duplicate = await receive(queueUrl);
    assert.equal(duplicate.length, 1);
    const duplicateResult = await notificationWorker({
      Records: [
        { messageId: duplicate[0].MessageId!, body: duplicate[0].Body! },
      ],
    });
    assert.deepEqual(duplicateResult.batchItemFailures, []);
    await deleteMessage(queueUrl, duplicate[0].ReceiptHandle!);

    const statuses = await client.query<{
      report_type: string;
      status: string;
      count: string;
    }>(
      `SELECT report_type, status, COUNT(*)::text AS count
       FROM integration_notification_deliveries
       WHERE project_integration_id = $1
       GROUP BY report_type, status ORDER BY report_type, status`,
      [fixture.projectIntegrationId]
    );
    assert.ok(
      statuses.rows.some(
        (row) => row.report_type === "daily" && row.status === "succeeded"
      )
    );
    assert.ok(
      statuses.rows.some(
        (row) => row.report_type === "weekly" && row.status === "succeeded"
      )
    );
    assert.ok(
      calls.length >= 2,
      "The mock Slack transport did not receive success and retry calls."
    );
    console.log(
      JSON.stringify(
        {
          dispatcherCreated: created,
          sqsMessages: messages.length,
          slackCalls: calls.length,
          statuses: statuses.rows,
        },
        null,
        2
      )
    );
  } finally {
    client.release();
  }
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Pipeline test failed."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
