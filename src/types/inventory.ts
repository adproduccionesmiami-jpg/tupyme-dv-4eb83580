export interface Product {
  id: string | number;
  sku: string;
  nombre: string;
  presentacion: string;
  imagen: string;
  stock: number;
  costo: number;
  precio: number;
  categoria: string;
  categoryId?: string;
  brandId?: string;
  vendidos: number;
  minStock?: number;
  maxStock?: number;
  expirationDate?: string;
  isNonPerishable?: boolean;
}

export type MovementType = 'entrada' | 'salida' | 'ajuste';

export interface Movement {
  id: number | string;
  productoId: number | string;
  productoNombre: string;
  productoSku: string;
  productoCategoria: string;
  productoPresentacion: string;
  tipo: MovementType;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  motivo: string;
  usuario: string;
  usuarioRol: string;
  fecha: Date;
}

export type AlertType = 'sin_stock' | 'poco_stock' | 'sobre_stock' | 'vencimiento';
export type AlertPriority = 'alta' | 'media' | 'baja';

export interface Alert {
  id: number | string;
  productoId: number | string;
  productoNombre: string;
  productoSku: string;
  productoCategoria: string;
  productoPresentacion: string;
  tipo: AlertType;
  prioridad: AlertPriority;
  mensaje: string;
  stockActual: number;
  stockMinimo: number;
  fechaVencimiento?: string;
  diasRestantes?: number;
  fecha: Date;
}

export type FilterType = 'todos' | 'poco-stock' | 'sin-stock' | 'sobre-stock' | 'mas-vendidos';

export const CATEGORIAS_OPTIONS = [
  'Bebidas',
  'Lácteos',
  'Carnes y Embutidos',
  'Congelados',
  'Panadería',
  'Cereales y Granos',
  'Enlatados',
  'Condimentos y Salsas',
  'Snacks y Dulces',
  'Limpieza del Hogar',
  'Higiene Personal',
  'Frutas y Vegetales',
] as const;

export const FORMATO_OPTIONS = [
  'Unidad',
  'Libra (lb)',
  'Kilogramo (kg)',
  'Gramo (g)',
  'Litro (L)',
  'Mililitro (ml)',
  'Onza (oz)',
  'Paquete',
  'Bolsa',
  'Caja',
  'Botella',
  'Lata',
  'Pomo/Frasco',
  'Saco',
  'Bandeja',
  'Cubeta/Galón',
  'Display',
  'Six-pack',
] as const;

export const CATEGORIAS_PERECEDERAS = [
  'Bebidas',
  'Lácteos',
  'Carnes y Embutidos',
  'Congelados',
  'Panadería',
  'Frutas y Vegetales',
] as const;

export const isCategoriaPerecederera = (categoria: string): boolean => {
  return CATEGORIAS_PERECEDERAS.some(c => c.toLowerCase() === categoria.toLowerCase());
};
