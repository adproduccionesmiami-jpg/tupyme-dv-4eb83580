import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Pencil,
    Trash2,
    Package,
    Wheat,
    Milk,
    CupSoda,
    Drumstick,
    Croissant,
    Cookie,
    Soup,
    Coffee,
    Droplets,
    Egg,
    Salad,
    Utensils,
    Snowflake,
    Box
} from 'lucide-react';
import { Product } from '@/types/inventory';
import { getStockStatus } from '@/utils/inventory-io';
import { useCategories } from '@/hooks/useCategories';

interface ProductTableProps {
    products: Product[];
    isLoading?: boolean;
    canEdit: boolean;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}

const getCategoryIcon = (categoria: string) => {
    const iconClass = "w-6 h-6 text-muted-foreground/70";
    switch (categoria.toLowerCase()) {
        case 'granos':
        case 'cereales':
            return <Wheat className={iconClass} />;
        case 'lácteos':
        case 'lacteos':
            return <Milk className={iconClass} />;
        case 'bebidas':
            return <CupSoda className={iconClass} />;
        case 'embutidos':
            return <Drumstick className={iconClass} />;
        case 'panadería':
        case 'panaderia':
            return <Croissant className={iconClass} />;
        case 'snacks':
            return <Cookie className={iconClass} />;
        case 'enlatados':
            return <Soup className={iconClass} />;
        case 'café':
        case 'cafe':
            return <Coffee className={iconClass} />;
        case 'aceites':
            return <Droplets className={iconClass} />;
        case 'huevos':
            return <Egg className={iconClass} />;
        case 'condimentos':
        case 'salsas':
            return <Salad className={iconClass} />;
        case 'pastas':
        case 'abarrotes':
            return <Utensils className={iconClass} />;
        case 'congelados':
            return <Snowflake className={iconClass} />;
        default:
            return <Box className={iconClass} />;
    }
};

export function ProductTable({ products, isLoading, canEdit, onEdit, onDelete }: ProductTableProps) {
    const { data: categories = [] } = useCategories();

    if (isLoading) {
        return (
            <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-2xl bg-card/50 p-4 border border-border/40 animate-pulse">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-14 h-14 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <div className="flex gap-8 items-center">
                                <Skeleton className="h-8 w-16 hidden sm:block" />
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-8 w-20" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="rounded-3xl bg-card/30 backdrop-blur-sm p-16 flex items-center justify-center border border-dashed border-border/40 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-xs text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-2">
                        <Package className="w-10 h-10 text-primary/40" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground text-lg">No se encontraron productos</p>
                        <p className="text-sm mt-1">Intenta con otro término de búsqueda o agrega un nuevo producto para comenzar.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {products.map((product) => {
                const status = getStockStatus(product);
                const categoryName = categories.find(c => c.id === product.categoryId)?.name || product.categoria;

                return (
                    <div
                        key={product.id}
                        className="group relative rounded-2xl bg-card/60 backdrop-blur-[2px] p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/[0.03] hover:-translate-y-1 border border-border/40 hover:border-primary/20"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Product Info */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                {/* Category Icon */}
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center shrink-0 border border-border/20 shadow-inner group-hover:scale-105 transition-transform duration-300">
                                    {getCategoryIcon(categoryName)}
                                </div>

                                {/* Name & Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-foreground line-clamp-1 flex-1 min-w-0 tracking-tight text-base sm:text-lg">{product.nombre}</h3>
                                        <Badge className="font-black text-[9px] uppercase tracking-tighter shrink-0 bg-primary/10 text-primary border-primary/20">
                                            {categoryName}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                        <span className="bg-muted/30 px-2 py-0.5 rounded-md">{product.presentacion}</span>
                                        <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                                        <span className="font-mono text-xs text-primary/70">{product.sku}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-8 pl-0 sm:pl-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/20">
                                {/* Cost */}
                                <div className="hidden xl:block text-right">
                                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-black mb-1">Costo</p>
                                    <p className="text-sm font-medium text-muted-foreground/80 tabular-nums">${product.costo.toFixed(2)}</p>
                                </div>

                                {/* Price */}
                                <div className="text-right">
                                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-black mb-1">Precio</p>
                                    <p className="font-bold text-primary tabular-nums">${product.precio.toFixed(2)}</p>
                                </div>

                                {/* Stock */}
                                <div className="text-center min-w-[70px]">
                                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-black mb-1">Disponibilidad</p>
                                    <p className={`font-black text-xl tabular-nums tracking-tighter ${product.stock === 0
                                        ? 'text-destructive'
                                        : product.stock <= (product.minStock ?? 10)
                                            ? 'text-amber-500'
                                            : 'text-foreground'
                                        }`}>
                                        {product.stock}
                                    </p>
                                </div>

                                {/* Status Badge */}
                                <div className="min-w-[100px] hidden sm:block">
                                    <Badge
                                        className={`
                                            w-full justify-center font-bold text-[10px] uppercase tracking-wider py-1
                                            ${status.variant === 'success' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}
                                            ${status.variant === 'warning' && 'bg-amber-500/10 text-amber-600 border-amber-500/20'}
                                            ${status.variant === 'destructive' && 'bg-rose-500/10 text-rose-600 border-rose-500/20'}
                                        `}
                                    >
                                        {status.label}
                                    </Badge>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {canEdit && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(product)}
                                                className="h-10 w-10 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-sm"
                                                title="Editar Producto"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDelete(product)}
                                                className="h-10 w-10 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 shadow-sm"
                                                title="Eliminar Producto"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
