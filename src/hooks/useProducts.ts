import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Product as LocalProduct } from '@/types/inventory';

export interface DbProduct {
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  brand_id: string | null;
  presentation: string | null;
  unit_cost: number;
  unit_price: number;
  stock: number;
  min_stock: number;
  max_stock: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expiration_date: string | null;
}

// Mapper from Database to UI
export const mapDbToLocal = (db: DbProduct): LocalProduct => ({
  id: db.id,
  sku: db.sku || '',
  nombre: db.name,
  presentacion: db.presentation || 'Unidad',
  imagen: '/placeholder.svg',
  stock: db.stock,
  costo: db.unit_cost,
  precio: db.unit_price,
  categoria: 'Sin categoría', // This will be enriched in the component via categoryId
  categoryId: db.category_id || undefined,
  brandId: db.brand_id || undefined,
  vendidos: 0,
  minStock: db.min_stock,
  maxStock: db.max_stock || undefined,
  expirationDate: db.expiration_date || undefined,
});

export interface CreateProductParams {
  name: string;
  sku?: string;
  category_id?: string;
  brand_id?: string;
  presentation?: string;
  unit_cost?: number;
  unit_price?: number;
  stock?: number;
  min_stock?: number;
  max_stock?: number;
  expiration_date?: string;
}

interface UseProductsResult {
  products: LocalProduct[];
  isLoading: boolean;
  error: string | null;
  isCreating: boolean;
  isDeleting: boolean;
  refetch: () => Promise<void>;
  createProduct: (params: CreateProductParams) => Promise<{ success: boolean; error?: string; product?: LocalProduct }>;
  updateProduct: (productId: string | number, updates: Partial<LocalProduct>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (productId: string | number) => Promise<{ success: boolean; error?: string }>;
}

export function useProducts(): UseProductsResult {
  const { organizationId, user } = useSupabaseAuth();
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!organizationId || !user) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (queryError) {
        setError(`Error: ${queryError.message}`);
        setProducts([]);
        return;
      }

      setProducts((data as DbProduct[]).map(mapDbToLocal));
    } catch (err) {
      setError('Error inesperado al cargar productos');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, user]);

  const createProduct = useCallback(async (params: CreateProductParams): Promise<{ success: boolean; error?: string; product?: LocalProduct }> => {
    if (!organizationId || !user) {
      return { success: false, error: 'Sesión no válida' };
    }

    try {
      setIsCreating(true);
      const { data, error: insertError } = await supabase
        .from('products')
        .insert({
          organization_id: organizationId,
          name: params.name,
          sku: params.sku ?? null,
          category_id: params.category_id ?? null,
          brand_id: params.brand_id ?? null,
          presentation: params.presentation ?? 'Unidad',
          unit_cost: params.unit_cost ?? 0,
          unit_price: params.unit_price ?? 0,
          stock: params.stock ?? 0,
          min_stock: params.min_stock ?? 0,
          max_stock: params.max_stock ?? null,
          expiration_date: params.expiration_date ?? null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      const newProduct = mapDbToLocal(data as DbProduct);
      await fetchProducts();
      return { success: true, product: newProduct };
    } catch (err) {
      return { success: false, error: 'Error inesperado' };
    } finally {
      setIsCreating(false);
    }
  }, [organizationId, user, fetchProducts]);

  const updateProduct = useCallback(async (productId: string | number, updates: Partial<LocalProduct>): Promise<{ success: boolean; error?: string }> => {
    if (!organizationId || !user) return { success: false, error: 'Sesión no válida' };

    try {
      const dbUpdates: Partial<DbProduct> = {};
      if (updates.nombre !== undefined) dbUpdates.name = updates.nombre;
      if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId as any;
      if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId as any;
      if (updates.presentacion !== undefined) dbUpdates.presentation = updates.presentacion;
      if (updates.costo !== undefined) dbUpdates.unit_cost = updates.costo;
      if (updates.precio !== undefined) dbUpdates.unit_price = updates.precio;
      if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
      if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
      if (updates.maxStock !== undefined) dbUpdates.max_stock = updates.maxStock;
      if (updates.expirationDate !== undefined) dbUpdates.expiration_date = updates.expirationDate;

      const { error: updateError } = await supabase
        .from('products')
        .update(dbUpdates)
        .eq('id', productId);

      if (updateError) return { success: false, error: updateError.message };

      await fetchProducts();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error inesperado' };
    }
  }, [organizationId, user, fetchProducts]);

  const deleteProduct = useCallback(async (productId: string | number): Promise<{ success: boolean; error?: string }> => {
    if (!organizationId || !user) {
      return { success: false, error: 'Sesión no válida' };
    }

    try {
      setIsDeleting(true);

      // Delete movements first
      await supabase
        .from('inventory_movements')
        .delete()
        .eq('product_id', productId);

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      await fetchProducts();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error inesperado' };
    } finally {
      setIsDeleting(false);
    }
  }, [organizationId, user, fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    isCreating,
    isDeleting,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
