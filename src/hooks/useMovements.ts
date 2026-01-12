import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client.browser';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Movement, MovementType } from '@/types/inventory';

export interface DbMovement {
  id: string;
  organization_id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjust';
  delta: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  products?: {
    name: string;
    sku: string | null;
    category_id: string | null;
    presentation: string | null;
    categories?: {
      name: string;
    }
  }
}

const mapType = (type: 'in' | 'out' | 'adjust'): MovementType => {
  if (type === 'in') return 'entrada';
  if (type === 'out') return 'salida';
  return 'ajuste';
};

export const mapDbToLocalMovement = (db: DbMovement): Movement => ({
  id: db.id,
  productoId: db.product_id,
  productoNombre: db.products?.name || 'Producto desconocido',
  productoSku: db.products?.sku || '',
  productoCategoria: db.products?.categories?.name || 'Sin categoría',
  productoPresentacion: db.products?.presentation || 'Unidad',
  tipo: mapType(db.movement_type),
  cantidad: Math.abs(db.delta),
  stockAntes: 0, // Not stored in DB, would need a more complex query or trigger to log
  stockDespues: 0, // Not stored in DB
  motivo: db.notes || '',
  usuario: db.created_by,
  usuarioRol: 'Usuario', // Placeholder
  fecha: new Date(db.created_at),
});

interface UseMovementsResult {
  movements: Movement[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMovements(): UseMovementsResult {
  const { organizationId, user } = useSupabaseAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    if (!organizationId || !user) {
      setMovements([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          products (
            name,
            sku,
            category_id,
            presentation,
            categories (
              name
            )
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(`Error: ${queryError.message}`);
        setMovements([]);
        return;
      }

      setMovements((data as any[]).map(mapDbToLocalMovement));
    } catch (err) {
      setError('Error inesperado al cargar movimientos');
      setMovements([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, user]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return {
    movements,
    isLoading,
    error,
    refetch: fetchMovements,
  };
}
