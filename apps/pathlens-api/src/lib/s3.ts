import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_SNAPSHOT_BUCKET = "project-snapshots";
const SIGNED_URL_EXPIRES_IN = 24 * 60 * 60;

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
