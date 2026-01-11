
-- 0) Enum: crear solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE public.movement_type AS ENUM ('in', 'out', 'adjust');
  END IF;
END $$;

-- 1) Tabla categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_select_member ON public.categories
FOR SELECT TO authenticated
USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY categories_insert_admin ON public.categories
FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(organization_id, auth.uid()));

CREATE POLICY categories_update_admin ON public.categories
FOR UPDATE TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()))
WITH CHECK (public.is_org_admin(organization_id, auth.uid()));

CREATE POLICY categories_delete_admin ON public.categories
FOR DELETE TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()));

-- 2) Tabla brands
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY brands_select_member ON public.brands
FOR SELECT TO authenticated
USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY brands_insert_admin ON public.brands
FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(organization_id, auth.uid()));

CREATE POLICY brands_update_admin ON public.brands
FOR UPDATE TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()))
WITH CHECK (public.is_org_admin(organization_id, auth.uid()));

CREATE POLICY brands_delete_admin ON public.brands
FOR DELETE TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()));

-- 3) Agregar FKs a products (category_id, brand_id)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

-- 4) Tabla inventory_movements con constraints de seguridad
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type public.movement_type NOT NULL,
  delta integer NOT NULL,
  notes text NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT inv_mov_delta_nonzero CHECK (delta <> 0),
  CONSTRAINT inv_mov_delta_matches_type CHECK (
    (movement_type = 'in' AND delta > 0)
    OR (movement_type = 'out' AND delta < 0)
    OR (movement_type = 'adjust' AND delta <> 0)
  )
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 5) RLS para movements: SELECT para miembros, INSERT con validación cross-org
CREATE POLICY movements_select_member ON public.inventory_movements
FOR SELECT TO authenticated
USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY movements_insert_member ON public.inventory_movements
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_member(organization_id, auth.uid())
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id
      AND p.organization_id = organization_id
  )
);

-- UPDATE/DELETE bloqueados por diseño (sin policies = denegado)

-- 6) Trigger function: COALESCE + bloqueo stock negativo
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_stock integer;
BEGIN
  UPDATE public.products p
  SET stock = COALESCE(p.stock, 0) + NEW.delta
  WHERE p.id = NEW.product_id
  RETURNING stock INTO new_stock;

  IF new_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found for movement: %', NEW.product_id;
  END IF;

  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative (product %, resulting stock %)', NEW.product_id, new_stock;
  END IF;

  RETURN NEW;
END;
$$;

-- 7) Trigger en inventory_movements
CREATE TRIGGER trg_update_product_stock
AFTER INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock();

-- 8) Índices para performance
CREATE INDEX IF NOT EXISTS idx_categories_org ON public.categories (organization_id);
CREATE INDEX IF NOT EXISTS idx_brands_org ON public.brands (organization_id);
CREATE INDEX IF NOT EXISTS idx_mov_org_created ON public.inventory_movements (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_product_created ON public.inventory_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand_id);

-- 9) Storage bucket (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage policies seguras
CREATE POLICY "Authenticated can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view product images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Owners can update their uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = owner);

CREATE POLICY "Owners can delete their uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- 10) Reload schema
SELECT pg_notify('pgrst', 'reload schema');
