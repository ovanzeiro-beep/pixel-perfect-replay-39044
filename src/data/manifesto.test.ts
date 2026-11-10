import { describe, expect, it } from "vitest";
import { textoManifesto, textoResumoViagem } from "./manifesto";
import type { Linha, Motorista, Passageiro, Van } from "./tipos";
import type { Ida, Viagem } from "./viagens";

const P = (id: string, nome: string, cidade: string, extra: Partial<Passageiro> = {}) =>
  ({
    id,
    nome,
    telefone: "(43) 99999-0000",
    endereco: "Rua A",
    numero: "10",
    bairro: "Centro",
    cidade,
    referencia: "",
    ...extra,
  }) as Passageiro;
const pass = [
  P("a", "Ana", "Londrina", { referencia: "casa azul" }),
  P("b", "Beto", "Jacarezinho"),
  P("c", "Cida", "Cambará"),
  P("d", "Davi", "Londrina"),
  P("e", "Edu", "Cambará"),
];
const linha = {
  id: "l1",
  nome: "Londrina - Fim de semana",
  paradas: ["Jacarezinho", "Cambará", "Londrina"],
} as Linha;
const van = { apelido: "Van Branca", placa: "BRA2E19" } as Van;
const mot = { nome: "João" } as Motorista;
const viagem = {
  id: "l1_2026-11-13",
  linhaId: "l1",
  data: "2026-11-13",
  saida: "17:30",
  volta: "20:30",
  lugares: 15,
  vao: ["a", "b", "c"],
  espera: ["d"],
  sem: ["e"],
  nao: [],
} as unknown as Viagem;

describe("textoManifesto", () => {
  const t = textoManifesto({ viagem, linha, van, motorista: mot, passageiros: pass });
  it("traz o cabeçalho com linha, dia, van e motorista", () => {
    expect(t).toContain("Lista da viagem — Londrina - Fim de semana");
    expect(t).toContain("sexta, 13/11 · saída 17:30 · volta 20:30");
    expect(t).toContain("Van Branca (BRA2E19) · Motorista: João");
    expect(t).toContain("Confirmados: 3 de 15 lugares");
  });
  it("lista os confirmados na ordem do trajeto, com telefone e endereço", () => {
    expect(t.indexOf("1. Beto")).toBeLessThan(t.indexOf("2. Cida"));
    expect(t.indexOf("2. Cida")).toBeLessThan(t.indexOf("3. Ana"));
    expect(t).toContain("3. Ana — (43) 99999-0000");
    expect(t).toContain("Rua A, 10 - Centro, Londrina - PR (casa azul)");
  });
  it("mostra lista de espera e quem não respondeu", () => {
    expect(t).toContain("*Lista de espera:* 1º Davi");
    expect(t).toContain("*Sem resposta:* Edu");
  });
  it("viagem sem ninguém avisa", () => {
    expect(
      textoManifesto({
        viagem: { ...viagem, vao: [], espera: [], sem: [] },
        linha,
        van,
        motorista: mot,
        passageiros: pass,
      }),
    ).toContain("Ninguém confirmou ainda.");
  });
  it("não quebra sem van, motorista ou linha", () => {
    const x = textoManifesto({
      viagem,
      linha: undefined,
      van: undefined,
      motorista: undefined,
      passageiros: pass,
    });
    expect(x).toContain("sem van");
    expect(x).toContain("sem motorista");
  });
});

describe("textoResumoViagem", () => {
  const ida: Ida = {
    ordem: ["a", "b"],
    fase: "chegou",
    inicio: new Date(2026, 10, 13, 17, 30).getTime(),
    encerrada: new Date(2026, 10, 13, 20, 45).getTime(),
    marcas: [
      { pid: "a", r: "embarcou", cobrou: 150 },
      { pid: "b", r: "faltou", cobrou: 0 },
    ],
    volta: {
      fase: "entrega",
      inicio: 1,
      status: { a: { r: "nao", motivo: "volta outro dia" } },
      extras: [],
      ordem: [],
      entregas: [],
    },
  };
  const t = textoResumoViagem({
    linhaNome: "Londrina",
    data: "2026-11-13",
    ida,
    passageiros: pass,
  });
  it("resume horários, números e dinheiro", () => {
    expect(t).toContain("Viagem concluída — Londrina");
    expect(t).toContain("saída 17:30 · chegada 20:45");
    expect(t).toContain("Embarcaram: 1 · Entregues: 0");
    expect(t).toMatch(/Total cobrado na viagem: R\$\s150,00/);
  });
  it("cita quem faltou e quem não voltou", () => {
    expect(t).toContain("Não apareceram: Beto");
    expect(t).toContain("Não voltaram: Ana (volta outro dia)");
  });
});
