import { cn } from '@/lib/utils';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  style?: React.CSSProperties;
  highlight?: boolean;
  customContent?: ReactNode;
  onClick?: () => void;
  hideIcon?: boolean;
  iconClassName?: string;
}

export function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  className, 
  style, 
  highlight = false, 
  customContent, 
  onClick, 
  hideIcon = false, 
  iconClassName 
}: StatCardProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border transition-all duration-200 group",
        highlight 
          ? "p-5 bg-primary text-primary-foreground border-primary shadow-card-hero" 
          : "p-5 bg-card border-border/50 shadow-card hover:shadow-card-elevated hover:border-primary/30",
        onClick && "cursor-pointer",
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 relative">
        <div className="space-y-1 flex-1 min-w-0">
          {/* Label */}
          <p className={cn(
            "text-sm font-medium",
            highlight ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          
          {/* Value - Large and prominent */}
          <p className={cn(
            "text-3xl font-bold tracking-tight leading-none",
            highlight ? "text-primary-foreground" : "text-foreground"
          )}>
            {value}
          </p>
          
          {/* Description or Trend */}
          {description && (
            <p className={cn(
              "text-xs mt-1.5",
              highlight ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {description}
            </p>
          )}
          
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
                trend.isPositive 
                  ? "text-success bg-success/10" 
                  : "text-destructive bg-destructive/10"
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className={cn(
                "text-[10px]",
                highlight ? "text-primary-foreground/60" : "text-muted-foreground/60"
              )}>
                vs mes anterior
              </span>
            </div>
          )}
          
          {/* Custom content slot */}
          {customContent}
        </div>
        
        {/* Icon with arrow indicator */}
        {!hideIcon && (
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {onClick && (
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                highlight 
                  ? "bg-primary-foreground/20" 
                  : "bg-muted group-hover:bg-primary/10"
              )}>
                <ArrowUpRight className={cn(
                  "w-3.5 h-3.5",
                  highlight ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                )} />
              </div>
            )}
            <div className={cn(
              "flex-shrink-0 rounded-lg p-2",
              iconClassName 
                ? iconClassName 
                : highlight 
                  ? "bg-primary-foreground/10" 
                  : "bg-muted/50"
            )}>
              <Icon 
                className={cn(
                  "w-5 h-5",
                  highlight 
                    ? "text-primary-foreground/80" 
                    : "text-muted-foreground"
                )} 
                strokeWidth={1.5} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}