import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type DevFlags = {
  enabled: boolean;
  isLoading: boolean;
  error: string | null;
};

export function useDevFlags(): DevFlags {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase.functions.invoke("dev-flags");

        if (cancelled) return;

        if (error) {
          // Non-DEV users may get denied; treat as disabled.
          setEnabled(false);
          setError(error.message);
          return;
        }

        setEnabled(Boolean((data as any)?.devResetEnabled));
      } catch (err) {
        if (cancelled) return;
        setEnabled(false);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, isLoading, error };
}
