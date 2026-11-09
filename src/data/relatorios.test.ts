import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cobranca } from "./cobrancas";
import type { Gasto } from "./financeiro";
import { resumoMes, mesDe, somaMes, fimDoMes } from "./financeiro";
import { historicoViagens, type ItemHistorico } from "./historico";
import { combustivelPorVan, nomePeriodo, ocupacaoPorLinha, periodoPreset, periodoValido, relatorioPeriodo, textoRelatorio, type Contexto } from "./relatorios";

const pg = (valor: number, data: string) => ({ valor, data, forma: "pix" as const, recibo: 1 });
const cob = (o: Partial<Cobranca> & { pid: string; pagamentos: Cobranca["pagamentos"] }): Cobranca => ({ id: `${o.pid}_${Math.random()}`, tipo: "mes", ref: "x", vencimento: "2026-11-05", valor: 100, ...o });
const gas = (o: Partial<Gasto> & { valor: number; data: string }): Gasto => ({ id: `g${Math.random()}`, categoria: "Outros", vanId: "", linhaId: "", descricao: "", litros: null, km: null, mensal: false, ...o });

const linhas = [{ id: "l1", nome: "Londrina", vanId: "v1" }, { id: "l2", nome: "Faculdade", vanId: "v2" }];
const vans = [{ id: "v1", apelido: "Branca", lugares: 10 }, { id: "v2", apelido: "Prata", lugares: 5 }];
const linhaDoPassageiro = (pid: string) => ({ a: "l1", b: "l2" })[pid as "a" | "b"] ?? "";

describe("períodos", () => {
  it("atalhos", () => {
    expect(periodoPreset("mes", "2026-11-09")).toEqual({ de: "2026-11-01", ate: "2026-11-30" });
    expect(periodoPreset("mes_passado", "2026-01-15")).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
    expect(periodoPreset("3meses", "2026-11-09")).toEqual({ de: "2026-09-01", ate: "2026-11-30" });
    expect(periodoPreset("ano", "2026-11-09")).toEqual({ de: "2026-01-01", ate: "2026-12-31" });
  });
  it("fevereiro de ano bissexto", () => {
    expect(periodoPreset("mes", "2028-02-10").ate).toBe("2028-02-29");
  });
  it("validação", () => {
    expect(periodoValido({ de: "2026-11-01", ate: "2026-11-30" })).toBe(true);
    expect(periodoValido({ de: "2026-11-30", ate: "2026-11-01" })).toBe(false);
    expect(periodoValido({ de: "", ate: "2026-11-01" })).toBe(false);
  });
  it("nome legível", () => {
    expect(nomePeriodo({ de: "2026-11-01", ate: "2026-11-30" })).toBe("Novembro de 2026");
    expect(nomePeriodo({ de: "2026-09-01", ate: "2026-11-30" })).toBe("Setembro de 2026 a Novembro de 2026");
    expect(nomePeriodo({ de: "2026-11-03", ate: "2026-11-20" })).toBe("03/11/2026 a 20/11/2026");
  });
});

describe("relatorioPeriodo", () => {
  const cobrancas = [
    cob({ pid: "a", pagamentos: [pg(300, "2026-11-02")] }),
    cob({ pid: "b", pagamentos: [pg(100, "2026-11-03"), pg(50, "2026-10-30")] }),
    cob({ pid: "a", tipo: "viagem", linhaId: "l2", pagamentos: [pg(150, "2026-11-07")] }),
    cob({ pid: "zz", pagamentos: [pg(40, "2026-11-08")] }),
  ];
  const gastos = [
    gas({ valor: 200, data: "2026-11-04", vanId: "v1", linhaId: "l1" }),
    gas({ valor: 100, data: "2026-11-05", vanId: "v2" }),
    gas({ valor: 60, data: "2026-11-06", linhaId: "l2" }),
    gas({ valor: 30, data: "2026-11-06" }),
    gas({ valor: 500, data: "2026-10-20", vanId: "v1" }),
  ];
  const ctx: Contexto = { cobrancas, gastos, linhas, vans, linhaDoPassageiro };
  const r = relatorioPeriodo(ctx, { de: "2026-11-01", ate: "2026-11-30" });

  it("só conta o que está dentro do período", () => {
    expect(r.recebido).toBe(590);
    expect(r.gastos).toBe(390);
    expect(r.lucro).toBe(200);
    expect(r.margem).toBe(34);
  });
  it("receita da van vem da linha dela; cobrança de viagem usa a linha da própria cobrança", () => {
    const v1 = r.porVan.find((x) => x.id === "v1")!, v2 = r.porVan.find((x) => x.id === "v2")!;
    expect(v1.recebido).toBe(300);
    expect(v2.recebido).toBe(250);
  });
  it("gasto sem van usa a van da linha; sem nada vai para 'Sem van'", () => {
    expect(r.porVan.find((x) => x.id === "v1")!.gastos).toBe(200);
    expect(r.porVan.find((x) => x.id === "v2")!.gastos).toBe(160);
    const sem = r.porVan.find((x) => x.id === "")!;
    expect(sem).toMatchObject({ nome: "Sem van", gastos: 30, recebido: 40 });
  });
  it("as somas por van e por linha fecham com o total", () => {
    const s = (l: { recebido: number; gastos: number }[], k: "recebido" | "gastos") => Math.round(l.reduce((t, x) => t + x[k], 0) * 100) / 100;
    for (const lista of [r.porVan, r.porLinha]) {
      expect(s(lista, "recebido")).toBe(r.recebido);
      expect(s(lista, "gastos")).toBe(r.gastos);
    }
  });
  it("linha 'Gastos gerais' só aparece se tiver movimento", () => {
    const limpo = relatorioPeriodo({ ...ctx, cobrancas: [cobrancas[0]!], gastos: [gastos[0]!] }, { de: "2026-11-01", ate: "2026-11-30" });
    expect(limpo.porLinha.some((l) => l.id === "")).toBe(false);
    expect(limpo.porVan.some((l) => l.id === "")).toBe(false);
  });
  it("período vazio dá zero e sem margem", () => {
    const vazio = relatorioPeriodo(ctx, { de: "2020-01-01", ate: "2020-01-31" });
    expect(vazio).toMatchObject({ recebido: 0, gastos: 0, lucro: 0, margem: null });
  });
  it("gasto 'todo mês' entra em cada mês do período", () => {
    const fixo = gas({ valor: 1000, data: "2026-09-10", mensal: true, vanId: "v1" });
    const t = relatorioPeriodo({ ...ctx, cobrancas: [], gastos: [fixo] }, { de: "2026-09-01", ate: "2026-11-30" });
    expect(t.gastos).toBe(3000);
    const meio = relatorioPeriodo({ ...ctx, cobrancas: [], gastos: [fixo] }, { de: "2026-10-11", ate: "2026-11-09" });
    expect(meio.gastos).toBe(0);
  });
});

describe("relatorioPeriodo bate com o Financeiro mensal (dados de exemplo)", () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });
  it("em todos os meses com movimento, recebido e gastos são iguais", async () => {
    const store = await import("./store");
    const e = store.obterEstado();
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const ctx: Contexto = { cobrancas: e.cobrancas, gastos: e.gastos, linhas: e.linhas, vans: e.vans, linhaDoPassageiro: (pid) => e.passageiros.find((p) => p.id === pid)?.linhaIds[0] ?? "" };
    let comMovimento = 0;
    for (let i = 0; i < 6; i++) {
      const mes = somaMes(mesDe(iso), -i);
      const r = relatorioPeriodo(ctx, { de: `${mes}-01`, ate: fimDoMes(mes) });
      const f = resumoMes(e.cobrancas, e.gastos, mes, iso);
      expect(r.recebido).toBeCloseTo(f.recebido, 2);
      expect(r.gastos).toBeCloseTo(f.gastos, 2);
      expect(r.lucro).toBeCloseTo(f.lucro, 2);
      if (f.recebido > 0) comMovimento++;
    }
    expect(comMovimento).toBeGreaterThan(2);
  });

  it("três meses = soma dos três meses", async () => {
    const store = await import("./store");
    const e = store.obterEstado();
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const ctx: Contexto = { cobrancas: e.cobrancas, gastos: e.gastos, linhas: e.linhas, vans: e.vans, linhaDoPassageiro: (pid) => e.passageiros.find((p) => p.id === pid)?.linhaIds[0] ?? "" };
    const tres = relatorioPeriodo(ctx, periodoPreset("3meses", iso));
    const soma = [0, 1, 2].reduce((s, i) => s + relatorioPeriodo(ctx, periodoPreset("mes", `${somaMes(mesDe(iso), -i)}-15`)).recebido, 0);
    expect(tres.recebido).toBeCloseTo(soma, 2);
  });
});

describe("ocupacaoPorLinha", () => {
  const item = (id: string, linhaId: string, data: string, embarcaram: number, vanId?: string): ItemHistorico =>
    ({ id, linhaId, data, ajuste: { respostas: {}, espera: [], extras: [], ...(vanId ? { vanId } : {}) }, ida: {} as never, encerrada: 1, stats: { embarcaram, entregues: embarcaram, faltaram: 0, naoVoltaram: 0, paradas: 0, total: 0 } });
  const hist = [item("1", "l1", "2026-11-02", 8), item("2", "l1", "2026-11-09", 6), item("3", "l2", "2026-11-03", 5), item("4", "l1", "2026-10-01", 10), item("5", "l1", "2026-11-10", 5, "v2")];
  const o = ocupacaoPorLinha(hist, linhas, vans, { de: "2026-11-01", ate: "2026-11-30" });

  it("média por linha dentro do período, respeitando a troca de van da viagem", () => {
    const l1 = o.linhas.find((x) => x.linhaId === "l1")!;
    expect(l1.viagens).toBe(3);
    expect(l1.embarques).toBeCloseTo(19 / 3, 5);
    expect(l1.pct).toBe(Math.round((19 / (10 + 10 + 5)) * 100));
    expect(o.linhas.find((x) => x.linhaId === "l2")).toMatchObject({ viagens: 1, pct: 100 });
  });
  it("ocupação geral soma todas as viagens", () => {
    expect(o.geral).toEqual({ viagens: 4, pct: Math.round((24 / 30) * 100) });
  });
  it("viagem sem van (0 lugares) não entra", () => {
    const x = ocupacaoPorLinha([item("9", "l1", "2026-11-02", 5, "nao-existe")], linhas, vans, { de: "2026-11-01", ate: "2026-11-30" });
    expect(x.linhas).toEqual([]);
    expect(x.geral).toEqual({ viagens: 0, pct: 0 });
  });
  it("funciona com o histórico real do app", async () => {
    vi.resetModules(); localStorage.clear();
    const store = await import("./store");
    const e = store.obterEstado();
    const h = historicoViagens(e.ajustes);
    const r = ocupacaoPorLinha(h, e.linhas, e.vans, { de: "2000-01-01", ate: "2100-01-01" });
    expect(r.geral.viagens).toBe(h.length);
    expect(r.geral.pct).toBeGreaterThan(0);
    expect(r.geral.pct).toBeLessThanOrEqual(100);
  });
});

describe("combustivelPorVan", () => {
  const dies = (valor: number, data: string, litros: number, km: number | null, vanId = "v1") => gas({ valor, data, categoria: "Diesel", vanId, litros, km });
  const per = { de: "2026-06-01", ate: "2026-11-30" };
  it("preço por litro, consumo e custo por km (tanque cheio)", () => {
    const c = combustivelPorVan([dies(720, "2026-06-04", 120, 1000), dies(690, "2026-07-03", 115, 2150), dies(700, "2026-08-05", 100, 3150)], per, vans);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ nome: "Branca", abastecimentos: 3, litros: 335, valor: 2110 });
    expect(c[0]!.precoLitro).toBeCloseTo(6.3, 2);
    expect(c[0]!.kmRodados).toBe(2150);
    expect(c[0]!.kmPorLitro).toBeCloseTo(2150 / 215, 2);
    expect(c[0]!.custoPorKm).toBeCloseTo(1390 / 2150, 2);
  });
  it("sem 2 leituras de km só mostra litros e valor", () => {
    const c = combustivelPorVan([dies(700, "2026-06-04", 100, 5000), dies(300, "2026-07-04", 50, null)], per, vans)[0]!;
    expect(c.kmPorLitro).toBeNull();
    expect(c.custoPorKm).toBeNull();
    expect(c.litros).toBe(150);
  });
  it("ignora o que não é diesel com litros, o que está fora do período e vans sem abastecimento", () => {
    const c = combustivelPorVan([dies(10, "2026-05-01", 5, 1), gas({ valor: 50, data: "2026-07-01", categoria: "Pedágio", vanId: "v1" }), dies(100, "2026-07-01", 20, null, "v2")], per, vans);
    expect(c.map((x) => x.vanId)).toEqual(["v2"]);
  });
  it("hodômetro que volta atrás (digitação errada) não gera consumo absurdo", () => {
    const c = combustivelPorVan([dies(700, "2026-06-04", 100, 5000), dies(300, "2026-07-04", 50, 5000)], per, vans)[0]!;
    expect(c.kmPorLitro).toBeNull();
  });
});

describe("textoRelatorio", () => {
  it("traz totais, van, linha, ocupação e combustível", () => {
    const ctx: Contexto = { cobrancas: [cob({ pid: "a", pagamentos: [pg(300, "2026-11-02")] })], gastos: [gas({ valor: 100, data: "2026-11-04", vanId: "v1", linhaId: "l1" })], linhas, vans, linhaDoPassageiro };
    const periodo = { de: "2026-11-01", ate: "2026-11-30" };
    const t = textoRelatorio({ periodo, vanzeiro: "João", rel: relatorioPeriodo(ctx, periodo), ocupacao: { linhas: [{ linhaId: "l1", nome: "Londrina", viagens: 4, embarques: 8, lugares: 10, pct: 80 }], geral: { viagens: 4, pct: 80 } }, combustivel: [{ vanId: "v1", nome: "Branca", abastecimentos: 2, litros: 100, valor: 630, precoLitro: 6.3, kmRodados: 900, kmPorLitro: 9, custoPorKm: 0.7 }] });
    expect(t).toContain("*Relatório — Novembro de 2026*");
    expect(t).toMatch(/Recebido: R\$\s300,00/);
    expect(t).toMatch(/Lucro: R\$\s200,00 \(67% do recebido\)/);
    expect(t).toContain("Branca: recebeu");
    expect(t).toContain("Londrina: 80% · 4 viagens");
    expect(t).toContain("9 km/L");
  });
});
