import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { usePassageiroId } from "@/data/sessao";
import { usePassageiroVisao, useVanzeiro, responderViagemApp } from "@/data/repositorio";
import { diaSemana, dataCurta, horarioNaParada } from "@/data/viagens";
import { prazoViagem } from "@/data/alertas";
import { PrazoEncerrado } from "@/components/app/PrazoEncerrado";

function MinhasViagens() {
  const vanzeiro = useVanzeiro();
  const passageiroId = usePassageiroId();
  const { eu: p, linhas, viagens: minhasViagens } = usePassageiroVisao(passageiroId);
  const [aba, setAba] = useState<"proximas" | "anteriores">("proximas");
  if (!p) return null;

  const proximas = minhasViagens
    .filter((v) => !v.passada && !v.cancelada)
    .sort((a, b) => a.data.localeCompare(b.data));
  const anteriores = minhasViagens
    .filter((v) => v.passada)
    .sort((a, b) => b.data.localeCompare(a.data));

  const responder = (viagemId: string, vai: boolean) => {
    if (!responderViagemApp(p.id, viagemId, vai)) {
      toast.error("O prazo para responder acabou. Fale com o vanzeiro.");
      return;
    }
    toast.success(vai ? "Confirmado!" : "Registrado.");
  };

  return (
    <div className="px-5 pb-6 pt-6">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-extrabold text-primary">Minhas viagens</h1>
      <div className="mt-3"></div>

      <div className="mt-5 flex gap-2 rounded-2xl bg-muted p-1">
        <button
          onClick={() => setAba("proximas")}
          className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${aba === "proximas" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
        >
          Próximas
        </button>
        <button
          onClick={() => setAba("anteriores")}
          className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${aba === "anteriores" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
        >
          Anteriores
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {aba === "proximas" &&
          (proximas.length === 0 ? (
            <p className="pt-8 text-center text-muted-foreground">Nenhuma viagem próxima.</p>
          ) : (
            proximas.map((v) => {
              const linha = linhas.find((l) => l.id === v.linhaId);
              const resposta = v.resposta;
              const posEspera = v.posicaoEspera - 1;
              return (
                <div key={v.id} className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
                  <div>
                    <p className="font-extrabold text-primary">{linha?.nome ?? v.linhaId}</p>
                    <p className="text-sm text-muted-foreground">
                      {diaSemana(v.data)}, {dataCurta(v.data)} · saída {v.saida}
                    </p>
                    {linha && horarioNaParada(v.saida, p.cidade, linha.paradas) !== v.saida && (
                      <p className="text-sm font-semibold">
                        Na sua parada: ~{horarioNaParada(v.saida, p.cidade, linha.paradas)}
                      </p>
                    )}
                    {resposta === "sem" && (
                      <p className="mt-1 text-sm font-semibold text-accent-strong">
                        {prazoViagem(v.data, new Date()).rotulo}
                      </p>
                    )}
                  </div>
                  {resposta === "vai" && (
                    <div className="flex items-center gap-2 text-success">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-bold">Confirmado</span>
                    </div>
                  )}
                  {resposta === "nao" && (
                    <div className="flex items-center gap-2 text-destructive">
                      <X className="h-4 w-4" />
                      <span className="text-sm font-bold">Não vai</span>
                    </div>
                  )}
                  {resposta === "espera" && (
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      Lista de espera — posição {posEspera + 1}
                    </p>
                  )}
                  {v.situacao !== "cancelada" && prazoViagem(v.data, new Date()).encerrado && (
                    <PrazoEncerrado
                      vanzeiro={vanzeiro}
                      passageiro={p.nome}
                      viagem={`${diaSemana(v.data)}, ${dataCurta(v.data)}`}
                    />
                  )}
                  {v.situacao !== "cancelada" && !prazoViagem(v.data, new Date()).encerrado && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => responder(v.id, true)}
                        className={`flex flex-1 min-h-10 items-center justify-center rounded-lg text-sm font-bold ${resposta === "vai" ? "bg-success text-success-foreground" : "bg-success/15 text-success"}`}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Vou
                      </button>
                      <button
                        onClick={() => responder(v.id, false)}
                        className={`flex flex-1 min-h-10 items-center justify-center rounded-lg text-sm font-bold ${resposta === "nao" ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive"}`}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Não vou
                      </button>
                    </div>
                  )}
                  {v.situacao === "cancelada" && (
                    <p className="text-sm font-bold text-muted-foreground">Viagem cancelada</p>
                  )}
                </div>
              );
            })
          ))}

        {aba === "anteriores" &&
          (anteriores.length === 0 ? (
            <p className="pt-8 text-center text-muted-foreground">Nenhuma viagem anterior.</p>
          ) : (
            anteriores.map((v) => {
              const linha = linhas.find((l) => l.id === v.linhaId);
              const embarcou = v.ida?.minhaMarca === "embarcou";
              const entregue = v.ida?.volta?.minhaEntrega === "entregue";
              const cancelada = v.cancelada;
              return (
                <div key={v.id} className="rounded-2xl bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-primary">{linha?.nome ?? v.linhaId}</p>
                      <p className="text-sm text-muted-foreground">
                        {diaSemana(v.data)}, {dataCurta(v.data)} · {v.saida}
                      </p>
                    </div>
                    {cancelada ? (
                      <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                        Cancelada
                      </span>
                    ) : embarcou ? (
                      <span className="shrink-0 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                        {entregue ? "Entregue ✓" : "Embarcou"}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                        Não embarcou
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/passageiro/viagens")({
  head: () => ({
    meta: [
      { title: "Minhas viagens · O Vanzeiro" },
      { name: "description", content: "Minhas viagens no O Vanzeiro." },
      { property: "og:title", content: "Minhas viagens · O Vanzeiro" },
      { property: "og:description", content: "Minhas viagens no O Vanzeiro." },
    ],
  }),
  component: MinhasViagens,
});
