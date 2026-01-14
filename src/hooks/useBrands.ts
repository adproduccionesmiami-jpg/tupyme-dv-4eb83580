import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client.browser';

export interface Brand {
    id: string;
    name: string;
    is_active: boolean;
}

export function useBrands() {
    return useQuery({
        queryKey: ['brands'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('brands')
                .select('*')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching brands:', error);
                return [];
            }

            return data as Brand[];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}
