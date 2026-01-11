import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  Bell,
  User,
  LogOut,
  FileText,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logoMonocromatico from '@/assets/logo-monocromatico.png';
import { SidebarBrand } from './SidebarBrand';

// Logo storage utilities per tenant
const getLogoStorageKey = (tenantId: string) => `tupyme_tenant_logo_${tenantId}`;
const MAX_FILE_SIZE_MB = 2;
const NORMALIZED_SIZE = 512; // Retina quality for 64px display

const getTenantLogo = (tenantId: string): string | null => {
  try {
    return localStorage.getItem(getLogoStorageKey(tenantId));
  } catch {
    return null;
  }
};

const saveTenantLogo = (tenantId: string, dataUrl: string): void => {
  try {
    localStorage.setItem(getLogoStorageKey(tenantId), dataUrl);
  } catch (e) {
    console.error('Error saving logo:', e);
    toast.error('Error al guardar el logo. El archivo puede ser muy grande.');
  }
};

// Normalize image to NORMALIZED_SIZE x NORMALIZED_SIZE for retina quality
const normalizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = NORMALIZED_SIZE;
        canvas.height = NORMALIZED_SIZE;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se pudo crear el canvas'));
          return;
        }
        
        // Clear with transparency
        ctx.clearRect(0, 0, NORMALIZED_SIZE, NORMALIZED_SIZE);
        
        // Calculate scaling to fit and center (contain behavior)
        const scale = Math.min(NORMALIZED_SIZE / img.width, NORMALIZED_SIZE / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (NORMALIZED_SIZE - scaledWidth) / 2;
        const offsetY = (NORMALIZED_SIZE - scaledHeight) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        // Export as PNG for transparency support (better for logos)
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        resolve(dataUrl);
      };
      
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, permissions, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tenantId = user?.tenantId || 'default';
  const isAdmin = user?.role === 'admin';
  
  // Load custom logo from localStorage
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  
  useEffect(() => {
    const savedLogo = getTenantLogo(tenantId);
    setCustomLogo(savedLogo);
  }, [tenantId]);
  
  const handleLogoClick = () => {
    if (!isAdmin) {
      toast.info('Solo el administrador puede cambiar el logo');
      return;
    }
    fileInputRef.current?.click();
  };
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('Formato no válido. Sube un PNG o JPG.');
      e.target.value = '';
      return;
    }
    
    // Validate file size (max 2 MB)
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo es muy grande. Máximo ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = '';
      return;
    }
    
    try {
      const normalizedDataUrl = await normalizeImage(file);
      saveTenantLogo(tenantId, normalizedDataUrl);
      setCustomLogo(normalizedDataUrl);
      toast.success('Logo actualizado correctamente');
    } catch (error) {
      toast.error('Error al procesar la imagen');
      console.error('Logo upload error:', error);
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Navigation items - filtered by permissions
  const navItems = [
    { icon: LayoutDashboard, label: 'Inicio', path: '/app/dashboard', key: 'dashboard' as const },
    { icon: Package, label: 'Inventario', path: '/app/inventario', key: 'inventario' as const },
    { icon: ArrowLeftRight, label: 'Movimientos', path: '/app/movimientos', key: 'movimientos' as const },
    { icon: Bell, label: 'Alertas', path: '/app/alertas', key: 'alertas' as const },
    { icon: FileText, label: 'Reportes', path: '/app/reportes', key: 'reportes' as const },
    { icon: Settings, label: 'Configuración', path: '/app/configuracion', key: 'perfil' as const },
    { icon: User, label: 'Mi Perfil', path: '/app/mi-perfil', key: 'perfil' as const },
  ];

  // Filter items based on canView permissions
  const visibleNavItems = navItems.filter(item => {
    if (!permissions) return true; // Show all while loading
    return permissions.canView[item.key];
  });

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <>
      <SidebarBrand
        fileInputRef={fileInputRef}
        isAdmin={isAdmin}
        logoSrc={customLogo || logoMonocromatico}
        onLogoClick={handleLogoClick}
        onLogoUpload={handleLogoUpload}
      />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-[22px] h-[22px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
            navigate('/login');
          }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200 cursor-pointer active:scale-[0.98]"
        >
          <LogOut className="w-[22px] h-[22px]" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );
}
