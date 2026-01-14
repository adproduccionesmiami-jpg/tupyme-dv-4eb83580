import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { FileText, Download, Calendar, Package, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoPremium from '@/assets/logo-tupyme-premium.png';

type PeriodType = 'today' | 'yesterday' | 'this_week' | 'this_month';

interface PeriodOption {
  value: PeriodType;
  label: string;
}

const periodOptions: PeriodOption[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'this_month', label: 'Este mes' },
];

function getPeriodDates(period: PeriodType): { start: Date; end: Date; label: string } {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now), label: 'Hoy' };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday), label: 'Ayer' };
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: 'Esta semana' };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'Este mes' };
    default:
      return { start: startOfDay(now), end: endOfDay(now), label: 'Hoy' };
  }
}

const formatDateShort = (date: Date) => format(date, 'dd MMM yyyy', { locale: es });
const formatDateTime = (date: Date) => format(date, 'dd MMM yyyy HH:mm', { locale: es });

const formatMoney = (value: number) => {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const loadImageAsDataUrl = async (src: string): Promise<string> => {
  const res = await fetch(src);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(blob);
  });
};

export default function Reportes() {
  const { products, movements } = useInventory();
  const { user, getRoleSnapshot } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('this_month');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const periodDates = useMemo(() => getPeriodDates(selectedPeriod), [selectedPeriod]);

  // Filter movements by period
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const movDate = new Date(m.fecha);
      return movDate >= periodDates.start && movDate <= periodDates.end;
    });
  }, [movements, periodDates]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalEvents = filteredMovements.length;
    const entradas = filteredMovements.filter(m => m.tipo === 'entrada');
    const salidas = filteredMovements.filter(m => m.tipo === 'salida');
    const ajustes = filteredMovements.filter(m => m.tipo === 'ajuste');

    const unitsIn = entradas.reduce((sum, m) => sum + m.cantidad, 0);
    const unitsOut = salidas.reduce((sum, m) => sum + m.cantidad, 0);

    // Calculate values if costo/precio exist
    let valorCostoEntradas = 0;
    let valorCostoSalidas = 0;
    let valorVentaSalidas = 0;

    entradas.forEach(m => {
      const product = products.find(p => p.id === m.productoId);
      if (product?.costo) valorCostoEntradas += m.cantidad * product.costo;
    });

    salidas.forEach(m => {
      const product = products.find(p => p.id === m.productoId);
      if (product?.costo) valorCostoSalidas += m.cantidad * product.costo;
      if (product?.precio) valorVentaSalidas += m.cantidad * product.precio;
    });

    return {
      totalEvents,
      entradasCount: entradas.length,
      salidasCount: salidas.length,
      ajustesCount: ajustes.length,
      unitsIn,
      unitsOut,
      valorCostoEntradas,
      valorCostoSalidas,
      valorVentaSalidas,
    };
  }, [filteredMovements, products]);

  // Top products
  const topProducts = useMemo(() => {
    const salidasByProduct: Record<number, number> = {};
    const entradasByProduct: Record<number, number> = {};

    filteredMovements.forEach(m => {
      if (m.tipo === 'salida') {
        salidasByProduct[m.productoId] = (salidasByProduct[m.productoId] || 0) + m.cantidad;
      } else if (m.tipo === 'entrada') {
        entradasByProduct[m.productoId] = (entradasByProduct[m.productoId] || 0) + m.cantidad;
      }
    });

    const topSalidas = Object.entries(salidasByProduct)
      .map(([id, qty]) => ({ product: products.find(p => p.id === Number(id)), qty }))
      .filter(x => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const topEntradas = Object.entries(entradasByProduct)
      .map(([id, qty]) => ({ product: products.find(p => p.id === Number(id)), qty }))
      .filter(x => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { topSalidas, topEntradas };
  }, [filteredMovements, products]);

  // Inventory snapshot - Aligned with Dashboard/Alertas rules
  // "Productos activos" = productos con stock disponible (>0), igual que KPI de Inicio
  const inventorySnapshot = useMemo(() => {
    const totalProducts = products.length;
    
    let valorCosto = 0;
    let valorVenta = 0;
    let sinStock = 0;
    let pocoStock = 0;
    let enStock = 0;
    let sobreStock = 0;

    products.forEach(p => {
      const stock = p.stock || 0;
      const costo = p.costo || 0;
      const precio = p.precio || 0;
      const minStock = p.minStock ?? 5;
      const maxStock = p.maxStock ?? 100;

      // Valores totales (solo productos con stock > 0)
      if (stock > 0) {
        valorCosto += stock * costo;
        valorVenta += stock * precio;
      }

      // Clasificación de stock (misma lógica que Alertas)
      if (stock === 0) {
        sinStock++;
      } else if (stock <= minStock) {
        pocoStock++;
      } else if (stock >= maxStock) {
        sobreStock++;
      } else {
        enStock++;
      }
    });

    // Productos activos = stock > 0 (disponible)
    const activeProducts = totalProducts - sinStock;

    return { totalProducts, activeProducts, valorCosto, valorVenta, sinStock, pocoStock, enStock, sobreStock };
  }, [products]);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;
      const headerLineY = 32;
      const contentStartY = 42;
      const totalPagesExp = '{total_pages_count_string}';

      const logoDataUrl = await loadImageAsDataUrl(logoPremium);

      const businessName = 'TuPyme';
      const periodText = `${periodDates.label} (${formatDateShort(periodDates.start)} — ${formatDateShort(periodDates.end)})`;
      const generatedBy = user?.email || 'Usuario';

      const drawPageHeader = () => {
        // Logo TuPyme Premium - proper sizing
        const logoHeight = 20;
        const logoWidth = 20;
        const logoX = marginX;
        const logoY = 8;
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);

        // Business + meta - positioned to the right of the logo
        const textStartX = marginX + logoWidth + 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(26, 54, 93); // TuPyme dark blue
        doc.text(businessName, textStartX, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(periodText, textStartX, 21);
        doc.text(`Generado: ${formatDateTime(new Date())}`, textStartX, 26);

        // Page number
        const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${pageNumber} de ${totalPagesExp}`, pageWidth - marginX, 18, { align: 'right' });

        // Reset text color
        doc.setTextColor(0, 0, 0);

        // Divider with brand color
        doc.setDrawColor(26, 54, 93);
        doc.setLineWidth(0.5);
        doc.line(marginX, headerLineY, pageWidth - marginX, headerLineY);
      };

      // Page 1 header
      drawPageHeader();
      let y = contentStartY;

      // Helper for centered text
      const centerText = (text: string, yPos: number, fontSize = 12) => {
        doc.setFontSize(fontSize);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, yPos);
      };

      const withHeader = {
        margin: { top: contentStartY, left: marginX, right: marginX },
        didDrawPage: () => {
          drawPageHeader();
        },
      };

      // A) Header (contenido)
      doc.setFont('helvetica', 'bold');
      centerText('REPORTE', y, 20);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      centerText(businessName, y);
      y += 6;
      centerText(`Generado: ${formatDateTime(new Date())}`, y);
      y += 6;
      centerText(`Período: ${periodText}`, y);
      y += 14;

      // B) Executive Summary - Movements
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Resumen de Movimientos', marginX, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const movementsSummary: Array<[string, string]> = [
        ['Total de movimientos (eventos)', stats.totalEvents.toString()],
        ['Entradas (eventos)', stats.entradasCount.toString()],
        ['Salidas (eventos)', stats.salidasCount.toString()],
        ['Ajustes (eventos)', stats.ajustesCount.toString()],
        ['Unidades que entraron', stats.unitsIn.toString()],
        ['Unidades que salieron', stats.unitsOut.toString()],
      ];

      if (stats.valorCostoEntradas > 0 || stats.valorCostoSalidas > 0) {
        movementsSummary.push(['Valor a costo (entradas)', formatMoney(stats.valorCostoEntradas)]);
        movementsSummary.push(['Valor a costo (salidas)', formatMoney(stats.valorCostoSalidas)]);
      }
      if (stats.valorVentaSalidas > 0) {
        movementsSummary.push(['Valor a venta (salidas)', formatMoney(stats.valorVentaSalidas)]);
      }

      autoTable(doc, {
        ...withHeader,
        startY: y,
        head: [['Métrica', 'Valor']],
        body: movementsSummary,
        theme: 'striped',
        headStyles: { fillColor: [26, 54, 93] }, // TuPyme dark blue
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // C) Top Products
      if (topProducts.topSalidas.length > 0 || topProducts.topEntradas.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Top Productos', marginX, y);
        y += 8;

        if (topProducts.topSalidas.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('Top 5 por Salidas', marginX, y);
          y += 4;

          autoTable(doc, {
            ...withHeader,
            startY: y,
            head: [['Producto', 'SKU', 'Unidades']],
            body: topProducts.topSalidas.map(x => [
              x.product?.nombre || '-',
              x.product?.sku || '-',
              x.qty.toString(),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68] },
          });
          y = (doc as any).lastAutoTable.finalY + 8;
        }

        if (topProducts.topEntradas.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('Top 5 por Entradas', marginX, y);
          y += 4;

          autoTable(doc, {
            ...withHeader,
            startY: y,
            head: [['Producto', 'SKU', 'Unidades']],
            body: topProducts.topEntradas.map(x => [
              x.product?.nombre || '-',
              x.product?.sku || '-',
              x.qty.toString(),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94] },
          });
          y = (doc as any).lastAutoTable.finalY + 12;
        }
      }

      // D) Inventory Snapshot
      if (y > 240) {
        doc.addPage();
        drawPageHeader();
        y = contentStartY;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Resumen de Inventario (Snapshot Actual)', marginX, y);
      y += 8;

      const inventorySummary: Array<[string, string]> = [
        ['Productos totales', inventorySnapshot.totalProducts.toString()],
        ['Productos activos', inventorySnapshot.activeProducts.toString()],
        ['Sin stock', inventorySnapshot.sinStock.toString()],
        ['Poco stock', inventorySnapshot.pocoStock.toString()],
        ['En stock', inventorySnapshot.enStock.toString()],
        ['Sobre stock', inventorySnapshot.sobreStock.toString()],
      ];

      if (inventorySnapshot.valorCosto > 0) {
        inventorySummary.push(['Valor total a costo', formatMoney(inventorySnapshot.valorCosto)]);
      }
      if (inventorySnapshot.valorVenta > 0) {
        inventorySummary.push(['Valor total a venta', formatMoney(inventorySnapshot.valorVenta)]);
      }

      autoTable(doc, {
        ...withHeader,
        startY: y,
        head: [['Métrica', 'Valor']],
        body: inventorySummary,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // TuPyme accent blue
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // E) Movement Details Table
      if (filteredMovements.length > 0) {
        if (y > 200) {
          doc.addPage();
          drawPageHeader();
          y = contentStartY;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Detalle de Movimientos', marginX, y);
        y += 8;

        const movementRows = filteredMovements
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .map(m => {
            const typeLabel = m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'salida' ? 'Salida' : 'Ajuste';
            // Clean display: product name only (no SKU or IDs)
            const productDisplay = m.productoNombre || 'Producto';
            return [
              formatDateTime(new Date(m.fecha)),
              typeLabel,
              productDisplay,
              m.cantidad.toString(),
              m.usuario || '-',
            ];
          });

        autoTable(doc, {
          ...withHeader,
          startY: y,
          head: [['Fecha/Hora', 'Tipo', 'Producto', 'Cant.', 'Usuario']],
          body: movementRows,
          theme: 'striped',
          headStyles: { fillColor: [26, 54, 93] }, // TuPyme dark blue
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 34 },
            1: { cellWidth: 20 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 15 },
            4: { cellWidth: 35 },
          },
        });
      }

      // Total pages
      const anyDoc = doc as any;
      if (typeof anyDoc.putTotalPages === 'function') {
        anyDoc.putTotalPages(totalPagesExp);
      }

      // Generate blob
      const blob = doc.output('blob');
      setPdfBlob(blob);
      toast.success('Reporte generado correctamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF descargado');
  };

  // Reset PDF when period changes
  const handlePeriodChange = (value: PeriodType) => {
    setSelectedPeriod(value);
    setPdfBlob(null);
  };

  return (
    <AppLayout title="Reportes">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Genera reportes y analiza el rendimiento de tu inventario.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-border/40 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Generar reporte
            </CardTitle>
            <CardDescription>
              Selecciona un período y genera un PDF con inventario y movimientos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Period Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período
              </label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Selecciona período" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {format(periodDates.start, "dd MMM yyyy", { locale: es })} — {format(periodDates.end, "dd MMM yyyy", { locale: es })}
              </p>
            </div>

            {/* Preview Stats - Using StatCard like Dashboard */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                title="Movimientos"
                value={stats.totalEvents}
                icon={ArrowUpDown}
                iconClassName="bg-primary/10 text-primary"
              />
              <StatCard
                title="Unid. entraron"
                value={stats.unitsIn}
                icon={ArrowUp}
                iconClassName="bg-success/10 text-success"
              />
              <StatCard
                title="Unid. salieron"
                value={stats.unitsOut}
                icon={ArrowDown}
                iconClassName="bg-destructive/10 text-destructive"
              />
              <StatCard
                title="Productos"
                value={inventorySnapshot.totalProducts}
                icon={Package}
                iconClassName="bg-accent/10 text-accent"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button 
                onClick={generatePDF} 
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                {isGenerating ? 'Generando...' : 'Generar reporte'}
              </Button>
              {pdfBlob && (
                <Button 
                  variant="outline" 
                  onClick={downloadPDF}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
