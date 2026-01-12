import { AppLayout } from '@/components/layout/AppLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useProducts } from '@/hooks/useProducts';
import { useInventoryMovements } from '@/hooks/useInventoryMovements';
import { useInventoryMovementsList } from '@/hooks/useInventoryMovementsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Building2, User, Shield, Plus, RefreshCw, AlertCircle, CheckCircle, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SupabaseDashboard() {
  const { user, organization, membership, organizationId, userRole, isLoading: authLoading } = useSupabaseAuth();
  const { products, isLoading: productsLoading, error: productsError, refetch: refetchProducts, createProduct, isCreating: isCreatingProduct } = useProducts();
  const { createMovement, isCreating: isCreatingMovement } = useInventoryMovements();
  const { movements, isLoading: movementsLoading, error: movementsError, refetch: refetchMovements } = useInventoryMovementsList(20);
  
  const [productResult, setProductResult] = useState<{ success: boolean; message: string } | null>(null);
  const [movementResult, setMovementResult] = useState<{ success: boolean; message: string } | null>(null);

  // DEBUG: Log auth user info on every render
  console.log('[AUTH] user.id:', user?.id, 'email:', user?.email);
  console.log('[MEMBERSHIPS] membership:', membership, 'organizationId:', organizationId, 'userRole:', userRole);

  // Check if user can create products (admin or warehouse roles)
  // ALIGNED with Supabase enum: admin, cashier, seller, warehouse
  const canCreateProducts = userRole === 'admin' || userRole === 'warehouse';

  // Handle creating a demo product
  const handleCreateProduct = async () => {
    setProductResult(null);
    
    const result = await createProduct({
      name: `Producto Demo ${Date.now()}`,
      sku: `DEMO-${Math.floor(Math.random() * 10000)}`,
      unit_cost: 10.00,
      unit_price: 15.00,
      stock: 100,
      min_stock: 10,
    });

    if (result.success) {
      setProductResult({ success: true, message: `Producto "${result.product?.nombre}" creado exitosamente` });
      toast.success('Producto creado');
    } else {
      setProductResult({ success: false, message: result.error || 'Error desconocido' });
    }
  };

  // Handle creating a test movement
  const handleCreateMovement = async () => {
    setMovementResult(null);
    
    if (products.length === 0) {
      setMovementResult({ success: false, message: 'No hay productos. Crea un producto primero.' });
      return;
    }

    const firstProduct = products[0];
    const result = await createMovement({
      product_id: String(firstProduct.id),
      movement_type: 'in', // ALIGNED with Supabase enum: 'in', 'out', 'adjust'
      delta: 1,
      notes: 'Movimiento de prueba desde dashboard',
    });

    if (result.success) {
      setMovementResult({ success: true, message: `Movimiento creado para "${firstProduct.nombre}" (+1)` });
      refetchMovements();
    } else {
      setMovementResult({ success: false, message: result.error || 'Error desconocido' });
    }
  };

  // Refresh all data
  const handleRefreshAll = () => {
    refetchProducts();
    refetchMovements();
  };

  // Show loading state
  if (authLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Show message if no active membership
  if (!membership || !organizationId) {
    return (
      <AppLayout title="Dashboard">
        <div className="max-w-2xl mx-auto py-12">
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Sin organización asignada</AlertTitle>
            <AlertDescription className="mt-2">
              Tu usuario no está asignado a ninguna organización activa. 
              Pide al administrador que te agregue a una organización para poder acceder al dashboard.
            </AlertDescription>
          </Alert>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Email:</strong> {user?.email ?? 'N/A'}</p>
              <p><strong>Auth User ID (Supabase):</strong></p>
              <code className="block text-xs bg-muted p-2 rounded break-all">{user?.id ?? 'N/A'}</code>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Format movement type for display
  const formatMovementType = (type: string) => {
    const types: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      purchase: { label: 'Compra', variant: 'default' },
      sale: { label: 'Venta', variant: 'destructive' },
      adjustment_in: { label: 'Ajuste +', variant: 'secondary' },
      adjustment_out: { label: 'Ajuste -', variant: 'outline' },
      transfer_in: { label: 'Transfer +', variant: 'secondary' },
      transfer_out: { label: 'Transfer -', variant: 'outline' },
    };
    return types[type] ?? { label: type, variant: 'outline' as const };
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header with Organization Info */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{organization?.name ?? 'Organización'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default" className="capitalize">{userRole}</Badge>
                <Badge variant="outline" className="capitalize">{membership?.status}</Badge>
              </div>
            </div>
          </div>
          
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar Todo
          </Button>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Usuario Autenticado
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p><strong>Email:</strong> {user?.email}</p>
              <p className="text-muted-foreground text-xs">ID: {user?.id}</p>
              <p className="text-muted-foreground text-xs">Org ID: {organizationId}</p>
            </div>
          </CardContent>
        </Card>

        {/* Products Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Productos</CardTitle>
              <Badge variant="secondary">{products.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {canCreateProducts && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleCreateProduct}
                  disabled={isCreatingProduct}
                >
                  {isCreatingProduct ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Crear Producto Demo
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refetchProducts} disabled={productsLoading}>
                <RefreshCw className={`h-4 w-4 ${productsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {productsError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error al cargar productos</AlertTitle>
                <AlertDescription className="font-mono text-xs">{productsError}</AlertDescription>
              </Alert>
            )}

            {productResult && (
              <Alert variant={productResult.success ? 'default' : 'destructive'} className="mb-4">
                {productResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{productResult.success ? 'Éxito' : 'Error'}</AlertTitle>
                <AlertDescription className="font-mono text-xs">{productResult.message}</AlertDescription>
              </Alert>
            )}

            {productsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Cargando productos...
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay productos. {canCreateProducts && 'Usa el botón "Crear Producto Demo" para agregar uno.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Creado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={String(product.id)}>
                        <TableCell className="font-medium">{product.nombre}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{product.sku ?? '-'}</TableCell>
                        <TableCell className="text-right font-mono">${Number(product.costo ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">${Number(product.precio ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{product.stock}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movements Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              <CardTitle>Últimos Movimientos</CardTitle>
              <Badge variant="secondary">{movements.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleCreateMovement}
                disabled={isCreatingMovement || products.length === 0}
              >
                {isCreatingMovement ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Crear Movimiento de Prueba
              </Button>
              <Button variant="outline" size="sm" onClick={refetchMovements} disabled={movementsLoading}>
                <RefreshCw className={`h-4 w-4 ${movementsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {movementsError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error al cargar movimientos</AlertTitle>
                <AlertDescription className="font-mono text-xs">{movementsError}</AlertDescription>
              </Alert>
            )}

            {movementResult && (
              <Alert variant={movementResult.success ? 'default' : 'destructive'} className="mb-4">
                {movementResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{movementResult.success ? 'Éxito' : 'Error'}</AlertTitle>
                <AlertDescription className="font-mono text-xs">{movementResult.message}</AlertDescription>
              </Alert>
            )}

            {movementsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Cargando movimientos...
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay movimientos registrados. 
                {products.length > 0 && ' Usa el botón "Crear Movimiento de Prueba" para agregar uno.'}
                {products.length === 0 && ' Primero crea un producto.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => {
                      const typeInfo = formatMovementType(movement.movement_type);
                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                            {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {movement.product?.name ?? movement.product_id.slice(0, 8) + '...'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${movement.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movement.delta >= 0 ? '+' : ''}{movement.delta}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                            {movement.notes ?? '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
