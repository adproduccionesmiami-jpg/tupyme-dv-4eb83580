import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface SupabaseProtectedRouteProps {
  children: ReactNode;
}

export function SupabaseProtectedRoute({ children }: SupabaseProtectedRouteProps) {
  const { user, isLoading } = useSupabaseAuth();

  // Show loading while auth is initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
