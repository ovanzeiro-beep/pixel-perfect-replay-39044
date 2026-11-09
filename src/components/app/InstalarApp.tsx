import { useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useInstalarApp } from "@/lib/pwa";

export function InstalarApp() {
  const { instalado, podeInstalar, ios, instalar } = useInstalarApp();
  const [fechado, setFechado] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);

  if (instalado || fechado) return null;
  if (!podeInstalar && !ios) return null;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-left backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold leading-tight">Instale o app no celular</p>
          <p className="mt-0.5 text-sm opacity-80">Abre em tela cheia, como um aplicativo de verdade.</p>
        </div>
        <button onClick={() => setFechado(true)} aria-label="Dispensar" className="-mr-1 -mt-1 p-1 opacity-70">
          <X className="h-5 w-5" />
        </button>
      </div>
      {podeInstalar ? (
        <button onClick={instalar} className="mt-3 min-h-12 w-full rounded-xl bg-accent font-extrabold text-accent-foreground active:scale-[0.99]">
          Instalar agora
        </button>
      ) : (
        <>
          <button onClick={() => setAjudaAberta((v) => !v)} className="mt-3 min-h-12 w-full rounded-xl bg-accent font-extrabold text-accent-foreground">
            Como instalar no iPhone
          </button>
          {ajudaAberta && (
            <ol className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2"><Share className="h-5 w-5 shrink-0 text-accent" /> Toque em <b>Compartilhar</b> na barra do Safari</li>
              <li className="flex items-center gap-2"><SquarePlus className="h-5 w-5 shrink-0 text-accent" /> Escolha <b>Adicionar à Tela de Início</b></li>
            </ol>
          )}
        </>
      )}
    </div>
  );
}
