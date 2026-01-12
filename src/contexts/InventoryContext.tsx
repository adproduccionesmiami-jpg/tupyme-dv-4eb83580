import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback, useEffect } from 'react';
import { startOfDay, differenceInCalendarDays, isSameDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { useMovements } from '@/hooks/useMovements';
import { Product, Movement, MovementType, Alert } from '@/types/inventory';
import { toast } from 'sonner';

interface InventoryContextType {
  products: Product[];
  movements: Movement[];
  alerts: Alert[];
  isLoading: boolean;

  // Product operations
  addProduct: (product: Omit<Product, 'id' | 'vendidos' | 'imagen'>) => Promise<void>;
  updateProduct: (id: string | number, updates: Partial<Product>, motivo?: string) => Promise<void>;
  deleteProduct: (id: string | number) => Promise<void>;
  setProducts: (products: Product[]) => void;

  // Movement operations
  addMovement: (movement: Omit<Movement, 'id' | 'fecha'>) => void;

  // Dashboard stats
  dashboardStats: {
    productosActivos: number;
    movimientosHoy: number;
    entradasHoy: number;
    salidasHoy: number;
    valorTotalInventario: number;
    valorTotalCosto: number;
    valorTotalPrecio: number;
    totalProductos: number;
    sinStock: number;
    pocoStock: number;
    vencimiento: number;
  };
  refetch: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
    products: dbProducts,
    isLoading: loadingProducts,
    createProduct,
    updateProduct: dbUpdateProduct,
    deleteProduct: dbDeleteProduct,
    refetch: refetchProducts,
  } = useProducts();

  const {
    movements: dbMovements,
    isLoading: loadingMovements,
    refetch: refetchMovements,
  } = useMovements();

  // Unified loading state
  const isLoading = loadingProducts || loadingMovements;

  // Sync products and movements from hooks
  const products = useMemo(() => dbProducts, [dbProducts]);
  const movements = useMemo(() => dbMovements, [dbMovements]);

  // Sync refetch
  const refetch = useCallback(async () => {
    await Promise.all([refetchProducts(), refetchMovements()]);
  }, [refetchProducts, refetchMovements]);

  // Handle movements - In external DB mode, these are primarily driven by triggers
  const addMovement = useCallback(() => {
    console.info('[InventoryContext] addMovement call: Movements are managed via DB triggers on inventory_movements table.');
    refetchMovements();
  }, [refetchMovements]);

  // Product operations
  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'vendidos' | 'imagen'>) => {
    const result = await createProduct({
      name: productData.nombre,
      sku: productData.sku,
      unit_cost: productData.costo,
      unit_price: productData.precio,
      stock: productData.stock,
      min_stock: productData.minStock,
    });

    if (!result.success) {
      toast.error('Error al crear producto', { description: result.error });
      throw new Error(result.error);
    }
  }, [createProduct]);

  const updateProduct = useCallback(async (id: string | number, updates: Partial<Product>, motivo?: string) => {
    const result = await dbUpdateProduct(id, updates);
    if (!result.success) {
      toast.error('Error al actualizar producto', { description: result.error });
      throw new Error(result.error);
    }
  }, [dbUpdateProduct]);

  const deleteProduct = useCallback(async (id: string | number) => {
    const result = await dbDeleteProduct(String(id));
    if (!result.success) {
      toast.error('Error al eliminar producto', { description: result.error });
      throw new Error(result.error);
    }
  }, [dbDeleteProduct]);

  const setProducts = useCallback((newProducts: Product[]) => {
    console.warn('Manual setProducts disabled. Syncing via Supabase.');
  }, []);

  // Alertas dinámicas basadas en el Canon (Punto 0.2 y 4.6)
  const alerts = useMemo<Alert[]>(() => {
    const now = startOfDay(new Date());
    const generatedAlerts: Alert[] = [];
    let alertId = 1;

    products.forEach(product => {
      // 1. Alerta Sin Stock (Roja)
      if (product.stock === 0) {
        generatedAlerts.push({
          id: `alert-ss-${alertId++}`,
          productoId: product.id,
          productoNombre: product.nombre,
          productoSku: product.sku,
          productoCategoria: product.categoria,
          productoPresentacion: product.presentacion,
          tipo: 'sin_stock',
          prioridad: 'alta',
          mensaje: 'Grave: Producto sin existencias.',
          stockActual: product.stock,
          stockMinimo: product.minStock || 0,
          fecha: new Date(),
        });
      }

      // 2. Alerta Poco Stock (Amarilla/Naranja)
      else if (product.minStock && product.stock <= product.minStock) {
        generatedAlerts.push({
          id: `alert-ps-${alertId++}`,
          productoId: product.id,
          productoNombre: product.nombre,
          productoSku: product.sku,
          productoCategoria: product.categoria,
          productoPresentacion: product.presentacion,
          tipo: 'poco_stock',
          prioridad: 'media',
          mensaje: 'Atención: Stock por debajo del mínimo.',
          stockActual: product.stock,
          stockMinimo: product.minStock,
          fecha: new Date(),
        });
      }

      // 3. Alerta Sobre Stock (Información)
      else if (product.maxStock && product.stock >= product.maxStock) {
        generatedAlerts.push({
          id: `alert-os-${alertId++}`,
          productoId: product.id,
          productoNombre: product.nombre,
          productoSku: product.sku,
          productoCategoria: product.categoria,
          productoPresentacion: product.presentacion,
          tipo: 'sobre_stock',
          prioridad: 'baja',
          mensaje: 'Optimización: Exceso de inventario detectado.',
          stockActual: product.stock,
          stockMinimo: product.minStock || 0,
          fecha: new Date(),
        });
      }

      // 4. Alerta de Vencimiento (Punto 4.6 del Canon)
      if (product.expirationDate) {
        const expDate = startOfDay(new Date(product.expirationDate));
        const daysRestantes = differenceInCalendarDays(expDate, now);

        if (daysRestantes < 0) {
          generatedAlerts.push({
            id: `alert-v-red-${alertId++}`,
            productoId: product.id,
            productoNombre: product.nombre,
            productoSku: product.sku,
            productoCategoria: product.categoria,
            productoPresentacion: product.presentacion,
            tipo: 'vencimiento',
            prioridad: 'alta',
            mensaje: `Crítico: Producto vencido hace ${Math.abs(daysRestantes)} días.`,
            stockActual: product.stock,
            stockMinimo: product.minStock || 0,
            fechaVencimiento: product.expirationDate,
            diasRestantes: daysRestantes,
            fecha: new Date(),
          });
        } else if (daysRestantes <= 14) {
          generatedAlerts.push({
            id: `alert-v-warn-${alertId++}`,
            productoId: product.id,
            productoNombre: product.nombre,
            productoSku: product.sku,
            productoCategoria: product.categoria,
            productoPresentacion: product.presentacion,
            tipo: 'vencimiento',
            prioridad: 'media',
            mensaje: `Próximo a vencer: Faltan ${daysRestantes} días.`,
            stockActual: product.stock,
            stockMinimo: product.minStock || 0,
            fechaVencimiento: product.expirationDate,
            diasRestantes: daysRestantes,
            fecha: new Date(),
          });
        }
      }
    });
    return generatedAlerts;
  }, [products]);

  // KPIs oficiales del Canon
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const valorTotalCosto = products.reduce((acc, p) => acc + (p.stock * p.costo), 0);
    const valorTotalPrecio = products.reduce((acc, p) => acc + (p.stock * p.precio), 0);

    const todayMovements = movements.filter(m => isSameDay(new Date(m.fecha), now));

    return {
      productosActivos: products.filter(p => p.stock > 0).length,
      movimientosHoy: todayMovements.length,
      entradasHoy: todayMovements.filter(m => m.tipo === 'entrada').length,
      salidasHoy: todayMovements.filter(m => m.tipo === 'salida').length,
      valorTotalInventario: valorTotalCosto,
      valorTotalCosto,
      valorTotalPrecio,
      totalProductos: products.length,
      sinStock: products.filter(p => p.stock === 0).length,
      pocoStock: products.filter(p => p.minStock && p.stock > 0 && p.stock <= p.minStock).length,
      vencimiento: alerts.filter(a => a.tipo === 'vencimiento').length,
    };
  }, [products, movements, alerts]);

  return (
    <InventoryContext.Provider value={{
      products,
      movements,
      alerts,
      isLoading,
      addProduct,
      updateProduct,
      deleteProduct,
      setProducts,
      addMovement,
      dashboardStats,
      refetch,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory debe ser usado dentro de un InventoryProvider');
  }
  return context;
}
