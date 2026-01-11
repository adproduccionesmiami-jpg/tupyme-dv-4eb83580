import type { ChangeEvent, RefObject } from "react";
import { cn } from "@/lib/utils";

interface SidebarBrandProps {
  fileInputRef: RefObject<HTMLInputElement>;
  isAdmin: boolean;
  logoSrc: string;
  onLogoClick: () => void;
  onLogoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * SidebarBrand - SINGLE SOURCE OF TRUTH for the sidebar logo.
 * 
 * TAMAÑOS FIJOS (INAMOVIBLES):
 * - Sidebar expandido: contenedor h-[44px], logo h-[36px]
 * - Sidebar colapsado: logo h-[28px]
 * - flex-shrink-0 SIEMPRE para evitar que encoja
 * - object-contain para mantener proporción
 * 
 * NO MODIFICAR estos valores sin aprobación explícita.
 */
export function SidebarBrand({
  fileInputRef,
  isAdmin,
  logoSrc,
  onLogoClick,
  onLogoUpload,
}: SidebarBrandProps) {
  return (
    <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={onLogoUpload}
          className="hidden"
        />

        {/* 
          Logo container - TAMAÑO FIJO INAMOVIBLE
          - Altura fija: 44px (contenedor)
          - Logo interno: 36px de alto, ancho auto
          - flex-shrink-0: PROHIBIDO encoger
          - object-contain: mantener proporción sin recortes
        */}
        <button
          type="button"
          onClick={onLogoClick}
          className={cn(
            // Contenedor fijo 44x44px - NO MODIFICAR
            "h-[44px] w-[44px]",
            "min-h-[44px] min-w-[44px]",
            // Prohibir shrink bajo cualquier circunstancia
            "flex-shrink-0 shrink-0 flex-none",
            // Estilos visuales
            "rounded-xl bg-sidebar-accent/20 flex items-center justify-center p-1",
            "shadow-md border border-border/20 transition-all duration-200",
            isAdmin
              ? "cursor-pointer hover:bg-sidebar-accent/40 hover:shadow-lg hover:scale-105"
              : "cursor-default"
          )}
          title={
            isAdmin
              ? "Click para cambiar logo"
              : "Solo el administrador puede cambiar el logo"
          }
        >
          {/* 
            Imagen del logo - ALTO FIJO 36px
            - h-[36px]: altura fija inamovible
            - w-auto: ancho automático para mantener proporción
            - object-contain: sin recortes
          */}
          <img
            src={logoSrc}
            alt="Logo del negocio"
            className="h-[36px] w-auto max-w-full object-contain flex-shrink-0"
          />
        </button>

        <span className="text-lg font-bold text-sidebar-foreground tracking-tight flex-shrink-0">
          TuPyme
        </span>
      </div>
    </div>
  );
}
