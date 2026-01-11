import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export interface InventoryMovement {
  id: string;
  organization_id: string;
  product_id: string;
  movement_type: string;
  delta: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  product?: {
    name: string;
  };
}

interface UseInventoryMovementsListResult {
  movements: InventoryMovement[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryMovementsList(limit: number = 20): UseInventoryMovementsListResult {
  const { organizationId, user } = useSupabaseAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    if (!organizationId) {
      console.log('[MovementsList] No organization_id, skipping fetch');
      setMovements([]);
      setIsLoading(false);
      return;
    }

    if (!user) {
      console.log('[MovementsList] No user, skipping fetch');
      setMovements([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('[MovementsList] Fetching movements for org:', organizationId);

      const { data, error: queryError } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          organization_id,
          product_id,
          movement_type,
          delta,
          notes,
          created_by,
          created_at,
          products:product_id (name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (queryError) {
        console.error('[MovementsList] Query error:', queryError);
        setError(`Error RLS: ${queryError.message} (code: ${queryError.code})`);
        setMovements([]);
        return;
      }

      console.log('[MovementsList] Fetched:', data?.length ?? 0, 'movements');
      
      // Transform the data to flatten the product relationship
      const transformedData = (data ?? []).map((item: any) => ({
        ...item,
        product: item.products ? { name: item.products.name } : undefined,
      }));
      
      setMovements(transformedData);
    } catch (err) {
      console.error('[MovementsList] Unexpected error:', err);
      setError('Error inesperado al cargar movimientos');
      setMovements([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, user, limit]);

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
