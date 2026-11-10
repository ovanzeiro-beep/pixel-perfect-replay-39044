import { beforeEach, describe, expect, it, vi } from "vitest";
import { gerarAvisosPassageiro } from "./alertas";
import { gerarPeriodicas, venceEm7Dias } from "./cobrancas";
import { estaPausada, type Estado, type Pausa } from "./tipos";
import { datasDaLinha, iso, montarViagens, vazio } from "./viagens";
import { visaoDoPassageiro } from "./visaoPassageiro";

const dia = (n: number, de = new Date()) => {
  const d = new Date(de.getFullYear(), de.getMonth(), de.getDate() + n);
  return iso(d);
};
const HOJE = new Date(2026, 10, 10, 12, 0, 0); // terça, 10/11/2026
const P = (o: Partial<Pausa> & { de: string; ate: string }): Pausa => ({
  id: "z1",
  motivo: "",
  ...o,
});

describe("estaPausada", () => {
  it("os dois extremos entram; fora do período não", () => {
    const z = [P({ de: "2026-12-20", ate: "2027-01-31" })];
    expect(estaPausada(z, "l1", "2026-12-20")).toBe(true);
    expect(estaPausada(z, "l1", "2027-01-31")).toBe(true);
    expect(estaPausada(z, "l1", "2026-12-19")).toBe(false);
    expect(estaPausada(z, "l1", "2027-02-01")).toBe(false);
    expect(estaPausada(undefined, "l1", "2026-12-25")).toBe(false);
  });
  it("pausa de uma linha não vale para as outras; sem linha vale para todas", () => {
    expect(
      estaPausada([P({ de: "2026-12-20", ate: "2026-12-25", linhaId: "l1" })], "l2", "2026-12-22"),
    ).toBe(false);
    expect(
      estaPausada([P({ de: "2026-12-20", ate: "2026-12-25", linhaId: "l1" })], "l1", "2026-12-22"),
    ).toBe(true);
    expect(estaPausada([P({ de: "2026-12-20", ate: "2026-12-25" })], "l9", "2026-12-22")).toBe(
      true,
    );
  });
});

describe("viagens e pausas", () => {
  let e: Estado;
  beforeEach(async () => {
    vi.resetModules();
    const { criarEstadoExemplo } = await import("./store");
    e = criarEstadoExemplo();
  });

  it("dias em pausa saem das datas da linha; os outros ficam", () => {
    const l = e.linhas.find((x) => x.frequencia === "semanal" && x.ativa)!;
    const todas = datasDaLinha(l, HOJE);
    expect(todas.length).toBeGreaterThan(3);
    const sem = datasDaLinha(l, HOJE, [P({ de: todas[0]!, ate: todas[1]! })]);
    expect(sem).toEqual(todas.slice(2));
  });

  it("viagem que já aconteceu (tem ida) nunca some, mesmo dentro de uma pausa", () => {
    const l = e.linhas.find((x) => x.frequencia === "semanal" && x.ativa)!;
    const datas = datasDaLinha(l, HOJE);
    const feita = datas[0]!;
    const ajustes = {
      [`${l.id}_${feita}`]: {
        ...vazio(),
        ida: { ordem: [], marcas: [], fase: "chegou" as const, encerrada: 1 },
      },
    };
    const r = datasDaLinha(l, HOJE, [P({ de: datas[0]!, ate: datas.at(-1)! })], ajustes);
    expect(r).toEqual([feita]);
  });

  it("montarViagens respeita a pausa só nas linhas dela", () => {
    const [a, b] = e.linhas.filter((x) => x.ativa);
    const sem = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, HOJE);
    const com = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, HOJE, [
      P({ de: dia(-30, HOJE), ate: dia(30, HOJE), linhaId: a!.id }),
    ]);
    expect(com.filter((v) => v.linhaId === a!.id).every((v) => e.ajustes[v.id]?.ida)).toBe(true);
    expect(com.filter((v) => v.linhaId === b!.id).length).toBe(
      sem.filter((v) => v.linhaId === b!.id).length,
    );
    expect(com.length).toBeLessThan(sem.length);
  });
});

describe("pausa que suspende o plano semanal e mensal", () => {
  const pas = (o: Record<string, unknown> = {}) => ({
    id: "p1",
    formaPagamento: "mensal",
    valor: 300,
    vencimento: "10",
    ativo: true,
    linhaIds: ["l1"],
    ...o,
  });

  it("sem a opção, a cobrança sai normalmente", () => {
    const r = gerarPeriodicas([], [pas()], "2026-12-12", 0, [
      P({ de: "2026-12-01", ate: "2026-12-31" }),
    ]);
    expect(r.some((c) => c.tipo === "mes")).toBe(true);
  });

  it("com a opção, quem tem a linha em pausa não é cobrado no período; fora do período sim", () => {
    const z = [P({ de: "2026-12-01", ate: "2026-12-31", suspenderPlanos: true })];
    expect(gerarPeriodicas([], [pas()], "2026-12-12", 0, z)).toEqual([]);
    expect(
      gerarPeriodicas([], [pas()], "2027-01-12", 0, z).some((c) => c.vencimento === "2027-01-10"),
    ).toBe(true);
  });

  it("pausa de outra linha não suspende quem não anda nela; pausa de todas suspende todos", () => {
    const so2 = [P({ de: "2026-12-01", ate: "2026-12-31", suspenderPlanos: true, linhaId: "l2" })];
    expect(gerarPeriodicas([], [pas()], "2026-12-12", 0, so2)).toHaveLength(1);
    const todas = [P({ de: "2026-12-01", ate: "2026-12-31", suspenderPlanos: true })];
    expect(gerarPeriodicas([], [pas({ linhaIds: ["l9"] })], "2026-12-12", 0, todas)).toEqual([]);
  });

  it("semanal: só os vencimentos dentro do período somem", () => {
    const sem = pas({ formaPagamento: "semanal", vencimento: "sexta" });
    const z = [P({ de: "2026-12-07", ate: "2026-12-13", suspenderPlanos: true })]; // inclui a sexta 11/12
    expect(gerarPeriodicas([], [sem], "2026-12-12", 0, z)).toEqual([]);
    expect(gerarPeriodicas([], [sem], "2026-12-19", 0, z).map((c) => c.vencimento)).toEqual([
      "2026-12-18",
    ]);
  });

  it("a previsão de 'vence nos próximos 7 dias' também respeita", () => {
    const z = [P({ de: "2026-12-01", ate: "2026-12-31", suspenderPlanos: true })];
    expect(venceEm7Dias([], "2026-12-08", [pas()])).toBe(300);
    expect(venceEm7Dias([], "2026-12-08", [pas()], z)).toBe(0);
  });
});

describe("salvarPausa e excluirPausa", () => {
  type Loja = typeof import("./store");
  let s: Loja;
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    s = await import("./store");
  });
  const pausas = () => s.obterEstado().pausas ?? [];

  it("cria, edita e exclui; o motivo é aparado e limitado a 60 caracteres", () => {
    expect(
      s.salvarPausa({ de: "2026-12-20", ate: "2027-01-31", motivo: `  ${"x".repeat(80)}  ` }),
    ).toBe(true);
    expect(pausas()).toHaveLength(1);
    expect(pausas()[0]!.motivo).toHaveLength(60);
    const id = pausas()[0]!.id;
    expect(s.salvarPausa({ id, de: "2026-12-22", ate: "2027-01-30", motivo: "Férias" })).toBe(true);
    expect(pausas()).toHaveLength(1);
    expect(pausas()[0]).toMatchObject({ id, de: "2026-12-22", motivo: "Férias" });
    s.excluirPausa(id);
    expect(pausas()).toEqual([]);
  });

  it("recusa datas inválidas, fim antes do começo, mais de um ano e linha que não existe", () => {
    expect(s.salvarPausa({ de: "20/12/2026", ate: "2027-01-31", motivo: "" })).toBe(false);
    expect(s.salvarPausa({ de: "2026-12-20", ate: "", motivo: "" })).toBe(false);
    expect(s.salvarPausa({ de: "2027-01-31", ate: "2026-12-20", motivo: "" })).toBe(false);
    expect(s.salvarPausa({ de: "2026-01-01", ate: "2027-06-01", motivo: "" })).toBe(false);
    expect(
      s.salvarPausa({ de: "2026-12-20", ate: "2026-12-25", motivo: "", linhaId: "nao-existe" }),
    ).toBe(false);
    expect(pausas()).toEqual([]);
  });

  it("um dia só vale (primeiro = último)", () => {
    expect(s.salvarPausa({ de: "2026-12-25", ate: "2026-12-25", motivo: "Natal" })).toBe(true);
  });

  it("em dia de pausa o passageiro não consegue responder (a viagem não existe), e a resposta não é gravada", () => {
    const e = s.obterEstado();
    const v = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, new Date()).find(
      (x) => x.data >= dia(3) && !x.ajuste.ida && x.passageiroIds.length > 0,
    )!;
    s.salvarPausa({ de: v.data, ate: v.data, motivo: "Feriado", linhaId: v.linhaId });
    const ajustesAntes = JSON.stringify(s.obterEstado().ajustes);
    expect(s.responderViagemApp(v.passageiroIds[0]!, v.id, true)).toBe(false);
    expect(JSON.stringify(s.obterEstado().ajustes)).toBe(ajustesAntes);
    s.excluirPausa(pausas()[0]!.id);
    expect(s.responderViagemApp(v.passageiroIds[0]!, v.id, true)).toBe(true);
  });

  it("a pausa entra no backup e volta na restauração (faz parte do estado)", () => {
    s.salvarPausa({ de: "2026-12-20", ate: "2027-01-31", motivo: "Férias" });
    const copia = JSON.parse(JSON.stringify(s.obterEstado()));
    s.restaurarExemplo();
    expect(pausas()).toEqual([]);
    s.substituirTodosOsDados(copia);
    expect(pausas()).toHaveLength(1);
  });
});

describe("o passageiro e a pausa", () => {
  const AGORA = new Date(2026, 10, 10, 12, 0, 0);
  let e: Estado;
  beforeEach(async () => {
    vi.resetModules();
    const { criarEstadoExemplo } = await import("./store");
    e = criarEstadoExemplo();
  });

  it("a visão traz só as pausas das linhas dele, que ainda não acabaram", () => {
    const p = e.passageiros.find((x) => x.linhaIds.length === 1)!;
    const outra = e.linhas.find((l) => !p.linhaIds.includes(l.id))!;
    e.pausas = [
      P({ id: "a", de: "2026-12-20", ate: "2027-01-31", motivo: "Férias" }),
      P({ id: "b", de: "2026-12-20", ate: "2027-01-31", linhaId: outra.id, motivo: "Só a outra" }),
      P({ id: "c", de: "2026-10-01", ate: "2026-10-05", motivo: "Passada" }),
      P({ id: "d", de: "2026-11-20", ate: "2026-11-22", linhaId: p.linhaIds[0]!, motivo: "Dele" }),
    ];
    const v = visaoDoPassageiro(e, p.id, AGORA);
    expect(v.pausas.map((z) => z.motivo).sort()).toEqual(["Dele", "Férias"]);
  });

  it("as viagens da visão não incluem os dias em pausa", () => {
    const p = e.passageiros[0]!;
    const antes = visaoDoPassageiro(e, p.id, AGORA).viagens.filter((v) => !v.passada);
    e.pausas = [P({ de: dia(0, AGORA), ate: dia(20, AGORA) })];
    const depois = visaoDoPassageiro(e, p.id, AGORA).viagens.filter(
      (v) => !v.passada && !v.iniciada,
    );
    expect(antes.length).toBeGreaterThan(0);
    expect(depois).toEqual([]);
  });

  const avisos = (pausas: { de: string; ate: string; motivo: string }[]) =>
    gerarAvisosPassageiro({ pid: "a", cobrancas: [], viagens: [], agora: AGORA, pausas });

  it("avisa que não há viagem: em andamento, e as que começam em até 14 dias", () => {
    const agora = avisos([{ de: "2026-11-05", ate: "2026-11-30", motivo: "Férias escolares" }]);
    expect(agora[0]).toMatchObject({ id: "pausa_2026-11-05_2026-11-30", nivel: "info" });
    expect(agora[0]!.titulo).toBe("Sem viagens até 30/11/2026 (Férias escolares)");
    const logo = avisos([{ de: "2026-11-20", ate: "2026-11-22", motivo: "" }]);
    expect(logo[0]!.titulo).toBe("Sem viagens de 20/11/2026 a 22/11/2026");
  });

  it("não avisa de pausa que está longe (mais de 14 dias) nem de pausa que já acabou", () => {
    expect(avisos([{ de: "2026-12-20", ate: "2027-01-31", motivo: "" }])).toEqual([]);
    expect(avisos([{ de: "2026-10-01", ate: "2026-10-05", motivo: "" }])).toEqual([]);
  });
});
