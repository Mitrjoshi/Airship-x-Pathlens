import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const productionQueueUrl =
  "https://sqs.ap-south-1.amazonaws.com/176246209215/pathlens-snapshot-worker-queue";

const endpoint = process.env.SNAPSHOT_SQS_ENDPOINT?.trim();
const sqs = new SQSClient({
  region: process.env.AWS_REGION ?? "ap-south-1",
  ...(endpoint
    ? {
        endpoint,
        credentials: { accessKeyId: "test", secretAccessKey: "test" },
      }
    : {}),
});

export async function enqueueProjectSnapshot(projectId: string): Promise<void> {
  const queueUrl =
    process.env.SNAPSHOT_QUEUE_URL?.trim() ??
    (process.env.NODE_ENV === "production" ? productionQueueUrl : undefined);

  if (!queueUrl) {
    throw new Error("SNAPSHOT_QUEUE_URL is required outside production");
  }

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ projectId }),
    })
  );
}
