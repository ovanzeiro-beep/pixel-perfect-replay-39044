import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAtualizacaoApp } from "@/lib/pwa";

/** Aviso fixo no topo quando existe uma versão nova do app. A versão só troca quando a pessoa toca em Atualizar. */
export function AtualizacaoApp() {
  const { disponivel, atualizar } = useAtualizacaoApp();
  const [adiado, setAdiado] = useState(false);
  if (!disponivel || adiado) return null;
  return (
    <div role="status" className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-xl">
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
        <div className="flex-1">
          <p className="font-extrabold leading-snug">Nova versão do app disponível</p>
          <p className="text-sm opacity-85">
            Atualize para ter as últimas melhorias. Seus dados continuam salvos.
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={atualizar}
          className="min-h-12 rounded-xl bg-accent font-extrabold text-accent-foreground"
        >
          Atualizar agora
        </button>
        <button
          onClick={() => setAdiado(true)}
          className="min-h-12 rounded-xl border-2 border-primary-foreground/40 font-bold"
        >
          Depois
        </button>
      </div>
    </div>
  );
}
