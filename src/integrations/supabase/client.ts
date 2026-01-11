// Supabase client configured for EXTERNAL Supabase project
import { createClient } from '@supabase/supabase-js';

// Priority: External Supabase instance > Lovable Cloud
const SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Debug logging for connection verification
console.log('[Supabase Client] Using External:', !!import.meta.env.VITE_EXTERNAL_SUPABASE_URL);
console.log('[Supabase Client] URL configured:', SUPABASE_URL ? 'YES' : 'NO');
console.log('[Supabase Client] Key configured:', SUPABASE_KEY ? 'YES' : 'NO');

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});