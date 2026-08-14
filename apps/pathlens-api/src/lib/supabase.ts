import { createClient } from "@supabase/supabase-js";

const DEFAULT_SNAPSHOT_BUCKET = "project-snapshots";
const SIGNED_URL_EXPIRES_IN = 24 * 60 * 60;

let supabaseAdmin: ReturnType<typeof createClient> | null | undefined;

function getSupabaseAdmin() {
  if (supabaseAdmin !== undefined) return supabaseAdmin;

  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    supabaseAdmin = null;
    return supabaseAdmin;
  }

  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

export async function createSnapshotSignedUrl(
  storagePath: string
): Promise<string | null> {
  const client = getSupabaseAdmin();

  if (!client) return null;

  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SNAPSHOT_BUCKET;
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN);

  if (error) {
    console.error("Unable to create project snapshot URL.", error);
    return null;
  }

  return data.signedUrl;
}
