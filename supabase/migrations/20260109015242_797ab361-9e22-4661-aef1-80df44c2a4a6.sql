-- Create product_formats table for Excel dropdown values
CREATE TABLE public.product_formats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  abbreviation text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_formats ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read formats (public reference data)
CREATE POLICY "formats_select_all" ON public.product_formats
  FOR SELECT USING (true);

-- Only admins can modify formats (requires org context - simplified for global formats)
CREATE POLICY "formats_insert_admin" ON public.product_formats
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  ));

CREATE POLICY "formats_update_admin" ON public.product_formats
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  ));

-- Insert default formats
INSERT INTO public.product_formats (name, abbreviation, sort_order) VALUES
  ('Unidad', 'Ud', 1),
  ('Libra', 'Lb', 2),
  ('Kilogramo', 'Kg', 3),
  ('Gramo', 'g', 4),
  ('Litro', 'L', 5),
  ('Mililitro', 'mL', 6),
  ('Onza', 'Oz', 7),
  ('Paquete', 'Paq', 8),
  ('Caja', 'Caja', 9),
  ('Docena', 'Doc', 10);