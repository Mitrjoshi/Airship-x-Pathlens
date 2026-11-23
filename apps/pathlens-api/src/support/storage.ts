import {
  CopyObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { SupportError } from "./errors";

export const SUPPORT_UPLOAD_TTL_SECONDS = 600;

let s3Client: S3Client | undefined;

function client() {
  const region = process.env.AWS_REGION?.trim();
  if (!region)
    throw new SupportError(503, "Attachment storage is not configured.");
  return (s3Client ??= new S3Client({ region }));
}

export function supportBucket() {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket)
    throw new SupportError(503, "Attachment storage is not configured.");
  return bucket;
}

export async function createSupportUpload(data: {
  bucket: string;
  storageKey: string;
  contentType: string;
  size: number;
}) {
  return createPresignedPost(client(), {
    Bucket: data.bucket,
    Key: data.storageKey,
    Expires: SUPPORT_UPLOAD_TTL_SECONDS,
    Fields: { "Content-Type": data.contentType },
    Conditions: [
      ["content-length-range", data.size, data.size],
      ["eq", "$Content-Type", data.contentType],
    ],
  });
}

// Copy to a key that no browser upload grant can write. If the source changes
// between HEAD and COPY, CopySourceIfMatch rejects it instead of accepting it.
export async function finalizeSupportUpload(
  data: {
    bucket: string;
    storageKey: string;
    contentType: string;
    size: number;
  },
  finalKey: string
) {
  const s3 = client();
  let head;
  try {
    head = await s3.send(
      new HeadObjectCommand({
        Bucket: data.bucket,
        Key: data.storageKey,
      })
    );
  } catch (error) {
    if (
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 404
    ) {
      throw new SupportError(
        409,
        "An attachment has not been uploaded. Please upload it again."
      );
    }
    throw error;
  }
  if (
    head.ContentLength !== data.size ||
    head.ContentType !== data.contentType ||
    !head.ETag
  ) {
    throw new SupportError(
      400,
      "Uploaded attachment does not match its declared size or type."
    );
  }
  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: data.bucket,
        Key: finalKey,
        CopySource: `${data.bucket}/${data.storageKey.split("/").map(encodeURIComponent).join("/")}`,
        CopySourceIfMatch: head.ETag,
        MetadataDirective: "REPLACE",
        ContentType: data.contentType,
        ContentDisposition: "attachment",
        CacheControl: "private, no-store",
      })
    );
  } catch (error) {
    if (
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 412
    ) {
      throw new SupportError(
        409,
        "An attachment changed during submission. Please try again."
      );
    }
    throw error;
  }
}
