import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdmin: SupabaseClient | null | undefined;

export function isSupabasePersistenceConfigured(): boolean {
  const disabled = process.env.SUPABASE_PERSISTENCE_ENABLED?.trim().toLowerCase();
  if (disabled === "0" || disabled === "false" || disabled === "no") {
    return false;
  }
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/** Service-role client — server Route Handlers only. Never import from client components. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedAdmin !== undefined) {
    return cachedAdmin;
  }

  if (!isSupabasePersistenceConfigured()) {
    cachedAdmin = null;
    return null;
  }

  cachedAdmin = createClient(
    process.env.SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return cachedAdmin;
}

/** Test helper — reset module cache between tests */
export function resetSupabaseAdminClientForTests(): void {
  cachedAdmin = undefined;
}
