import { ReactNode, useState, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    
    if (sidebarOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out",
          "w-[80%] max-w-[280px] lg:w-64 lg:max-w-none",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Close button for mobile */}
        <button
          onClick={handleCloseSidebar}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground lg:hidden z-10"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
        
        <AppSidebar onNavigate={handleCloseSidebar} />
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-64 min-w-0 flex flex-col min-h-screen">
        <AppHeader 
          title={title} 
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />
        <main className="flex-1 min-w-0">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}