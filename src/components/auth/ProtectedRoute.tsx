import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { canViewRoute } from '@/lib/permissions';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: 'dashboard' | 'inventario' | 'movimientos' | 'alertas' | 'perfil' | 'reportes';
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const hasShownToast = useRef(false);

  // Check if user has permission for this route
  const hasPermission = !requiredPermission || 
    (user?.role && canViewRoute(user.role, requiredPermission));

  // Show loading while auth is initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user doesn't have permission, redirect to dashboard immediately
  // Show toast only once to avoid loops
  if (!hasPermission) {
    if (!hasShownToast.current && location.pathname !== '/app/dashboard') {
      hasShownToast.current = true;
      // Use setTimeout to show toast after redirect
      setTimeout(() => {
        toast.error('Acceso denegado', {
          description: 'No tienes permisos para acceder a esta sección.'
        });
      }, 0);
    }
    return <Navigate to="/app/dashboard" replace />;
  }

  // Reset toast flag when permission check passes
  hasShownToast.current = false;

  return <>{children}</>;
}
