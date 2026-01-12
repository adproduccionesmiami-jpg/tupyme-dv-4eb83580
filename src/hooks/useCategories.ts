import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client.browser';

export interface Category {
    id: string;
    nombre: string;
    is_active: boolean;
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categorías' as any) // Using 'categorías' as seen in user screenshot
                .select('*')
                .eq('is_active', true)
                .order('nombre', { ascending: true });

            if (error) {
                console.error('Error fetching categories:', error);
                return [];
            }

            return data as Category[];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}
