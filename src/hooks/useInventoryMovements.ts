import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';

// ALIGNED with Supabase enum public.movement_type: 'in', 'out', 'adjust'
export type MovementType = 'in' | 'out' | 'adjust';

export interface CreateMovementParams {
  product_id: string;
  movement_type: MovementType;
  delta: number;
  notes?: string;
}

interface UseInventoryMovementsResult {
  isCreating: boolean;
  createMovement: (params: CreateMovementParams) => Promise<{ success: boolean; error?: string }>;
}

export function useInventoryMovements(): UseInventoryMovementsResult {
  const { organizationId, user } = useSupabaseAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createMovement = useCallback(async (params: CreateMovementParams): Promise<{ success: boolean; error?: string }> => {
    if (!organizationId) {
      return { success: false, error: 'No hay organización activa' };
    }

    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      setIsCreating(true);
      console.log('[Movements] Creating movement:', {
        organization_id: organizationId,
        created_by: user.id,
        ...params,
      });

      const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
          organization_id: organizationId,
          product_id: params.product_id,
          movement_type: params.movement_type,
          delta: params.delta,
          notes: params.notes ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('[Movements] Insert error:', error);
        return { 
          success: false, 
          error: `Error RLS: ${error.message} (code: ${error.code})` 
        };
      }

      console.log('[Movements] Created successfully:', data);
      toast.success('Movimiento creado', {
        description: `ID: ${data.id}`,
      });
      return { success: true };
    } catch (err) {
      console.error('[Movements] Unexpected error:', err);
      return { success: false, error: 'Error inesperado al crear movimiento' };
    } finally {
      setIsCreating(false);
    }
  }, [organizationId, user]);

  return {
    isCreating,
    createMovement,
  };
}
