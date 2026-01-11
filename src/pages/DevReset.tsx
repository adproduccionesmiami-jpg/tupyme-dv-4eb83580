import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface ResetReport {
  ok: boolean;
  scope?: {
    column: string;
    value: string;
    valueType: string;
  };
  tables?: {
    products: string;
    movements: string;
  };
  before?: {
    products: number;
    movements: number;
  };
  deleted?: {
    products: number;
    movements: number;
  };
  after?: {
    products: number;
    movements: number;
  };
  samples?: {
    products: string[];
    movements: string[];
  };
  errors?: string[];
  error?: string;
}

const DevReset = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ResetReport | null>(null);

  const isConfirmValid = confirmText === 'RESET';

  const handleReset = async () => {
    if (!isConfirmValid || isLoading) return;

    setIsLoading(true);
    setReport(null);

    try {
      const { data, error } = await supabase.functions.invoke('reset-dev-data');

      if (error) {
        console.error('[DevReset] Function error:', error);
        toast.error('Error al ejecutar reset', { description: error.message });
        setReport({ ok: false, error: error.message });
        return;
      }

      if (data?.error) {
        toast.error('Reset denegado', { description: data.error });
        setReport({ ok: false, error: data.error });
        return;
      }

      // Set the full report
      setReport(data as ResetReport);

      if (data?.ok) {
        const { movements, products } = data.deleted || {};
        const afterProducts = data.after?.products ?? 0;
        const afterMovements = data.after?.movements ?? 0;

        if (afterProducts === 0 && afterMovements === 0) {
          toast.success('Reset completado', {
            description: `Eliminados: ${products} productos, ${movements} movimientos`,
          });
          
          // Clear localStorage cache so Movimientos/Reportes/Actividad reciente queden en 0
          const keysToRemove = Object.keys(localStorage).filter(k => 
            k.startsWith('tupyme_inventario_') ||
            k.startsWith('tupyme_movimientos_') ||
            k.startsWith('tupyme_reportes_') ||
            k.startsWith('tupyme_recentActivity_')
          );
          keysToRemove.forEach(k => localStorage.removeItem(k));
          console.log('[DevReset] Cleared localStorage keys:', keysToRemove);

          // Invalidate any React Query caches (if any screens use them)
          queryClient.invalidateQueries();

          // Hard refresh: remount providers + ensure UI is not stuck with in-memory state
          sessionStorage.setItem('tupyme_dev_reset_redirect', '1');
          window.location.href = '/app/dashboard';
        } else {
          toast.warning('Reset incompleto', {
            description: `Quedan ${afterProducts} productos y ${afterMovements} movimientos`,
          });
        }
      }
    } catch (err) {
      console.error('[DevReset] Unexpected error:', err);
      toast.error('Error inesperado', { description: 'Revisa la consola para más detalles.' });
      setReport({ ok: false, error: String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const isResetComplete = report?.ok && 
    report.after?.products === 0 && 
    report.after?.movements === 0;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Debes iniciar sesión para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto py-12 px-4">
      <Card className="border-destructive">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">Reset de datos (DEV)</CardTitle>
              <CardDescription>Herramienta interna de desarrollo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>¡Acción irreversible!</AlertTitle>
            <AlertDescription>
              Esto eliminará <strong>permanentemente</strong> todos los Productos y Movimientos
              de tu organización actual. Esta acción no se puede deshacer.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Usuario: <span className="font-medium text-foreground">{user.email}</span>
            </p>
          </div>

          <div className="space-y-3">
            <label htmlFor="confirm" className="text-sm font-medium">
              Escribe <code className="px-1.5 py-0.5 bg-muted rounded text-destructive font-bold">RESET</code> para confirmar:
            </label>
            <Input
              id="confirm"
              type="text"
              placeholder="Escribe RESET"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
              disabled={isLoading}
            />
          </div>

          <Button
            variant="destructive"
            size="lg"
            className="w-full gap-2"
            disabled={!isConfirmValid || isLoading}
            onClick={handleReset}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ejecutando reset...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Reset datos (DEV)
              </>
            )}
          </Button>

          {/* Report section */}
          {report && (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${isResetComplete ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                {isResetComplete ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {isResetComplete ? 'Reset completo' : 'Reset incompleto'}
                </span>
              </div>

              {report.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{report.error}</AlertDescription>
                </Alert>
              )}

              {report.ok && (
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Reporte del Reset</h4>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="font-medium text-muted-foreground">Tabla</div>
                    <div className="font-medium text-muted-foreground text-center">Before</div>
                    <div className="font-medium text-muted-foreground text-center">After</div>
                    
                    <div>Productos</div>
                    <div className="text-center">{report.before?.products ?? '?'}</div>
                    <div className={`text-center font-bold ${report.after?.products === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {report.after?.products ?? '?'}
                    </div>
                    
                    <div>Movimientos</div>
                    <div className="text-center">{report.before?.movements ?? '?'}</div>
                    <div className={`text-center font-bold ${report.after?.movements === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {report.after?.movements ?? '?'}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <div>Eliminados: <strong>{report.deleted?.products}</strong> productos, <strong>{report.deleted?.movements}</strong> movimientos</div>
                    <div>Scope: <code className="bg-background px-1 rounded">{report.scope?.column} = {report.scope?.value?.slice(0, 8)}...</code></div>
                  </div>

                  {report.samples?.products && report.samples.products.length > 0 && (
                    <div className="text-xs text-yellow-600 pt-2 border-t">
                      <div className="font-medium">⚠️ Productos residuales (IDs):</div>
                      <code className="text-[10px] break-all">{report.samples.products.join(', ')}</code>
                    </div>
                  )}

                  {report.samples?.movements && report.samples.movements.length > 0 && (
                    <div className="text-xs text-yellow-600 pt-2 border-t">
                      <div className="font-medium">⚠️ Movimientos residuales (IDs):</div>
                      <code className="text-[10px] break-all">{report.samples.movements.join(', ')}</code>
                    </div>
                  )}
                </div>
              )}

              {isResetComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/app/inventario')}
                >
                  Ir a Inventario
                </Button>
              )}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Esta página no aparece en el menú. Solo accesible vía URL directa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevReset;
