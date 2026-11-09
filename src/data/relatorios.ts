// Relatórios por período: lucro por van e por linha, ocupação das viagens, combustível e texto para compartilhar.
import { brl, type Cobranca } from "./cobrancas";
import { fimDoMes, gastosDoMes, mesDe, nomeMes, somaMes, type Gasto } from "./financeiro";
import type { ItemHistorico } from "./historico";

export type Periodo = { de: string; ate: string };
export type PresetPeriodo = "mes" | "mes_passado" | "3meses" | "ano";
export const PRESETS: { id: PresetPeriodo; nome: string }[] = [
  { id: "mes", nome: "Este mês" }, { id: "mes_passado", nome: "Mês passado" }, { id: "3meses", nome: "Últimos 3 meses" }, { id: "ano", nome: "Este ano" },
];

const r2 = (n: number) => Math.round(n * 100) / 100;
const dentro = (d: string, p: Periodo) => d >= p.de && d <= p.ate;
export const periodoValido = (p: Periodo) => /^\d{4}-\d{2}-\d{2}$/.test(p.de) && /^\d{4}-\d{2}-\d{2}$/.test(p.ate) && p.de <= p.ate;

export function periodoPreset(id: PresetPeriodo, hoje: string): Periodo {
  const mes = mesDe(hoje);
  switch (id) {
    case "mes": return { de: `${mes}-01`, ate: fimDoMes(mes) };
    case "mes_passado": { const m = somaMes(mes, -1); return { de: `${m}-01`, ate: fimDoMes(m) }; }
    case "3meses": return { de: `${somaMes(mes, -2)}-01`, ate: fimDoMes(mes) };
    case "ano": return { de: `${hoje.slice(0, 4)}-01-01`, ate: `${hoje.slice(0, 4)}-12-31` };
  }
}

export function nomePeriodo(p: Periodo) {
  const br = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  if (p.de.slice(8) === "01" && p.ate === fimDoMes(mesDe(p.ate))) {
    return mesDe(p.de) === mesDe(p.ate) ? nomeMes(mesDe(p.de)) : `${nomeMes(mesDe(p.de))} a ${nomeMes(mesDe(p.ate))}`;
  }
  return `${br(p.de)} a ${br(p.ate)}`;
}

export type LinhaR = { id: string; nome: string; vanId: string };
export type VanR = { id: string; apelido: string; lugares: number };
export type Contexto = { cobrancas: Cobranca[]; gastos: Gasto[]; linhas: LinhaR[]; vans: VanR[]; linhaDoPassageiro: (pid: string) => string };
export type Linha3 = { id: string; nome: string; recebido: number; gastos: number; lucro: number };

/** Gastos que caem no período (gastos "todo mês" entram em cada mês do período). */
export function gastosDoPeriodo(gastos: Gasto[], p: Periodo) {
  const out = [];
  for (let m = mesDe(p.de); m <= mesDe(p.ate); m = somaMes(m, 1)) out.push(...gastosDoMes(gastos, m).filter((g) => dentro(g.data, p)));
  return out;
}

export function relatorioPeriodo(ctx: Contexto, p: Periodo) {
  const gastos = gastosDoPeriodo(ctx.gastos, p);
  const linhaPorId = new Map(ctx.linhas.map((l) => [l.id, l]));
  const vanDaLinha = (linhaId: string) => linhaPorId.get(linhaId)?.vanId ?? "";
  const vanIds = new Set(ctx.vans.map((v) => v.id));
  const linhaIds = new Set(ctx.linhas.map((l) => l.id));

  const recLinha: Record<string, number> = {}, recVan: Record<string, number> = {};
  let recebido = 0;
  for (const c of ctx.cobrancas) for (const pg of c.pagamentos) {
    if (!dentro(pg.data, p)) continue;
    const linha = c.tipo === "viagem" ? (c.linhaId ?? ctx.linhaDoPassageiro(c.pid)) : ctx.linhaDoPassageiro(c.pid);
    const chaveLinha = linhaIds.has(linha) ? linha : "";
    const van = vanDaLinha(chaveLinha);
    const chaveVan = vanIds.has(van) ? van : "";
    recLinha[chaveLinha] = (recLinha[chaveLinha] ?? 0) + pg.valor;
    recVan[chaveVan] = (recVan[chaveVan] ?? 0) + pg.valor;
    recebido += pg.valor;
  }
  const gasLinha: Record<string, number> = {}, gasVan: Record<string, number> = {};
  let totalGastos = 0;
  for (const g of gastos) {
    const chaveLinha = linhaIds.has(g.linhaId) ? g.linhaId : "";
    const van = g.vanId || vanDaLinha(chaveLinha);
    const chaveVan = vanIds.has(van) ? van : "";
    gasLinha[chaveLinha] = (gasLinha[chaveLinha] ?? 0) + g.valor;
    gasVan[chaveVan] = (gasVan[chaveVan] ?? 0) + g.valor;
    totalGastos += g.valor;
  }
  const monta = (itens: { id: string; nome: string }[], rec: Record<string, number>, gas: Record<string, number>, rotuloResto: string): Linha3[] => {
    const linhas = itens.map((i) => ({ id: i.id, nome: i.nome, recebido: r2(rec[i.id] ?? 0), gastos: r2(gas[i.id] ?? 0), lucro: r2((rec[i.id] ?? 0) - (gas[i.id] ?? 0)) }));
    const resto = { id: "", nome: rotuloResto, recebido: r2(rec[""] ?? 0), gastos: r2(gas[""] ?? 0), lucro: r2((rec[""] ?? 0) - (gas[""] ?? 0)) };
    return resto.recebido || resto.gastos ? [...linhas, resto] : linhas;
  };
  return {
    recebido: r2(recebido), gastos: r2(totalGastos), lucro: r2(recebido - totalGastos),
    margem: recebido > 0 ? Math.round(((recebido - totalGastos) / recebido) * 100) : null,
    porVan: monta(ctx.vans.map((v) => ({ id: v.id, nome: v.apelido })), recVan, gasVan, "Sem van"),
    porLinha: monta(ctx.linhas, recLinha, gasLinha, "Gastos gerais"),
  };
}

export type OcupacaoLinha = { linhaId: string; nome: string; viagens: number; embarques: number; lugares: number; pct: number };

/** Ocupação média: embarques ÷ lugares da van, somando as viagens realizadas no período. */
export function ocupacaoPorLinha(historico: ItemHistorico[], linhas: LinhaR[], vans: VanR[], p: Periodo): { linhas: OcupacaoLinha[]; geral: { viagens: number; pct: number } } {
  const ag: Record<string, { viagens: number; embarques: number; lugares: number }> = {};
  for (const h of historico) {
    if (!dentro(h.data, p)) continue;
    const linha = linhas.find((l) => l.id === h.linhaId);
    const lugares = vans.find((v) => v.id === (h.ajuste.vanId ?? linha?.vanId))?.lugares ?? 0;
    if (!linha || lugares <= 0) continue;
    const a = (ag[linha.id] ??= { viagens: 0, embarques: 0, lugares: 0 });
    a.viagens += 1; a.embarques += h.stats.embarcaram; a.lugares += lugares;
  }
  const lista = linhas.filter((l) => ag[l.id]).map((l) => {
    const a = ag[l.id]!;
    return { linhaId: l.id, nome: l.nome, viagens: a.viagens, embarques: a.embarques / a.viagens, lugares: a.lugares / a.viagens, pct: Math.round((a.embarques / a.lugares) * 100) };
  });
  const tot = Object.values(ag).reduce((s, a) => ({ v: s.v + a.viagens, e: s.e + a.embarques, l: s.l + a.lugares }), { v: 0, e: 0, l: 0 });
  return { linhas: lista, geral: { viagens: tot.v, pct: tot.l ? Math.round((tot.e / tot.l) * 100) : 0 } };
}

export type CombustivelVan = { vanId: string; nome: string; abastecimentos: number; litros: number; valor: number; precoLitro: number; kmRodados: number | null; kmPorLitro: number | null; custoPorKm: number | null };

/**
 * Combustível por van. Preço por litro = valor ÷ litros. Consumo (método do tanque cheio): km rodados entre a primeira e a
 * última leitura do hodômetro ÷ litros abastecidos depois da primeira. Sem pelo menos 2 leituras de km, não calcula consumo.
 */
export function combustivelPorVan(gastos: Gasto[], p: Periodo, vans: VanR[]): CombustivelVan[] {
  const dies = gastosDoPeriodo(gastos, p).filter((g) => g.categoria === "Diesel" && g.litros && g.litros > 0);
  const out: CombustivelVan[] = [];
  for (const van of vans) {
    const dela = dies.filter((g) => g.vanId === van.id);
    if (dela.length === 0) continue;
    const litros = dela.reduce((s, g) => s + g.litros!, 0), valor = dela.reduce((s, g) => s + g.valor, 0);
    const comKm = dela.filter((g) => g.km != null).sort((a, b) => a.km! - b.km!);
    let kmRodados: number | null = null, kmPorLitro: number | null = null, custoPorKm: number | null = null;
    if (comKm.length >= 2) {
      const primeiro = comKm[0]!, ultimo = comKm[comKm.length - 1]!;
      const rod = ultimo.km! - primeiro.km!;
      const litrosDepois = comKm.slice(1).reduce((s, g) => s + g.litros!, 0);
      const valorDepois = comKm.slice(1).reduce((s, g) => s + g.valor, 0);
      if (rod > 0 && litrosDepois > 0) { kmRodados = rod; kmPorLitro = r2(rod / litrosDepois); custoPorKm = r2(valorDepois / rod); }
    }
    out.push({ vanId: van.id, nome: van.apelido, abastecimentos: dela.length, litros: r2(litros), valor: r2(valor), precoLitro: r2(valor / litros), kmRodados, kmPorLitro, custoPorKm });
  }
  return out;
}

type DadosTexto = {
  periodo: Periodo; vanzeiro: string; rel: ReturnType<typeof relatorioPeriodo>;
  ocupacao: ReturnType<typeof ocupacaoPorLinha>; combustivel: CombustivelVan[];
};

/** Relatório do período em texto para WhatsApp. */
export function textoRelatorio({ periodo, vanzeiro, rel, ocupacao, combustivel }: DadosTexto): string {
  const linhas = [
    `*Relatório — ${nomePeriodo(periodo)}*`, vanzeiro, "",
    `Recebido: ${brl(rel.recebido)}`, `Gastos: ${brl(rel.gastos)}`,
    `Lucro: ${brl(rel.lucro)}${rel.margem !== null ? ` (${rel.margem}% do recebido)` : ""}`,
  ];
  const bloco = (titulo: string, itens: Linha3[]) => {
    if (!itens.length) return;
    linhas.push("", `*${titulo}*`);
    for (const i of itens) linhas.push(`${i.nome}: recebeu ${brl(i.recebido)} · gastou ${brl(i.gastos)} · lucro ${brl(i.lucro)}`);
  };
  bloco("Por van", rel.porVan);
  bloco("Por linha", rel.porLinha);
  if (ocupacao.linhas.length) {
    linhas.push("", `*Ocupação das viagens* (${ocupacao.geral.viagens} viagens, ${ocupacao.geral.pct}% dos lugares)`);
    for (const o of ocupacao.linhas) linhas.push(`${o.nome}: ${o.pct}% · ${o.viagens} viagens`);
  }
  if (combustivel.length) {
    linhas.push("", "*Combustível*");
    for (const c of combustivel) linhas.push(`${c.nome}: ${c.litros} L · ${brl(c.valor)} (${brl(c.precoLitro)}/L)${c.kmPorLitro ? ` · ${String(c.kmPorLitro).replace(".", ",")} km/L` : ""}`);
  }
  return linhas.join("\n");
}
