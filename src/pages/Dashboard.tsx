import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Package, TrendingUp, ArrowDownUp, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
    <AppLayout title="Inicio">
      <div className="space-y-10">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <StatCard
                key={stat.title}
                {...stat}
                style={{ animationDelay: `${index * 60}ms` } as React.CSSProperties}
              />
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Actividad reciente</h2>
            <Link 
              to="/app/movimientos" 
              className="text-xs font-semibold text-accent hover:text-accent/70 transition-colors flex items-center gap-1 group"
            >
              Ver todo 
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
          
          {recentActivity.length === 0 ? (
            <EmptyActivity />
          ) : (
            <DataTable columns={columns} data={recentActivity} />
          )}
        </section>
      </div>
    </AppLayout>
  );
}
