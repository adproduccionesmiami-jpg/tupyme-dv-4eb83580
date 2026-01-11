import { Building2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center animate-pulse-subtle">
          <Building2 className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">TuPyme</h2>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    </div>
  );
}
