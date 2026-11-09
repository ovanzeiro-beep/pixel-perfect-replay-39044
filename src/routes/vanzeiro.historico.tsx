import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronDown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ResumoViagem } from "@/components/app/ResumoViagem";
import { brl } from "@/data/cobrancas";
import { historicoViagens, totaisHistorico, type ItemHistorico } from "@/data/historico";
import { textoResumoViagem } from "@/data/manifesto";
import { useFrota } from "@/data/repositorio";
import { dataCurta, diaSemana, doIso, horaDe } from "@/data/viagens";
import { compartilharTexto } from "@/lib/compartilhar";

export const Route = createFileRoute("/vanzeiro/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de viagens · O Vanzeiro" },
      { name: "description", content: "Todas as viagens que você já fez, com resumo e cobranças." },
      { property: "og:title", content: "Histórico de viagens · O Vanzeiro" },
      {
        property: "og:description",
        content: "Todas as viagens que você já fez, com resumo e cobranças.",
      },
    ],
  }),
  component: Historico,
});

const mesAno = (data: string) =>
  doIso(data).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

function Historico() {
  const { ajustes, linhas, vans, passageiros } = useFrota();
  const [linhaId, setLinhaId] = useState("");
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const itens = historicoViagens(ajustes, linhaId || undefined);
  const tot = totaisHistorico(itens);
  const nomeLinha = (id: string) => linhas.find((l) => l.id === id)?.nome ?? "Linha removida";
  const grupos = itens.reduce<Record<string, ItemHistorico[]>>(
    (g, i) => ((g[mesAno(i.data)] ??= []).push(i), g),
    {},
  );
  const chip = (a: boolean) =>
    `min-h-11 shrink-0 rounded-full border-2 px-4 text-base font-bold ${a ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`;

  const compartilhar = async (i: ItemHistorico) => {
    const r = await compartilharTexto(
      textoResumoViagem({ linhaNome: nomeLinha(i.linhaId), data: i.data, ida: i.ida, passageiros }),
      `Viagem concluída — ${nomeLinha(i.linhaId)}`,
    );
    if (r === "whatsapp") toast.success("Abrindo o WhatsApp com o resumo");
  };

  return (
    <div className="px-5 pt-6">
      <Toaster position="top-center" />
      <Link
        to="/vanzeiro/mais"
        className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-primary"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </Link>
      <h1 className="text-3xl font-extrabold text-primary">Histórico de viagens</h1>

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <button className={chip(linhaId === "")} onClick={() => setLinhaId("")}>
          Todas as linhas
        </button>
        {linhas.map((l) => (
          <button key={l.id} className={chip(linhaId === l.id)} onClick={() => setLinhaId(l.id)}>
            {l.nome}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-2xl font-extrabold text-primary">{tot.viagens}</p>
          <p className="text-sm text-muted-foreground">viagens</p>
        </div>
        <div className="rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-2xl font-extrabold text-primary">{tot.passageiros}</p>
          <p className="text-sm text-muted-foreground">embarques</p>
        </div>
        <div className="rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-xl font-extrabold text-success">{brl(tot.cobrado)}</p>
          <p className="text-sm text-muted-foreground">cobrado</p>
        </div>
      </div>

      {itens.length === 0 && (
        <p className="mt-10 text-center text-lg text-muted-foreground">
          Nenhuma viagem concluída ainda. Quando você encerrar uma viagem, ela aparece aqui.
        </p>
      )}

      {Object.entries(grupos).map(([mes, lista]) => (
        <section key={mes} className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {mes}
          </h2>
          <ul className="space-y-3">
            {lista.map((i) => {
              const aberto = abertoId === i.id;
              const van = vans.find(
                (v) => v.id === (i.ajuste.vanId ?? linhas.find((l) => l.id === i.linhaId)?.vanId),
              );
              return (
                <li key={i.id} className="rounded-3xl bg-card shadow-sm">
                  <button
                    onClick={() => setAbertoId(aberto ? null : i.id)}
                    aria-expanded={aberto}
                    className="flex min-h-20 w-full items-center gap-3 p-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-extrabold">{nomeLinha(i.linhaId)}</p>
                      <p className="text-muted-foreground">
                        {diaSemana(i.data)}, {dataCurta(i.data)} ·{" "}
                        {i.ida.inicio ? horaDe(i.ida.inicio) : "—"} às {horaDe(i.encerrada)}
                        {van ? ` · ${van.apelido}` : ""}
                      </p>
                      <p className="mt-1 text-base font-semibold">
                        {i.stats.embarcaram} embarcaram · {i.stats.entregues} entregues
                        {i.stats.total > 0 ? ` · ${brl(i.stats.total)}` : ""}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-6 w-6 shrink-0 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`}
                    />
                  </button>
                  {aberto && (
                    <div className="space-y-3 px-4 pb-4">
                      <ResumoViagem ida={i.ida} passageiros={passageiros} />
                      <button
                        onClick={() => compartilhar(i)}
                        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card text-lg font-bold text-primary"
                      >
                        <Share2 className="h-5 w-5" /> Compartilhar resumo
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
