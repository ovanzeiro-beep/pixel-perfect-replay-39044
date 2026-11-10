import { ChevronDown } from "lucide-react";
import type { TopicoAjuda } from "@/data/ajuda";

/** Lista de tópicos da ajuda: cada um abre e fecha (nativo, funciona com leitor de tela). */
export function AjudaApp({ topicos }: { topicos: TopicoAjuda[] }) {
  return (
    <div className="mt-5 space-y-3">
      {topicos.map((t, i) => (
        <details
          key={t.id}
          name="ajuda"
          open={i === 0}
          className="group rounded-2xl bg-card shadow-sm [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3">
            <span className="flex-1 break-words text-lg font-extrabold text-primary">
              {t.titulo}
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <ol className="space-y-3 px-4 pb-4">
            {t.passos.map((p, n) => (
              <li key={p} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
                >
                  {n + 1}
                </span>
                <span className="min-w-0 flex-1 break-words text-base">{p}</span>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
