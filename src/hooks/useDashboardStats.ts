import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client.browser';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export interface DashboardStats {
  productosActivos: number;
  totalProductos: number;
  valorTotalCosto: number;
  valorTotalPrecio: number;
  movimientosHoy: number;
  entradasHoy: number;
  salidasHoy: number;
  ajustesHoy: number;
}

interface UseDashboardStatsResult {
  stats: DashboardStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultStats: DashboardStats = {
  productosActivos: 0,
  totalProductos: 0,
  valorTotalCosto: 0,
  valorTotalPrecio: 0,
  movimientosHoy: 0,
  entradasHoy: 0,
  salidasHoy: 0,
  ajustesHoy: 0,
};

export function useDashboardStats(): UseDashboardStatsResult {
  const { organizationId, user } = useSupabaseAuth();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!organizationId || !user) {
      setStats(defaultStats);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch products for this org
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, stock, cost, price, is_active')
        .eq('organization_id', organizationId);

      if (prodError) throw prodError;

      // Calculate product stats
      const allProducts = products || [];
      // "Productos activos" = productos con stock disponible (>0)
      const activeProducts = allProducts.filter(p => (p.stock || 0) > 0);
      
      const valorTotalCosto = activeProducts.reduce(
        (acc, p) => acc + ((p.stock || 0) * (Number(p.cost) || 0)), 
        0
      );
      const valorTotalPrecio = activeProducts.reduce(
        (acc, p) => acc + ((p.stock || 0) * (Number(p.price) || 0)), 
        0
      );

      // Get today's date range in user's timezone
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      // Fetch movements for today
      const { data: movements, error: movError } = await supabase
        .from('inventory_movements')
        .select('id, movement_type, delta')
        .eq('organization_id', organizationId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      if (movError) throw movError;

      const todayMovements = movements || [];
      const entradasHoy = todayMovements.filter(m => m.movement_type === 'in').length;
      const salidasHoy = todayMovements.filter(m => m.movement_type === 'out').length;
      const ajustesHoy = todayMovements.filter(m => m.movement_type === 'adjust').length;

      setStats({
        productosActivos: activeProducts.length,
        totalProductos: allProducts.length,
        valorTotalCosto,
        valorTotalPrecio,
        movimientosHoy: todayMovements.length,
        entradasHoy,
        salidasHoy,
        ajustesHoy,
      });
    } catch (err) {
      console.error('[DashboardStats] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}
