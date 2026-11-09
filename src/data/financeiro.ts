// Regras do financeiro: gastos (inclusive os que repetem todo mês) e números do mês.
import { aberto, type Cobranca } from "./cobrancas";

export const CATEGORIAS = ["Diesel", "Manutenção", "Pneus", "Pedágio", "Alimentação", "Pagamento de motorista", "Documentos e seguro", "Lavagem", "Outros"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export type Gasto = {
  id: string; valor: number; data: string; categoria: Categoria; vanId: string; linhaId: string; descricao: string;
  litros: number | null; km: number | null; mensal: boolean;
};
/** Ocorrência de um gasto num mês (gastos "todo mês" aparecem em cada mês a partir do primeiro). */
export type Ocorrencia = Gasto & { origemId: string; repetido: boolean };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const mesDe = (iso: string) => iso.slice(0, 7);
export const nomeMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
export const mesCurto = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1]!.slice(0, 3);
export function somaMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a!, m! - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export const fimDoMes = (mes: string) => { const [a, m] = mes.split("-").map(Number); return `${mes}-${String(new Date(a!, m!, 0).getDate()).padStart(2, "0")}`; };

export function gastosDoMes(gastos: Gasto[], mes: string): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  for (const g of gastos) {
    if (mesDe(g.data) === mes) out.push({ ...g, origemId: g.id, repetido: false });
    else if (g.mensal && mesDe(g.data) < mes) {
      const dia = Math.min(Number(g.data.slice(8, 10)), Number(fimDoMes(mes).slice(8, 10)));
      out.push({ ...g, id: `${g.id}@${mes}`, data: `${mes}-${String(dia).padStart(2, "0")}`, origemId: g.id, repetido: true });
    }
  }
  return out.sort((a, b) => b.data.localeCompare(a.data));
}
const soma = (l: { valor: number }[]) => Math.round(l.reduce((s, x) => s + x.valor, 0) * 100) / 100;

export const recebidoMes = (cobs: Cobranca[], mes: string) =>
  Math.round(cobs.reduce((s, c) => s + c.pagamentos.filter((p) => mesDe(p.data) === mes).reduce((t, p) => t + p.valor, 0), 0) * 100) / 100;
/** O que estava em aberto no fim do mês (para o mês atual = em aberto hoje). */
export function aReceberMes(cobs: Cobranca[], mes: string, hoje: string) {
  if (mes >= mesDe(hoje)) return Math.round(cobs.reduce((s, c) => s + aberto(c), 0) * 100) / 100;
  const fim = fimDoMes(mes);
  return Math.round(cobs.filter((c) => !c.cancelada && c.vencimento <= fim)
    .reduce((s, c) => s + Math.max(0, c.valor - c.pagamentos.filter((p) => p.data <= fim).reduce((t, p) => t + p.valor, 0)), 0) * 100) / 100;
}

export function resumoMes(cobs: Cobranca[], gastos: Gasto[], mes: string, hoje: string) {
  const recebido = recebidoMes(cobs, mes);
  const gasto = soma(gastosDoMes(gastos, mes));
  return { recebido, gastos: gasto, lucro: Math.round((recebido - gasto) * 100) / 100, aReceber: aReceberMes(cobs, mes, hoje) };
}

export function porCategoria(gastos: Gasto[], mes: string) {
  const oc = gastosDoMes(gastos, mes);
  const total = soma(oc);
  return CATEGORIAS.map((c) => { const v = soma(oc.filter((g) => g.categoria === c)); return { categoria: c, valor: v, pct: total ? Math.round((v / total) * 100) : 0 }; })
    .filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
}

/** Por linha: recebido (pagamentos dos passageiros da linha), gastos ligados à linha e lucro. Gastos sem linha vão em "Gastos gerais". */
export function porLinha(cobs: Cobranca[], gastos: Gasto[], mes: string, linhas: { id: string; nome: string }[], linhaDoPassageiro: (pid: string) => string) {
  const oc = gastosDoMes(gastos, mes);
  const rec: Record<string, number> = {};
  for (const c of cobs) for (const p of c.pagamentos) if (mesDe(p.data) === mes) { const l = c.tipo === "viagem" ? (c.linhaId ?? linhaDoPassageiro(c.pid)) : linhaDoPassageiro(c.pid); rec[l] = (rec[l] ?? 0) + p.valor; }
  const linhasR = linhas.map((l) => { const r = rec[l.id] ?? 0, g = soma(oc.filter((x) => x.linhaId === l.id)); return { id: l.id, nome: l.nome, recebido: r, gastos: g, lucro: Math.round((r - g) * 100) / 100 }; });
  const ids = new Set(linhas.map((l) => l.id));
  const gerais = soma(oc.filter((x) => !x.linhaId || !ids.has(x.linhaId)));
  const semLinha = Object.entries(rec).filter(([k]) => !ids.has(k)).reduce((s, [, v]) => s + v, 0);
  return [...linhasR, { id: "", nome: "Gastos gerais", recebido: semLinha, gastos: gerais, lucro: Math.round((semLinha - gerais) * 100) / 100 }];
}

export const porVan = (gastos: Gasto[], mes: string, vans: { id: string; apelido: string }[]) => {
  const oc = gastosDoMes(gastos, mes);
  return [...vans.map((v) => ({ nome: v.apelido, valor: soma(oc.filter((g) => g.vanId === v.id)) })), { nome: "Sem van", valor: soma(oc.filter((g) => !vans.some((v) => v.id === g.vanId))) }].filter((x, i, a) => i < a.length - 1 || x.valor > 0);
};

/** Diferença em relação ao mês anterior. */
export const variacao = (atual: number, anterior: number) => Math.round((atual - anterior) * 100) / 100;
