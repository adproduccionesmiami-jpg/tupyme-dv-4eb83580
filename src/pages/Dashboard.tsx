import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { 
  Package, 
  TrendingUp, 
  ArrowDownUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  ArrowRight 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useInventory } from '@/contexts/InventoryContext';

export default function Dashboard() {
  const { products, movements, dashboardStats } = useInventory();
  const [usePrecioVenta, setUsePrecioVenta] = useState(false);
  const navigate = useNavigate();

  const stats = useMemo(() => ({
    productosActivos: dashboardStats.productosActivos,
    totalProductos: products.length,
    valorTotalCosto: dashboardStats.valorTotalCosto,
    valorTotalPrecio: dashboardStats.valorTotalPrecio,
    movimientosHoy: dashboardStats.movimientosHoy,
    entradasHoy: dashboardStats.entradasHoy,
    salidasHoy: dashboardStats.salidasHoy,
    ajustesHoy: movements.filter(m => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const movDate = new Date(m.fecha);
      movDate.setHours(0, 0, 0, 0);
      return movDate.getTime() === today.getTime() && m.tipo === 'ajuste';
    }).length,
  }), [products, movements, dashboardStats]);

  const recentActivity = useMemo(() => {
    return movements.slice(0, 10).map(m => ({
      id: m.id,
      producto: m.productoNombre,
      tipo: m.tipo,
      cantidad: m.cantidad,
      fecha: format(new Date(m.fecha), "d MMM, HH:mm", { locale: es }),
      usuario: m.usuario.split('@')[0] || 'Usuario',
    }));
  }, [movements]);

  const valorInventario = usePrecioVenta
    ? stats.valorTotalPrecio
    : stats.valorTotalCosto;

  const statCards = useMemo(() => [
    {
      title: 'Productos activos',
      value: stats.productosActivos.toString(),
      icon: Package,
      onClick: () => navigate('/app/inventario?filter=activos'),
      highlight: true,
    },
    {
      title: 'Valor total inventario',
      value: `$${valorInventario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      hideIcon: true,
      onClick: () => navigate('/app/inventario'),
      customContent: (
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Switch
            id="valor-toggle"
            checked={usePrecioVenta}
            onCheckedChange={setUsePrecioVenta}
            className="scale-75"
          />
          <Label htmlFor="valor-toggle" className="text-xs text-muted-foreground cursor-pointer">
            {usePrecioVenta ? 'Por precio' : 'Por costo'}
          </Label>
        </div>
      ),
    },
    {
      title: 'Movimientos hoy',
      value: stats.movimientosHoy.toString(),
      icon: ArrowDownUp,
      description: `${stats.entradasHoy} entradas, ${stats.salidasHoy} salidas`,
      onClick: () => navigate('/app/movimientos?filter=hoy'),
    },
    {
      title: 'Total productos',
      value: stats.totalProductos.toString(),
      icon: TrendingUp,
      onClick: () => navigate('/app/inventario'),
    },
  ], [stats, valorInventario, usePrecioVenta, navigate]);

  const columns = [
    {
      key: 'producto',
      header: 'Producto',
      render: (item: typeof recentActivity[0]) => (
        <span className="font-medium text-foreground">{item.producto}</span>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (item: typeof recentActivity[0]) => {
        const config = {
          entrada: { icon: ArrowUpRight, class: 'bg-success/10 text-success border-success/30' },
          salida: { icon: ArrowDownRight, class: 'bg-warning/10 text-warning border-warning/30' },
          ajuste: { icon: RefreshCw, class: 'bg-info/10 text-info border-info/30' },
        }[item.tipo];
        const Icon = config.icon;
        return (
          <Badge variant="outline" className={`${config.class} text-xs font-medium`}>
            <Icon className="w-3 h-3 mr-1" />
            {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      className: 'text-center',
      render: (item: typeof recentActivity[0]) => (
        <span className="font-semibold text-foreground tabular-nums">{item.cantidad}</span>
      ),
    },
    { key: 'usuario', header: 'Usuario' },
    { key: 'fecha', header: 'Fecha', className: 'text-muted-foreground' },
  ];

  const EmptyActivity = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">Sin actividad reciente</h3>
      <p className="text-xs text-muted-foreground max-w-xs">
        Los movimientos aparecerán aquí cuando se registren.
      </p>
    </div>
  );

  return (
    <AppLayout title="Inicio">
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inicio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Resumen de tu inventario y actividad reciente.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/app/inventario')} className="gap-2">
              <Package className="w-4 h-4" />
              Ir a Inventario
            </Button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <StatCard
              key={stat.title}
              {...stat}
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Table */}
          <Card className="lg:col-span-2 bg-card border-border/50 shadow-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Actividad Reciente</CardTitle>
                <Link
                  to="/app/movimientos"
                  className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline flex items-center gap-1.5 group transition-colors"
                >
                  Ver todo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <EmptyActivity />
              ) : (
                <DataTable columns={columns} data={recentActivity} />
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Sidebar */}
          <div className="space-y-4">
            {/* Critical Alerts */}
            <Card className="bg-card border-border/50 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Alertas Críticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/15 border border-red-500/30">
                  <div>
                    <p className="text-xs font-semibold text-red-400">Sin Stock</p>
                    <p className="text-xl font-bold text-foreground">{dashboardStats.sinStock}</p>
                  </div>
                  <Package className="w-6 h-6 text-red-400/60" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/15 border border-amber-500/30">
                  <div>
                    <p className="text-xs font-semibold text-amber-400">Poco Stock</p>
                    <p className="text-xl font-bold text-foreground">{dashboardStats.pocoStock}</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-amber-400/60" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/15 border border-amber-500/30">
                  <div>
                    <p className="text-xs font-semibold text-amber-400">Por Vencer</p>
                    <p className="text-xl font-bold text-foreground">{dashboardStats.vencimiento}</p>
                  </div>
                  <RefreshCw className="w-6 h-6 text-amber-400/60" />
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-sm font-medium hover:bg-muted/50"
                  onClick={() => navigate('/app/alertas')}
                >
                  Ver todas las alertas →
                </Button>
              </CardContent>
            </Card>

            {/* Total Investment Card - Compact */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Inversión Total</p>
              <p className="text-lg font-bold text-foreground mb-2">
                ${dashboardStats.valorTotalCosto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => navigate('/app/reportes')}
              >
                Ver Reporte Financiero
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}