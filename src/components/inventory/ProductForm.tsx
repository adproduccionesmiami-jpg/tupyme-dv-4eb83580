import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { useBrands } from '@/hooks/useBrands';
import { useProductFormats } from '@/hooks/useProductFormats';

interface ProductFormProps {
    editingProduct: Product | null;
    onSave: (data: any) => void;
    onCancel: () => void;
}

export function ProductForm({ editingProduct, onSave, onCancel }: ProductFormProps) {
    const { data: categories = [], isLoading: loadingCats } = useCategories();
    const { data: brands = [], isLoading: loadingBrands } = useBrands();
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
        brandId: editingProduct?.brandId || '',
        minStock: editingProduct?.minStock?.toString() || '10',
        maxStock: editingProduct?.maxStock?.toString() || '100',
        expirationDate: editingProduct?.expirationDate || '',
    });
    const [formError, setFormError] = useState('');

    const isPerishable = useMemo(() => {
        const cat = categories.find(c => c.id === formData.categoryId);
        return cat ? isCategoriaPerecederera(cat.nombre) : false;
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

    return (
        <DialogContent className="sm:max-w-[700px] overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-background/95 backdrop-blur-xl p-0">
            <div className="bg-primary/5 p-8 border-b border-primary/10">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="flex items-center gap-4 text-3xl font-black tracking-tighter">
                        <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <Package className="w-7 h-7" />
                        </div>
                        {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground/80 font-semibold text-sm">
                        {editingProduct
                            ? 'Modifica los parámetros técnicos del registro.'
                            : 'Define la información base para el nuevo ítem de inventario.'
                        }
                    </DialogDescription>
                </DialogHeader>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* ID Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                        <Label htmlFor="sku" className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">SKU / CÓDIGO BARRAS *</Label>
                        <Input
                            id="sku"
                            placeholder="PRO-001"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            className="h-14 bg-muted/20 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl transition-all font-mono text-lg px-5"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <Label htmlFor="nombre" className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">NOMBRE COMERCIAL *</Label>
                        <Input
                            id="nombre"
                            placeholder="Ej: Aceite de Girasol 1L"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="h-14 bg-muted/20 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl transition-all font-bold text-lg px-5"
                        />
                    </div>
                </div>

                {/* Categorization Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2.5">
                        <Label className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">CATEGORÍA *</Label>
                        <Select
                            value={formData.categoryId}
                            onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                        >
                            <SelectTrigger className="h-14 bg-muted/20 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl px-5">
                                {loadingCats ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <SelectValue placeholder="Categoría..." />}
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/40 backdrop-blur-3xl shadow-2xl">
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id} className="rounded-xl py-3 focus:bg-primary/10">{cat.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">MARCA</Label>
                        <Select
                            value={formData.brandId}
                            onValueChange={(value) => setFormData({ ...formData, brandId: value })}
                        >
                            <SelectTrigger className="h-14 bg-muted/20 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl px-5">
                                {loadingBrands ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <SelectValue placeholder="Marca..." />}
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/40 backdrop-blur-3xl shadow-2xl">
                                {brands.map((brand) => (
                                    <SelectItem key={brand.id} value={brand.id} className="rounded-xl py-3 focus:bg-primary/10">{brand.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">FORMATO</Label>
                        <Select
                            value={formData.presentacion}
                            onValueChange={(value) => setFormData({ ...formData, presentacion: value })}
                        >
                            <SelectTrigger className="h-14 bg-muted/20 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl px-5">
                                {loadingFormats ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <SelectValue placeholder="Formato..." />}
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/40 backdrop-blur-3xl shadow-2xl overflow-y-auto max-h-[300px]">
                                {FORMATO_OPTIONS.map((formato) => (
                                    <SelectItem key={formato} value={formato} className="rounded-xl py-2 focus:bg-primary/10">{formato}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Stock Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-[2rem] bg-primary/5 border-2 border-primary/10 shadow-inner">
                    <div className="space-y-2.5">
                        <Label htmlFor="stock" className="text-[11px] uppercase font-black tracking-[0.2em] text-primary/70 ml-1">STOCK ACTUAL</Label>
                        <Input
                            id="stock"
                            type="number"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            className="h-14 bg-background border-2 border-primary/20 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all text-center font-black text-2xl text-primary"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <Label htmlFor="minStock" className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">MÍN. (ALERTA)</Label>
                        <Input
                            id="minStock"
                            type="number"
                            value={formData.minStock}
                            onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                            className="h-14 bg-background/50 border-2 border-transparent focus:border-amber-500/20 rounded-2xl text-center font-bold text-lg"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <Label htmlFor="maxStock" className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">MÁX. (REPOSICIÓN)</Label>
                        <Input
                            id="maxStock"
                            type="number"
                            value={formData.maxStock}
                            onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                            className="h-14 bg-background/50 border-2 border-transparent focus:border-blue-500/20 rounded-2xl text-center font-bold text-lg"
                        />
                    </div>
                </div>

                {/* Pricing Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                        <Label htmlFor="costo" className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">COSTO UNITARIO ($)</Label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 font-black text-lg group-focus-within:text-primary transition-colors">$</div>
                            <Input
                                id="costo"
                                type="number"
                                step="0.01"
                                value={formData.costo}
                                onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                                className="h-14 bg-muted/20 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl pl-10 pr-5 transition-all text-lg font-bold"
                            />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <Label htmlFor="precio" className="text-[11px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 ml-1">PRECIO VENTA ($) *</Label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-xl">$</div>
                            <Input
                                id="precio"
                                type="number"
                                step="0.01"
                                value={formData.precio}
                                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                                className="h-14 bg-primary/5 border-2 border-primary/20 focus:border-primary focus:bg-background rounded-2xl pl-10 pr-5 transition-all text-xl font-black text-foreground shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Expiration Section */}
                <div className="p-6 rounded-[2rem] bg-rose-500/5 border-2 border-dashed border-rose-500/10 space-y-4">
                    <Label htmlFor="expirationDate" className="text-[11px] uppercase font-black tracking-[0.2em] text-rose-600/60 ml-1 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        FECHA DE VENCIMIENTO
                        {isPerishable && <span className="text-rose-600 font-black text-lg">*</span>}
                    </Label>
                    <Input
                        id="expirationDate"
                        type="date"
                        value={formData.expirationDate}
                        onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                        className="h-14 bg-background border-2 border-transparent focus:border-rose-500/20 rounded-2xl px-5 transition-all text-lg"
                    />
                    {isPerishable && !formData.expirationDate && (
                        <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest px-1">Atención: Requerido para productos de esta categoría</p>
                    )}
                </div>

                {formError && (
                    <div className="p-5 rounded-2xl bg-destructive/10 border-2 border-destructive/20 text-destructive text-sm font-black text-center animate-in fade-in slide-in-from-bottom-2">
                        {formError}
                    </div>
                )}
            </div>

            <div className="p-8 bg-muted/10 border-t border-border/40 flex flex-col sm:flex-row gap-4">
                <Button variant="ghost" onClick={onCancel} className="h-14 flex-1 rounded-2xl font-bold text-muted-foreground hover:bg-muted/50 transition-all text-base">
                    Cancelar
                </Button>
                <Button onClick={handleSave} className="h-14 flex-[1.5] rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 text-lg">
                    {editingProduct ? 'Guardar Cambios' : 'Registrar en Inventario'}
                </Button>
            </div>
        </DialogContent>
    );
}
