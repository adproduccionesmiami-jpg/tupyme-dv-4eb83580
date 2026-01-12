import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client.browser';
import { toast } from 'sonner';
import { AppRole } from '@/lib/permissions';

// Types for membership data from Supabase
// ALIGNED with Supabase enum public.app_role: admin, cashier, seller, warehouse
export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole; // admin | cashier | seller | warehouse
  status: 'active' | 'invited' | 'suspended';
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  status?: string;
}

interface SupabaseAuthContextType {
  // Auth state
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  
  // Organization/membership state
  membership: Membership | null;
  organization: Organization | null;
  organizationId: string | null;
  userRole: AppRole | null;
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  
  // Utility
  refreshMembership: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Fetch user's membership and organization using the REAL auth user ID
  const fetchMembership = useCallback(async (authUserId: string) => {
    try {
      console.log('[Auth] ========================================');
      console.log('[Auth] Fetching membership for AUTH USER ID:', authUserId);
      console.log('[Auth] This ID comes from session.user.id (Supabase Auth)');
      console.log('[Auth] ========================================');
      
      // CRITICAL: Query memberships using the REAL auth user ID (UUID from auth.users)
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', authUserId) // This MUST be the UUID from auth.users
        .eq('status', 'active')
        .maybeSingle();

      if (membershipError) {
        console.error('[Auth] ERROR fetching membership:', membershipError);
        console.error('[Auth] Error code:', membershipError.code);
        console.error('[Auth] Error details:', membershipError.details);
        console.error('[Auth] Error hint:', membershipError.hint);
        // Don't silently fail - show the actual error
        toast.error('Error al cargar membresía', {
          description: `${membershipError.message} (${membershipError.code})`,
        });
        return;
      }

      if (!membershipData) {
        console.warn('[Auth] No active membership found for user ID:', authUserId);
        console.warn('[Auth] Check that public.memberships has a row with:');
        console.warn('[Auth]   user_id =', authUserId);
        console.warn('[Auth]   status = "active"');
        setMembership(null);
        setOrganization(null);
        return;
      }

      console.log('[Auth] ✓ Membership found:', membershipData);
      console.log('[Auth]   - membership.id:', membershipData.id);
      console.log('[Auth]   - membership.user_id:', membershipData.user_id);
      console.log('[Auth]   - membership.organization_id:', membershipData.organization_id);
      console.log('[Auth]   - membership.role:', membershipData.role);
      console.log('[Auth]   - membership.status:', membershipData.status);
      
      setMembership(membershipData as Membership);

      // Fetch the organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, status')
        .eq('id', membershipData.organization_id)
        .single();

      if (orgError) {
        console.error('[Auth] ERROR fetching organization:', orgError);
        console.error('[Auth] Tried to fetch org with ID:', membershipData.organization_id);
        toast.error('Error al cargar organización', {
          description: orgError.message,
        });
        return;
      }

      console.log('[Auth] ✓ Organization found:', orgData);
      setOrganization(orgData as Organization);
    } catch (err) {
      console.error('[Auth] Unexpected error fetching membership:', err);
      toast.error('Error inesperado al cargar datos de organización');
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    console.log('[Auth] Initializing auth state...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch membership when user signs in (using setTimeout to avoid deadlock)
        if (session?.user) {
          setTimeout(() => {
            fetchMembership(session.user.id);
          }, 0);
        } else {
          setMembership(null);
          setOrganization(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session check:', session?.user?.id ?? 'no session');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchMembership(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchMembership]);

  // Sign in with email/password
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      console.log('[Auth] Signing in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Sign in error:', error);
        return { error: error.message };
      }

      console.log('[Auth] Sign in successful:', data.user?.id);
      return {};
    } catch (err) {
      console.error('[Auth] Unexpected sign in error:', err);
      return { error: 'Error inesperado al iniciar sesión' };
    }
  };

  // Sign up with email/password
  const signUp = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      console.log('[Auth] Signing up:', email);
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('[Auth] Sign up error:', error);
        return { error: error.message };
      }

      console.log('[Auth] Sign up successful:', data.user?.id);
      toast.success('Cuenta creada', {
        description: 'Revisa tu email para confirmar tu cuenta.',
      });
      return {};
    } catch (err) {
      console.error('[Auth] Unexpected sign up error:', err);
      return { error: 'Error inesperado al registrarse' };
    }
  };

  // Sign out
  // NOTE: We do NOT clear localStorage here anymore.
  // Data persists in Supabase (the source of truth). Clearing localStorage
  // was causing users to see empty screens after re-login because InventoryContext
  // was loading from localStorage which was wiped, while Supabase still had data.
  // Only DevReset (manual) should clear localStorage.
  const signOut = async () => {
    console.log('[Auth] Signing out...');
    await supabase.auth.signOut();
    setMembership(null);
    setOrganization(null);
  };

  // Refresh membership data
  const refreshMembership = async () => {
    if (user) {
      await fetchMembership(user.id);
    }
  };

  const value: SupabaseAuthContextType = {
    session,
    user,
    isLoading,
    membership,
    organization,
    organizationId: membership?.organization_id ?? null,
    userRole: membership?.role ?? null,
    signIn,
    signUp,
    signOut,
    refreshMembership,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
