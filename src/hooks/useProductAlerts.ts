import { useMemo } from 'react';
import { parseISO, startOfDay, differenceInCalendarDays, isValid } from 'date-fns';
import { useProducts } from '@/hooks/useProducts';
import { useInventory } from '@/contexts/InventoryContext';

export type AlertType = 'sin_stock' | 'poco_stock' | 'sobre_stock' | 'vencimiento';
export type AlertPriority = 'alta' | 'media' | 'baja';

export interface ProductAlert {
  id: string;
  productoId: string;
  productoNombre: string;
  productoSku: string;
  tipo: AlertType;
  prioridad: AlertPriority;
  mensaje: string;
  stockActual: number;
  stockMinimo: number;
  fechaVencimiento?: string;
  diasRestantes?: number;
  fecha: Date;
}

const DEFAULT_MIN_STOCK = 10;
const WARNING_DAYS = 10;

// Parse expiration date correctly regardless of format
function parseExpiry(value?: string | null): Date | null {
  if (!value) return null;

  // 1) ISO format (YYYY-MM-DD) - from database
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  }

  // 2) dd/MM/yyyy format (UI display format)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('/').map((n) => Number(n));
    if (!dd || !mm || !yyyy) return null;

    const d = new Date(yyyy, mm - 1, dd);

    // Guard against overflow dates (e.g., 32/13/2026)
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;

    return isValid(d) ? d : null;
  }

  return null;
}

function normalizeExpiryToIso(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('/').map((n) => Number(n));
    if (!dd || !mm || !yyyy) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${yyyy}-${pad(mm)}-${pad(dd)}`;
  }

  return null;
}

type AlertProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number | null;
  min_stock: number | null;
  max_stock: number | null;
  expiration_date?: string | null;
};

// Type guard to convert DB products to AlertProduct
function mapDbProductToAlertProduct(p: {
  id: string;
  name: string;
  sku: string | null;
  stock: number | null;
  min_stock: number | null;
  max_stock?: number | null;
  expiration_date?: string | null;
}): AlertProduct {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    min_stock: p.min_stock,
    max_stock: p.max_stock ?? null,
    expiration_date: p.expiration_date,
  };
}

export function useProductAlerts() {
  const { products: dbProducts, isLoading, error, refetch } = useProducts();
  const { products: localProducts } = useInventory();

  // If there are no DB products yet, fall back to local inventory (keeps the same alert logic,
  // but avoids showing 0 alerts when the user is actually working with local data).
  const products = useMemo<AlertProduct[]>(() => {
    if (dbProducts.length > 0) {
      return dbProducts.map((p) => mapDbProductToAlertProduct({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        min_stock: p.min_stock,
        max_stock: p.max_stock,
        expiration_date: p.expiration_date,
      }));
    }

    return localProducts.map((p) => ({
      id: String(p.id),
      name: p.nombre,
      sku: p.sku ?? null,
      stock: p.stock ?? 0,
      min_stock: p.minStock ?? null,
      max_stock: p.maxStock ?? null,
      expiration_date: normalizeExpiryToIso(p.expirationDate ?? null),
    }));
  }, [dbProducts, localProducts]);

  const alerts = useMemo<ProductAlert[]>(() => {
    const now = new Date();
    const today = startOfDay(now);
    const generatedAlerts: ProductAlert[] = [];
    let alertId = 1;

    products.forEach((product) => {
      const stockActual = product.stock ?? 0;
      const minStockThreshold = product.min_stock ?? DEFAULT_MIN_STOCK;
      const maxStockThreshold = product.max_stock;

      // Sin Stock (stock === 0)
      if (stockActual === 0) {
        generatedAlerts.push({
          id: `alert-${alertId++}`,
          productoId: product.id,
          productoNombre: product.name,
          productoSku: product.sku || 'SIN-SKU',
          tipo: 'sin_stock',
          prioridad: 'alta',
          mensaje: 'Producto agotado - requiere reposición urgente',
          stockActual,
          stockMinimo: minStockThreshold,
          fecha: now,
        });
      }
      // Poco Stock (stock > 0 AND stock <= minStock)
      else if (stockActual > 0 && stockActual <= minStockThreshold) {
        generatedAlerts.push({
          id: `alert-${alertId++}`,
          productoId: product.id,
          productoNombre: product.name,
          productoSku: product.sku || 'SIN-SKU',
          tipo: 'poco_stock',
          prioridad: 'media',
          mensaje: `Stock bajo (mín: ${minStockThreshold}) - considerar reposición`,
          stockActual,
          stockMinimo: minStockThreshold,
          fecha: now,
        });
      }
      // Sobre Stock (max_stock > 0 AND stock > max_stock)
      else if (maxStockThreshold && maxStockThreshold > 0 && stockActual > maxStockThreshold) {
        generatedAlerts.push({
          id: `alert-${alertId++}`,
          productoId: product.id,
          productoNombre: product.name,
          productoSku: product.sku || 'SIN-SKU',
          tipo: 'sobre_stock',
          prioridad: 'baja',
          mensaje: `Stock excedido (máx: ${maxStockThreshold}) - considerar redistribución`,
          stockActual,
          stockMinimo: minStockThreshold,
          fecha: now,
        });
      }

      // Vencimiento alerts (only if expiration_date exists AND stock > 0)
      if (product.expiration_date && stockActual > 0) {
        const expiry = parseExpiry(product.expiration_date);

        if (expiry) {
          const expiryDay = startOfDay(expiry);
          const diasRestantes = differenceInCalendarDays(expiryDay, today);

          // Vencido (rojo): expiry < today
          if (diasRestantes < 0) {
            generatedAlerts.push({
              id: `alert-${alertId++}`,
              productoId: product.id,
              productoNombre: product.name,
              productoSku: product.sku || 'SIN-SKU',
              tipo: 'vencimiento',
              prioridad: 'alta',
              mensaje: `Producto VENCIDO hace ${Math.abs(diasRestantes)} día(s) - retirar`,
              stockActual,
              stockMinimo: minStockThreshold,
              fechaVencimiento: product.expiration_date,
              diasRestantes,
              fecha: now,
            });
          }
          // Por vencer (amarillo): 0 <= days <= WARNING_DAYS
          else if (diasRestantes >= 0 && diasRestantes <= WARNING_DAYS) {
            generatedAlerts.push({
              id: `alert-${alertId++}`,
              productoId: product.id,
              productoNombre: product.name,
              productoSku: product.sku || 'SIN-SKU',
              tipo: 'vencimiento',
              prioridad: 'media',
              mensaje:
                diasRestantes === 0
                  ? 'Producto vence HOY - acción inmediata requerida'
                  : diasRestantes === 1
                    ? 'Producto vence MAÑANA - priorizar venta'
                    : `Producto vence en ${diasRestantes} días - considerar promoción`,
              stockActual,
              stockMinimo: minStockThreshold,
              fechaVencimiento: product.expiration_date,
              diasRestantes,
              fecha: now,
            });
          }
          // Si diasRestantes > WARNING_DAYS, no crear alerta
        }
      }
    });

    return generatedAlerts;
  }, [products]);

  const stats = useMemo(() => {
    return {
      sinStock: alerts.filter((a) => a.tipo === 'sin_stock').length,
      pocoStock: alerts.filter((a) => a.tipo === 'poco_stock').length,
      sobreStock: alerts.filter((a) => a.tipo === 'sobre_stock').length,
      vencimiento: alerts.filter((a) => a.tipo === 'vencimiento').length,
      total: alerts.length,
    };
  }, [alerts]);

  return {
    alerts,
    stats,
    products,
    isLoading,
    error,
    refetch,
  };
}
