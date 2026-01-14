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

// Logo storage utilities per tenant
const getLogoStorageKey = (tenantId: string) => `tupyme_tenant_logo_${tenantId}`;
const MAX_FILE_SIZE_MB = 2;
const NORMALIZED_SIZE = 512;

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
        
        ctx.clearRect(0, 0, NORMALIZED_SIZE, NORMALIZED_SIZE);
        const scale = Math.min(NORMALIZED_SIZE / img.width, NORMALIZED_SIZE / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (NORMALIZED_SIZE - scaledWidth) / 2;
        const offsetY = (NORMALIZED_SIZE - scaledHeight) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
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
    
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('Formato no válido. Sube un PNG o JPG.');
      e.target.value = '';
      return;
    }
    
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
    
    e.target.value = '';
  };

  // Navigation items organized by section
  type NavKey = 'dashboard' | 'inventario' | 'movimientos' | 'alertas' | 'reportes' | 'perfil';

  interface NavItem {
    icon: typeof LayoutDashboard;
    label: string;
    path: string;
    key: NavKey;
  }

  const menuItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Inicio', path: '/app/dashboard', key: 'dashboard' },
    { icon: Package, label: 'Inventario', path: '/app/inventario', key: 'inventario' },
    { icon: ArrowLeftRight, label: 'Movimientos', path: '/app/movimientos', key: 'movimientos' },
    { icon: Bell, label: 'Alertas', path: '/app/alertas', key: 'alertas' },
    { icon: FileText, label: 'Reportes', path: '/app/reportes', key: 'reportes' },
  ];

  const generalItems: NavItem[] = [
    { icon: Settings, label: 'Configuración', path: '/app/configuracion', key: 'perfil' },
  ];

  const filterItems = (items: NavItem[]) => 
    items.filter(item => {
      if (!permissions) return true;
      return permissions.canView[item.key];
    });

  const visibleMenuItems = filterItems(menuItems);
  const visibleGeneralItems = filterItems(generalItems);

  const handleNavClick = () => {
    onNavigate?.();
  };

  const NavItem = ({ item }: { item: typeof menuItems[0] }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={handleNavClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleLogoUpload}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={handleLogoClick}
          className={cn(
            "h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0",
            "rounded-xl bg-primary/10 flex items-center justify-center",
            "border border-primary/20 transition-all duration-200",
            isAdmin
              ? "cursor-pointer hover:bg-primary/20 hover:scale-105"
              : "cursor-default"
          )}
          title={isAdmin ? "Click para cambiar logo" : "Solo el administrador puede cambiar el logo"}
        >
          <img
            src={customLogo || logoMonocromatico}
            alt="Logo"
            className="h-7 w-auto object-contain"
          />
        </button>

        <span className="ml-3 text-lg font-bold text-foreground tracking-tight">
          TuPyme
        </span>
      </div>

      {/* Menu Section */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Menú
          </p>
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>
        </div>

        {/* General Section */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            General
          </p>
          <nav className="space-y-1">
            {visibleGeneralItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>
        </div>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
            navigate('/login');
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}