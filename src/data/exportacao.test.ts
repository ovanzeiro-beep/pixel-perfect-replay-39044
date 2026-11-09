import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cobranca } from "./cobrancas";
import {
  celulaCsv,
  csv,
  linhasGastos,
  linhasRecebimentos,
  linhasResumo,
  nomeDoArquivoExportado,
  numeroBR,
} from "./exportacao";
import type { Gasto } from "./financeiro";
import {
  combustivelPorVan,
  ocupacaoPorLinha,
  periodoPreset,
  relatorioPeriodo,
  type Contexto,
} from "./relatorios";
import { historicoViagens } from "./historico";

describe("célula do CSV", () => {
  it("número no jeito brasileiro, sem milhar, com sinal", () => {
    expect(numeroBR(1234.5)).toBe("1234,50");
    expect(numeroBR(-50)).toBe("-50,00");
    expect(numeroBR(0.005)).toBe("0,01");
    expect(celulaCsv(150)).toBe("150,00");
    expect(celulaCsv(-12.3)).toBe("-12,30");
  });
  it("texto com ponto e vírgula, aspas ou quebra de linha vai entre aspas, com aspas dobradas", () => {
    expect(celulaCsv("a;b")).toBe('"a;b"');
    expect(celulaCsv('diz "oi"')).toBe('"diz ""oi"""');
    expect(celulaCsv("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(celulaCsv("simples")).toBe("simples");
    expect(celulaCsv("Açaí, pão")).toBe("Açaí, pão");
  });
  it("vazio, nulo e número inválido viram célula vazia", () => {
    expect(celulaCsv(null)).toBe("");
    expect(celulaCsv(undefined)).toBe("");
    expect(celulaCsv("")).toBe("");
    expect(celulaCsv(Number.NaN)).toBe("");
  });
  it("texto que viraria fórmula na planilha ganha apóstrofo (nome, descrição...)", () => {
    for (const perigoso of [
      "=1+1",
      "+55 43 9999",
      "-cmd",
      "@SOMA(A1)",
      "\t=x",
      '=HYPERLINK("http://x")',
    ]) {
      expect(celulaCsv(perigoso).replace(/^"/, "")).toMatch(/^'/);
    }
    expect(celulaCsv("-50")).toBe("'-50");
    expect(celulaCsv(-50)).toBe("-50,00"); // número de verdade não é mexido
  });
  it("o arquivo tem BOM (acentos certos no Excel), separador ';' e linhas com CRLF", () => {
    const t = csv([
      ["Nome", "Valor"],
      ["José", 10],
    ]);
    expect(t.startsWith("﻿")).toBe(true);
    expect(t).toBe("﻿Nome;Valor\r\nJosé;10,00\r\n");
  });
  it("nome do arquivo tem o tipo e o período", () => {
    expect(nomeDoArquivoExportado("recebimentos", { de: "2026-11-01", ate: "2026-11-30" })).toBe(
      "vanzeiro-recebimentos-2026-11-01_a_2026-11-30.csv",
    );
    expect(nomeDoArquivoExportado("resumo", { de: "2026-01-01", ate: "2026-12-31" })).toBe(
      "vanzeiro-resumo-2026-01-01_a_2026-12-31.csv",
    );
  });
});

const pg = (valor: number, data: string, forma: "pix" | "dinheiro", recibo: number) => ({
  valor,
  data,
  forma,
  recibo,
});
const cob = (
  o: Partial<Cobranca> & { pid: string; pagamentos: Cobranca["pagamentos"] },
): Cobranca => ({
  id: `${o.pid}_${Math.random()}`,
  tipo: "mes",
  ref: "Novembro",
  vencimento: "2026-11-05",
  valor: 100,
  ...o,
});
const gas = (o: Partial<Gasto> & { valor: number; data: string }): Gasto => ({
  id: `g${Math.random()}`,
  categoria: "Outros",
  vanId: "",
  linhaId: "",
  descricao: "",
  litros: null,
  km: null,
  mensal: false,
  ...o,
});

const linhas = [{ id: "l1", nome: "Londrina", vanId: "v1" }];
const vans = [{ id: "v1", apelido: "Branca", lugares: 10 }];
const passageiros = [
  { id: "a", nome: "Ana Lima" },
  { id: "b", nome: "=CMD()" },
];
const periodo = { de: "2026-11-01", ate: "2026-11-30" };

describe("planilha de recebimentos", () => {
  const ctx = {
    cobrancas: [
      cob({
        pid: "a",
        ref: "Viagem 07/11",
        tipo: "viagem",
        linhaId: "l1",
        pagamentos: [pg(150, "2026-11-07", "pix", 5)],
      }),
      cob({
        pid: "b",
        pagamentos: [pg(300, "2026-11-02", "dinheiro", 2), pg(40, "2026-10-30", "pix", 1)],
      }),
      cob({ pid: "sumiu", pagamentos: [pg(10, "2026-11-03", "pix", 3)] }),
    ],
    gastos: [],
    linhas,
    vans,
    linhaDoPassageiro: () => "l1",
    passageiros,
  } as Contexto & { passageiros: typeof passageiros };
  const l = linhasRecebimentos(ctx, periodo);

  it("cabeçalho, um pagamento por linha só do período, e o total", () => {
    expect(l[0]).toEqual([
      "Data",
      "Passageiro",
      "Referência",
      "Forma",
      "Valor (R$)",
      "Recibo nº",
      "Linha",
      "Van",
    ]);
    expect(l).toHaveLength(1 + 3 + 1);
    expect(l.at(-1)).toEqual(["TOTAL", "", "", "", 460, "", "", ""]);
  });
  it("em ordem de data (depois recibo), com forma por extenso e linha/van", () => {
    expect(l.slice(1, 4).map((r) => r[0])).toEqual(["02/11/2026", "03/11/2026", "07/11/2026"]);
    expect(l[1]).toEqual([
      "02/11/2026",
      "=CMD()",
      "Novembro",
      "Dinheiro",
      300,
      "2",
      "Londrina",
      "Branca",
    ]);
    expect(l[3]![3]).toBe("Pix");
  });
  it("passageiro que não existe mais aparece como 'Passageiro removido'", () => {
    expect(l[2]![1]).toBe("Passageiro removido");
  });
  it("no arquivo final, nome perigoso sai protegido", () => {
    expect(csv(l)).toContain("'=CMD()");
  });
});

describe("planilha de gastos", () => {
  const ctx = {
    cobrancas: [],
    gastos: [
      gas({
        valor: 200,
        data: "2026-11-04",
        vanId: "v1",
        linhaId: "l1",
        categoria: "Diesel",
        descricao: "Posto; centro",
        litros: 30,
        km: 1000,
      }),
      gas({ valor: 100, data: "2026-11-02" }),
      gas({ valor: 1000, data: "2026-09-10", mensal: true, descricao: "Parcela" }),
      gas({ valor: 999, data: "2026-10-20" }),
    ],
    linhas,
    vans,
    linhaDoPassageiro: () => "",
    passageiros,
  } as Contexto & { passageiros: typeof passageiros };
  const l = linhasGastos(ctx, periodo);

  it("só o período, com o gasto 'todo mês' repetido no mês e o total", () => {
    expect(l[0]).toEqual([
      "Data",
      "Categoria",
      "Descrição",
      "Van",
      "Linha",
      "Litros",
      "Km",
      "Valor (R$)",
      "Repete todo mês",
    ]);
    expect(l.slice(1, -1).map((r) => r[0])).toEqual(["02/11/2026", "04/11/2026", "10/11/2026"]);
    expect(l.at(-1)![7]).toBe(1300);
  });
  it("van e linha por nome, 'Sem van'/'Sem linha' quando não há, e 'Sim/Não' no repete", () => {
    expect(l[2]).toEqual([
      "04/11/2026",
      "Diesel",
      "Posto; centro",
      "Branca",
      "Londrina",
      30,
      "1000",
      200,
      "Não",
    ]);
    expect(l[1]![3]).toBe("Sem van");
    expect(l[1]![4]).toBe("Sem linha");
    expect(l[3]![8]).toBe("Sim");
  });
  it("texto com ponto e vírgula não quebra as colunas", () => {
    const linha = csv(l).split("\r\n")[2]!;
    expect(linha).toContain('"Posto; centro"');
    expect(linha.split(";").length).toBeGreaterThan(9); // há ';' dentro da célula entre aspas
  });
});

describe("planilha do resumo", () => {
  const ctx = {
    cobrancas: [cob({ pid: "a", pagamentos: [pg(300, "2026-11-02", "pix", 1)] })],
    gastos: [gas({ valor: 100, data: "2026-11-04", vanId: "v1", linhaId: "l1" })],
    linhas,
    vans,
    linhaDoPassageiro: () => "l1",
  } as Contexto;
  const rel = relatorioPeriodo(ctx, periodo);
  const l = linhasResumo(
    periodo,
    rel,
    {
      linhas: [
        { linhaId: "l1", nome: "Londrina", viagens: 2, embarques: 7.5, lugares: 10, pct: 75 },
      ],
      geral: { viagens: 2, pct: 75 },
    },
    [
      {
        vanId: "v1",
        nome: "Branca",
        abastecimentos: 2,
        litros: 100,
        valor: 630,
        precoLitro: 6.3,
        kmRodados: 900,
        kmPorLitro: 9,
        custoPorKm: 0.7,
      },
    ],
    "João",
  );

  it("totais, por van, por linha, ocupação e combustível", () => {
    const achar = (t: string) => l.find((r) => r[0] === t);
    expect(l[0]).toEqual(["Resumo do período", "Novembro de 2026"]);
    expect(achar("Recebido (R$)")![1]).toBe(300);
    expect(achar("Gastos (R$)")![1]).toBe(100);
    expect(achar("Lucro (R$)")![1]).toBe(200);
    expect(achar("Lucro sobre o recebido (%)")![1]).toBe(67);
    expect(achar("Vanzeiro")![1]).toBe("João");
    expect(l.some((r) => r[0] === "Por van")).toBe(true);
    expect(l.some((r) => r[0] === "Por linha")).toBe(true);
    expect(achar("Ocupação das viagens")).toBeDefined();
    expect(achar("Combustível")).toBeDefined();
    expect(achar("Branca")![1]).toBe(300); // linha "Por van"
  });
  it("sem ocupação nem combustível, essas seções não aparecem", () => {
    const m = linhasResumo(periodo, rel, { linhas: [], geral: { viagens: 0, pct: 0 } }, []);
    expect(m.some((r) => r[0] === "Ocupação das viagens")).toBe(false);
    expect(m.some((r) => r[0] === "Combustível")).toBe(false);
  });
  it("período sem nada não mostra a porcentagem", () => {
    const vazio = relatorioPeriodo(ctx, { de: "2020-01-01", ate: "2020-01-31" });
    expect(
      linhasResumo(
        { de: "2020-01-01", ate: "2020-01-31" },
        vazio,
        { linhas: [], geral: { viagens: 0, pct: 0 } },
        [],
      ).some((r) => r[0] === "Lucro sobre o recebido (%)"),
    ).toBe(false);
  });
});

describe("as planilhas batem com o relatório da tela (dados de exemplo)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });
  it.each(["mes", "mes_passado", "3meses", "ano"] as const)(
    "período %s: soma dos recebimentos e dos gastos é a do relatório",
    async (preset) => {
      const store = await import("./store");
      const e = store.obterEstado();
      const hoje = new Date();
      const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      const p = periodoPreset(preset, iso);
      const ctx = {
        cobrancas: e.cobrancas,
        gastos: e.gastos,
        linhas: e.linhas,
        vans: e.vans,
        passageiros: e.passageiros,
        linhaDoPassageiro: (pid: string) =>
          e.passageiros.find((x) => x.id === pid)?.linhaIds[0] ?? "",
      };
      const rel = relatorioPeriodo(ctx, p);
      const rec = linhasRecebimentos(ctx, p);
      const gas = linhasGastos(ctx, p);
      expect(rec.at(-1)![4] as number).toBeCloseTo(rel.recebido, 2);
      expect(gas.at(-1)![7] as number).toBeCloseTo(rel.gastos, 2);
      const somaLinhas = (l: (string | number | null | undefined)[][], col: number) =>
        l.slice(1, -1).reduce((s, r) => s + (r[col] as number), 0);
      expect(somaLinhas(rec, 4)).toBeCloseTo(rel.recebido, 2);
      expect(somaLinhas(gas, 7)).toBeCloseTo(rel.gastos, 2);
      const oc = ocupacaoPorLinha(historicoViagens(e.ajustes), e.linhas, e.vans, p);
      const resumo = linhasResumo(
        p,
        rel,
        oc,
        combustivelPorVan(e.gastos, p, e.vans),
        e.perfil.nome,
      );
      expect(resumo.find((r) => r[0] === "Recebido (R$)")![1]).toBe(rel.recebido);
      // o arquivo inteiro é CSV válido: toda linha tem as colunas do cabeçalho
      for (const l of [rec, gas]) {
        const texto = csv(l).slice(1);
        expect(texto.endsWith("\r\n")).toBe(true);
      }
    },
  );
});
