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
    AlertTriangle,
    XCircle,
    Package,
    LayoutGrid,
    TrendingUp,
    ArrowUpCircle
} from 'lucide-react';
import { FilterType } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
    const filters: { key: FilterType; label: string; icon?: React.ReactNode; colorActive?: string; colorInactive?: string }[] = [
        { key: 'todos', label: 'Todos', icon: <LayoutGrid className="w-3.5 h-3.5" />, colorActive: 'bg-muted text-foreground', colorInactive: 'text-muted-foreground' },
        { key: 'poco-stock', label: 'Poco stock', icon: <AlertTriangle className="w-3.5 h-3.5" />, colorActive: 'bg-amber-500/20 text-amber-400 border-amber-500/30', colorInactive: 'text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10' },
        { key: 'sin-stock', label: 'Sin stock', icon: <XCircle className="w-3.5 h-3.5" />, colorActive: 'bg-red-500/20 text-red-400 border-red-500/30', colorInactive: 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10' },
        { key: 'sobre-stock', label: 'Sobre stock', icon: <ArrowUpCircle className="w-3.5 h-3.5" />, colorActive: 'bg-blue-500/20 text-blue-400 border-blue-500/30', colorInactive: 'text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10' },
        { key: 'mas-vendidos', label: 'Más vendidos', icon: <TrendingUp className="w-3.5 h-3.5" />, colorActive: 'bg-muted text-foreground', colorInactive: 'text-muted-foreground' },
    ];

    return (
        <div className="space-y-4 mb-6 animate-fade-in">
            {/* Page Header with H1 */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
                <p className="text-sm text-muted-foreground">
                    Gestiona productos, stock y existencias de tu negocio.
                </p>
            </div>

            {/* Stats & Actions Row */}
            {/* Top Row: Stats & Primary Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Stats Summary */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        {stats.total} productos
                    </Badge>
                    {stats.pocoStock > 0 && (
                        <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-400 bg-amber-500/10">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {stats.pocoStock} poco stock
                        </Badge>
                    )}
                    {stats.sinStock > 0 && (
                        <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold gap-1.5 border-red-500/30 text-red-400 bg-red-500/10">
                            <XCircle className="w-3.5 h-3.5" />
                            {stats.sinStock} sin stock
                        </Badge>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {canDownload && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 text-xs font-medium"
                            onClick={onDownloadInventory}
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Exportar</span>
                        </Button>
                    )}

                    {canDownload && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-medium">
                                    <FileDown className="w-4 h-4" />
                                    <span className="hidden sm:inline">Plantilla</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={onDownloadTemplateCSV}>
                                    <Download className="w-4 h-4" /> Plantilla CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={onDownloadTemplateXLSX}>
                                    <Download className="w-4 h-4" /> Plantilla Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {canUpload && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 text-xs font-medium"
                            onClick={onUploadClick}
                        >
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">Importar</span>
                        </Button>
                    )}

                    {canAdd && (
                        <Button
                            size="sm"
                            className="h-9 gap-2 text-xs font-semibold"
                            onClick={onAddProduct}
                        >
                            <Plus className="w-4 h-4" />
                            Agregar producto
                        </Button>
                    )}
                </div>
            </div>

            {/* Search & Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, código o categoría..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 h-10 text-sm"
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {filters.map((filter) => (
                        <Button
                            key={filter.key}
                            variant="ghost"
                            size="sm"
                            onClick={() => onFilterChange(filter.key)}
                            className={cn(
                                "h-9 px-3 gap-1.5 text-xs font-medium whitespace-nowrap transition-all border",
                                activeFilter === filter.key
                                    ? filter.colorActive + " border-current"
                                    : filter.colorInactive + " border-transparent"
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
