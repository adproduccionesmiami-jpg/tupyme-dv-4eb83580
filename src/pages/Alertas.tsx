import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  XCircle,
  TrendingDown,
  TrendingUp,
  Calendar,
  Package,
  Clock,
  BellOff,
  Wrench,
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProductAlerts, AlertType, AlertPriority, ProductAlert } from '@/hooks/useProductAlerts';

// ============= HELPERS =============

const formatExpiryDisplay = (value: string) => {
  // If it's already dd/MM/yyyy (from UI/local), just display it.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

  // If it's ISO (YYYY-MM-DD), format safely without new Date(string)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return format(parseISO(value), 'dd/MM/yyyy');
  }

  return value;
};

const getAlertTypeConfig = (tipo: AlertType, alert?: ProductAlert) => {
  switch (tipo) {
    case 'sin_stock':
      return { 
        label: 'Sin Stock', 
        icon: XCircle, 
        colorClass: 'bg-destructive/10 text-destructive border-destructive/20',
        iconColorClass: 'text-destructive',
      };
    case 'poco_stock':
      return { 
        label: 'Poco Stock', 
        icon: TrendingDown, 
        colorClass: 'bg-warning/10 text-warning border-warning/20',
        iconColorClass: 'text-warning',
      };
    case 'sobre_stock':
      return { 
        label: 'Sobre Stock', 
        icon: TrendingUp, 
        colorClass: 'bg-primary/10 text-primary border-primary/20',
        iconColorClass: 'text-primary',
      };
    case 'vencimiento':
      // Vencido (rojo) vs Por vencer (amarillo)
      const isExpired = alert?.diasRestantes !== undefined && alert.diasRestantes < 0;
      return { 
        label: isExpired ? 'Vencido' : 'Por vencer', 
        icon: Calendar, 
        colorClass: isExpired 
          ? 'bg-destructive/10 text-destructive border-destructive/20'
          : 'bg-warning/10 text-warning border-warning/20',
        iconColorClass: isExpired ? 'text-destructive' : 'text-warning',
      };
  }
};

const getPriorityConfig = (prioridad: AlertPriority) => {
  switch (prioridad) {
    case 'alta':
      return { label: 'Alta', colorClass: 'bg-destructive/10 text-destructive border-destructive/30' };
    case 'media':
      return { label: 'Media', colorClass: 'bg-warning/10 text-warning border-warning/30' };
    case 'baja':
      return { label: 'Baja', colorClass: 'bg-muted text-muted-foreground border-muted-foreground/30' };
  }
};

// ============= COMPONENT =============

export default function Alertas() {
  const navigate = useNavigate();
  const { alerts, stats, isLoading, refetch } = useProductAlerts();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter(alert => {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          alert.productoNombre.toLowerCase().includes(searchLower) ||
          alert.productoSku.toLowerCase().includes(searchLower);
        const matchesType = filterType === 'all' || alert.tipo === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        // Priority: alta > media > baja
        const priorityOrder = { alta: 0, media: 1, baja: 2 };
        return priorityOrder[a.prioridad] - priorityOrder[b.prioridad];
      });
  }, [alerts, search, filterType]);

  // ============= HANDLERS =============

  const handleResolveAction = (productoSku: string) => {
    navigate(`/app/inventario?edit=${productoSku}`);
  };

  return (
    <AppLayout title="Alertas">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <Card 
            className={`border-border cursor-pointer transition-all hover:border-destructive/50 hover:shadow-md ${filterType === 'sin_stock' ? 'ring-2 ring-destructive border-destructive' : ''}`}
            onClick={() => setFilterType(filterType === 'sin_stock' ? 'all' : 'sin_stock')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sin Stock</p>
                <p className="text-2xl font-bold text-foreground">{stats.sinStock}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`border-border cursor-pointer transition-all hover:border-warning/50 hover:shadow-md ${filterType === 'poco_stock' ? 'ring-2 ring-warning border-warning' : ''}`}
            onClick={() => setFilterType(filterType === 'poco_stock' ? 'all' : 'poco_stock')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Poco Stock</p>
                <p className="text-2xl font-bold text-foreground">{stats.pocoStock}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`border-border cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${filterType === 'sobre_stock' ? 'ring-2 ring-primary border-primary' : ''}`}
            onClick={() => setFilterType(filterType === 'sobre_stock' ? 'all' : 'sobre_stock')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sobre Stock</p>
                <p className="text-2xl font-bold text-foreground">{stats.sobreStock}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`border-border cursor-pointer transition-all hover:border-warning/50 hover:shadow-md ${filterType === 'vencimiento' ? 'ring-2 ring-warning border-warning' : ''}`}
            onClick={() => setFilterType(filterType === 'vencimiento' ? 'all' : 'vencimiento')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencimiento</p>
                <p className="text-2xl font-bold text-foreground">{stats.vencimiento}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`border-border cursor-pointer transition-all hover:border-success/50 hover:shadow-md ${filterType === 'all' ? 'ring-2 ring-success border-success' : ''}`}
            onClick={() => setFilterType('all')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Alertas</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Panel de Alertas</h2>
            <p className="text-sm text-muted-foreground">Alertas de inventario que requieren atención (desde BD)</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de alerta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="sin_stock">Sin Stock</SelectItem>
              <SelectItem value="poco_stock">Poco Stock</SelectItem>
              <SelectItem value="sobre_stock">Sobre Stock</SelectItem>
              <SelectItem value="vencimiento">Vencimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alerts Grid */}
        {filteredAlerts.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <BellOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No hay alertas</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                ¡Excelente! No hay alertas de inventario pendientes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAlerts.map((alert) => {
              const typeConfig = getAlertTypeConfig(alert.tipo, alert);
              const priorityConfig = getPriorityConfig(alert.prioridad);
              const TypeIcon = typeConfig.icon;
              
              return (
                <Card key={alert.id} className="border-border transition-all group hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5">
                  <CardContent className="p-0">
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${typeConfig.colorClass}`}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className={`w-4 h-4 ${typeConfig.iconColorClass}`} />
                        <span className="font-medium text-sm">{typeConfig.label}</span>
                      </div>
                      <Badge variant="outline" className={`text-xs ${priorityConfig.colorClass}`}>
                        {priorityConfig.label}
                      </Badge>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground leading-tight">{alert.productoNombre}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs font-mono">{alert.productoSku}</Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{alert.mensaje}</p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3.5 h-3.5" />
                          <span>Stock: <strong className="text-foreground">{alert.stockActual}</strong></span>
                        </div>
                        {/* Show expiration date for vencimiento alerts with debug info */}
                        {alert.tipo === 'vencimiento' && alert.fechaVencimiento ? (
                          <div className="flex flex-col items-end gap-0.5 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>
                                Vence: <strong className="text-foreground">{formatExpiryDisplay(alert.fechaVencimiento)}</strong>
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/70">Días: {alert.diasRestantes}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{format(new Date(alert.fecha), "d MMM", { locale: es })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 border-t border-border/50 bg-muted/10 flex items-center justify-center">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="gap-2 px-6 bg-success hover:bg-success/90"
                        onClick={() => handleResolveAction(alert.productoSku)}
                      >
                        <Wrench className="w-4 h-4" />
                        Resolver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
