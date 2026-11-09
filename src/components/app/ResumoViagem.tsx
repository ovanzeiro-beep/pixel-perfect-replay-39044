import { brl } from "@/data/cobrancas";
import { estatisticasIda } from "@/data/historico";
import { horaDe, type Ida } from "@/data/viagens";
import type { Passageiro } from "@/data/repositorio";

/** Resumo da viagem concluída (usado na tela da viagem e na ficha). */
export function ResumoViagem({ ida, passageiros }: { ida: Ida; passageiros: Passageiro[] }) {
  const nome = (id: string) => passageiros.find((p) => p.id === id)?.nome ?? "Passageiro";
  const volta = ida.volta;
  const { embarcaram, entregues, total } = estatisticasIda(ida);
  const naoVoltaram = volta
    ? Object.entries(volta.status).flatMap(([pid, s]) =>
        s.r === "nao" ? [{ pid, motivo: s.motivo }] : [],
      )
    : [];
  const paradas = [
    ...(ida.paradas ?? []).map((p) => ({ ...p, trecho: "Ida" })),
    ...(volta?.paradas ?? []).map((p) => ({ ...p, trecho: "Volta" })),
  ];
  const ficaram = paradas.flatMap((p) => p.ficaram.map((f) => ({ ...f, trecho: p.trecho })));
  const cobrancas = [
    ...ida.marcas.filter((m) => m.cobrou > 0),
    ...(volta?.extras.filter((e) => e.cobrou > 0) ?? []),
  ];
  const viajaram = [
    ...ida.marcas.filter((m) => m.r !== "faltou").map((m) => m.pid),
    ...(volta?.extras.map((e) => e.pid) ?? []),
  ];
  const planos = new Set(
    viajaram.filter((id) => {
      const f = passageiros.find((p) => p.id === id)?.formaPagamento;
      return f === "semanal" || f === "mensal";
    }),
  ).size;
  const L = ({ r, v }: { r: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-3 py-2">
      <span className="text-muted-foreground">{r}</span>
      <b className="text-right">{v}</b>
    </div>
  );
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
      <h2 className="text-xl font-extrabold text-primary">Resumo da viagem</h2>
      <div className="divide-y text-lg">
        <L r="Saída" v={ida.inicio ? horaDe(ida.inicio) : "—"} />
        <L r="Chegada" v={ida.encerrada ? horaDe(ida.encerrada) : "—"} />
        <L r="Embarcaram" v={embarcaram} />
        <L r="Entregues" v={entregues} />
        <L r="Total da viagem" v={brl(total)} />
      </div>
      {planos > 0 && (
        <p className="text-muted-foreground">
          {planos} {planos === 1 ? "passageiro" : "passageiros"} com plano semanal/mensal
        </p>
      )}
      {naoVoltaram.length > 0 && (
        <div>
          <p className="font-extrabold">Não voltaram</p>
          {naoVoltaram.map((n) => (
            <p key={n.pid}>
              {nome(n.pid)} — {n.motivo}
            </p>
          ))}
        </div>
      )}
      {ficaram.length > 0 && (
        <div>
          <p className="font-extrabold">Ficaram em parada</p>
          {ficaram.map((f, i) => (
            <p key={i}>
              {nome(f.pid)} ({f.trecho}, {f.hora}) — {f.motivo}
            </p>
          ))}
        </div>
      )}
      <div>
        <p className="font-extrabold">Paradas feitas</p>
        {paradas.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma</p>
        ) : (
          paradas.map((p, i) => (
            <p key={i}>
              {p.trecho} · {horaDe(p.inicio)} · {p.local || "Sem local"} · {p.minutos} min
            </p>
          ))
        )}
      </div>
      <div>
        <p className="font-extrabold">Cobranças criadas</p>
        {cobrancas.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma</p>
        ) : (
          cobrancas.map((c, i) => (
            <p key={i} className="flex justify-between">
              <span>{nome(c.pid)}</span>
              <b>{brl(c.cobrou)}</b>
            </p>
          ))
        )}
      </div>
    </section>
  );
}
