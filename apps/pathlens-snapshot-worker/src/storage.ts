import {
  GetPublicAccessBlockCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const defaultBucket = 'project-snapshots'

export interface SnapshotStorage {
  assertPrivateBucket(): Promise<void>
  upload(storagePath: string, image: Buffer): Promise<void>
}

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) throw new Error(`${name} is required`)

  return value
}

export function createSnapshotStorage(): SnapshotStorage {
  const region = requiredEnvironmentValue('AWS_REGION')
  const bucket = process.env.S3_BUCKET?.trim() || defaultBucket
  const s3 = new S3Client({ region })

  return {
    async assertPrivateBucket(): Promise<void> {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }))
        const accessBlock = await s3.send(
          new GetPublicAccessBlockCommand({ Bucket: bucket })
        )
        const configuration = accessBlock.PublicAccessBlockConfiguration

        if (
          !configuration?.BlockPublicAcls ||
          !configuration.IgnorePublicAcls ||
          !configuration.BlockPublicPolicy ||
          !configuration.RestrictPublicBuckets
        ) {
          throw new Error(`S3 bucket '${bucket}' must block public access`)
        }
      } catch (error) {
        throw new Error(
          `Unable to inspect private S3 bucket '${bucket}': ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    async upload(storagePath: string, image: Buffer): Promise<void> {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: storagePath,
            Body: image,
            CacheControl: '86400',
            ContentType: 'image/jpeg',
          })
        )
      } catch (error) {
        throw new Error(
          `Unable to upload snapshot: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
  }
}

export function defaultSnapshotStoragePath(
  workspaceId: string,
  projectId: string
): string {
  return `snapshots/${workspaceId}/${projectId}.jpg`
}
