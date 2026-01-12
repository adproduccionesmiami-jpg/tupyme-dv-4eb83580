import { createClient } from "@supabase/supabase-js";

// NOTE:
// In some hosting/build contexts, Vite env vars may not be injected as expected.
// We therefore provide a safe fallback to the project’s public URL + anon key.

const envUrl = String(
  (import.meta as any).env?.VITE_EXTERNAL_SUPABASE_URL ??
    (import.meta as any).env?.VITE_SUPABASE_URL ??
    ""
).trim();

const envKey = String(
  (import.meta as any).env?.VITE_EXTERNAL_SUPABASE_KEY ??
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ??
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
    ""
).trim();

// Public fallback values (safe to ship to the browser)
const FALLBACK_URL = "https://oqwiozlwxmaqoqyfvmsk.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd2lvemx3eG1hcW9xeWZ2bXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDkyNDMsImV4cCI6MjA4MzEyNTI0M30.SBTRebgM82M04XXe9eaVO_Ov2rAZd_U17UylzVa6oIo";

const SUPABASE_URL = envUrl || FALLBACK_URL;
const SUPABASE_KEY = envKey || FALLBACK_ANON_KEY;

if (!envUrl || !envKey) {
  console.warn("[Supabase Client] Vite env missing; using fallback config", {
    hasEnvUrl: Boolean(envUrl),
    hasEnvKey: Boolean(envKey),
  });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
