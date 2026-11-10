// Exportar para planilha (CSV): recebimentos, gastos e o resumo do período.
// Formato pensado para o Excel e o Planilhas Google em português: separador ";", vírgula nos decimais, acentos preservados (UTF-8 com BOM).
import { dataBR } from "./cobrancas";
import type { Cobranca } from "./cobrancas";
import {
  gastosDoPeriodo,
  nomePeriodo,
  type CombustivelVan,
  type Contexto,
  type OcupacaoLinha,
  type Periodo,
} from "./relatorios";
import type { relatorioPeriodo } from "./relatorios";

export type Celula = string | number | null | undefined;

const SEPARADOR = ";";
const BOM = String.fromCharCode(0xfeff); // marca de UTF-8: sem ela o Excel estraga os acentos
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Número no jeito brasileiro (vírgula), sem separador de milhar, para a planilha reconhecer como número. */
export const numeroBR = (n: number) => r2(n).toFixed(2).replace(".", ",");

/**
 * Uma célula do CSV. Texto que começa com =, +, -, @ (ou tab/enter) viraria fórmula na planilha:
 * recebe um apóstrofo na frente. Números nunca passam por isso (podem ser negativos).
 */
export function celulaCsv(v: Celula): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? numeroBR(v) : "";
  const texto = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export const csv = (linhas: Celula[][]): string =>
  BOM + linhas.map((l) => l.map(celulaCsv).join(SEPARADOR)).join("\r\n") + "\r\n";

export type TipoExportacao = "recebimentos" | "gastos" | "resumo";
export const nomeDoArquivoExportado = (tipo: TipoExportacao, p: Periodo) =>
  `vanzeiro-${tipo}-${p.de}_a_${p.ate}.csv`;

type Ctx = Contexto & { passageiros: { id: string; nome: string }[] };
const FORMA = { pix: "Pix", dinheiro: "Dinheiro" } as const;

/** Cada pagamento recebido no período, um por linha, com o total no fim. */
export function linhasRecebimentos(ctx: Ctx, p: Periodo): Celula[][] {
  const nomeLinha = new Map(ctx.linhas.map((l) => [l.id, l]));
  const nomeVan = new Map(ctx.vans.map((v) => [v.id, v.apelido]));
  const nomePas = new Map(ctx.passageiros.map((x) => [x.id, x.nome]));
  const linhaDe = (c: Cobranca) => {
    const id =
      c.tipo === "viagem"
        ? (c.linhaId ?? ctx.linhaDoPassageiro(c.pid))
        : ctx.linhaDoPassageiro(c.pid);
    return nomeLinha.get(id);
  };
  const itens: { data: string; recibo: number; linha: Celula[] }[] = [];
  let total = 0;
  for (const c of ctx.cobrancas)
    for (const pg of c.pagamentos) {
      if (pg.data < p.de || pg.data > p.ate) continue;
      const linha = linhaDe(c);
      total += pg.valor;
      itens.push({
        data: pg.data,
        recibo: pg.recibo,
        linha: [
          dataBR(pg.data),
          nomePas.get(c.pid) ?? "Passageiro removido",
          c.ref,
          FORMA[pg.forma] ?? pg.forma,
          pg.valor,
          String(pg.recibo),
          linha?.nome ?? "Sem linha",
          nomeVan.get(linha?.vanId ?? "") ?? "Sem van",
        ],
      });
    }
  itens.sort((a, b) => a.data.localeCompare(b.data) || a.recibo - b.recibo);
  return [
    ["Data", "Passageiro", "Referência", "Forma", "Valor (R$)", "Recibo nº", "Linha", "Van"],
    ...itens.map((i) => i.linha),
    ["TOTAL", "", "", "", total, "", "", ""],
  ];
}

/** Cada gasto do período (os que se repetem todo mês aparecem em cada mês), com o total no fim. */
export function linhasGastos(ctx: Ctx, p: Periodo): Celula[][] {
  const nomeLinha = new Map(ctx.linhas.map((l) => [l.id, l.nome]));
  const nomeVan = new Map(ctx.vans.map((v) => [v.id, v.apelido]));
  const gastos = gastosDoPeriodo(ctx.gastos, p).sort(
    (a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id),
  );
  const total = gastos.reduce((s, g) => s + g.valor, 0);
  return [
    [
      "Data",
      "Categoria",
      "Descrição",
      "Van",
      "Linha",
      "Litros",
      "Km",
      "Valor (R$)",
      "Repete todo mês",
    ],
    ...gastos.map((g) => [
      dataBR(g.data),
      g.categoria,
      g.descricao,
      nomeVan.get(g.vanId) ?? "Sem van",
      nomeLinha.get(g.linhaId) ?? "Sem linha",
      g.litros,
      g.km === null ? null : String(g.km),
      g.valor,
      g.mensal ? "Sim" : "Não",
    ]),
    ["TOTAL", "", "", "", "", "", "", total, ""],
  ];
}

type Relatorio = ReturnType<typeof relatorioPeriodo>;

/** Resumo do período: totais, lucro por van e por linha, ocupação das viagens e combustível. */
export function linhasResumo(
  p: Periodo,
  rel: Relatorio,
  ocupacao: { linhas: OcupacaoLinha[]; geral: { viagens: number; pct: number } },
  combustivel: CombustivelVan[],
  vanzeiro = "",
): Celula[][] {
  const bloco = (titulo: string, itens: Relatorio["porVan"]): Celula[][] => [
    [],
    [titulo],
    [titulo === "Por van" ? "Van" : "Linha", "Recebido (R$)", "Gastos (R$)", "Lucro (R$)"],
    ...itens.map((i) => [i.nome, i.recebido, i.gastos, i.lucro]),
  ];
  const out: Celula[][] = [
    ["Resumo do período", nomePeriodo(p)],
    ["De", dataBR(p.de)],
    ["Até", dataBR(p.ate)],
    ...(vanzeiro ? [["Vanzeiro", vanzeiro] as Celula[]] : []),
    [],
    ["Recebido (R$)", rel.recebido],
    ["Gastos (R$)", rel.gastos],
    ["Lucro (R$)", rel.lucro],
    ...(rel.margem !== null ? [["Lucro sobre o recebido (%)", rel.margem] as Celula[]] : []),
    ...bloco("Por van", rel.porVan),
    ...bloco("Por linha", rel.porLinha),
  ];
  if (ocupacao.linhas.length) {
    out.push(
      [],
      ["Ocupação das viagens"],
      ["Linha", "Viagens", "Embarques (média)", "Lugares (média)", "Ocupação (%)"],
    );
    for (const o of ocupacao.linhas)
      out.push([o.nome, String(o.viagens), o.embarques, o.lugares, String(o.pct)]);
    out.push(["Geral", String(ocupacao.geral.viagens), "", "", String(ocupacao.geral.pct)]);
  }
  if (combustivel.length) {
    out.push(
      [],
      ["Combustível"],
      [
        "Van",
        "Abastecimentos",
        "Litros",
        "Gasto (R$)",
        "Preço por litro (R$)",
        "Km rodados",
        "Consumo (km/L)",
        "Custo por km (R$)",
      ],
    );
    for (const c of combustivel)
      out.push([
        c.nome,
        String(c.abastecimentos),
        c.litros,
        c.valor,
        c.precoLitro,
        c.kmRodados === null ? null : String(c.kmRodados),
        c.kmPorLitro,
        c.custoPorKm,
      ]);
  }
  return out;
}
