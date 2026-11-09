import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cobranca } from "./cobrancas";
import { contarAtencao, filtrarDispensados, gerarAlertas, prazoViagem, type EntradaAlertas } from "./alertas";
import type { Viagem } from "./viagens";
import { somarDias } from "./datasRelativas";

// Segunda-feira, 09/11/2026, 10:00
const AGORA = new Date(2026, 10, 9, 10, 0);
const em = (h: number, min = 0) => new Date(2026, 10, 9, h, min);

const viagem = (o: Partial<Viagem> & { id: string; data: string }): Viagem => ({
  linhaId: "l1", saida: "17:30", volta: "20:30", vanId: "v1", motoristaId: "m1", lugares: 10, passageiroIds: [], situacao: "agendada", passada: false,
  vao: [], sem: [], nao: [], espera: [], ajuste: { respostas: {}, espera: [], extras: [] }, ...o,
});
const cob = (o: Partial<Cobranca> & { pid: string; vencimento: string }): Cobranca => ({ id: `${o.pid}_${o.vencimento}`, tipo: "mes", ref: "x", valor: 100, pagamentos: [], ...o });

const base = (o: Partial<EntradaAlertas> = {}): EntradaAlertas => ({
  motoristas: [], cobrancas: [], viagens: [], agora: AGORA,
  passageiros: [{ id: "a", nome: "Ana Lima" }, { id: "b", nome: "Beto Souza" }, { id: "c", nome: "Cida Rocha" }, { id: "d", nome: "Davi Alves" }, { id: "e", nome: "Edu Reis" }],
  linhas: [{ id: "l1", nome: "Londrina" }], ...o,
});

describe("prazoViagem", () => {
  it("fecha na véspera às 20h", () => {
    const p = prazoViagem("2026-11-11", AGORA);
    expect(p.limite).toEqual(new Date(2026, 10, 10, 20, 0));
    expect(p.encerrado).toBe(false);
    expect(p.rotulo).toBe("Confirmações até amanhã, 10/11 às 20h");
  });
  it("viagem de segunda fecha no domingo à noite", () => {
    expect(prazoViagem("2026-11-16", AGORA).limite).toEqual(new Date(2026, 10, 15, 20, 0));
  });
  it("encerra exatamente às 20h", () => {
    expect(prazoViagem("2026-11-10", em(19, 59)).encerrado).toBe(false);
    expect(prazoViagem("2026-11-10", em(20, 0)).encerrado).toBe(true);
    expect(prazoViagem("2026-11-10", em(20, 0)).rotulo).toBe("Prazo de confirmação encerrado");
  });
  it("vira o mês e o ano", () => {
    expect(prazoViagem("2027-01-01", AGORA).limite).toEqual(new Date(2026, 11, 31, 20, 0));
  });
});

describe("CNH", () => {
  const m = (dias: number | string) => ({ id: "m1", nome: "João Batista", cnhValidade: typeof dias === "string" ? dias : somarDias(AGORA, dias) });
  const cnh = (dias: number | string) => gerarAlertas(base({ motoristas: [m(dias)] })).filter((a) => a.tipo === "cnh");

  it("vencida é urgente e diz há quantos dias", () => {
    const [a] = cnh(-3);
    expect(a).toMatchObject({ nivel: "urgente", titulo: "CNH de João vencida" });
    expect(a!.detalhe).toContain("Venceu há 3 dias");
  });
  it("vence hoje e amanhã", () => {
    expect(cnh(0)[0]!.titulo).toBe("CNH de João vence hoje");
    expect(cnh(1)[0]!.titulo).toBe("CNH de João vence em 1 dia");
  });
  it("até 15 dias é urgente; de 16 a 60 é atenção; depois disso não avisa", () => {
    expect(cnh(15)[0]!.nivel).toBe("urgente");
    expect(cnh(16)[0]!.nivel).toBe("atencao");
    expect(cnh(60)[0]!.nivel).toBe("atencao");
    expect(cnh(61)).toEqual([]);
  });
  it("sem validade preenchida ou inválida não gera alerta", () => {
    expect(cnh("")).toEqual([]);
    expect(cnh("amanhã")).toEqual([]);
  });
  it("um alerta por motorista", () => {
    const r = gerarAlertas(base({ motoristas: [m(5), { id: "m2", nome: "Carlos", cnhValidade: somarDias(AGORA, 30) }] }));
    expect(r.map((a) => a.id)).toEqual(["cnh_m1", "cnh_m2"]);
  });
});

describe("pagamentos atrasados", () => {
  const cobr = (cs: Cobranca[]) => gerarAlertas(base({ cobrancas: cs })).find((a) => a.tipo === "cobranca");

  it("resume quantos estão atrasados, quanto e o mais antigo", () => {
    const a = cobr([cob({ pid: "a", vencimento: "2026-11-01", valor: 250 }), cob({ pid: "b", vencimento: "2026-11-05", valor: 90 }), cob({ pid: "b", vencimento: "2026-11-02", valor: 10 })])!;
    expect(a.titulo).toBe("2 passageiros com pagamento atrasado");
    expect(a.detalhe).toMatch(/R\$\s350,00 em atraso/);
    expect(a.detalhe).toContain("O mais antigo é Ana, há 8 dias");
    expect(a.nivel).toBe("atencao");
  });
  it("um só passageiro vira texto no singular", () => {
    expect(cobr([cob({ pid: "a", vencimento: "2026-11-08" })])!.titulo).toBe("Ana está com pagamento atrasado");
  });
  it("15 dias ou mais é urgente", () => {
    expect(cobr([cob({ pid: "a", vencimento: "2026-10-25" })])!.nivel).toBe("urgente");
    expect(cobr([cob({ pid: "a", vencimento: "2026-10-26" })])!.nivel).toBe("atencao");
  });
  it("não conta pago, cancelado, a vencer nem vencendo hoje", () => {
    const pago = cob({ pid: "a", vencimento: "2026-11-01", pagamentos: [{ valor: 100, data: "2026-11-02", forma: "pix", recibo: 1 }] });
    const cancelada = cob({ pid: "b", vencimento: "2026-11-01", cancelada: "erro" });
    const aVencer = cob({ pid: "c", vencimento: "2026-11-20" });
    const hoje = cob({ pid: "d", vencimento: "2026-11-09" });
    expect(cobr([pago, cancelada, aVencer, hoje])).toBeUndefined();
  });
  it("pagamento parcial soma só o que falta", () => {
    const parcial = cob({ pid: "a", vencimento: "2026-11-01", valor: 100, pagamentos: [{ valor: 40, data: "2026-11-02", forma: "pix", recibo: 1 }] });
    expect(cobr([parcial])!.detalhe).toMatch(/R\$\s60,00/);
  });
  it("a assinatura muda quando entra mais gente ou muda o valor, mas não só com o passar dos dias", () => {
    const um = cobr([cob({ pid: "a", vencimento: "2026-11-01" })])!;
    const dois = cobr([cob({ pid: "a", vencimento: "2026-11-01" }), cob({ pid: "b", vencimento: "2026-11-02" })])!;
    expect(dois.assinatura).not.toBe(um.assinatura);
    const amanha = gerarAlertas(base({ cobrancas: [cob({ pid: "a", vencimento: "2026-11-01" })], agora: new Date(2026, 10, 10, 10) })).find((a) => a.tipo === "cobranca")!;
    expect(amanha.assinatura).toBe(um.assinatura);
  });
});

describe("prazo de confirmação das viagens", () => {
  const conf = (vs: Viagem[], agora = AGORA) => gerarAlertas(base({ viagens: vs, agora })).filter((a) => a.tipo === "confirmacao");
  const amanha = viagem({ id: "l1_2026-11-10", data: "2026-11-10", sem: ["a", "b"] });

  it("a menos de 24h do prazo avisa quanto falta", () => {
    const [a] = conf([amanha]);
    expect(a).toMatchObject({ nivel: "atencao", titulo: "Confirmações fecham em 10 horas", destino: { to: "/vanzeiro/viagens", search: { v: "l1_2026-11-10" } } });
    expect(a!.detalhe).toBe("Londrina, terça, 10/11 às 17:30. Sem resposta: Ana, Beto.");
  });
  it("menos de 1 hora", () => {
    expect(conf([viagem({ ...amanha, id: "x", data: "2026-11-10", sem: ["a"] })], em(19, 30))[0]!.titulo).toBe("Confirmações fecham em menos de 1 hora");
  });
  it("depois do prazo fica urgente", () => {
    const [a] = conf([amanha], em(21, 0));
    expect(a).toMatchObject({ nivel: "urgente", titulo: "Prazo encerrado: 2 sem resposta" });
  });
  it("prazo longe demais (mais de 24h) não avisa ainda", () => {
    expect(conf([viagem({ id: "x", data: "2026-11-12", sem: ["a"] })])).toEqual([]);
  });
  it("não avisa se todos responderam, a viagem foi cancelada, já começou ou já passou", () => {
    expect(conf([viagem({ ...amanha, sem: [] })])).toEqual([]);
    expect(conf([viagem({ ...amanha, ajuste: { respostas: {}, espera: [], extras: [], cancelada: true } })])).toEqual([]);
    expect(conf([viagem({ ...amanha, ajuste: { respostas: {}, espera: [], extras: [], ida: { ordem: [], marcas: [], fase: "paradas" } } })])).toEqual([]);
    expect(conf([viagem({ ...amanha, passada: true })])).toEqual([]);
    expect(conf([viagem({ id: "h", data: "2026-11-09", saida: "08:00", sem: ["a"] })])).toEqual([]);
  });
  it("viagem de hoje que ainda não saiu, com prazo já encerrado, é urgente", () => {
    const [a] = conf([viagem({ id: "h", data: "2026-11-09", saida: "17:30", sem: ["a"] })]);
    expect(a!.nivel).toBe("urgente");
  });
  it("lista até 3 nomes e conta o resto", () => {
    const [a] = conf([viagem({ ...amanha, sem: ["a", "b", "c", "d", "e"] })]);
    expect(a!.detalhe).toContain("Sem resposta: Ana, Beto, Cida e mais 2.");
  });
});

describe("lotação", () => {
  it("avisa a primeira viagem lotada com lista de espera, como informação", () => {
    const l1 = viagem({ id: "l1_2026-11-14", data: "2026-11-14", situacao: "lotada", espera: ["a", "b"] });
    const l2 = viagem({ id: "l1_2026-11-21", data: "2026-11-21", situacao: "lotada", espera: ["c"] });
    const r = gerarAlertas(base({ viagens: [l1, l2] })).filter((a) => a.tipo === "lotacao");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ nivel: "info", titulo: "Viagem de sábado lotada", detalhe: "2 pessoas na lista de espera." });
  });
  it("lotada sem espera não avisa", () => {
    expect(gerarAlertas(base({ viagens: [viagem({ id: "x", data: "2026-11-14", situacao: "lotada" })] }))).toEqual([]);
  });
});

describe("ordem, dispensar e contagem", () => {
  const tudo = gerarAlertas(base({
    motoristas: [{ id: "m1", nome: "João", cnhValidade: somarDias(AGORA, 40) }],
    cobrancas: [cob({ pid: "a", vencimento: "2026-10-01" })],
    viagens: [viagem({ id: "l1_2026-11-10", data: "2026-11-10", sem: ["a"] }), viagem({ id: "l1_2026-11-14", data: "2026-11-14", situacao: "lotada", espera: ["b"] })],
  }));

  it("urgente primeiro, depois atenção, depois informação", () => {
    expect(tudo.map((a) => `${a.nivel}:${a.tipo}`)).toEqual(["urgente:cobranca", "atencao:cnh", "atencao:confirmacao", "info:lotacao"]);
  });
  it("o selo conta só o que pede atenção", () => {
    expect(contarAtencao(tudo)).toBe(3);
  });
  it("dispensar esconde, e volta se a situação mudar", () => {
    const cnh = tudo.find((a) => a.tipo === "cnh")!;
    expect(filtrarDispensados(tudo, { [cnh.id]: cnh.assinatura }).some((a) => a.tipo === "cnh")).toBe(false);
    expect(filtrarDispensados(tudo, { [cnh.id]: "outra" }).some((a) => a.tipo === "cnh")).toBe(true);
    expect(filtrarDispensados(tudo, {})).toHaveLength(tudo.length);
  });
  it("sem nada a avisar, lista vazia", () => {
    expect(gerarAlertas(base())).toEqual([]);
  });
});

describe("alertas com os dados de exemplo do app", () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it("a demonstração mostra CNH vencendo e pagamentos atrasados", async () => {
    const store = await import("./store");
    const { montarViagens } = await import("./viagens");
    const e = store.obterEstado();
    const agora = new Date();
    const alertas = gerarAlertas({ motoristas: e.motoristas, cobrancas: e.cobrancas, passageiros: e.passageiros, linhas: e.linhas, viagens: montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, agora), agora });
    expect(alertas.find((a) => a.id === "cnh_m2")).toMatchObject({ nivel: "atencao", titulo: "CNH de Carlos vence em 34 dias" });
    expect(alertas.find((a) => a.tipo === "cobranca")).toBeDefined();
  });

  it("dispensar fica salvo e restaurar traz de volta", async () => {
    const store = await import("./store");
    store.dispensarAlerta("cnh_m2", "x");
    expect(store.obterEstado().alertasDispensados).toEqual({ cnh_m2: "x" });
    store.restaurarAlertas();
    expect(store.obterEstado().alertasDispensados).toEqual({});
  });

  it("dados salvos antes dos alertas (sem o campo) carregam sem quebrar", async () => {
    const store = await import("./store");
    const { alertasDispensados: _x, ...antigo } = store.obterEstado();
    localStorage.setItem("vanzeiro:dados", JSON.stringify({ versao: 1, salvoEm: "x", dados: antigo }));
    vi.resetModules();
    const novo = await import("./store");
    const parar = novo.iniciarPersistencia();
    expect(novo.obterEstado().alertasDispensados).toEqual({});
    parar();
  });
});
