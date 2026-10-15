import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  isSupabasePersistenceConfigured,
  resetSupabaseAdminClientForTests,
} from "@/lib/supabase/server-client";

describe("isSupabasePersistenceConfigured", () => {
  let urlBackup: string | undefined;
  let keyBackup: string | undefined;
  let enabledBackup: string | undefined;

  beforeEach(() => {
    urlBackup = process.env.SUPABASE_URL;
    keyBackup = process.env.SUPABASE_SERVICE_ROLE_KEY;
    enabledBackup = process.env.SUPABASE_PERSISTENCE_ENABLED;
    resetSupabaseAdminClientForTests();
  });

  afterEach(() => {
    if (urlBackup === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = urlBackup;
    if (keyBackup === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = keyBackup;
    if (enabledBackup === undefined) delete process.env.SUPABASE_PERSISTENCE_ENABLED;
    else process.env.SUPABASE_PERSISTENCE_ENABLED = enabledBackup;
    resetSupabaseAdminClientForTests();
  });

  it("returns false when URL or service role key is missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_PERSISTENCE_ENABLED;
    assert.equal(isSupabasePersistenceConfigured(), false);
  });

  it("returns false when persistence is explicitly disabled", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.SUPABASE_PERSISTENCE_ENABLED = "false";
    assert.equal(isSupabasePersistenceConfigured(), false);
  });

  it("returns true when URL and service role key are set", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    delete process.env.SUPABASE_PERSISTENCE_ENABLED;
    assert.equal(isSupabasePersistenceConfigured(), true);
  });
});
