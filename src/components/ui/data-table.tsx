import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PackageOpen } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No hay datos',
  emptyDescription = 'Aún no hay registros para mostrar',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-b from-card to-secondary/30 rounded-xl border border-border/60 overflow-hidden shadow-card-elevated">
        <div className="p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-gradient-to-b from-card to-secondary/30 rounded-xl border border-border/60 overflow-hidden shadow-card-elevated">
        <div className="p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <PackageOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">{emptyMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-card rounded-xl border border-border/40 overflow-hidden shadow-[var(--shadow-card-elevated)]">
      {/* Left accent - operational register */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent/70" />
      
      {/* Responsive scroll container for table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-border/40 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    "h-12 px-5 first:pl-7 text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/40 bg-muted/20 whitespace-nowrap",
                    column.className
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow 
                key={index} 
                className={cn(
                  "border-b border-border/20 last:border-0",
                  "hover:bg-accent/8 hover:border-accent/25 transition-all duration-100",
                  "group cursor-default",
                  index % 2 === 1 && "bg-muted/10"
                )}
              >
                {columns.map((column) => (
                  <TableCell 
                    key={String(column.key)} 
                    className={cn(
                      "py-5 px-5 first:pl-7 text-sm text-foreground/75 transition-colors whitespace-nowrap",
                      "group-hover:text-foreground",
                      column.className
                    )}
                  >
                    {column.render 
                      ? column.render(item) 
                      : item[column.key as keyof T]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
