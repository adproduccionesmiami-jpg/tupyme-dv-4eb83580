import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductFormat {
  id: string;
  name: string;
  abbreviation: string | null;
  is_active: boolean;
  sort_order: number;
}

export function useProductFormats() {
  return useQuery({
    queryKey: ['product-formats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_formats')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching product formats:', error);
        // Return fallback formats if query fails
        return [
          { id: '1', name: 'Unidad', abbreviation: 'Ud', is_active: true, sort_order: 1 },
          { id: '2', name: 'Libra', abbreviation: 'Lb', is_active: true, sort_order: 2 },
          { id: '3', name: 'Kilogramo', abbreviation: 'Kg', is_active: true, sort_order: 3 },
          { id: '4', name: 'Paquete', abbreviation: 'Paq', is_active: true, sort_order: 4 },
          { id: '5', name: 'Caja', abbreviation: 'Caja', is_active: true, sort_order: 5 },
        ] as ProductFormat[];
      }

      return (data as ProductFormat[]) || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
