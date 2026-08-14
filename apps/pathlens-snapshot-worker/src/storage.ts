import { createClient } from '@supabase/supabase-js'

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
  const supabase = createClient(
    requiredEnvironmentValue('SUPABASE_URL'),
    requiredEnvironmentValue('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  )
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || defaultBucket

  return {
    async assertPrivateBucket(): Promise<void> {
      const { data, error } = await supabase.storage.getBucket(bucket)

      if (error) {
        throw new Error(
          `Unable to inspect Supabase Storage bucket: ${error.message}`
        )
      }

      if (!data) {
        throw new Error(`Supabase Storage bucket '${bucket}' does not exist`)
      }

      if (data.public) {
        throw new Error(`Supabase Storage bucket '${bucket}' must be private`)
      }
    },
    async upload(storagePath: string, image: Buffer): Promise<void> {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, image, {
          cacheControl: '86400',
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (error) {
        throw new Error(`Unable to upload snapshot: ${error.message}`)
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
