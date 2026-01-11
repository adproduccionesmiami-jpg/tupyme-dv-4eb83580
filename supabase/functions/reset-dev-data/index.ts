import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ====================================================================
// DISCOVERED TABLES (from codebase analysis):
// PRODUCTS_TABLE = 'products'          -> uses organization_id
// MOVEMENTS_TABLE = 'inventory_movements' -> uses organization_id
// SCOPE_COLUMN = 'organization_id'     -> UUID, obtained from memberships table
// DEPENDENT_TABLES = [] (no additional child tables discovered)
// ====================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Check if DEV reset is enabled (support both key names for flexibility)
    const devResetEnabled = Deno.env.get('DEV_RESET_HABILITADO') || Deno.env.get('DEV_RESET_ENABLED')
    if (devResetEnabled !== 'true') {
      console.log('[reset-dev-data] DEV_RESET_HABILITADO/DEV_RESET_ENABLED is not true, value:', devResetEnabled)
      return new Response(
        JSON.stringify({ error: 'Reset DEV deshabilitado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validate authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[reset-dev-data] Missing or invalid Authorization header')
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Get Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User client to validate JWT and get user info
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get authenticated user
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    
    if (userError || !user) {
      console.log('[reset-dev-data] Invalid user:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    const userEmail = user.email

    console.log('[reset-dev-data] User authenticated:', userEmail)

    // 4. Check if user email matches DEV_ADMIN_EMAIL (case-insensitive)
    const devAdminEmail = Deno.env.get('DEV_ADMIN_EMAIL')
    if (!devAdminEmail) {
      console.log('[reset-dev-data] DEV_ADMIN_EMAIL not configured')
      return new Response(
        JSON.stringify({ error: 'DEV_ADMIN_EMAIL no está configurado en secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if ((userEmail || '').toLowerCase() !== devAdminEmail.toLowerCase()) {
      console.log('[reset-dev-data] User email does not match DEV_ADMIN_EMAIL')
      console.log('[reset-dev-data] User:', userEmail, '| Admin:', devAdminEmail)
      return new Response(
        JSON.stringify({ error: 'No autorizado para reset DEV' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Get user's organization from memberships
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: membership, error: membershipError } = await adminClient
      .from('memberships')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      console.log('[reset-dev-data] No active membership found:', membershipError?.message)
      return new Response(
        JSON.stringify({ error: 'No se encontró organización activa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const organizationId = membership.organization_id
    console.log('[reset-dev-data] Resetting data for organization:', organizationId)

    // ======================================
    // STEP 3: BEFORE COUNTS
    // ======================================
    const { count: beforeProducts } = await adminClient
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const { count: beforeMovements } = await adminClient
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    console.log('[reset-dev-data] BEFORE - products:', beforeProducts, 'movements:', beforeMovements)

    // ======================================
    // STEP 4: DELETE (movements first, then products)
    // ======================================
    const { data: deletedMovements, error: movError } = await adminClient
      .from('inventory_movements')
      .delete()
      .eq('organization_id', organizationId)
      .select('id')

    if (movError) {
      console.error('[reset-dev-data] Error deleting movements:', movError)
      throw movError
    }

    const movementsDeletedCount = deletedMovements?.length ?? 0
    console.log('[reset-dev-data] Deleted movements:', movementsDeletedCount)

    const { data: deletedProducts, error: prodError } = await adminClient
      .from('products')
      .delete()
      .eq('organization_id', organizationId)
      .select('id')

    if (prodError) {
      console.error('[reset-dev-data] Error deleting products:', prodError)
      throw prodError
    }

    const productsDeletedCount = deletedProducts?.length ?? 0
    console.log('[reset-dev-data] Deleted products:', productsDeletedCount)

    // ======================================
    // STEP 5: AFTER COUNTS
    // ======================================
    const { count: afterProducts } = await adminClient
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const { count: afterMovements } = await adminClient
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    console.log('[reset-dev-data] AFTER - products:', afterProducts, 'movements:', afterMovements)

    // ======================================
    // STEP 6: Check for residual data
    // ======================================
    let remainingProductsSample: string[] = []
    let remainingMovementsSample: string[] = []

    if ((afterProducts ?? 0) > 0) {
      const { data: remaining } = await adminClient
        .from('products')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(10)
      
      remainingProductsSample = (remaining || []).map((p: { id: string }) => p.id)
      console.log('[reset-dev-data] WARNING: Remaining products sample:', remainingProductsSample)
    }

    if ((afterMovements ?? 0) > 0) {
      const { data: remaining } = await adminClient
        .from('inventory_movements')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(10)
      
      remainingMovementsSample = (remaining || []).map((m: { id: string }) => m.id)
      console.log('[reset-dev-data] WARNING: Remaining movements sample:', remainingMovementsSample)
    }

    // 8. Return detailed report
    const report = {
      ok: true,
      scope: {
        column: 'organization_id',
        value: organizationId,
        valueType: 'organization_id (from memberships)'
      },
      tables: {
        products: 'products',
        movements: 'inventory_movements',
      },
      before: {
        products: beforeProducts ?? 0,
        movements: beforeMovements ?? 0,
      },
      deleted: {
        products: productsDeletedCount,
        movements: movementsDeletedCount,
      },
      after: {
        products: afterProducts ?? 0,
        movements: afterMovements ?? 0,
      },
      samples: {
        products: remainingProductsSample,
        movements: remainingMovementsSample,
      },
      errors: [] as string[],
    }

    console.log('[reset-dev-data] Report:', JSON.stringify(report))

    return new Response(
      JSON.stringify(report),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[reset-dev-data] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
