import { describe, it, expect } from "vitest";
import { gastosDoMes, resumoMes, porCategoria, porLinha, somaMes, aReceberMes, type Gasto } from "./financeiro";
import type { Cobranca } from "./cobrancas";

const g = (id: string, valor: number, data: string, extra: Partial<Gasto> = {}): Gasto => ({ id, valor, data, categoria: "Diesel", vanId: "", linhaId: "", descricao: "", litros: null, km: null, mensal: false, ...extra });
const cob = (pid: string, valor: number, venc: string, pagos: [number, string][] = []): Cobranca => ({ id: pid + venc, pid, tipo: "mes", ref: "x", vencimento: venc, valor, pagamentos: pagos.map(([v, d]) => ({ valor: v, data: d, forma: "pix", recibo: 1 })) });

describe("financeiro", () => {
  it("gasto 'todo mês' aparece em cada mês seguinte", () => {
    const gs = [g("a", 900, "2026-06-31".replace("31", "30"), { mensal: true, categoria: "Outros" })];
    expect(gastosDoMes(gs, "2026-05")).toHaveLength(0);
    expect(gastosDoMes(gs, "2026-11").map((x) => x.data)).toEqual(["2026-11-30"]);
  });
  it("lucro = recebido menos gastos do mês", () => {
    const r = resumoMes([cob("p", 300, "2026-11-05", [[300, "2026-11-02"]])], [g("a", 400, "2026-11-03")], "2026-11", "2026-11-09");
    expect(r).toEqual({ recebido: 300, gastos: 400, lucro: -100, aReceber: 0 });
  });
  it("a receber de mês passado considera só o que estava aberto no fim do mês", () => {
    const cs = [cob("p", 250, "2026-10-01", [[250, "2026-11-02"]])];
    expect(aReceberMes(cs, "2026-10", "2026-11-09")).toBe(250);
    expect(aReceberMes(cs, "2026-11", "2026-11-09")).toBe(0);
  });
  it("porcentagem por categoria", () => {
    const pc = porCategoria([g("a", 300, "2026-11-01"), g("b", 100, "2026-11-02", { categoria: "Pedágio" })], "2026-11");
    expect(pc).toEqual([{ categoria: "Diesel", valor: 300, pct: 75 }, { categoria: "Pedágio", valor: 100, pct: 25 }]);
  });
  it("gastos sem linha vão para 'Gastos gerais'", () => {
    const r = porLinha([cob("p", 100, "2026-11-01", [[100, "2026-11-01"]])], [g("a", 30, "2026-11-01", { linhaId: "l1" }), g("b", 50, "2026-11-01")], "2026-11", [{ id: "l1", nome: "L1" }], () => "l1");
    expect(r[0]).toEqual({ id: "l1", nome: "L1", recebido: 100, gastos: 30, lucro: 70 });
    expect(r[1]!.nome).toBe("Gastos gerais");
    expect(r[1]!.gastos).toBe(50);
  });
  it("navegação de mês", () => {
    expect(somaMes("2026-01", -1)).toBe("2025-12");
    expect(somaMes("2026-11", 1)).toBe("2026-12");
  });
});
