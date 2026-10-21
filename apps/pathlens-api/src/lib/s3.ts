import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_SNAPSHOT_BUCKET = "project-snapshots";
const SIGNED_URL_EXPIRES_IN = 24 * 60 * 60;
const HEATMAP_SIGNED_URL_EXPIRES_IN = 15 * 60;
const AVATAR_SIGNED_URL_EXPIRES_IN = 60 * 60;

let s3Client: S3Client | null | undefined;

function getS3Client(): S3Client | null {
  if (s3Client !== undefined) return s3Client;

  const region = process.env.AWS_REGION?.trim();

  if (!region) {
    s3Client = null;
    return s3Client;
  }

  s3Client = new S3Client({ region });
  return s3Client;
}

export async function createSnapshotSignedUrl(
  storagePath: string
): Promise<string | null> {
  const client = getS3Client();
  const bucket = process.env.S3_BUCKET?.trim() || DEFAULT_SNAPSHOT_BUCKET;

  if (!client) return null;

  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: storagePath }),
      { expiresIn: SIGNED_URL_EXPIRES_IN }
    );
  } catch (error) {
    console.error("Unable to create project snapshot URL.", error);
    return null;
  }
}

export async function createHeatmapSnapshotSignedUrl(
  storagePath: string
): Promise<string | null> {
  const client = getS3Client();
  const bucket = process.env.S3_BUCKET?.trim() || DEFAULT_SNAPSHOT_BUCKET;

  if (!client) return null;

  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: storagePath }),
      { expiresIn: HEATMAP_SIGNED_URL_EXPIRES_IN }
    );
  } catch (error) {
    console.error("Unable to create heatmap snapshot URL.", error);
    return null;
  }
}

export async function createAvatarSignedUrl(
  storageKey: string
): Promise<string | null> {
  const client = getS3Client();
  const bucket =
    process.env.AVATAR_BUCKET?.trim() ||
    process.env.S3_BUCKET?.trim() ||
    DEFAULT_SNAPSHOT_BUCKET;

  if (!client) return null;

  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
      { expiresIn: AVATAR_SIGNED_URL_EXPIRES_IN }
    );
  } catch (error) {
    console.error("Unable to create avatar URL.", error);
    return null;
  }
}

export async function uploadReport(
  storagePath: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.S3_BUCKET?.trim() || DEFAULT_SNAPSHOT_BUCKET;

  if (!client) {
    throw new Error("AWS_REGION is required to upload reports.");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function createReportSignedUrl(
  storagePath: string,
  fileName = "report.xlsx"
): Promise<string> {
  const client = getS3Client();
  const bucket = process.env.S3_BUCKET?.trim() || DEFAULT_SNAPSHOT_BUCKET;

  if (!client) {
    throw new Error("AWS_REGION is required to download reports.");
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      ResponseContentDisposition: `attachment; filename="${fileName.replace(/"/g, "")}"`,
    }),
    { expiresIn: SIGNED_URL_EXPIRES_IN }
  );
}
