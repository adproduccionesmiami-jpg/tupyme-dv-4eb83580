// Multi-tenant and Multi-user system
// Storage keys use tenantId for namespace isolation
// ALIGNED with Supabase enum public.app_role: admin, cashier, seller, warehouse

import { AppRole, ROLE_LABELS } from './permissions';

// ============= TYPES =============
export interface TenantUser {
  userId: string;
  tenantId: string;
  email: string;
  password: string;
  role: AppRole;
  name?: string;
}

export interface TenantSession {
  tenantId: string;
  userId: string;
}

// ============= STORAGE KEY GENERATORS =============
export const getTenantStorageKeys = (tenantId: string) => ({
  products: `tupyme_inventario_productos_${tenantId}`,
  movements: `tupyme_movimientos_inventario_${tenantId}`,
  users: `tupyme_users_${tenantId}`,
});

export const SESSION_KEY = 'tupyme_session';

// ============= DEFAULT TENANT =============
export const DEFAULT_TENANT_ID = 'demo_business';

// ============= SEED USERS PER TENANT =============
// Using Supabase roles: admin, cashier, seller, warehouse
const createDefaultUsers = (tenantId: string): TenantUser[] => [
  {
    userId: 'admin-1',
    tenantId,
    email: 'admin@tupyme.com',
    password: 'admin123',
    role: 'admin',
    name: 'Administrador',
  },
  {
    userId: 'cashier-1',
    tenantId,
    email: 'cashier@tupyme.com',
    password: 'cashier123',
    role: 'cashier',
    name: 'Cajero',
  },
  {
    userId: 'seller-1',
    tenantId,
    email: 'seller@tupyme.com',
    password: 'seller123',
    role: 'seller',
    name: 'Vendedor',
  },
  {
    userId: 'warehouse-1',
    tenantId,
    email: 'warehouse@tupyme.com',
    password: 'warehouse123',
    role: 'warehouse',
    name: 'Almacén',
  },
];

// ============= USER MANAGEMENT =============
export const getTenantUsers = (tenantId: string): TenantUser[] => {
  const keys = getTenantStorageKeys(tenantId);
  try {
    const stored = localStorage.getItem(keys.users);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error loading tenant users:', error);
  }
  
  // Initialize with default users if none exist
  const defaultUsers = createDefaultUsers(tenantId);
  saveTenantUsers(tenantId, defaultUsers);
  return defaultUsers;
};

export const saveTenantUsers = (tenantId: string, users: TenantUser[]): void => {
  const keys = getTenantStorageKeys(tenantId);
  try {
    localStorage.setItem(keys.users, JSON.stringify(users));
  } catch (error) {
    console.warn('Error saving tenant users:', error);
  }
};

export const findUserByCredentials = (
  tenantId: string,
  email: string,
  password: string
): TenantUser | undefined => {
  const users = getTenantUsers(tenantId);
  return users.find(u => u.email === email && u.password === password);
};

export const findUserById = (tenantId: string, userId: string): TenantUser | undefined => {
  const users = getTenantUsers(tenantId);
  return users.find(u => u.userId === userId);
};

export const updateUserRole = (tenantId: string, userId: string, newRole: AppRole): boolean => {
  const users = getTenantUsers(tenantId);
  const userIndex = users.findIndex(u => u.userId === userId);
  if (userIndex === -1) return false;
  
  users[userIndex].role = newRole;
  saveTenantUsers(tenantId, users);
  return true;
};

export const createUser = (
  tenantId: string,
  email: string,
  password: string,
  role: AppRole = 'seller'
): TenantUser | null => {
  const users = getTenantUsers(tenantId);
  
  // Check if email already exists
  if (users.some(u => u.email === email)) {
    return null;
  }
  
  const newUser: TenantUser = {
    userId: `user-${Date.now()}`,
    tenantId,
    email,
    password,
    role,
    name: email.split('@')[0],
  };
  
  users.push(newUser);
  saveTenantUsers(tenantId, users);
  return newUser;
};

// ============= SESSION MANAGEMENT =============
export const getSession = (): TenantSession | null => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error loading session:', error);
  }
  return null;
};

export const saveSession = (session: TenantSession): void => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('Error saving session:', error);
  }
};

export const clearSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('Error clearing session:', error);
  }
};

// ============= ROLE SNAPSHOT HELPER =============
export const getRoleLabel = (role: AppRole): string => {
  return ROLE_LABELS[role] || role;
};
