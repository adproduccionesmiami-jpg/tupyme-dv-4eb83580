import { ReactNode, useState, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    
    if (sidebarOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when sidebar is open on mobile
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Close sidebar on route change (handled by clicking nav links)
  const handleCloseSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Mobile/Tablet Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={handleCloseSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Fixed on desktop, drawer (80% width) on mobile/tablet */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out",
          // Width: 80% on mobile, fixed 256px on desktop
          "w-[80%] max-w-[280px] lg:w-64 lg:max-w-none",
          // Desktop: always visible
          "lg:translate-x-0",
          // Mobile/Tablet: hidden by default, shown when open
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Close button for mobile */}
        <button
          onClick={handleCloseSidebar}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-sidebar-accent/50 text-sidebar-foreground lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
        
        <AppSidebar onNavigate={handleCloseSidebar} />
      </aside>

      {/* Main Content Area - flex-1 + min-w-0 prevents overflow */}
      <div className="lg:ml-64 min-w-0 flex flex-col min-h-screen">
        <AppHeader 
          title={title} 
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />
        <main className="flex-1 min-w-0">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
