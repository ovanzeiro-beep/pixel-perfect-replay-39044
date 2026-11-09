import { describe, expect, it } from "vitest";
import {
  estatisticasIda,
  historicoViagens,
  semearHistorico,
  separarIdViagem,
  totaisHistorico,
} from "./historico";
import type { Ajuste, Ida } from "./viagens";

const ida = (extra: Partial<Ida> = {}): Ida => ({
  ordem: ["a", "b", "c"],
  fase: "chegou",
  inicio: 1000,
  encerrada: 2000,
  marcas: [
    { pid: "a", r: "embarcou", cobrou: 150 },
    { pid: "b", r: "faltou", cobrou: 0 },
    { pid: "c", r: "ficou", cobrou: 150 },
  ],
  volta: {
    fase: "entrega",
    inicio: 1500,
    status: { a: { r: "na_van", via: "manual" }, c: { r: "nao", motivo: "outro dia" } },
    extras: [{ pid: "d", cobrou: 10 }],
    ordem: ["a"],
    entregas: [
      { pid: "a", r: "entregue" },
      { pid: "c", r: "ficou" },
    ],
  },
  ...extra,
});
const aj = (i?: Ida, extra: Partial<Ajuste> = {}): Ajuste => ({
  respostas: {},
  espera: [],
  extras: [],
  ...(i ? { ida: i } : {}),
  ...extra,
});

describe("estatisticasIda", () => {
  it("conta embarques (inclui extras da volta), entregas, faltas e total", () => {
    expect(estatisticasIda(ida())).toEqual({
      embarcaram: 3,
      entregues: 1,
      faltaram: 1,
      naoVoltaram: 1,
      paradas: 0,
      total: 310,
    });
  });
  it("funciona sem volta", () => {
    const { volta: _v, ...semVolta } = ida();
    expect(estatisticasIda(semVolta as Ida)).toMatchObject({
      entregues: 0,
      naoVoltaram: 0,
      embarcaram: 2,
    });
  });
});

describe("historicoViagens", () => {
  const ajustes = {
    "l1_2026-11-06": aj(ida({ encerrada: 5 })),
    "l1_2026-11-13": aj(ida({ encerrada: 9 })),
    "l2_2026-11-10": aj(ida({ encerrada: 7 })),
    "l2_2026-11-11": aj((({ encerrada: _e, ...resto }) => resto)(ida()) as Ida),
    "l3_2026-11-12": aj(ida(), { cancelada: true }),
    "l3_2026-11-14": aj(),
  } as Record<string, Ajuste>;

  it("só viagens encerradas e não canceladas, da mais recente para a mais antiga", () => {
    expect(historicoViagens(ajustes).map((i) => i.id)).toEqual([
      "l1_2026-11-13",
      "l2_2026-11-10",
      "l1_2026-11-06",
    ]);
  });
  it("filtra por linha", () => {
    expect(historicoViagens(ajustes, "l1").map((i) => i.id)).toEqual([
      "l1_2026-11-13",
      "l1_2026-11-06",
    ]);
  });
  it("totais somam viagens, embarques e dinheiro", () => {
    expect(totaisHistorico(historicoViagens(ajustes))).toEqual({
      viagens: 3,
      passageiros: 9,
      cobrado: 930,
    });
  });
  it("separa id da viagem mesmo com id de linha esquisito", () => {
    expect(separarIdViagem("l1_2026-11-13")).toEqual({ linhaId: "l1", data: "2026-11-13" });
    expect(separarIdViagem("lmx3k_ab_2026-11-13")).toEqual({
      linhaId: "lmx3k_ab",
      data: "2026-11-13",
    });
  });
});

describe("semearHistorico (dados de exemplo)", () => {
  const linhas = [
    { id: "l1", saida: "17:30", volta: "20:30" },
    { id: "l9", saida: "22:00", volta: "01:00" },
  ];
  const base: Record<string, Ajuste> = {
    "l1_2026-11-06": aj(undefined, { respostas: { a: "vai", b: "nao", c: "vai" } }),
    "l1_2026-11-13": aj(undefined, { respostas: { a: "vai" } }),
    "l1_2026-11-05": aj(undefined, { respostas: { a: "vai" }, cancelada: true }),
    "l1_2026-11-04": aj(undefined, { respostas: { a: "nao" } }),
    "l9_2026-11-06": aj(undefined, { respostas: { a: "vai" } }),
  };
  const cobrancas = [
    { pid: "a", tipo: "viagem", vencimento: "2026-11-06", valor: 150 },
    { pid: "c", tipo: "viagem", vencimento: "2026-11-06", valor: 150, cancelada: "x" },
  ];
  const r = semearHistorico(base, linhas, cobrancas, "2026-11-09");

  it("só vira viagem realizada: passada, não cancelada, com quem foi", () => {
    expect(Object.keys(r).filter((k) => r[k]!.ida)).toEqual(["l1_2026-11-06", "l9_2026-11-06"]);
    expect(r["l1_2026-11-13"]!.ida).toBeUndefined();
    expect(r["l1_2026-11-05"]!.ida).toBeUndefined();
    expect(r["l1_2026-11-04"]!.ida).toBeUndefined();
  });
  it("embarcam só os que confirmaram e a volta entrega todos", () => {
    const i = r["l1_2026-11-06"]!.ida!;
    expect(i.marcas.map((m) => m.pid)).toEqual(["a", "c"]);
    expect(i.volta!.entregas.map((e) => e.pid)).toEqual(["c", "a"]);
    expect(i.encerrada).toBeGreaterThan(i.inicio!);
  });
  it("valor cobrado só existe se houver cobrança daquele dia (e não cancelada)", () => {
    const i = r["l1_2026-11-06"]!.ida!;
    expect(i.marcas.find((m) => m.pid === "a")!.cobrou).toBe(150);
    expect(i.marcas.find((m) => m.pid === "c")!.cobrou).toBe(0);
  });
  it("viagem que volta depois da meia-noite termina no dia seguinte", () => {
    const i = r["l9_2026-11-06"]!.ida!;
    expect(new Date(i.encerrada!).getDate()).toBe(7);
  });
  it("não muda o que recebeu", () => {
    expect(base["l1_2026-11-06"]!.ida).toBeUndefined();
  });
});
