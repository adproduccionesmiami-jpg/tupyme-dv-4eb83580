// Custom database types for external Supabase
export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'cashier' | 'seller' | 'warehouse';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  sku?: string;
  description?: string;
  unit_cost: number;
  unit_price: number;
  stock: number;
  min_stock?: number;
  category?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  organization_id: string;
  product_id: string;
  user_id: string;
  type: 'in' | 'out' | 'adjust';
  quantity_change: number;
  notes?: string;
  created_at: string;
}
