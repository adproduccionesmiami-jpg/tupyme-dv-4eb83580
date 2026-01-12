import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Package, TrendingUp, ArrowDownUp, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Use dashboardStats from context (same source as Inventario/Alertas)
  const stats = useMemo(() => ({
    // "Productos activos" = productos con stock disponible (>0)
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

  // Map movements to table format (using context movements, same as Movimientos page)
  const recentActivity = useMemo(() => {
    // Get last 15 movements, already sorted by fecha desc in context
    return movements.slice(0, 15).map(m => ({
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
    },
    {
      title: 'Valor total en inventario',
      value: `$${valorInventario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      highlight: true,
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
      description: `${stats.entradasHoy} entradas, ${stats.salidasHoy} salidas${stats.ajustesHoy > 0 ? `, ${stats.ajustesHoy} ajustes` : ''}`,
      onClick: () => navigate('/app/movimientos?filter=hoy'),
    },
    {
      title: 'Total de productos',
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
        <span className="font-semibold text-foreground">{item.producto}</span>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (item: typeof recentActivity[0]) => {
        const config = {
          entrada: { icon: ArrowUpRight, class: 'bg-success/15 text-success border border-success/40' },
          salida: { icon: ArrowDownRight, class: 'bg-warning/15 text-warning border border-warning/40' },
          ajuste: { icon: RefreshCw, class: 'bg-primary/15 text-primary border border-primary/40' },
        }[item.tipo];
        const Icon = config.icon;
        return (
          <Badge variant="secondary" className={`${config.class} font-bold text-[11px] px-2.5 py-0.5`}>
            <Icon className="w-3.5 h-3.5 mr-1" strokeWidth={2.5} />
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
        <span className="font-bold text-foreground tabular-nums">{item.cantidad}</span>
      ),
    },
    { key: 'usuario', header: 'Usuario' },
    { key: 'fecha', header: 'Fecha', className: 'text-muted-foreground/70' },
  ];

  // Empty state for activity
  const EmptyActivity = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        <ArrowDownUp className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">Sin actividad reciente</h3>
      <p className="text-xs text-muted-foreground max-w-xs">
        Los movimientos de inventario aparecerán aquí cuando se registren entradas, salidas o ajustes.
      </p>
    </div>
  );

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8 animate-fade-in">
        {/* Main Stats Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <StatCard
                key={stat.title}
                {...stat}
                className="glass-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
                style={{ animationDelay: `${index * 60}ms` } as React.CSSProperties}
              />
            ))}
          </div>
        </section>

        {/* Alerts and Critical Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 glass-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Actividad Reciente</CardTitle>
                  <CardDescription className="text-xs">Últimos movimientos registrados en el sistema</CardDescription>
                </div>
                <Link
                  to="/app/movimientos"
                  className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors flex items-center gap-1 group"
                >
                  Ver historial
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
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

          {/* Alerts Sidebar */}
          <div className="space-y-6">
            <Card className="glass-card border-warning/20">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-warning flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Alertas Críticas
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Hoy</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-destructive">Sin Existencias</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{dashboardStats.sinStock}</p>
                  </div>
                  <Package className="w-8 h-8 text-destructive/20" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-warning">Bajo Stock</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{dashboardStats.pocoStock}</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-warning/20" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-primary">Por Vencer (14d)</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{dashboardStats.vencimiento}</p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-primary/20" />
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/app/alertas')}
                >
                  Gestionar todas las alertas →
                </Button>
              </CardContent>
            </Card>

            <div className="p-5 rounded-xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-card-hero relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-xs font-medium opacity-80 mb-1">Inversión Total</p>
                <p className="text-2xl font-bold mb-4">
                  ${dashboardStats.valorTotalCosto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <Button variant="secondary" size="sm" className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-white text-xs" onClick={() => navigate('/app/reportes')}>
                  Ver Reporte Financiero
                </Button>
              </div>
              <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
