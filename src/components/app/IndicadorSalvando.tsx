import { useEffect, useState } from "react";
import { useSalvando } from "@/data/gravacao";

/** "Salvando…" só aparece se a gravação demorar (com banco e internet lenta); no mock nunca pisca. */
export function IndicadorSalvando({ atrasoMs = 400 }: { atrasoMs?: number }) {
  const salvando = useSalvando();
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (!salvando) {
      setVisivel(false);
      return;
    }
    const t = setTimeout(() => setVisivel(true), atrasoMs);
    return () => clearTimeout(t);
  }, [salvando, atrasoMs]);
  return (
    <div role="status" aria-live="polite" className="flex justify-center">
      {visivel && (
        <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-lg">
          Salvando…
        </span>
      )}
    </div>
  );
}
