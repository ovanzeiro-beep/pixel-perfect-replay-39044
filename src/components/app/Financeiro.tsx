import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useFrota } from "@/data/store";
import { brl, isoDe } from "@/data/cobrancas";
import { mesCurto, mesDe, nomeMes, porCategoria, porLinha, porVan, resumoMes, somaMes, variacao } from "@/data/financeiro";
import { ICONE_CATEGORIA } from "@/components/app/categorias";
import { vanzeiro } from "@/data/exemplo";

/** Diferença em relação ao mês anterior; `bomSubir` diz se subir é bom (verde). */
function Variacao({ d, bomSubir }: { d: number; bomSubir: boolean }) {
  if (d === 0) return <p className="text-sm text-muted-foreground">Igual ao mês anterior</p>;
  const bom = d > 0 === bomSubir;
  const I = d > 0 ? TrendingUp : TrendingDown;
  return <p className={`flex items-center gap-1 text-sm font-bold ${bom ? "text-success" : "text-destructive"}`}><I className="h-4 w-4" />{d > 0 ? "Subiu" : "Desceu"} {brl(Math.abs(d))}</p>;
}

export function Financeiro() {
  const { cobrancas, gastos, linhas, vans, passageiros } = useFrota();
  const hoje = isoDe(new Date());
  const [mes, setMes] = useState(mesDe(hoje));
  const r = resumoMes(cobrancas, gastos, mes, hoje);
  const ant = resumoMes(cobrancas, gastos, somaMes(mes, -1), hoje);
  const seis = Array.from({ length: 6 }, (_, i) => somaMes(mes, i - 5)).map((m) => ({ m, ...resumoMes(cobrancas, gastos, m, hoje) }));
  const maxBarra = Math.max(1, ...seis.flatMap((x) => [x.recebido, x.gastos]));
  const cats = porCategoria(gastos, mes);
  const maxCat = Math.max(1, ...cats.map((c) => c.valor));
  const linhaDe = (pid: string) => passageiros.find((p) => p.id === pid)?.linhaIds[0] ?? "";
  const pl = porLinha(cobrancas, gastos, mes, linhas, linhaDe);
  const pv = porVan(gastos, mes, vans);
  const texto = `Resumo de ${nomeMes(mes)} — ${vanzeiro.nome}\nRecebido: ${brl(r.recebido)}\nGastos: ${brl(r.gastos)}\nLucro: ${brl(r.lucro)}\nA receber: ${brl(r.aReceber)}`;

  return (
    <div className="space-y-5 pb-8 pt-4">
      <div className="flex items-center justify-between rounded-2xl bg-card p-2 shadow-sm">
        <button onClick={() => setMes(somaMes(mes, -1))} aria-label="Mês anterior" className="flex h-14 w-14 items-center justify-center rounded-xl text-primary"><ChevronLeft className="h-8 w-8" /></button>
        <p className="text-xl font-extrabold">{nomeMes(mes)}</p>
        <button onClick={() => setMes(somaMes(mes, 1))} disabled={mes >= mesDe(hoje)} aria-label="Próximo mês" className="flex h-14 w-14 items-center justify-center rounded-xl text-primary disabled:opacity-30"><ChevronRight className="h-8 w-8" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-success/10 p-4"><p className="text-sm font-bold text-muted-foreground">Recebido no mês</p><p className="text-xl font-extrabold text-success">{brl(r.recebido)}</p><Variacao d={variacao(r.recebido, ant.recebido)} bomSubir /></div>
        <div className="rounded-3xl bg-destructive/10 p-4"><p className="text-sm font-bold text-muted-foreground">Gastos do mês</p><p className="text-xl font-extrabold text-destructive">{brl(r.gastos)}</p><Variacao d={variacao(r.gastos, ant.gastos)} bomSubir={false} /></div>
        <div className={`rounded-3xl p-4 ${r.lucro >= 0 ? "bg-success/15" : "bg-destructive/15"}`}><p className="text-sm font-bold text-muted-foreground">Lucro</p><p className={`text-xl font-extrabold ${r.lucro >= 0 ? "text-success" : "text-destructive"}`}>{brl(r.lucro)}</p><Variacao d={variacao(r.lucro, ant.lucro)} bomSubir /></div>
        <div className="rounded-3xl bg-accent/15 p-4"><p className="text-sm font-bold text-muted-foreground">A receber</p><p className="text-xl font-extrabold text-accent-strong">{brl(r.aReceber)}</p><Variacao d={variacao(r.aReceber, ant.aReceber)} bomSubir={false} /></div>
      </div>

      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-primary">Últimos 6 meses</h2>
        <div className="mt-2 flex gap-4 text-sm font-bold"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-success" /> Recebido</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-destructive" /> Gastos</span></div>
        <div className="mt-4 flex h-44 items-end justify-between gap-2">
          {seis.map((x) => (
            <button key={x.m} onClick={() => setMes(x.m)} className="flex h-full flex-1 flex-col items-center justify-end gap-1" aria-label={`${nomeMes(x.m)}: recebido ${brl(x.recebido)}, gastos ${brl(x.gastos)}`}>
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div className="w-1/2 max-w-5 rounded-t bg-success" style={{ height: `${(x.recebido / maxBarra) * 100}%` }} />
                <div className="w-1/2 max-w-5 rounded-t bg-destructive" style={{ height: `${(x.gastos / maxBarra) * 100}%` }} />
              </div>
              <span className={`text-sm ${x.m === mes ? "font-extrabold text-primary" : "text-muted-foreground"}`}>{mesCurto(x.m)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-primary">Gastos por categoria</h2>
        <ul className="mt-3 space-y-3">
          {cats.map((c) => {
            const I = ICONE_CATEGORIA[c.categoria];
            return (
              <li key={c.categoria}>
                <div className="flex items-center justify-between gap-2 text-base"><span className="flex items-center gap-2 font-bold"><I className="h-5 w-5 text-accent-strong" />{c.categoria}</span><span><b>{brl(c.valor)}</b> <span className="text-muted-foreground">· {c.pct}%</span></span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(c.valor / maxCat) * 100}%` }} /></div>
              </li>
            );
          })}
          {cats.length === 0 && <p className="text-muted-foreground">Nenhum gasto neste mês.</p>}
        </ul>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-primary">Por linha</h2>
        <ul className="mt-2 divide-y">
          {pl.map((l) => (
            <li key={l.id || "gerais"} className="py-3">
              <p className="font-extrabold">{l.nome}</p>
              <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-muted-foreground">Recebeu</p><p className="font-bold text-success">{brl(l.recebido)}</p></div>
                <div><p className="text-muted-foreground">Gastou</p><p className="font-bold text-destructive">{brl(l.gastos)}</p></div>
                <div><p className="text-muted-foreground">Lucro</p><p className={`font-bold ${l.lucro >= 0 ? "text-success" : "text-destructive"}`}>{brl(l.lucro)}</p></div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-primary">Por van</h2>
        <ul className="mt-2 divide-y">
          {pv.map((v) => <li key={v.nome} className="flex justify-between py-3 text-lg"><span className="font-bold">{v.nome}</span><span className="font-extrabold text-destructive">{brl(v.valor)}</span></li>)}
        </ul>
      </section>

      <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-success text-lg font-extrabold text-success-foreground"><MessageCircle className="h-6 w-6" /> Enviar resumo pelo WhatsApp</a>
    </div>
  );
}
