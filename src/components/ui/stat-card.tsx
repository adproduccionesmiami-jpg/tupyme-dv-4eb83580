import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
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

export function StatCard({ title, value, description, icon: Icon, trend, className, style, highlight = false, customContent, onClick, hideIcon = false, iconClassName }: StatCardProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border transition-all duration-200 group",
        highlight 
          ? "p-8 bg-card border-accent/30 shadow-[var(--shadow-card-hero)] hover:shadow-[var(--shadow-card-hover)]" 
          : "p-5 bg-card border-border/40 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-elevated)]",
        onClick && "cursor-pointer hover:border-primary/40",
        className
      )}
      style={style}
      onClick={onClick}
    >
      {/* Top accent - only on highlight, subtle but present */}
      <div className={cn(
        "absolute inset-x-0 top-0",
        highlight ? "h-[2px] bg-accent" : "h-0"
      )} />
      
      <div className="flex items-start justify-between gap-4 relative">
        <div className="space-y-2 flex-1">
          {/* Label - legible, professional */}
          <p className={cn(
            "leading-none font-semibold tracking-normal",
            highlight 
              ? "text-base text-foreground/80" 
              : "text-sm text-muted-foreground"
          )}>
            {title}
          </p>
          
          {/* Value - DOMINANT, the data commands attention */}
          <p className={cn(
            "tracking-tight leading-none font-black",
            highlight 
              ? "text-5xl text-foreground" 
              : "text-4xl text-foreground"
          )}>
            {value}
          </p>
          
          {/* Description or Trend */}
          {description && (
            <p className={cn(
              "leading-tight mt-1",
              highlight ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground/70"
            )}>{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                "inline-flex items-center gap-1 font-bold rounded-md",
                highlight ? "text-sm px-2.5 py-1" : "text-xs px-2 py-0.5",
                trend.isPositive 
                  ? "text-success bg-success/10 border border-success/20" 
                  : "text-destructive bg-destructive/10 border border-destructive/20"
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className={cn(
                "text-muted-foreground/50 font-medium",
                highlight ? "text-xs" : "text-[10px]"
              )}>vs mes anterior</span>
            </div>
          )}
          {/* Custom content slot */}
          {customContent}
        </div>
        
      {/* Icon - functional, not decorative */}
        {!hideIcon && (
          <div className={cn(
            "flex-shrink-0 rounded-lg p-2 transition-colors duration-200",
            iconClassName 
              ? iconClassName 
              : highlight 
                ? "bg-accent/10" 
                : "bg-muted/50"
          )}>
            <Icon 
              className={cn(
                "transition-colors duration-200",
                highlight 
                  ? "w-8 h-8 text-accent" 
                  : "w-6 h-6",
                !iconClassName && !highlight && "text-muted-foreground/60 group-hover:text-muted-foreground/80"
              )} 
              strokeWidth={highlight ? 2 : 1.5} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
