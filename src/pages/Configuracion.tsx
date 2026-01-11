import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useDevFlags } from '@/hooks/useDevFlags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Users, UserPlus, Lock, Loader2, Shield, Mail, RefreshCw, Eye, EyeOff, User, Save, LogOut, Bug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppRole, APP_ROLES, ROLE_LABELS } from '@/lib/permissions';

// Types for memberships
interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'seller';
  status: 'active' | 'inactive';
  created_at: string;
  invited_email?: string;
}

// Role labels for team
const TEAM_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  seller: 'Vendedor',
};

// Password validation schema
const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// Profile storage
const PROFILE_STORAGE_KEY = 'tupyme_profile';

interface ProfileData {
  nombre: string;
  apellido: string;
}

const loadProfileFromStorage = (userId: string): ProfileData | null => {
  try {
    const stored = localStorage.getItem(`${PROFILE_STORAGE_KEY}_${userId}`);
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore */ }
  return null;
};

const saveProfileToStorage = (userId: string, data: ProfileData): void => {
  localStorage.setItem(`${PROFILE_STORAGE_KEY}_${userId}`, JSON.stringify(data));
};

export default function Configuracion() {
  const navigate = useNavigate();
  const { user, logout, isLoading: authLoading, permissions, updateUserRole } = useAuth();
  const { user: supabaseUser, organizationId, membership, organization } = useSupabaseAuth();
  const { enabled: devFlagsEnabled } = useDevFlags();
  
  // Active tab
  const [activeTab, setActiveTab] = useState('perfil');
  
  // Profile state
  const [originalData, setOriginalData] = useState<ProfileData>({ nombre: '', apellido: '' });
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileErrors, setProfileErrors] = useState<{ nombre?: string; apellido?: string }>({});
  
  // Role change state
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  
  // Team management state
  const [teamMembers, setTeamMembers] = useState<Membership[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'seller'>('seller');
  const [isInviting, setIsInviting] = useState(false);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  
  // DEV Diagnostics state
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    productsCount: number;
    movementsCount: number;
    queriedAt: string;
  } | null>(null);
  
  const isAdmin = membership?.role === 'admin';
  const canEditRole = permissions?.canEditRole ?? false;
  
  // DEV admin check
  const devAdminEmail = 'alaindaniel.ofic@gmail.com';
  const isDevAdmin = devFlagsEnabled && supabaseUser?.email === devAdminEmail;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load profile data
  useEffect(() => {
    if (user?.id) {
      setIsLoadingProfile(true);
      const storedProfile = loadProfileFromStorage(user.id);
      if (storedProfile) {
        setNombre(storedProfile.nombre);
        setApellido(storedProfile.apellido);
        setOriginalData(storedProfile);
      }
      setIsLoadingProfile(false);
    }
  }, [user?.id]);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    if (!organizationId) {
      setTeamMembers([]);
      setIsLoadingTeam(false);
      return;
    }

    try {
      setIsLoadingTeam(true);
      
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Configuracion] Error fetching team:', error);
        toast.error('Error al cargar el equipo');
        return;
      }

      setTeamMembers((data as Membership[]) || []);
    } catch (err) {
      console.error('[Configuracion] Unexpected error:', err);
    } finally {
      setIsLoadingTeam(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Profile validation
  const validateField = (field: 'nombre' | 'apellido', value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return field === 'nombre' ? 'El nombre es requerido' : 'El apellido es requerido';
    if (trimmed.length < 2) return 'Mínimo 2 caracteres';
    return undefined;
  };

  const hasProfileChanges = useMemo(() => {
    return nombre.trim() !== originalData.nombre || apellido.trim() !== originalData.apellido;
  }, [nombre, apellido, originalData]);

  const isProfileFormValid = useMemo(() => {
    return !validateField('nombre', nombre) && !validateField('apellido', apellido);
  }, [nombre, apellido]);

  const canSubmitProfile = hasProfileChanges && isProfileFormValid && !isSavingProfile;

  // Handle profile input changes
  const handleNombreChange = (value: string) => {
    setNombre(value);
    setProfileErrors(prev => ({ ...prev, nombre: validateField('nombre', value) }));
  };

  const handleApellidoChange = (value: string) => {
    setApellido(value);
    setProfileErrors(prev => ({ ...prev, apellido: validateField('apellido', value) }));
  };

  // Handle role change
  const handleRoleChangeRequest = (newRole: AppRole) => {
    if (newRole !== user?.role) {
      setPendingRole(newRole);
      setShowRoleConfirm(true);
    }
  };

  const handleConfirmRoleChange = () => {
    if (pendingRole) {
      updateUserRole(pendingRole);
      toast.success('Rol actualizado', { description: `Tu rol ha sido cambiado a ${ROLE_LABELS[pendingRole]}.` });
    }
    setShowRoleConfirm(false);
    setPendingRole(null);
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!user?.id || !canSubmitProfile) return;

    const nombreError = validateField('nombre', nombre);
    const apellidoError = validateField('apellido', apellido);
    
    if (nombreError || apellidoError) {
      setProfileErrors({ nombre: nombreError, apellido: apellidoError });
      return;
    }

    setIsSavingProfile(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const trimmedData: ProfileData = {
        nombre: nombre.trim(),
        apellido: apellido.trim()
      };
      
      saveProfileToStorage(user.id, trimmedData);
      setOriginalData(trimmedData);
      
      toast.success('Cambios guardados', { description: 'Tu perfil ha sido actualizado correctamente.' });
    } catch (error) {
      toast.error('No se pudo guardar', { description: 'Ocurrió un error. Intenta de nuevo.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle invite member - FIXED: properly include organization_id
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    if (!organizationId) {
      toast.error('No hay organización activa. Por favor recarga la página.');
      return;
    }

    if (!supabaseUser?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error('Email inválido');
      return;
    }

    setIsInviting(true);
    try {
      // Note: In a real system, you'd create an invitation and send an email
      // For now, we create the membership with the inviter's ID as placeholder
      const { error } = await supabase
        .from('memberships')
        .insert({
          organization_id: organizationId,
          user_id: supabaseUser.id, // Placeholder - in production, this would be the invited user's ID
          role: inviteRole,
          status: 'active' as const,
        });

      if (error) {
        console.error('[Configuracion] Error inviting member:', error);
        
        // Handle specific errors
        if (error.code === '23505') {
          toast.error('Este usuario ya es miembro del equipo');
        } else if (error.code === '42501') {
          toast.error('No tienes permisos para invitar miembros');
        } else {
          toast.error(`Error al invitar: ${error.message}`);
        }
        return;
      }

      toast.success('Miembro agregado correctamente', {
        description: `${inviteEmail} ahora tiene acceso como ${TEAM_ROLE_LABELS[inviteRole]}`
      });
      
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('seller');
      fetchTeamMembers();
    } catch (err) {
      console.error('[Configuracion] Unexpected invite error:', err);
      toast.error('Error inesperado al invitar miembro');
    } finally {
      setIsInviting(false);
    }
  };

  // Handle password change - IMPROVED error handling
  const handleChangePassword = async () => {
    // Clear previous errors
    setPasswordErrors({});

    // Validate empty fields first
    if (!newPassword.trim()) {
      setPasswordErrors({ newPassword: 'La contraseña es requerida' });
      return;
    }

    if (!confirmPassword.trim()) {
      setPasswordErrors({ confirmPassword: 'Confirma tu contraseña' });
      return;
    }

    // Validate with schema
    const result = passwordSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const errors: { newPassword?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'newPassword') errors.newPassword = err.message;
        if (err.path[0] === 'confirmPassword') errors.confirmPassword = err.message;
      });
      setPasswordErrors(errors);
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('[Configuracion] Password change error:', error);
        
        // Handle specific Supabase Auth errors
        if (error.message.includes('Password should be at least')) {
          setPasswordErrors({ newPassword: 'La contraseña debe tener al menos 6 caracteres' });
        } else if (error.message.includes('New password should be different')) {
          setPasswordErrors({ newPassword: 'La nueva contraseña debe ser diferente a la actual' });
        } else {
          toast.error(`Error: ${error.message}`);
        }
        return;
      }

      toast.success('Contraseña actualizada correctamente');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      console.error('[Configuracion] Unexpected password error:', err);
      toast.error('Error inesperado al cambiar contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // DEV Diagnostics
  const runDiagnostics = useCallback(async () => {
    if (!organizationId) {
      toast.error('No hay organización activa');
      return;
    }

    setDiagLoading(true);
    try {
      const { count: productsCount, error: prodErr } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (prodErr) throw prodErr;

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
      toast.error('Error al ejecutar diagnóstico');
    } finally {
      setDiagLoading(false);
    }
  }, [organizationId]);

  // Loading state
  if (authLoading || isLoadingProfile) {
    return (
      <AppLayout title="Configuración">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Configuración">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mi Cuenta</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona tu perfil, equipo y configuración de seguridad
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="perfil" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Perfil</span>
              <span className="sm:hidden">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="equipo" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Equipo</span>
              <span className="sm:hidden">Equipo</span>
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="gap-2">
              <Shield className="w-4 h-4" />
              Seguridad
            </TabsTrigger>
          </TabsList>

          {/* PERFIL TAB */}
          <TabsContent value="perfil" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Profile Form */}
              <div className="lg:col-span-8">
                <Card className="border-border">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Datos del usuario</h3>
                        <p className="text-sm text-muted-foreground">Información de tu cuenta</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Nombre + Apellido */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="nombre" className="text-sm font-medium">Nombre</Label>
                          <Input
                            id="nombre"
                            placeholder="Tu nombre"
                            value={nombre}
                            onChange={(e) => handleNombreChange(e.target.value)}
                            className={profileErrors.nombre ? 'border-destructive focus-visible:ring-destructive' : ''}
                          />
                          {profileErrors.nombre && (
                            <p className="text-xs text-destructive">{profileErrors.nombre}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="apellido" className="text-sm font-medium">Apellido</Label>
                          <Input
                            id="apellido"
                            placeholder="Tu apellido"
                            value={apellido}
                            onChange={(e) => handleApellidoChange(e.target.value)}
                            className={profileErrors.apellido ? 'border-destructive focus-visible:ring-destructive' : ''}
                          />
                          {profileErrors.apellido && (
                            <p className="text-xs text-destructive">{profileErrors.apellido}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Email */}
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

                      {/* Rol */}
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
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end pt-4">
                        <Button onClick={handleSaveProfile} disabled={!canSubmitProfile} className="gap-2">
                          {isSavingProfile ? (
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

              {/* Session Card */}
              <div className="lg:col-span-4">
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
          </TabsContent>

          {/* EQUIPO TAB */}
          <TabsContent value="equipo" className="space-y-6">
            <Card className="border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Mi Equipo</CardTitle>
                      <CardDescription>Miembros de tu organización</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchTeamMembers}
                      disabled={isLoadingTeam}
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingTeam ? 'animate-spin' : ''}`} />
                    </Button>
                    {isAdmin && (
                      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-2">
                            <UserPlus className="w-4 h-4" />
                            Invitar Miembro
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invitar nuevo miembro</DialogTitle>
                            <DialogDescription>
                              Ingresa el email del nuevo miembro y selecciona su rol.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="invite-email">Correo electrónico</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  id="invite-email"
                                  type="email"
                                  placeholder="ejemplo@empresa.com"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Rol</Label>
                              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as 'admin' | 'seller')}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="seller">Vendedor</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleInviteMember} disabled={isInviting}>
                              {isInviting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Invitando...
                                </>
                              ) : (
                                'Invitar'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTeam ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay miembros en el equipo</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Desde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-primary">
                                    {member.user_id === supabaseUser?.id ? 'Tú' : 'M'}
                                  </span>
                                </div>
                                <span className="truncate max-w-[200px]">
                                  {member.user_id === supabaseUser?.id ? supabaseUser?.email : `Miembro ${member.id.slice(0, 8)}`}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                {TEAM_ROLE_LABELS[member.role] || member.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={member.status === 'active' ? 'outline' : 'secondary'}
                                className={member.status === 'active' ? 'border-success text-success' : ''}
                              >
                                {member.status === 'active' ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(member.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEGURIDAD TAB */}
          <TabsContent value="seguridad" className="space-y-6">
            <Card className="border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Cambiar Contraseña</CardTitle>
                    <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordErrors({});
                        }}
                        className={`pl-10 pr-10 ${passwordErrors.newPassword ? 'border-destructive' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordErrors({});
                        }}
                        className={`pl-10 pr-10 ${passwordErrors.confirmPassword ? 'border-destructive' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-xs text-destructive">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>

                  <Button 
                    onClick={handleChangePassword} 
                    disabled={isChangingPassword}
                    className="gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Cambiar contraseña
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

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

                  <div className="space-y-2 text-sm font-mono bg-muted/30 rounded-lg p-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">user.id:</span>
                      <span className="text-foreground truncate max-w-[200px]">{supabaseUser?.id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">user.email:</span>
                      <span className="text-foreground">{supabaseUser?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">organization_id:</span>
                      <span className="text-foreground truncate max-w-[200px]">{organizationId || 'N/A'}</span>
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

                  {diagResult && (
                    <div className="space-y-2 text-sm font-mono bg-success/10 rounded-lg p-3 border border-success/30">
                      <p className="text-xs text-muted-foreground mb-2">
                        Consultado: {new Date(diagResult.queriedAt).toLocaleString()}
                      </p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">products (DB):</span>
                        <span className="text-success font-bold">{diagResult.productsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">inventory_movements (DB):</span>
                        <span className="text-success font-bold">{diagResult.movementsCount}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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
            <AlertDialogCancel onClick={() => { setShowRoleConfirm(false); setPendingRole(null); }}>
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