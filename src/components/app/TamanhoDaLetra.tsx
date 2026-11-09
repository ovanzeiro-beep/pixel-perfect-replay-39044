import { Type } from "lucide-react";
import { TAMANHOS, definirTamanhoLetra, useTamanhoLetra } from "@/lib/tamanhoLetra";

/** Escolher o tamanho da letra do app (vale neste aparelho). */
export function TamanhoDaLetra() {
  const atual = useTamanhoLetra();
  return (
    <section
      aria-label="Tamanho da letra"
      className="mt-4 space-y-3 rounded-3xl bg-card p-5 shadow-sm"
    >
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <Type className="h-5 w-5 text-accent-strong" /> Tamanho da letra
      </h2>
      <p className="text-sm text-muted-foreground">
        Deixe a letra maior se estiver difícil de ler. A escolha vale só neste aparelho.
      </p>
      <div role="radiogroup" aria-label="Tamanho da letra" className="grid grid-cols-3 gap-2">
        {TAMANHOS.map((t) => {
          const ativo = atual === t.id;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={ativo}
              onClick={() => definirTamanhoLetra(t.id)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-1 text-center font-extrabold leading-tight ${ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
            >
              <span aria-hidden style={{ fontSize: `${t.percentual / 100 + 0.35}rem` }}>
                Aa
              </span>
              <span className="text-xs">{t.nome}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
