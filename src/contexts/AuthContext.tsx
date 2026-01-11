// ==========================================
// BRIDGE: This file now wraps SupabaseAuthContext to maintain 
// backward compatibility with existing components
// ALIGNED with Supabase enum public.app_role: admin, cashier, seller, warehouse
// ==========================================

import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { AppRole, getPermissions, Permissions, ROLE_LABELS } from '@/lib/permissions';

interface User {
  id: string;
  email: string;
  role: AppRole;
  tenantId: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  permissions: Permissions | null;
  tenantId: string;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  updateUserRole: (role: AppRole) => void;
  getRoleSnapshot: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { 
    user: supabaseUser, 
    isLoading, 
    membership,
    organizationId,
    userRole,
    signIn, 
    signUp, 
    signOut 
  } = useSupabaseAuth();

  // Map Supabase user to legacy User format
  // userRole comes directly from Supabase as AppRole (admin, cashier, seller, warehouse)
  const user: User | null = supabaseUser ? {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    role: userRole ?? 'seller', // Default to seller if no role
    tenantId: organizationId ?? 'default',
    name: supabaseUser.email?.split('@')[0],
  } : null;

  // Compute permissions based on user role
  const permissions = user ? getPermissions(user.role) : null;

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    return signIn(email, password);
  };

  const signup = async (email: string, password: string): Promise<{ error?: string }> => {
    return signUp(email, password);
  };

  const logout = () => {
    signOut();
  };

  // No-op for now since roles are managed in Supabase
  const updateUserRole = (_role: AppRole) => {
    console.warn('[AuthContext] updateUserRole is a no-op in Supabase mode');
  };

  const getRoleSnapshot = (): string => {
    if (!user) return 'Sistema';
    return ROLE_LABELS[user.role] ?? user.role;
  };

  // Compute the effective tenantId for InventoryContext
  const effectiveTenantId = organizationId ?? 'default';
  
  // Log for debugging
  console.log('[AuthContext] Current tenantId:', effectiveTenantId, '| organizationId:', organizationId);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      permissions, 
      tenantId: effectiveTenantId,
      login, 
      signup, 
      logout, 
      updateUserRole,
      getRoleSnapshot,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
