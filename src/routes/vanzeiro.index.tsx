import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Bus, ChevronRight, Clock, Fuel, UserPlus, Wallet, Users } from "lucide-react";
import {
  vanzeiro, vans, motoristas, linhas, passageiros, viagensSemana, proximaViagemId,
  cobrancasEmAberto, recebimentosMes, gastosMes, aReceberRestoMes,
} from "@/data/exemplo";

export const Route = createFileRoute("/vanzeiro/")({
  head: () => ({
    meta: [
      { title: "Início · O Vanzeiro" },
      { name: "description", content: "Resumo do dia: próxima viagem, quem está devendo e resultado do mês." },
      { property: "og:title", content: "Início · O Vanzeiro" },
      { property: "og:description", content: "Resumo do dia: próxima viagem, quem está devendo e resultado do mês." },
    ],
  }),
  component: Inicio,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const soma = (l: { valor: number }[]) => l.reduce((t, x) => t + x.valor, 0);
const linha = (id: string) => linhas.find((l) => l.id === id)!;
const lugares = (vanId: string) => vans.find((v) => v.id === vanId)!.lugares;

function saudacao(h: number) {
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Inicio() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => setAgora(new Date()), []);

  const prox = viagensSemana.find((v) => v.id === proximaViagemId)!;
  const proxVan = vans.find((v) => v.id === prox.vanId)!;
  const proxMot = motoristas.find((m) => m.id === prox.motoristaId)!;
  const pct = Math.round((prox.confirmados / proxVan.lugares) * 100);

  const avisos = viagensSemana.flatMap((v) => {
    const a: string[] = [];
    if (v.naoConfirmados > 0) a.push(`${v.naoConfirmados} passageiros ainda não confirmaram a viagem de ${v.dia.toLowerCase()}`);
    if (v.confirmados >= lugares(v.vanId) && v.listaEspera > 0) a.push(`Viagem de ${v.dia.toLowerCase()} lotada — ${v.listaEspera} na lista de espera`);
    return a;
  });

  const totalAberto = soma(cobrancasEmAberto);
  const top3 = [...cobrancasEmAberto].sort((a, b) => b.diasAtraso - a.diasAtraso).slice(0, 3);
  const recebido = soma(recebimentosMes);
  const gastos = soma(gastosMes);
  const lucro = recebido - gastos;
  const faltaReceber = soma(aReceberRestoMes);
  const primeiroNome = vanzeiro.nome.split(" ")[0];

  return (
    <div className="space-y-5 px-5 pt-6">
      <div>
        <h1 className="text-3xl font-extrabold text-primary">
          {agora ? saudacao(agora.getHours()) : "Olá"}, {primeiroNome}
        </h1>
        <p className="mt-1 text-lg capitalize text-muted-foreground">
          {agora?.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) ?? "\u00a0"}
        </p>
      </div>

      {avisos.length > 0 && (
        <div className="space-y-2">
          {avisos.map((a) => (
            <div key={a} className="flex items-start gap-3 rounded-2xl bg-accent/20 px-4 py-3 text-base font-semibold text-foreground">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-strong" /> {a}
            </div>
          ))}
        </div>
      )}

      <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">Próxima viagem</p>
        <h2 className="mt-1 text-2xl font-extrabold">{linha(prox.linhaId).nome}</h2>
        <p className="mt-1 flex items-center gap-2 text-lg"><Clock className="h-5 w-5" /> {prox.dia}, saída às {prox.saida}</p>
        <p className="mt-1 flex items-center gap-2 opacity-90"><Bus className="h-5 w-5" /> {proxVan.modelo} · {proxMot.nome}</p>
        <div className="mt-4">
          <div className="flex justify-between text-base font-bold">
            <span>Lugares confirmados</span><span>{prox.confirmados} de {proxVan.lugares}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-primary-foreground/20">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Link to="/vanzeiro/viagens" className="mt-5 flex min-h-14 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-foreground">
          Ver viagem
        </Link>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-primary">Viagens da semana</h2>
        <ul className="mt-3 divide-y">
          {viagensSemana.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold">{v.dia} · {v.saida}</p>
                <p className="text-muted-foreground">{linha(v.linhaId).nome}</p>
              </div>
              <span className="rounded-full bg-success/15 px-3 py-1 font-bold text-success">{v.confirmados}/{lugares(v.vanId)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-primary">Quem está devendo</h2>
        <p className="mt-2 text-3xl font-extrabold text-destructive">{brl(totalAberto)}</p>
        <p className="text-muted-foreground">{cobrancasEmAberto.length} pessoas com pagamento em aberto</p>
        <ul className="mt-3 divide-y">
          {top3.map((c) => {
            const p = passageiros.find((x) => x.id === c.passageiroId)!;
            return (
              <li key={c.passageiroId} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-bold">{p.nome}</p>
                  <p className="text-sm text-destructive">há {c.diasAtraso} dias</p>
                </div>
                <span className="font-bold">{brl(c.valor)}</span>
              </li>
            );
          })}
        </ul>
        <Link to="/vanzeiro/dinheiro" className="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary text-lg font-bold text-primary">
          Ver cobranças <ChevronRight className="h-5 w-5" />
        </Link>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-primary">Resultado do mês</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted p-3"><p className="text-sm text-muted-foreground">Recebido</p><p className="text-lg font-bold">{brl(recebido)}</p></div>
          <div className="rounded-2xl bg-muted p-3"><p className="text-sm text-muted-foreground">Gastos</p><p className="text-lg font-bold">{brl(gastos)}</p></div>
        </div>
        <div className={`mt-3 rounded-2xl p-4 ${lucro >= 0 ? "bg-success/15" : "bg-destructive/15"}`}>
          <p className="text-sm font-semibold text-muted-foreground">Lucro</p>
          <p className={`text-3xl font-extrabold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{brl(lucro)}</p>
        </div>
        <p className="mt-3 text-base text-muted-foreground">Ainda falta receber no mês: <span className="font-bold text-foreground">{brl(faltaReceber)}</span></p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold text-primary">Atalhos</h2>
        <div className="grid grid-cols-3 gap-3">
          {([
            { to: "/vanzeiro/passageiros", label: "Novo passageiro", icon: UserPlus },
            { to: "/vanzeiro/dinheiro", label: "Marcar pagamento", icon: Wallet },
            { to: "/vanzeiro/gastos", label: "Lançar gasto", icon: Fuel },
          ] as const).map((a) => (
            <Link key={a.label} to={a.to} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl bg-card p-3 text-center font-bold shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><a.icon className="h-7 w-7" /></span>
              <span className="text-sm leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>
      <span className="sr-only"><Users /></span>
    </div>
  );
}
