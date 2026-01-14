import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Package,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export function ProductTable({ products, isLoading, canEdit, onEdit, onDelete }: ProductTableProps) {
    const { data: categories = [] } = useCategories();

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="glass-card rounded-lg p-4 animate-pulse">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-10 h-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <Skeleton className="h-6 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="glass-card rounded-xl p-12 flex items-center justify-center border-dashed">
                <div className="flex flex-col items-center gap-3 text-muted-foreground max-w-xs text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">No se encontraron productos</p>
                        <p className="text-sm mt-1">Intenta con otro término de búsqueda o agrega un nuevo producto.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2 animate-fade-in">
            {/* Table Header - Desktop */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Producto</div>
                <div className="col-span-2">SKU</div>
                <div className="col-span-1 text-right">Costo</div>
                <div className="col-span-1 text-right">Precio</div>
                <div className="col-span-1 text-center">Stock</div>
                <div className="col-span-2 text-center">Estado</div>
                <div className="col-span-1 text-right">Acciones</div>
            </div>

            {/* Product Rows */}
            {products.map((product) => {
                const status = getStockStatus(product);
                const categoryName = categories.find(c => c.id === product.categoryId)?.name || product.categoria;

                return (
                    <div
                        key={product.id}
                        className="glass-card rounded-lg p-4 transition-all duration-200 hover:shadow-card-elevated hover:border-primary/20"
                    >
                        {/* Mobile Layout */}
                        <div className="lg:hidden space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-foreground truncate">{product.nombre}</h3>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <span className="bg-muted/50 px-2 py-0.5 rounded">{product.presentacion}</span>
                                        <span>·</span>
                                        <span className="font-mono">{product.sku}</span>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                    {categoryName}
                                </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <div className="flex items-center gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground text-xs">Precio: </span>
                                        <span className="font-semibold text-primary">${product.precio.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs">Stock: </span>
                                        <span className={`font-bold ${
                                            product.stock === 0 ? 'text-destructive' :
                                            product.stock <= (product.minStock ?? 10) ? 'text-warning' : 'text-foreground'
                                        }`}>{product.stock}</span>
                                    </div>
                                </div>
                                
                                {canEdit && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(product)} className="gap-2">
                                                <Pencil className="w-4 h-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onDelete(product)} className="gap-2 text-destructive focus:text-destructive">
                                                <Trash2 className="w-4 h-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                            {/* Product Name & Category */}
                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-foreground truncate">{product.nombre}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-muted-foreground">{product.presentacion}</span>
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                            {categoryName}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* SKU */}
                            <div className="col-span-2">
                                <span className="font-mono text-sm text-muted-foreground">{product.sku}</span>
                            </div>

                            {/* Cost */}
                            <div className="col-span-1 text-right">
                                <span className="text-sm text-muted-foreground tabular-nums">${product.costo.toFixed(2)}</span>
                            </div>

                            {/* Price */}
                            <div className="col-span-1 text-right">
                                <span className="font-semibold text-primary tabular-nums">${product.precio.toFixed(2)}</span>
                            </div>

                            {/* Stock */}
                            <div className="col-span-1 text-center">
                                <span className={`font-bold text-lg tabular-nums ${
                                    product.stock === 0 ? 'text-destructive' :
                                    product.stock <= (product.minStock ?? 10) ? 'text-warning' : 'text-foreground'
                                }`}>
                                    {product.stock}
                                </span>
                            </div>

                            {/* Status */}
                            <div className="col-span-2 flex justify-center">
                                <Badge
                                    variant="outline"
                                    className={`text-xs font-medium px-2.5 py-0.5 ${
                                        status.variant === 'success' ? 'border-success/30 text-success bg-success/5' :
                                        status.variant === 'warning' ? 'border-warning/30 text-warning bg-warning/5' :
                                        'border-destructive/30 text-destructive bg-destructive/5'
                                    }`}
                                >
                                    {status.label}
                                </Badge>
                            </div>

                            {/* Actions */}
                            <div className="col-span-1 flex justify-end gap-1">
                                {canEdit && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit(product)}
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            title="Editar"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(product)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
