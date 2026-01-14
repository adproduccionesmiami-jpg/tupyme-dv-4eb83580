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
    const filters: { key: FilterType; label: string; icon?: React.ReactNode }[] = [
        { key: 'todos', label: 'Todos', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
        { key: 'poco-stock', label: 'Poco stock', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
        { key: 'sin-stock', label: 'Sin stock', icon: <XCircle className="w-3.5 h-3.5" /> },
        { key: 'sobre-stock', label: 'Sobre stock', icon: <ArrowUpCircle className="w-3.5 h-3.5" /> },
        { key: 'mas-vendidos', label: 'Más vendidos', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="space-y-6 mb-6 animate-fade-in">
            {/* Top Row: Stats & Primary Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Stats Summary */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold gap-2">
                        <Package className="w-3.5 h-3.5" />
                        {stats.total} productos
                    </Badge>
                    {stats.pocoStock > 0 && (
                        <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold gap-2 border-warning/30 text-warning bg-warning/5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {stats.pocoStock} con poco stock
                        </Badge>
                    )}
                    {stats.sinStock > 0 && (
                        <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold gap-2 border-destructive/30 text-destructive bg-destructive/5">
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
                            variant={activeFilter === filter.key ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onFilterChange(filter.key)}
                            className={cn(
                                "h-9 px-3 gap-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                                activeFilter === filter.key
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
