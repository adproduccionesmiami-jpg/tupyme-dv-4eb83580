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

const formatExpiryDisplay = (value: string) => {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
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
        colorClass: 'bg-info/10 text-info border-info/20',
        iconColorClass: 'text-info',
      };
    case 'vencimiento':
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
        const priorityOrder = { alta: 0, media: 1, baja: 2 };
        return priorityOrder[a.prioridad] - priorityOrder[b.prioridad];
      });
  }, [alerts, search, filterType]);

  const handleResolveAction = (productoSku: string) => {
    navigate(`/app/inventario?edit=${productoSku}`);
  };

  const kpiCards = [
    { key: 'sin_stock', label: 'Sin Stock', value: stats.sinStock, icon: XCircle, bgColor: 'bg-red-500/15', iconColor: 'text-red-400', borderColor: 'border-red-500/30' },
    { key: 'poco_stock', label: 'Poco Stock', value: stats.pocoStock, icon: TrendingDown, bgColor: 'bg-amber-500/15', iconColor: 'text-amber-400', borderColor: 'border-amber-500/30' },
    { key: 'sobre_stock', label: 'Sobre Stock', value: stats.sobreStock, icon: TrendingUp, bgColor: 'bg-blue-500/15', iconColor: 'text-blue-400', borderColor: 'border-blue-500/30' },
    { key: 'vencimiento', label: 'Vencimiento', value: stats.vencimiento, icon: Calendar, bgColor: 'bg-amber-500/15', iconColor: 'text-amber-400', borderColor: 'border-amber-500/30' },
    { key: 'all', label: 'Total Alertas', value: stats.total, icon: Package, bgColor: 'bg-muted/50', iconColor: 'text-muted-foreground', borderColor: 'border-border' },
  ];

  return (
    <AppLayout title="Alertas">
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Alertas de inventario que requieren atención.
            </p>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpiCards.map((kpi) => (
            <Card 
              key={kpi.key}
              className={`bg-card cursor-pointer transition-all hover:shadow-md ${
                filterType === kpi.key 
                  ? `ring-2 ring-offset-2 ring-offset-background ${kpi.borderColor} ${kpi.bgColor}` 
                  : 'border-border/50 hover:border-border'
              }`}
              onClick={() => setFilterType(filterType === kpi.key ? 'all' : kpi.key)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/50 border-border/50"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-muted/50 border-border/50">
              <SelectValue placeholder="Tipo de alerta" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
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
          <Card className="bg-card border-border/50">
            <CardContent className="p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BellOff className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-1">No hay alertas</h3>
              <p className="text-sm text-muted-foreground">
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
                <Card key={alert.id} className="bg-card border-border/50 transition-all hover:shadow-card-elevated hover:border-primary/30">
                  <CardContent className="p-0">
                    <div className={`px-4 py-2.5 border-b flex items-center justify-between ${typeConfig.colorClass}`}>
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
                        <h3 className="font-semibold text-foreground">{alert.productoNombre}</h3>
                        <Badge variant="outline" className="text-xs font-mono mt-1">{alert.productoSku}</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{alert.mensaje}</p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3.5 h-3.5" />
                          <span>Stock: <strong className="text-foreground">{alert.stockActual}</strong></span>
                        </div>
                        {alert.tipo === 'vencimiento' && alert.fechaVencimiento ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Vence: <strong className="text-foreground">{formatExpiryDisplay(alert.fechaVencimiento)}</strong></span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{format(new Date(alert.fecha), "d MMM", { locale: es })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
                      <Button 
                        size="sm" 
                        className="w-full gap-2"
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