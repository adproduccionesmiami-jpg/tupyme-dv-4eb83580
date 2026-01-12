import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    
    // If no auth header, return disabled (non-fatal for dev flags)
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[dev-flags] No auth header, returning disabled");
      return new Response(JSON.stringify({ ok: true, devResetEnabled: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      console.log("[dev-flags] Invalid token, returning disabled");
      return new Response(JSON.stringify({ ok: true, devResetEnabled: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = user.email ?? "";
    const devResetEnabled = (Deno.env.get("DEV_RESET_HABILITADO") === "true");
    const devAdminEmail = Deno.env.get("DEV_ADMIN_EMAIL") ?? "";

    const isDevAdmin = (userEmail.toLowerCase() === devAdminEmail.toLowerCase());

    // Do not leak DEV flags to non-dev users; treat as disabled.
    const safeEnabled = devResetEnabled && isDevAdmin;

    console.log("[dev-flags] User:", userEmail, "isDevAdmin:", isDevAdmin, "enabled:", safeEnabled);

    return new Response(
      JSON.stringify({
        ok: true,
        devResetEnabled: safeEnabled,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[dev-flags] Error:", error);
    return new Response(JSON.stringify({ ok: true, devResetEnabled: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
