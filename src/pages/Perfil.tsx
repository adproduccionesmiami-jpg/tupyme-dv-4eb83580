import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useDevFlags } from '@/hooks/useDevFlags';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogOut, Lock, Save, User, Loader2, Bug, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.browser';
import { toast } from 'sonner';
import { AppRole, APP_ROLES, ROLE_LABELS } from '@/lib/permissions';

interface ProfileData {
  nombre: string;
  apellido: string;
}

// Storage key for profile data
const PROFILE_STORAGE_KEY = 'tupyme_profile';

// Load profile from localStorage
const loadProfileFromStorage = (userId: string): ProfileData | null => {
  try {
    const stored = localStorage.getItem(`${PROFILE_STORAGE_KEY}_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading profile from storage:', e);
  }
  return null;
};

// Save profile to localStorage
const saveProfileToStorage = (userId: string, data: ProfileData): void => {
  try {
    localStorage.setItem(`${PROFILE_STORAGE_KEY}_${userId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving profile to storage:', e);
    throw new Error('No se pudo guardar el perfil');
  }
};

export default function Perfil() {
  const { user, logout, isLoading: authLoading, permissions, updateUserRole } = useAuth();
  const { user: supabaseUser, organizationId, membership, organization } = useSupabaseAuth();
  const { enabled: devFlagsEnabled } = useDevFlags();
  const navigate = useNavigate();
  
  // Original values (for comparison)
  const [originalData, setOriginalData] = useState<ProfileData>({ nombre: '', apellido: '' });
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Role change state
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState<{ nombre?: string; apellido?: string }>({});

  // DEV Diagnostics state
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    productsCount: number;
    movementsCount: number;
    queriedAt: string;
  } | null>(null);

  // DEV ADMIN check (same email as reset-dev-data uses)
  const devAdminEmail = 'alaindaniel.ofic@gmail.com';
  const isDevAdmin = devFlagsEnabled && supabaseUser?.email === devAdminEmail;

  // Run DEV diagnostics - queries Supabase with SAME scope as Inventario/Movimientos
  const runDiagnostics = useCallback(async () => {
    if (!organizationId) {
      toast.error('No hay organización activa');
      return;
    }

    setDiagLoading(true);
    try {
      // Count products using SAME query scope as useProducts / Inventario
      const { count: productsCount, error: prodErr } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (prodErr) throw prodErr;

      // Count movements using SAME query scope as Movimientos / Dashboard
      const { count: movementsCount, error: movErr } = await supabase
        .from('inventory_movements')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (movErr) throw movErr;

      setDiagResult({
        productsCount: productsCount ?? 0,
        movementsCount: movementsCount ?? 0,
        queriedAt: new Date().toISOString(),
      });

      toast.success('Diagnóstico completado');
    } catch (err) {
      console.error('[Diagnostics] Error:', err);
      toast.error('Error al ejecutar diagnóstico', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDiagLoading(false);
    }
  }, [organizationId]);
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load user data on mount
  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      
      // Load profile from storage
      const storedProfile = loadProfileFromStorage(user.id);
      
      if (storedProfile) {
        setNombre(storedProfile.nombre);
        setApellido(storedProfile.apellido);
        setOriginalData(storedProfile);
      } else {
        // Default empty values for new users
        setNombre('');
        setApellido('');
        setOriginalData({ nombre: '', apellido: '' });
      }
      
      setIsLoading(false);
    }
  }, [user?.id]);

  // Validate input
  const validateField = (field: 'nombre' | 'apellido', value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return field === 'nombre' ? 'El nombre es requerido' : 'El apellido es requerido';
    }
    if (trimmed.length < 2) {
      return `Mínimo 2 caracteres`;
    }
    return undefined;
  };

  // Check if form has changes
  const hasChanges = useMemo(() => {
    const currentNombre = nombre.trim();
    const currentApellido = apellido.trim();
    return currentNombre !== originalData.nombre || currentApellido !== originalData.apellido;
  }, [nombre, apellido, originalData]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const nombreError = validateField('nombre', nombre);
    const apellidoError = validateField('apellido', apellido);
    return !nombreError && !apellidoError;
  }, [nombre, apellido]);

  // Can submit?
  const canSubmit = hasChanges && isFormValid && !isSaving;

  // Handle input change with validation
  const handleNombreChange = (value: string) => {
    setNombre(value);
    const error = validateField('nombre', value);
    setErrors(prev => ({ ...prev, nombre: error }));
  };

  const handleApellidoChange = (value: string) => {
    setApellido(value);
    const error = validateField('apellido', value);
    setErrors(prev => ({ ...prev, apellido: error }));
  };

  // Handle role change request
  const handleRoleChangeRequest = (newRole: AppRole) => {
    if (newRole !== user?.role) {
      setPendingRole(newRole);
      setShowRoleConfirm(true);
    }
  };

  // Confirm role change
  const handleConfirmRoleChange = () => {
    if (pendingRole) {
      updateUserRole(pendingRole);
      toast.success('Rol actualizado', {
        description: `Tu rol ha sido cambiado a ${ROLE_LABELS[pendingRole]}.`
      });
    }
    setShowRoleConfirm(false);
    setPendingRole(null);
  };

  // Cancel role change
  const handleCancelRoleChange = () => {
    setShowRoleConfirm(false);
    setPendingRole(null);
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!user?.id || !canSubmit) return;

    // Validate all fields
    const nombreError = validateField('nombre', nombre);
    const apellidoError = validateField('apellido', apellido);
    
    if (nombreError || apellidoError) {
      setErrors({ nombre: nombreError, apellido: apellidoError });
      return;
    }

    setIsSaving(true);
    
    try {
      // Simulate network delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const trimmedData: ProfileData = {
        nombre: nombre.trim(),
        apellido: apellido.trim()
      };
      
      // Persist to storage
      saveProfileToStorage(user.id, trimmedData);
      
      // Update original data (so button becomes disabled again)
      setOriginalData(trimmedData);
      setNombre(trimmedData.nombre);
      setApellido(trimmedData.apellido);
      
      toast.success('Cambios guardados', {
        description: 'Tu perfil ha sido actualizado correctamente.'
      });
    } catch (error) {
      toast.error('No se pudo guardar', {
        description: 'Ocurrió un error. Intenta de nuevo.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Show loading while checking auth or loading profile
  if (authLoading || isLoading) {
    return (
      <AppLayout title="Mi Perfil">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const canEditRole = permissions?.canEditRole ?? false;

  return (
    <AppLayout title="Mi Perfil">
      <div className="space-y-6">
        {/* Page Header - matches Movimientos/Alertas pattern */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Configuración de cuenta</h2>
          <p className="text-sm text-muted-foreground">
            Actualiza tu información personal y gestiona tu sesión
          </p>
        </div>

        {/* Grid Layout: 8/12 + 4/12 on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Main Form (8/12) */}
          <div className="lg:col-span-8">
            <Card className="border-border">
              <CardContent className="p-5">
                {/* Card Header - matches system card titles */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Datos del usuario</h3>
                    <p className="text-sm text-muted-foreground">Información de tu cuenta</p>
                  </div>
                </div>
                
                {/* Form */}
                <div className="space-y-4">
                  {/* Row 1: Nombre + Apellido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="nombre" className="text-sm font-medium">Nombre</Label>
                      <Input
                        id="nombre"
                        placeholder="Tu nombre"
                        value={nombre}
                        onChange={(e) => handleNombreChange(e.target.value)}
                        className={errors.nombre ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                      {errors.nombre && (
                        <p className="text-xs text-destructive">{errors.nombre}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="apellido" className="text-sm font-medium">Apellido</Label>
                      <Input
                        id="apellido"
                        placeholder="Tu apellido"
                        value={apellido}
                        onChange={(e) => handleApellidoChange(e.target.value)}
                        className={errors.apellido ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                      {errors.apellido && (
                        <p className="text-xs text-destructive">{errors.apellido}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Row 2: Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      El correo electrónico no puede ser modificado
                    </p>
                  </div>

                  {/* Row 3: Rol */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Rol</Label>
                    <div className="flex items-center gap-3">
                      {canEditRole ? (
                        <Select
                          value={user?.role}
                          onValueChange={(value) => handleRoleChangeRequest(value as AppRole)}
                        >
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                          <SelectContent>
                            {APP_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <>
                          <Input
                            value={user?.role ? ROLE_LABELS[user.role] : ''}
                            disabled
                            className="bg-muted/50 text-muted-foreground cursor-not-allowed max-w-[200px]"
                          />
                          <Badge variant="secondary" className="text-xs">
                            Solo lectura
                          </Badge>
                        </>
                      )}
                    </div>
                    {canEditRole && (
                      <p className="text-xs text-muted-foreground">
                        Como administrador, puedes cambiar tu rol
                      </p>
                    )}
                  </div>

                  {/* Save Button - Bottom right with breathing room */}
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={!canSubmit}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Guardar cambios
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Secondary Cards (4/12) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Security Card - Same header height as Session */}
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 min-h-[40px]">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">Seguridad</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground border-muted-foreground/30">
                        Próximamente
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Cambiar contraseña</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    Disponible próximamente con autenticación completa.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Session Card - Same header height as Security */}
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 min-h-[40px]">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Sesión</h3>
                    <p className="text-sm text-muted-foreground">Cerrar sesión en este dispositivo</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2 w-full">
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* DEV Diagnostics Panel - only visible to DEV admin */}
        {isDevAdmin && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Bug className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Diagnóstico DEV</h3>
                  <p className="text-sm text-muted-foreground">Panel de depuración (solo admin DEV)</p>
                </div>
              </div>

              {/* User/Org Info */}
              <div className="space-y-2 text-sm font-mono bg-muted/30 rounded-lg p-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">user.id:</span>
                  <span className="text-foreground truncate max-w-[200px]" title={supabaseUser?.id}>
                    {supabaseUser?.id || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">user.email:</span>
                  <span className="text-foreground">{supabaseUser?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">organization_id:</span>
                  <span className="text-foreground truncate max-w-[200px]" title={organizationId || undefined}>
                    {organizationId || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">organization.name:</span>
                  <span className="text-foreground">{organization?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">membership.role:</span>
                  <span className="text-foreground">{membership?.role || 'N/A'}</span>
                </div>
              </div>

              {/* Diagnostics Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                disabled={diagLoading}
                className="gap-2 w-full mb-3"
              >
                {diagLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Consultando DB...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Ejecutar Diagnóstico DB
                  </>
                )}
              </Button>

              {/* Diagnostics Results */}
              {diagResult && (
                <div className="space-y-2 text-sm font-mono bg-success/10 rounded-lg p-3 border border-success/30">
                  <p className="text-xs text-muted-foreground mb-2">
                    Consultado: {new Date(diagResult.queriedAt).toLocaleString()}
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">products (Supabase):</span>
                    <span className="text-success font-bold">{diagResult.productsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">inventory_movements (Supabase):</span>
                    <span className="text-success font-bold">{diagResult.movementsCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-success/20">
                    Estos counts usan la misma query/scope que Inventario y Movimientos.
                    Si los counts &gt; 0 pero las pantallas muestran 0, el problema es que
                    las pantallas leen de localStorage (InventoryContext) en lugar de Supabase.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar tu rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Cambiar tu rol puede limitar el acceso a secciones del sistema. 
              {pendingRole && (
                <span className="block mt-2">
                  Nuevo rol: <strong>{ROLE_LABELS[pendingRole]}</strong>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRoleChange}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRoleChange}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
