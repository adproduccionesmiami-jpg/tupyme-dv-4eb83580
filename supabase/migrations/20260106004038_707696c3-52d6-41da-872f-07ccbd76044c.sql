-- Crear tabla products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NULL,
  description text NULL,
  cost numeric(12,2) DEFAULT 0,
  price numeric(12,2) DEFAULT 0,
  stock int DEFAULT 0,
  min_stock int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: miembro activo de la org
CREATE POLICY products_select_member
ON public.products
FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id, auth.uid()));

-- Policy INSERT: solo admin activo
CREATE POLICY products_insert_admin
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.is_org_admin(organization_id, auth.uid()));

-- Policy UPDATE: solo admin activo
CREATE POLICY products_update_admin
ON public.products
FOR UPDATE
TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()))
WITH CHECK (public.is_org_admin(organization_id, auth.uid()));

-- Policy DELETE: solo admin activo
CREATE POLICY products_delete_admin
ON public.products
FOR DELETE
TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()));

-- Notificar a PostgREST para recargar schema
SELECT pg_notify('pgrst', 'reload schema');