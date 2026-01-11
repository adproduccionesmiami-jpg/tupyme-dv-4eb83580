// RBAC: Role-Based Access Control System
// Source of truth for roles and permissions
// ALIGNED with Supabase enum public.app_role: admin, cashier, seller, warehouse

export type AppRole = 'admin' | 'warehouse' | 'cashier' | 'seller';

export const APP_ROLES: AppRole[] = ['admin', 'warehouse', 'cashier', 'seller'];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  warehouse: 'Almacén',
  cashier: 'Cajero',
  seller: 'Vendedor',
};

export interface Permissions {
  canView: {
    dashboard: boolean;
    inventario: boolean;
    movimientos: boolean;
    alertas: boolean;
    perfil: boolean;
    reportes: boolean;
  };
  canEditInventory: boolean;
  canAddProduct: boolean;
  canUploadInventory: boolean;
  canDownloadInventory: boolean;
  canCreateMovements: boolean;
  canCreateAdjustments: boolean;
  canResolveAlerts: boolean;
  canEditRole: boolean;
}

// Permission map - central source of truth
// Elevated permissions: admin OR warehouse
export const permissionMap: Record<AppRole, Permissions> = {
  admin: {
    canView: {
      dashboard: true,
      inventario: true,
      movimientos: true,
      alertas: true,
      perfil: true,
      reportes: true,
    },
    canEditInventory: true,
    canAddProduct: true,
    canUploadInventory: true,
    canDownloadInventory: true,
    canCreateMovements: true,
    canCreateAdjustments: true,
    canResolveAlerts: true,
    canEditRole: true,
  },
  warehouse: {
    canView: {
      dashboard: true,
      inventario: true,
      movimientos: true,
      alertas: true,
      perfil: true,
      reportes: false,
    },
    canEditInventory: true,
    canAddProduct: true,
    canUploadInventory: true,
    canDownloadInventory: true,
    canCreateMovements: true,
    canCreateAdjustments: true,
    canResolveAlerts: true,
    canEditRole: false,
  },
  cashier: {
    canView: {
      dashboard: true,
      inventario: true,
      movimientos: true,
      alertas: true,
      perfil: true,
      reportes: false,
    },
    canEditInventory: true,
    canAddProduct: true,
    canUploadInventory: false,
    canDownloadInventory: false,
    canCreateMovements: true,
    canCreateAdjustments: false,
    canResolveAlerts: false,
    canEditRole: false,
  },
  seller: {
    canView: {
      dashboard: true,
      inventario: true,
      movimientos: true,
      alertas: false,
      perfil: true,
      reportes: false,
    },
    canEditInventory: false,
    canAddProduct: false,
    canUploadInventory: false,
    canDownloadInventory: false,
    canCreateMovements: true,
    canCreateAdjustments: false,
    canResolveAlerts: false,
    canEditRole: false,
  },
};

// Get permissions for a given role
export function getPermissions(role: AppRole): Permissions {
  return permissionMap[role] ?? permissionMap.seller;
}

// Check if a role can view a specific route
export function canViewRoute(role: AppRole, route: keyof Permissions['canView']): boolean {
  return permissionMap[role]?.canView[route] ?? false;
}

// Helper: check if role has elevated permissions (admin or warehouse)
export function hasElevatedPermissions(role: AppRole): boolean {
  return role === 'admin' || role === 'warehouse';
}
