import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  Calendar,
  Plus,
  Package,
  User,
  Clock,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInventory } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { MovementType, Movement } from '@/types/inventory';
import { ROLE_LABELS, AppRole } from '@/lib/permissions';

// ============= HELPERS =============

const getMovementTypeConfig = (tipo: MovementType) => {
  switch (tipo) {
    case 'entrada':
      return { 
        label: 'Entrada', 
        icon: ArrowUpRight, 
        colorClass: 'bg-success/10 text-success border-success/20',
        iconColorClass: 'text-success',
        badgeClass: 'bg-success/10 text-success hover:bg-success/20 border-success/20'
      };
    case 'salida':
      return { 
        label: 'Salida', 
        icon: ArrowDownRight, 
        colorClass: 'bg-destructive/10 text-destructive border-destructive/20',
        iconColorClass: 'text-destructive',
        badgeClass: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20'
      };
    case 'ajuste':
      return { 
        label: 'Ajuste', 
        icon: RefreshCw, 
        colorClass: 'bg-warning/10 text-warning border-warning/20',
        iconColorClass: 'text-warning',
        badgeClass: 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/20'
      };
  }
};

// ============= COMPONENT =============

export default function Movimientos() {
  // Use shared context
  const { products, movements, addMovement } = useInventory();
  const { permissions, user, getRoleSnapshot } = useAuth();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [movementType, setMovementType] = useState<MovementType>('entrada');
  const [quantity, setQuantity] = useState<string>('');
  const [motivo, setMotivo] = useState('');

  // Permissions
  const canCreateMovements = permissions?.canCreateMovements ?? false;
  const canCreateAdjustments = permissions?.canCreateAdjustments ?? false;

  // Current user info
  const currentUser = user?.email || 'usuario@tupyme.com';

  // Get selected product
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find(p => p.id === parseInt(selectedProductId));
  }, [selectedProductId, products]);

  // Calculate resulting stock
  const resultingStock = useMemo(() => {
    if (!selectedProduct || !quantity) return null;
    const qty = parseInt(quantity) || 0;
    switch (movementType) {
      case 'entrada':
        return selectedProduct.stock + qty;
      case 'salida':
        return selectedProduct.stock - qty;
      case 'ajuste':
        return qty; // Ajuste sets the exact quantity
    }
  }, [selectedProduct, quantity, movementType]);

  // Validate stock
  const isStockValid = useMemo(() => {
    if (resultingStock === null) return true;
    return resultingStock >= 0;
  }, [resultingStock]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      // Search filter
      const matchesSearch = 
        m.productoNombre.toLowerCase().includes(search.toLowerCase()) ||
        m.productoSku.toLowerCase().includes(search.toLowerCase());
      
      // Type filter
      const matchesType = filterType === 'all' || m.tipo === filterType;
      
      // Date filters
      let matchesDateFrom = true;
      let matchesDateTo = true;
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        matchesDateFrom = m.fecha >= fromDate;
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDateTo = m.fecha <= toDate;
      }
      
      return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime()); // Most recent first
  }, [movements, search, filterType, dateFrom, dateTo]);

  // Summary stats - count of movement RECORDS (events), not sum of quantities
  const stats = useMemo(() => {
    const entradas = movements.filter(m => m.tipo === 'entrada').length;
    const salidas = movements.filter(m => m.tipo === 'salida').length;
    const ajustes = movements.filter(m => m.tipo === 'ajuste').length;
    const total = movements.length; // Total count of all movement records
    return { entradas, salidas, ajustes, total };
  }, [movements]);

  // Handlers
  const handleOpenRegister = () => {
    setSelectedProductId('');
    setMovementType('entrada');
    setQuantity('');
    setMotivo('');
    setIsRegisterOpen(true);
  };

  const handlePrepareConfirm = () => {
    // Validate required fields
    if (!selectedProductId) {
      toast.error('Selecciona un producto');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }
    if (movementType === 'ajuste' && !motivo.trim()) {
      toast.error('El motivo es obligatorio para ajustes');
      return;
    }
    if (!isStockValid) {
      toast.error('El stock resultante no puede ser negativo');
      return;
    }
    
    setIsConfirmOpen(true);
  };

  const handleConfirmMovement = () => {
    if (!selectedProduct || resultingStock === null) return;

    const qty = parseInt(quantity);
    
    // Use context's addMovement which also updates product stock
    addMovement({
      productoId: selectedProduct.id,
      productoNombre: selectedProduct.nombre,
      productoSku: selectedProduct.sku,
      productoCategoria: selectedProduct.categoria,
      productoPresentacion: selectedProduct.presentacion,
      tipo: movementType,
      cantidad: movementType === 'ajuste' ? Math.abs(selectedProduct.stock - qty) : qty,
      stockAntes: selectedProduct.stock,
      stockDespues: resultingStock,
      motivo: motivo.trim() || (movementType === 'entrada' ? 'Entrada de inventario' : 'Salida de inventario'),
      usuario: currentUser,
      usuarioRol: getRoleSnapshot(), // Snapshot current role at time of creation
    });

    // Close dialogs and reset form
    setIsConfirmOpen(false);
    setIsRegisterOpen(false);
    
    toast.success('Movimiento registrado', {
      description: `${getMovementTypeConfig(movementType).label} de ${qty} unidad(es) de ${selectedProduct.nombre}`
    });
  };

  return (
    <AppLayout title="Movimientos">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className={`border-border cursor-pointer transition-all hover:border-success/50 hover:shadow-md ${filterType === 'entrada' ? 'ring-2 ring-success border-success' : ''}`}
            onClick={() => setFilterType(filterType === 'entrada' ? 'all' : 'entrada')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-2xl font-bold text-foreground">{stats.entradas}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`border-border cursor-pointer transition-all hover:border-destructive/50 hover:shadow-md ${filterType === 'salida' ? 'ring-2 ring-destructive border-destructive' : ''}`}
            onClick={() => setFilterType(filterType === 'salida' ? 'all' : 'salida')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Salidas</p>
                <p className="text-2xl font-bold text-foreground">{stats.salidas}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`border-border cursor-pointer transition-all hover:border-warning/50 hover:shadow-md ${filterType === 'ajuste' ? 'ring-2 ring-warning border-warning' : ''}`}
            onClick={() => setFilterType(filterType === 'ajuste' ? 'all' : 'ajuste')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ajustes</p>
                <p className="text-2xl font-bold text-foreground">{stats.ajustes}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`border-border cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${filterType === 'all' ? 'ring-2 ring-primary border-primary' : ''}`}
            onClick={() => setFilterType('all')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Movimientos</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header with Action Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Historial de Movimientos</h2>
            <p className="text-sm text-muted-foreground">
              Registro de entradas, salidas y ajustes de inventario
            </p>
          </div>
          {canCreateMovements && (
            <Button size="lg" className="gap-2" onClick={handleOpenRegister}>
              <Plus className="w-4 h-4" />
              Registrar movimiento
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Search and Type filter row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto o SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="salida">Salidas</SelectItem>
                <SelectItem value="ajuste">Ajustes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 min-w-[130px] max-w-[160px]"
              placeholder="Desde"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 min-w-[130px] max-w-[160px]"
              placeholder="Hasta"
            />
          </div>
        </div>

        {/* Movements List */}
        <div className="space-y-3">
          {filteredMovements.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron movimientos</h3>
                <p className="text-sm text-muted-foreground">
                  Intenta con otro término de búsqueda o filtro
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMovements.map((movement) => {
              const typeConfig = getMovementTypeConfig(movement.tipo);
              const TypeIcon = typeConfig.icon;
              
              return (
                <Card key={movement.id} className="border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Type Icon */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.colorClass}`}>
                        <TypeIcon className={`w-6 h-6 ${typeConfig.iconColorClass}`} />
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground truncate">
                            {movement.productoNombre}
                          </h3>
                          <Badge variant="outline" className={typeConfig.badgeClass}>
                            {typeConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="font-mono text-xs">{movement.productoSku}</span>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {movement.productoCategoria}
                          </Badge>
                          <span className="text-xs">{movement.productoPresentacion}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {movement.usuarioRol || 'Admin'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(movement.fecha, "d MMM yyyy, HH:mm", { locale: es })}
                          </span>
                        </div>
                        {movement.motivo && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            "{movement.motivo}"
                          </p>
                        )}
                      </div>
                      
                      {/* Quantity & Stock Change */}
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cantidad</p>
                          <p className={`text-xl font-bold ${typeConfig.iconColorClass}`}>
                            {movement.tipo === 'entrada' ? '+' : movement.tipo === 'salida' ? '-' : '±'}
                            {movement.cantidad}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Antes</p>
                            <p className="font-medium text-foreground">{movement.stockAntes}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Después</p>
                            <p className="font-medium text-foreground">{movement.stockDespues}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="text-sm text-muted-foreground px-1">
          Mostrando {filteredMovements.length} de {stats.total} movimientos
        </div>
      </div>

      {/* Register Movement Modal */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              Registra una entrada, salida o ajuste de inventario
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Product Selector */}
            <div className="space-y-2">
              <Label htmlFor="product">Producto *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
                        <span>{product.nombre}</span>
                        <Badge variant="outline" className="ml-auto">
                          Stock: {product.stock}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Movement Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de movimiento *</Label>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-success" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="salida">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-destructive" />
                      Salida
                    </div>
                  </SelectItem>
                  {canCreateAdjustments && (
                    <SelectItem value="ajuste">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-warning" />
                        Ajuste (establecer cantidad exacta)
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {movementType === 'ajuste' ? 'Nuevo stock *' : 'Cantidad *'}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={movementType === 'ajuste' ? 'Cantidad exacta en inventario' : 'Cantidad a mover'}
              />
            </div>

            {/* Stock Preview */}
            {selectedProduct && quantity && (
              <Card className={`border ${isStockValid ? 'border-border' : 'border-destructive'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase">Stock actual</p>
                      <p className="text-lg font-bold text-foreground">{selectedProduct.stock}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase">Stock resultante</p>
                      <p className={`text-lg font-bold ${isStockValid ? 'text-foreground' : 'text-destructive'}`}>
                        {resultingStock}
                      </p>
                    </div>
                  </div>
                  {!isStockValid && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      El stock no puede ser negativo
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="motivo">
                Motivo {movementType === 'ajuste' ? '*' : '(opcional)'}
              </Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={movementType === 'ajuste' 
                  ? 'Describe el motivo del ajuste (obligatorio)'
                  : 'Describe el motivo del movimiento'
                }
                rows={3}
              />
            </div>

            {/* User & Date Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{currentUser}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(), "d MMM yyyy, HH:mm", { locale: es })}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePrepareConfirm} disabled={!isStockValid}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar movimiento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Estás a punto de registrar el siguiente movimiento:</p>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p><strong>Producto:</strong> {selectedProduct?.nombre}</p>
                  <p><strong>Tipo:</strong> {getMovementTypeConfig(movementType).label}</p>
                  <p><strong>Cantidad:</strong> {quantity}</p>
                  <p><strong>Stock:</strong> {selectedProduct?.stock} → {resultingStock}</p>
                  {motivo && <p><strong>Motivo:</strong> {motivo}</p>}
                </div>
                <p className="text-warning font-medium">
                  ⚠️ Este movimiento no podrá ser editado ni eliminado.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMovement}>
              Confirmar y registrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
