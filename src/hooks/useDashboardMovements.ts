import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client.browser';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export interface DashboardMovement {
  id: string;
  productName: string;
  movementType: 'in' | 'out' | 'adjust';
  delta: number;
  createdAt: string;
  createdBy: string;
}

interface UseDashboardMovementsResult {
  movements: DashboardMovement[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardMovements(limit: number = 15): UseDashboardMovementsResult {
  const { organizationId, user } = useSupabaseAuth();
  const [movements, setMovements] = useState<DashboardMovement[]>([]);
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
          id,
          movement_type,
          delta,
          created_at,
          created_by,
          products!inner (name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (queryError) throw queryError;

      const mapped: DashboardMovement[] = (data || []).map((row: any) => ({
        id: row.id,
        productName: row.products?.name || 'Producto desconocido',
        movementType: row.movement_type as 'in' | 'out' | 'adjust',
        delta: row.delta,
        createdAt: row.created_at,
        createdBy: row.created_by,
      }));

      setMovements(mapped);
    } catch (err) {
      console.error('[DashboardMovements] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, user, limit]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return { movements, isLoading, error, refetch: fetchMovements };
}
