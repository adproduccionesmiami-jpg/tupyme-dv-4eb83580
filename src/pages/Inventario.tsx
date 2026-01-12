import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useInventory } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductFormats } from '@/hooks/useProductFormats';
import { toast } from 'sonner';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';

// New Modular Components
import { InventoryHeader } from '@/components/inventory/InventoryHeader';
import { ProductTable } from '@/components/inventory/ProductTable';
import { ProductForm } from '@/components/inventory/ProductForm';

// Types and Utils
import {
  Product,
  FilterType,
} from '@/types/inventory';
import {
  exportToCSV,
  downloadTemplateCSV,
  downloadTemplateXLSX,
  parseCSV,
  parseXLSX,
  processImportData,
  getStockStatus
} from '@/utils/inventory-io';

export default function Inventario() {
  const [searchParams] = useSearchParams();
  const { products, isLoading, updateProduct, addProduct, deleteProduct: deleteProductFromContext, setProducts } = useInventory();
  const { user } = useAuth();
  const { data: productFormats = [] } = useProductFormats();

  // Search and Filter State
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>((searchParams.get('filter') as FilterType) || 'todos');

  // Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProductState, setDeleteProductState] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showErrorsDialog, setShowErrorsDialog] = useState(false);

  // Sync filter from URL
  useEffect(() => {
    const filter = searchParams.get('filter') as FilterType;
    if (filter) setActiveFilter(filter);
  }, [searchParams]);

  // Logic: Filtering
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.nombre.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.categoria.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const status = getStockStatus(product);
    switch (activeFilter) {
      case 'poco-stock': return status.label === 'Poco stock';
      case 'sin-stock': return status.label === 'Sin stock';
      case 'sobre-stock': return status.label === 'Sobre stock';
      case 'mas-vendidos': return product.vendidos > 50;
      default: return true;
    }
  });

  // Handlers: Product Management
  const handleOpenDialog = (product?: Product) => {
    setEditingProduct(product || null);
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (formData: any) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          nombre: formData.nombre,
          sku: formData.sku,
          categoryId: formData.categoryId,
          brandId: formData.brandId,
          presentacion: formData.presentacion,
          stock: formData.stock,
          costo: formData.costo,
          precio: formData.precio,
          categoria: formData.categoria ?? editingProduct.categoria,
          minStock: formData.minStock,
          maxStock: formData.maxStock,
          expirationDate: formData.expirationDate || undefined,
        });
        toast.success('Producto actualizado');
        handleCloseDialog();
        return;
      }

      await addProduct({
        sku: formData.sku,
        nombre: formData.nombre,
        presentacion: formData.presentacion,
        stock: formData.stock,
        costo: formData.costo,
        precio: formData.precio,
        categoria: formData.categoria ?? 'Sin categoría',
        categoryId: formData.categoryId,
        brandId: formData.brandId,
        minStock: formData.minStock,
        maxStock: formData.maxStock,
        expirationDate: formData.expirationDate || undefined,
      });

      toast.success('Producto agregado');
      handleCloseDialog();
    } catch (error) {
      toast.error('Error al guardar el producto');
      console.error(error);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductState) return;
    setIsDeleting(true);
    try {
      await deleteProductFromContext(deleteProductState.id);
      toast.success('Producto eliminado');
      setDeleteProductState(null);
    } catch (error) {
      toast.error('Error al eliminar el producto');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handlers: Import/Export
  const handleDownloadInventory = () => {
    exportToCSV(products);
    toast.success('Inventario descargado', { description: 'Archivo CSV generado con éxito.' });
  };

  const handleExecuteImport = async (mode: 'add' | 'replace') => {
    if (!pendingImportFile) return;
    setImportDialogOpen(false);

    try {
      let data: Record<string, any>[];
      const ext = pendingImportFile.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        const text = await pendingImportFile.text();
        data = parseCSV(text);
      } else {
        data = await parseXLSX(pendingImportFile);
      }

      if (!data || data.length === 0) {
        toast.error('Archivo vacío');
        return;
      }

      const { newProducts, errorMessages } = processImportData(data, mode, products);

      if (newProducts.length > 0) {
        if (mode === 'replace') setProducts(newProducts);
        else setProducts([...newProducts, ...products]);
        toast.success(`${newProducts.length} productos importados`);
      }

      if (errorMessages.length > 0) {
        setImportErrors(errorMessages);
        setShowErrorsDialog(true);
      }
    } catch (err) {
      toast.error('Error al importar');
    } finally {
      setPendingImportFile(null);
    }
  };

  const stats = {
    total: products.length,
    pocoStock: products.filter(p => getStockStatus(p).label === 'Poco stock').length,
    sinStock: products.filter(p => p.stock === 0).length,
  };

  return (
    <AppLayout title="Inventario">
      <InventoryHeader
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddProduct={() => handleOpenDialog()}
        onDownloadInventory={handleDownloadInventory}
        onDownloadTemplateCSV={downloadTemplateCSV}
        onDownloadTemplateXLSX={() => downloadTemplateXLSX(productFormats)}
        onUploadClick={() => fileInputRef.current?.click()}
        canAdd={true}
        canDownload={true}
        canUpload={true}
        stats={stats}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPendingImportFile(file);
            setImportDialogOpen(true);
          }
        }}
      />

      <ProductTable
        products={filteredProducts}
        canEdit={true}
        onEdit={handleOpenDialog}
        onDelete={setDeleteProductState}
      />

      {/* Dialogs */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        {isOpen && (
          <ProductForm
            editingProduct={editingProduct}
            onSave={handleSaveProduct}
            onCancel={handleCloseDialog}
          />
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProductState} onOpenChange={(open) => !open && !isDeleting && setDeleteProductState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>{deleteProductState?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Mode Selection */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cómo deseas importar?</AlertDialogTitle>
            <AlertDialogDescription>
              Se encontró el archivo <strong>{pendingImportFile?.name}</strong>. Elige una opción:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingImportFile(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleExecuteImport('add')}>Añadir</AlertDialogAction>
            <AlertDialogAction onClick={() => handleExecuteImport('replace')} className="bg-destructive">Reemplazar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Errors */}
      <Dialog open={showErrorsDialog} onOpenChange={setShowErrorsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Errores de importación
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] rounded border p-4">
            {importErrors.map((error, idx) => (
              <div key={idx} className="text-sm p-2 bg-destructive/10 rounded text-destructive mb-2">
                {error}
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
