import { beforeEach, describe, expect, it, vi } from "vitest";
import { aberto } from "./cobrancas";
import { montarViagens, type Viagem } from "./viagens";

type Loja = typeof import("./store");
let s: Loja;
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  s = await import("./store");
});

const dias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const viagens = (): Viagem[] => {
  const e = s.obterEstado();
  return montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, new Date());
};
/** Uma viagem daqui a alguns dias (prazo ainda aberto) com 3+ passageiros, sem ida iniciada. */
const futura = () =>
  viagens().find((v) => v.data >= dias(3) && !v.ajuste.ida && v.passageiroIds.length >= 3)!;
const aj = (id: string) => s.obterEstado().ajustes[id]!;
const totalCobrancas = (pid: string) =>
  s
    .obterEstado()
    .cobrancas.filter((c) => c.pid === pid && !c.cancelada)
    .reduce((t, c) => t + aberto(c), 0);
const porViagem = (v: Viagem) =>
  s
    .obterEstado()
    .passageiros.find((p) => v.passageiroIds.includes(p.id) && p.formaPagamento === "por_viagem");

describe("passageiro e vanzeiro mexendo ao mesmo tempo não se apagam", () => {
  it("o passageiro confirma a parada enquanto o vanzeiro marca outro: as duas marcações ficam", () => {
    const v = futura();
    const [a, b] = v.passageiroIds;
    expect(s.iniciarIda(v.id, v.passageiroIds)).toBe(true);
    expect(s.iniciarParada(v.id, "ida", 10, "Posto")).toBe(true);
    expect(s.confirmarParadaApp(a!, v.id)).toBe(true);
    expect(s.marcarPresencasNaParada(v.id, "ida", { [b!]: "manual" })).toBe(true);
    expect(aj(v.id).ida!.parada!.naVan).toEqual({ [a!]: "app", [b!]: "manual" });
  });

  it("o passageiro responde a volta enquanto o vanzeiro marca outro: as duas respostas ficam", () => {
    const v = futura();
    const [a, b] = v.passageiroIds;
    s.iniciarIda(v.id, v.passageiroIds);
    s.iniciarVolta(v.id);
    s.responderVoltaApp(a!, v.id, true);
    s.marcarStatusNaVolta(v.id, { [b!]: { r: "na_van", via: "manual" } });
    expect(Object.keys(aj(v.id).ida!.volta!.status).sort()).toEqual([a, b].sort());
  });

  it("o passageiro responde 'Vou' enquanto o vanzeiro marca embarque: nada se perde", () => {
    const v = futura();
    const [a, b] = v.passageiroIds;
    s.definirRespostaDoPassageiro(v.id, b!, "nao");
    s.iniciarIda(v.id, v.passageiroIds);
    s.responderViagemApp(a!, v.id, true);
    s.marcarEmbarque(v.id, a!, "faltou");
    const depois = aj(v.id);
    expect(depois.respostas[a!]).toBe("vai");
    expect(depois.respostas[b!]).toBe("nao");
    expect(depois.ida!.marcas.map((m) => m.pid)).toEqual([a]);
  });

  it("passageiro responde em viagem que ainda não tem registro (conta nova): grava de verdade", () => {
    const v = futura();
    const e = s.obterEstado();
    s.substituirTodosOsDados({ ...e, ajustes: {} });
    expect(s.obterEstado().ajustes[v.id]).toBeUndefined();
    expect(s.responderViagemApp(v.passageiroIds[0]!, v.id, true)).toBe(true);
    expect(aj(v.id).respostas[v.passageiroIds[0]!]).toBe("vai");
  });

  it("viagem que não existe (dia em que a linha não roda) não grava nada", () => {
    const v = futura();
    const antes = JSON.stringify(s.obterEstado().ajustes);
    expect(s.responderViagemApp(v.passageiroIds[0]!, `${v.linhaId}_2099-01-01`, true)).toBe(false);
    expect(s.cancelarViagem("nao-existe_2030-01-01")).toBe(false);
    expect(JSON.stringify(s.obterEstado().ajustes)).toBe(antes);
  });
});

describe("embarque e cobrança andam juntos", () => {
  it("embarcar quem paga por viagem marca e cobra numa operação só", () => {
    const v = viagens().find((x) => x.data >= dias(3) && !x.ajuste.ida && porViagem(x))!;
    const p = porViagem(v)!;
    s.iniciarIda(v.id, v.passageiroIds);
    const antes = totalCobrancas(p.id);
    const r = s.marcarEmbarque(v.id, p.id, "embarcou");
    expect(r).toEqual({ ok: true, cobrou: p.valor });
    expect(aj(v.id).ida!.marcas).toEqual([{ pid: p.id, r: "embarcou", cobrou: p.valor }]);
    expect(totalCobrancas(p.id)).toBeCloseTo(antes + p.valor);
  });

  it("marcar duas vezes a mesma pessoa não cobra duas vezes", () => {
    const v = viagens().find((x) => x.data >= dias(3) && !x.ajuste.ida && porViagem(x))!;
    const p = porViagem(v)!;
    s.iniciarIda(v.id, v.passageiroIds);
    s.marcarEmbarque(v.id, p.id, "embarcou");
    const depois = totalCobrancas(p.id);
    expect(s.marcarEmbarque(v.id, p.id, "embarcou")).toEqual({ ok: false, cobrou: 0 });
    expect(totalCobrancas(p.id)).toBeCloseTo(depois);
    expect(aj(v.id).ida!.marcas).toHaveLength(1);
  });

  it("não aparecer não cobra; desfazer o embarque tira a marcação e a cobrança juntas", () => {
    const v = viagens().find((x) => x.data >= dias(3) && !x.ajuste.ida && porViagem(x))!;
    const p = porViagem(v)!;
    s.iniciarIda(v.id, v.passageiroIds);
    const antes = totalCobrancas(p.id);
    expect(s.marcarEmbarque(v.id, p.id, "faltou")).toEqual({ ok: true, cobrou: 0 });
    expect(totalCobrancas(p.id)).toBeCloseTo(antes);
    expect(s.desfazerUltimaMarcacaoDaIda(v.id)).toEqual({ ok: true, cobrancaAchada: true });
    s.marcarEmbarque(v.id, p.id, "embarcou");
    expect(totalCobrancas(p.id)).toBeCloseTo(antes + p.valor);
    expect(s.desfazerUltimaMarcacaoDaIda(v.id)).toEqual({ ok: true, cobrancaAchada: true });
    expect(aj(v.id).ida!.marcas).toEqual([]);
    expect(aj(v.id).ida!.fase).toBe("paradas");
    expect(totalCobrancas(p.id)).toBeCloseTo(antes);
  });

  it("desfazer sem ter o que desfazer não mexe em nada", () => {
    const v = futura();
    s.iniciarIda(v.id, v.passageiroIds);
    expect(s.desfazerUltimaMarcacaoDaIda(v.id)).toEqual({ ok: false, cobrancaAchada: true });
  });

  it("quem só volta e paga por viagem entra na volta já cobrado, uma vez", () => {
    const v = viagens().find((x) => x.data >= dias(3) && !x.ajuste.ida && porViagem(x))!;
    const p = porViagem(v)!;
    s.iniciarIda(v.id, v.passageiroIds);
    s.iniciarVolta(v.id);
    const antes = totalCobrancas(p.id);
    expect(s.adicionarExtraNaVolta(v.id, p.id)).toEqual({ ok: true, cobrou: p.valor });
    expect(totalCobrancas(p.id)).toBeCloseTo(antes + p.valor);
    expect(s.adicionarExtraNaVolta(v.id, p.id)).toEqual({ ok: false, cobrou: 0 });
    expect(totalCobrancas(p.id)).toBeCloseTo(antes + p.valor);
  });
});

describe("o vanzeiro marca respostas respeitando a lotação", () => {
  it("quem confirma além dos lugares vai para a espera, e sobe quando abre vaga", () => {
    const v = futura();
    const lugares = v.lugares;
    const e = s.obterEstado();
    const todos = e.passageiros.filter((p) => p.ativo).slice(0, lugares + 1);
    const ids = todos.map((p) => p.id);
    // Esvazia as respostas e confirma todos: o último não cabe.
    s.substituirTodosOsDados({
      ...e,
      ajustes: { ...e.ajustes, [v.id]: { respostas: {}, espera: [], extras: [] } },
    });
    const resultados = ids.map((id) => s.definirRespostaDoPassageiro(v.id, id, "vai"));
    expect(resultados.at(-1)).toMatchObject({ foiParaEspera: true });
    expect(aj(v.id).espera).toEqual([ids.at(-1)]);
    const sobe = s.definirRespostaDoPassageiro(v.id, ids[0]!, "nao");
    expect(sobe).toMatchObject({ subiu: ids.at(-1) });
    expect(aj(v.id).respostas[ids.at(-1)!]).toBe("vai");
  });
});
