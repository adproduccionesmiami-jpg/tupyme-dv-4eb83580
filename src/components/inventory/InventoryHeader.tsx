import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    Search,
    Download,
    Upload,
    FileDown,
    Filter,
    AlertTriangle,
    XCircle,
    Package,
    LayoutGrid,
    TrendingUp,
    ArrowUpCircle
} from 'lucide-react';
import { FilterType } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface InventoryHeaderProps {
    search: string;
    onSearchChange: (value: string) => void;
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    onAddProduct: () => void;
    onDownloadInventory: () => void;
    onDownloadTemplateCSV: () => void;
    onDownloadTemplateXLSX: () => void;
    onUploadClick: () => void;
    canAdd: boolean;
    canDownload: boolean;
    canUpload: boolean;
    stats: {
        total: number;
        pocoStock: number;
        sinStock: number;
    };
}

export function InventoryHeader({
    search,
    onSearchChange,
    activeFilter,
    onFilterChange,
    onAddProduct,
    onDownloadInventory,
    onDownloadTemplateCSV,
    onDownloadTemplateXLSX,
    onUploadClick,
    canAdd,
    canDownload,
    canUpload,
    stats
}: InventoryHeaderProps) {
    const filters: { key: FilterType; label: string; icon?: React.ReactNode }[] = [
        { key: 'todos', label: 'Todos', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
        { key: 'poco-stock', label: 'Poco stock', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
        { key: 'sin-stock', label: 'Sin stock', icon: <XCircle className="w-3.5 h-3.5" /> },
        { key: 'sobre-stock', label: 'Sobre stock', icon: <ArrowUpCircle className="w-3.5 h-3.5" /> },
        { key: 'mas-vendidos', label: 'Más vendidos', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="space-y-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Top Row: Title, Stats & Primary Actions */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 rounded-[1.25rem] bg-primary shadow-xl shadow-primary/20 text-primary-foreground transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <Package className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tighter text-foreground leading-none">Gestión de Inventario</h2>
                            <p className="text-muted-foreground font-bold text-sm mt-1.5 uppercase tracking-widest opacity-70">TuPyme SaaS / Control de Stock</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/50 text-[10px] font-black uppercase tracking-[0.15em] text-secondary-foreground border-2 border-border/10 backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            {stats.total} PRODUCTOS TOTALES
                        </div>
                        {stats.pocoStock > 0 && (
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-[10px] font-black uppercase tracking-[0.15em] text-amber-600 border-2 border-amber-500/20">
                                <AlertTriangle className="w-3 h-3" />
                                {stats.pocoStock} ALERTAS
                            </div>
                        )}
                        {stats.sinStock > 0 && (
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 text-[10px] font-black uppercase tracking-[0.15em] text-rose-600 border-2 border-rose-500/20">
                                <XCircle className="w-3 h-3" />
                                {stats.sinStock} AGOTADOS
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-muted/10 p-1.5 rounded-[1.5rem] border-2 border-border/10 backdrop-blur-xl">
                        {canDownload && (
                            <Button
                                variant="ghost"
                                className="h-11 px-5 gap-3 text-xs font-black uppercase tracking-wider hover:bg-background hover:shadow-xl transition-all rounded-[1rem]"
                                onClick={onDownloadInventory}
                            >
                                <Download className="w-4 h-4 text-primary" />
                                <span className="hidden md:inline">Exportar</span>
                            </Button>
                        )}

                        {canDownload && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-11 px-5 gap-3 text-xs font-black uppercase tracking-wider hover:bg-background hover:shadow-xl transition-all rounded-[1rem]">
                                        <FileDown className="w-4 h-4 text-primary" />
                                        <span className="hidden md:inline">Plantillas</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-3 rounded-2xl backdrop-blur-3xl bg-background/95 border-2 border-border/10 shadow-2xl">
                                    <DropdownMenuItem className="rounded-xl py-3 gap-3 cursor-pointer font-bold text-sm focus:bg-primary/10" onClick={onDownloadTemplateCSV}>
                                        <Download className="w-4 h-4" /> Plantilla CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl py-3 gap-3 cursor-pointer font-bold text-sm focus:bg-primary/10" onClick={onDownloadTemplateXLSX}>
                                        <Download className="w-4 h-4" /> Plantilla Excel
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {canUpload && (
                            <Button
                                variant="ghost"
                                className="h-11 px-5 gap-3 text-xs font-black uppercase tracking-wider hover:bg-background hover:shadow-xl transition-all rounded-[1rem]"
                                onClick={onUploadClick}
                            >
                                <Upload className="w-4 h-4 text-primary" />
                                <span className="hidden md:inline">Importar</span>
                            </Button>
                        )}
                    </div>

                    {canAdd && (
                        <Button
                            className="h-14 px-8 gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-[1.5rem] shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-[1.05] active:scale-95 text-base"
                            onClick={onAddProduct}
                        >
                            <Plus className="w-6 h-6 stroke-[3px]" />
                            Nuevo Producto
                        </Button>
                    )}
                </div>
            </div>

            {/* Bottom Row: Search & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-[2.5rem] bg-muted/5 border-2 border-border/10 backdrop-blur-sm">
                <div className="md:col-span-7 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                    <Input
                        placeholder="Buscar por nombre, SKU o categoría..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-14 h-14 bg-background/50 border-2 border-transparent focus:border-primary/20 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-[1.5rem] text-lg font-bold"
                    />
                </div>

                <div className="md:col-span-5 flex items-center justify-end gap-2 overflow-x-auto pb-2 md:pb-0 scroll-hide">
                    {filters.map((filter) => (
                        <Button
                            key={filter.key}
                            variant={activeFilter === filter.key ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onFilterChange(filter.key)}
                            className={cn(
                                "h-14 px-6 gap-2.5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap border-2",
                                activeFilter === filter.key
                                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 border-primary"
                                    : "bg-background/40 text-muted-foreground/60 hover:bg-background hover:text-foreground border-transparent hover:border-border/20 md:border-2"
                            )}
                        >
                            {filter.icon}
                            {filter.label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
