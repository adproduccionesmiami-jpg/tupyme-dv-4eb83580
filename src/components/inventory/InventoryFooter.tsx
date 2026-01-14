import { useMemo } from 'react';
import { Product } from '@/types/inventory';

interface InventoryFooterProps {
    filteredCount: number;
    totalCount: number;
    products: Product[];
}

export function InventoryFooter({ filteredCount, totalCount, products }: InventoryFooterProps) {
    const totalCost = useMemo(() => {
        return products.reduce((sum, p) => sum + (p.costo * p.stock), 0);
    }, [products]);

    return (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 glass-card rounded-lg text-sm">
            <p className="text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{filteredCount}</span> de{' '}
                <span className="font-semibold text-foreground">{totalCount}</span> productos
            </p>
            <p className="text-muted-foreground">
                Valor total (costo):{' '}
                <span className="font-semibold text-foreground">
                    ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
            </p>
        </div>
    );
}
