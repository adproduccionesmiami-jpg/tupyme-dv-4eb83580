import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Package, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import {
    Product,
    FORMATO_OPTIONS,
    isCategoriaPerecederera
} from '@/types/inventory';
import { useCategories } from '@/hooks/useCategories';
import { useProductFormats } from '@/hooks/useProductFormats';

interface ProductFormProps {
    editingProduct: Product | null;
    onSave: (data: any) => void;
    onCancel: () => void;
}

export function ProductForm({ editingProduct, onSave, onCancel }: ProductFormProps) {
    const { data: categories = [], isLoading: loadingCats } = useCategories();
    const { data: formats = [], isLoading: loadingFormats } = useProductFormats();

    const [formData, setFormData] = useState({
        sku: editingProduct?.sku || '',
        nombre: editingProduct?.nombre || '',
        presentacion: editingProduct?.presentacion || 'Unidad',
        stock: editingProduct?.stock.toString() || '0',
        costo: editingProduct?.costo.toString() || '0',
        precio: editingProduct?.precio.toString() || '0',
        categoria: editingProduct?.categoria || '',
        categoryId: editingProduct?.categoryId || '',
        minStock: editingProduct?.minStock?.toString() || '10',
        maxStock: editingProduct?.maxStock?.toString() || '100',
        expirationDate: editingProduct?.expirationDate || '',
    });
    const [formError, setFormError] = useState('');

    const isPerishable = useMemo(() => {
        const cat = categories.find(c => c.id === formData.categoryId);
        return cat ? isCategoriaPerecederera(cat.name) : false;
    }, [formData.categoryId, categories]);

    const handleSave = () => {
        if (!formData.sku || !formData.nombre || !formData.precio || !formData.categoryId) {
            setFormError('Por favor completa los campos requeridos (SKU, Nombre, Precio, Categoría).');
            return;
        }

        if (isPerishable && !formData.expirationDate) {
            setFormError('Fecha de vencimiento requerida para esta categoría.');
            return;
        }

        const minStock = formData.minStock ? parseInt(formData.minStock) : undefined;
        const maxStock = formData.maxStock ? parseInt(formData.maxStock) : undefined;

        if (minStock !== undefined && maxStock !== undefined && maxStock <= minStock) {
            setFormError('El stock máximo debe ser mayor que el stock mínimo');
            return;
        }

        onSave({
            ...formData,
            stock: parseInt(formData.stock) || 0,
            costo: parseFloat(formData.costo) || 0,
            precio: parseFloat(formData.precio) || 0,
            minStock,
            maxStock,
        });
    };

    // TODO:DATA - categories comes from Supabase. If empty, show placeholder.
    const hasCategories = categories.length > 0;

    return (
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-hidden rounded-xl border-border/50 shadow-xl bg-card p-0">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/50">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Package className="w-5 h-5" />
                        </div>
                        {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        {editingProduct
                            ? 'Modifica los datos del producto.'
                            : 'Ingresa la información del nuevo producto.'
                        }
                    </DialogDescription>
                </DialogHeader>
            </div>

            {/* Form Content */}
            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* SKU & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="sku" className="text-xs font-semibold text-muted-foreground">
                            SKU / Código *
                        </Label>
                        <Input
                            id="sku"
                            placeholder="PRO-001"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            className="h-10 bg-muted/30 border-border/50 font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground">
                            Nombre *
                        </Label>
                        <Input
                            id="nombre"
                            placeholder="Ej: Aceite de Girasol 1L"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="h-10 bg-muted/30 border-border/50 text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Category & Format */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">
                            Categoría *
                        </Label>
                        <Select
                            value={formData.categoryId}
                            onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                            disabled={loadingCats}
                        >
                            <SelectTrigger className="h-10 bg-muted/30 border-border/50 text-sm">
                                {loadingCats ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <SelectValue placeholder={hasCategories ? "Selecciona..." : "Sin datos"} />
                                )}
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {hasCategories ? (
                                    categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id} className="text-sm">
                                            {cat.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    // TODO:DATA - Placeholder when no categories
                                    <SelectItem value="__placeholder__" disabled className="text-sm text-muted-foreground">
                                        Sin datos disponibles
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">
                            Formato
                        </Label>
                        <Select
                            value={formData.presentacion}
                            onValueChange={(value) => setFormData({ ...formData, presentacion: value })}
                        >
                            <SelectTrigger className="h-10 bg-muted/30 border-border/50 text-sm">
                                {loadingFormats ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <SelectValue placeholder="Formato..." />
                                )}
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border max-h-[200px]">
                                {FORMATO_OPTIONS.map((formato) => (
                                    <SelectItem key={formato} value={formato} className="text-sm">
                                        {formato}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Stock Controls */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Control de Stock
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="stock" className="text-xs text-muted-foreground">
                                Stock actual
                            </Label>
                            <Input
                                id="stock"
                                type="number"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                className="h-10 bg-background border-border/50 text-center font-bold text-lg"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="minStock" className="text-xs text-muted-foreground">
                                Stock mínimo
                            </Label>
                            <Input
                                id="minStock"
                                type="number"
                                value={formData.minStock}
                                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                                className="h-10 bg-background border-border/50 text-center text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="maxStock" className="text-xs text-muted-foreground">
                                Stock máximo
                            </Label>
                            <Input
                                id="maxStock"
                                type="number"
                                value={formData.maxStock}
                                onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                                className="h-10 bg-background border-border/50 text-center text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="costo" className="text-xs font-semibold text-muted-foreground">
                            Costo ($)
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                                id="costo"
                                type="number"
                                step="0.01"
                                value={formData.costo}
                                onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                                className="h-10 bg-muted/30 border-border/50 pl-7 text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="precio" className="text-xs font-semibold text-muted-foreground">
                            Precio venta ($) *
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-sm font-semibold">$</span>
                            <Input
                                id="precio"
                                type="number"
                                step="0.01"
                                value={formData.precio}
                                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                                className="h-10 bg-primary/5 border-primary/30 pl-7 text-sm font-semibold"
                            />
                        </div>
                    </div>
                </div>

                {/* Expiration Date */}
                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 border-dashed space-y-2">
                    <Label htmlFor="expirationDate" className="text-xs font-semibold text-amber-500/80 flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Fecha de vencimiento
                        {isPerishable && <span className="text-amber-500">*</span>}
                    </Label>
                    <Input
                        id="expirationDate"
                        type="date"
                        value={formData.expirationDate}
                        onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                        className="h-10 bg-background border-border/50 text-sm"
                    />
                    {isPerishable && !formData.expirationDate && (
                        <p className="text-xs text-amber-500 font-medium">
                            Requerido para productos de esta categoría
                        </p>
                    )}
                </div>

                {/* Error */}
                {formError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center">
                        {formError}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/30 border-t border-border/50 flex gap-3">
                <Button 
                    variant="ghost" 
                    onClick={onCancel} 
                    className="flex-1 h-10 text-sm font-medium"
                >
                    Cancelar
                </Button>
                <Button 
                    onClick={handleSave} 
                    className="flex-[1.5] h-10 text-sm font-semibold"
                >
                    {editingProduct ? 'Guardar cambios' : 'Agregar producto'}
                </Button>
            </div>
        </DialogContent>
    );
}