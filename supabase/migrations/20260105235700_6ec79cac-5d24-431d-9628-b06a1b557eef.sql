-- Crear función security definer para verificar si usuario es admin de una org (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE organization_id = _org_id
      AND user_id = _user_id
      AND role = 'admin'
      AND status = 'active'
  )
$$;

-- Crear función para verificar si usuario es miembro activo de una org
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE organization_id = _org_id
      AND user_id = _user_id
      AND status = 'active'
  )
$$;

-- Eliminar policies anteriores
DROP POLICY IF EXISTS org_select_for_members ON public.organizations;
DROP POLICY IF EXISTS org_update_admin_only ON public.organizations;
DROP POLICY IF EXISTS mem_select_self_or_admin ON public.memberships;
DROP POLICY IF EXISTS mem_admin_manage ON public.memberships;

-- Organizations: ver solo si eres miembro activo (usando función)
CREATE POLICY org_select_for_members
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_org_member(id, auth.uid()));

-- Organizations: actualizar solo admin activo (usando función)
CREATE POLICY org_update_admin_only
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_org_admin(id, auth.uid()))
WITH CHECK (public.is_org_admin(id, auth.uid()));

-- Memberships: SELECT - ver tu propia membership O si eres admin de esa org
CREATE POLICY mem_select_own_or_admin
ON public.memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_org_admin(organization_id, auth.uid())
);

-- Memberships: INSERT/UPDATE/DELETE - solo admin de la org
CREATE POLICY mem_admin_manage
ON public.memberships
FOR ALL
TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()))
WITH CHECK (public.is_org_admin(organization_id, auth.uid()));