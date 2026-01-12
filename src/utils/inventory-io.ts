import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Product, isCategoriaPerecederera } from '@/types/inventory';

// Canonical CSV headers for import/export (v1)
export const CSV_HEADERS = ['sku', 'nombre', 'categoria', 'formato', 'costo', 'precio_venta', 'stock', 'min_stock', 'max_stock', 'fecha_vencimiento', 'activo', 'notas'] as const;

// Template headers for download (user-friendly names)
export const TEMPLATE_HEADERS = ['SKU', 'Nombre', 'Formato', 'Categoría', 'Stock', 'Stock mínimo', 'Stock máximo', 'Vencimiento', 'Costo', 'Precio'];

// Normalize header names (trim, lowercase, handle common variations)
export const normalizeHeader = (header: string): string => {
    const h = header.trim().toLowerCase().replace(/\s+/g, '_');
    const headerMap: Record<string, string> = {
        'precio': 'precio_venta',
        'precioventa': 'precio_venta',
        'precio_de_venta': 'precio_venta',
        'minstock': 'min_stock',
        'min': 'min_stock',
        'maxstock': 'max_stock',
        'max': 'max_stock',
        'fechavencimiento': 'fecha_vencimiento',
        'vencimiento': 'fecha_vencimiento',
        'expiration': 'fecha_vencimiento',
        'expiration_date': 'fecha_vencimiento',
        'presentacion': 'formato',
        'unit': 'formato',
        'unidad': 'formato',
    };
    return headerMap[h] || h;
};

// Normalize decimal (handle comma as decimal separator)
export const normalizeDecimal = (value: string | number | undefined): number => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;
    const normalized = value.toString().replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
};

// Validate and parse integer
export const parseInteger = (value: string | number | undefined): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'number') return Math.floor(value);
    const normalized = value.toString().replace(/[^\d]/g, '');
    if (!normalized) return undefined;
    return parseInt(normalized, 10);
};

// Parse date (handle YYYY-MM-DD string and Excel serial dates)
export const parseDate = (value: string | number | undefined): string | undefined => {
    if (value === undefined || value === null || value === '') return undefined;

    if (typeof value === 'number' && value > 0) {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + value * 86400000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const str = value.toString().trim();
    if (!str) return undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return str;
    }

    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return undefined;
};

// Parse boolean (TRUE/FALSE, true/false, 1/0, si/no)
export const parseBoolean = (value: string | number | boolean | undefined): boolean => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const str = value.toString().toLowerCase().trim();
    return !['false', '0', 'no', 'n', 'falso'].includes(str);
};

// Detect CSV separator
export const detectSeparator = (text: string): ',' | ';' => {
    const firstLine = text.split('\n')[0] || '';
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    return semicolons > commas ? ';' : ',';
};

// Remove BOM from UTF-8 text
const removeBOM = (text: string): string => {
    if (text.charCodeAt(0) === 0xFEFF) {
        return text.slice(1);
    }
    return text;
};

// Parse CSV text
export const parseCSV = (text: string): Record<string, string>[] => {
    const cleanText = removeBOM(text);
    const separator = detectSeparator(cleanText);

    const result = Papa.parse(cleanText, {
        header: true,
        skipEmptyLines: true,
        delimiter: separator,
        transformHeader: (header) => normalizeHeader(header),
    });

    return result.data as Record<string, string>[];
};

// Parse XLSX file
export const parseXLSX = async (file: File): Promise<Record<string, any>[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                let sheetName = workbook.SheetNames.find(name =>
                    name.toLowerCase().includes('inventario')
                );
                if (!sheetName) {
                    sheetName = workbook.SheetNames[0];
                }

                if (!sheetName) {
                    reject(new Error('No se encontró ninguna hoja en el archivo'));
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

                const normalizedData = jsonData.map((row: any) => {
                    const normalized: Record<string, any> = {};
                    for (const key of Object.keys(row)) {
                        normalized[normalizeHeader(key)] = row[key];
                    }
                    return normalized;
                });

                resolve(normalizedData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsArrayBuffer(file);
    });
};

// Get stock status with label and variant
export const getStockStatus = (product: { stock: number; minStock?: number; maxStock?: number }): { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' } => {
    const { stock, minStock, maxStock } = product;
    const effectiveMinStock = minStock ?? 10;
    if (stock === 0) return { label: 'Sin stock', variant: 'destructive' };
    if (stock <= effectiveMinStock) return { label: 'Poco stock', variant: 'warning' };
    if (maxStock !== undefined && stock >= maxStock) return { label: 'Sobre stock', variant: 'secondary' };
    return { label: 'En stock', variant: 'success' };
};

// Process imported data and create products
export const processImportData = (data: Record<string, any>[], mode: 'add' | 'replace', currentProducts: Product[]) => {
    const errorMessages: string[] = [];
    const newProducts: Product[] = [];
    const baseId = mode === 'replace'
      ? 1
      : (Math.max(0, ...currentProducts.map(p => Number(p.id) || 0)) + 1);

    data.forEach((row, index) => {
        const rowNum = index + 2;
        const rowErrors: string[] = [];

        const sku = row.sku?.toString().trim();
        const nombre = row.nombre?.toString().trim();

        if (!sku) rowErrors.push('sku vacío');
        if (!nombre) rowErrors.push('nombre vacío');

        const costo = normalizeDecimal(row.costo);
        const precioVenta = normalizeDecimal(row.precio_venta);
        const stock = parseInteger(row.stock) ?? 0;
        const minStock = parseInteger(row.min_stock);
        const maxStock = parseInteger(row.max_stock);

        if (row.costo && costo < 0) rowErrors.push('costo debe ser >= 0');
        if (row.precio_venta && precioVenta < 0) rowErrors.push('precio_venta debe ser >= 0');
        if (minStock !== undefined && maxStock !== undefined && maxStock <= minStock) {
            rowErrors.push('max_stock debe ser mayor que min_stock');
        }

        const fechaVencimiento = parseDate(row.fecha_vencimiento);
        if (row.fecha_vencimiento && row.fecha_vencimiento.toString().trim() && !fechaVencimiento) {
            rowErrors.push('fecha_vencimiento formato inválido (usar YYYY-MM-DD)');
        }

        const categoria = row.categoria?.toString().trim() || '';
        if (isCategoriaPerecederera(categoria) && !fechaVencimiento) {
            rowErrors.push('fecha_vencimiento requerida para categoría perecedera');
        }

        const activo = parseBoolean(row.activo);

        if (rowErrors.length > 0) {
            errorMessages.push(`Fila ${rowNum}: ${rowErrors.join(', ')}`);
            return;
        }

        if (!activo) return;

        const newProduct: Product = {
            id: baseId + newProducts.length,
            sku: sku!,
            nombre: nombre!,
            presentacion: row.formato?.toString().trim() || '-',
            imagen: '/placeholder.svg',
            stock: stock,
            costo: costo,
            precio: precioVenta,
            categoria: categoria || 'Sin categoría',
            vendidos: 0,
            minStock: minStock,
            maxStock: maxStock,
            expirationDate: fechaVencimiento,
        };

        newProducts.push(newProduct);
    });

    return { newProducts, errorMessages };
};

export const exportToCSV = (products: Product[]) => {
    const exportData = products.map(p => ({
        sku: p.sku,
        nombre: p.nombre,
        categoria: p.categoria,
        formato: p.presentacion,
        costo: p.costo.toFixed(2),
        precio_venta: p.precio.toFixed(2),
        stock: p.stock,
        min_stock: p.minStock ?? '',
        max_stock: p.maxStock ?? '',
        fecha_vencimiento: p.expirationDate || '',
        activo: 'true',
        notas: ''
    }));

    const csv = Papa.unparse(exportData, {
        columns: [...CSV_HEADERS]
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inventario.csv';
    link.click();
    URL.revokeObjectURL(link.href);
};

export const downloadTemplateCSV = () => {
    const csv = TEMPLATE_HEADERS.join(',');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_inventario.csv';
    link.click();
    URL.revokeObjectURL(link.href);
};

export const downloadTemplateXLSX = (productFormats: any[]) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);

    ws['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    ];

    const CATEGORIAS_OPTIONS = [
        'Bebidas', 'Lácteos', 'Carnes y Embutidos', 'Congelados', 'Panadería',
        'Cereales y Granos', 'Enlatados', 'Condimentos y Salsas', 'Snacks y Dulces',
        'Limpieza del Hogar', 'Higiene Personal', 'Frutas y Vegetales',
    ];

    const formatNames = productFormats.length > 0
        ? productFormats.map(f => f.name)
        : ['Unidad', 'Libra (lb)', 'Kilogramo (kg)', 'Gramo (g)', 'Litro (L)', 'Mililitro (ml)',
            'Paquete', 'Caja', 'Docena', 'Bolsa', 'Botella', 'Lata', 'Frasco', 'Saco',
            'Bandeja', 'Galón', 'Arroba', 'Quintal', 'Onza', 'Blister'];

    if (!ws['!dataValidation']) ws['!dataValidation'] = [];

    for (let row = 2; row <= 100; row++) {
        ws['!dataValidation'].push({
            sqref: `C${row}`,
            type: 'list',
            formula1: `"${formatNames.join(',')}"`,
            showDropDown: true,
        });
        ws['!dataValidation'].push({
            sqref: `D${row}`,
            type: 'list',
            formula1: `"${CATEGORIAS_OPTIONS.join(',')}"`,
            showDropDown: true,
        });
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'plantilla_inventario.xlsx');
};
