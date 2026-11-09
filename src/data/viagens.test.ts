import { describe, it, expect } from "vitest";
import { definirResposta, aplicarNovaVan, sobram, vazio, type Ajuste } from "./viagens";

const com = (ids: string[], lugares: number) => ids.reduce<Ajuste>((a, p) => definirResposta(a, p, "vai", lugares).ajuste, vazio());

describe("lotação e lista de espera", () => {
  it("quem confirma depois de lotar vai para a lista de espera, em ordem", () => {
    const a = com(["a", "b", "c", "d"], 2);
    expect(a.espera).toEqual(["c", "d"]);
    expect(Object.keys(a.respostas).filter((k) => a.respostas[k] === "vai")).toEqual(["a", "b"]);
  });
  it("se um confirmado desiste, o primeiro da espera sobe", () => {
    const r = definirResposta(com(["a", "b", "c", "d"], 2), "a", "nao", 2);
    expect(r.subiu).toBe("c");
    expect(r.ajuste.espera).toEqual(["d"]);
  });
  it("trocar por van menor avisa quantos sobram e manda para a espera", () => {
    const a = com(["a", "b", "c"], 3);
    expect(sobram(a, 2)).toBe(1);
    expect(aplicarNovaVan(a, "v", 2).espera).toEqual(["c"]);
  });
});

import { ordenarParadas, partesRota } from "./viagens";
describe("ida", () => {
  it("ordena paradas pelas cidades do trajeto", () => {
    const cid: Record<string, string> = { a: "Londrina", b: "Jacarezinho", c: "Andirá" };
    expect(ordenarParadas(["a", "b", "c"], (i) => cid[i]!, ["Jacarezinho", "Cambará", "Andirá", "Londrina"])).toEqual(["b", "c", "a"]);
  });
  it("divide rota com muitas paradas em partes de até 10", () => {
    expect(partesRota(Array.from({ length: 12 }, (_, i) => `E${i}`))).toHaveLength(2);
    expect(partesRota(Array.from({ length: 10 }, (_, i) => `E${i}`))).toHaveLength(1);
  });
});

import { saidaParada, avisoParada, textoFaltam, encerrarParada, type Ida } from "./viagens";
describe("parada no caminho", () => {
  it("calcula saída e aviso", () => {
    const inicio = new Date(2026, 0, 1, 10, 15).getTime();
    expect(saidaParada(inicio, 20)).toBe("10:35");
    expect(avisoParada(20, "10:35")).toBe("Parada de 20 minutos. Saída às 10:35. Não se atrase!");
  });
  it("lista quem falta", () => {
    expect(textoFaltam(["Maria", "Joana"])).toBe("Faltam 2: Maria e Joana");
    expect(textoFaltam(["Ana"])).toBe("Falta 1: Ana");
  });
  it("quem não voltou fica na parada e sai do Na van", () => {
    const ida: Ida = { ordem: ["a", "b"], fase: "a_caminho", marcas: [{ pid: "a", r: "embarcou", cobrou: 0 }, { pid: "b", r: "embarcou", cobrou: 0 }],
      parada: { inicio: 0, minutos: 10, local: "Posto", chamada: true, naVan: { a: "manual" } } };
    const r = encerrarParada(ida, "Outro: foi de carona", 0);
    expect(r.parada).toBeUndefined();
    expect(r.marcas.filter((m) => m.r === "embarcou").map((m) => m.pid)).toEqual(["a"]);
    expect(r.paradas![0]!.ficaram.map((f) => f.pid)).toEqual(["b"]);
  });
});

import { novaVolta, pendentesVolta, rotaVolta, aindaNaVan, cobrancaSoVolta, totalCobrado } from "./viagens";
describe("volta e entrega", () => {
  const ida: Ida = { ordem: ["a", "b", "c"], fase: "chegou", marcas: [
    { pid: "a", r: "embarcou", cobrou: 0 }, { pid: "b", r: "embarcou", cobrou: 30 }, { pid: "c", r: "ficou", cobrou: 0 }] };
  it("chamada só libera com todos marcados Na van ou Não volta", () => {
    const v = { ...novaVolta(0), status: { a: { r: "na_van" as const, via: "manual" as const } } };
    expect(pendentesVolta(ida, v)).toEqual(["b"]);
    expect(pendentesVolta(ida, { ...v, status: { ...v.status, b: { r: "nao", motivo: "Volta outro dia" } } })).toEqual([]);
  });
  it("rota de volta é a ordem contrária da ida, só com quem está na van", () => {
    const v = { ...novaVolta(0), status: { a: { r: "na_van" as const, via: "manual" as const }, c: { r: "na_van" as const, via: "manual" as const }, b: { r: "nao" as const, motivo: "x" } } };
    expect(rotaVolta(ida, v)).toEqual(["c", "a"]);
  });
  it("ainda na van conta quem não foi entregue", () => {
    expect(aindaNaVan({ ...novaVolta(0), ordem: ["c", "a"], entregas: [{ pid: "c", r: "entregue" }] })).toEqual(["a"]);
  });
  it("cobra quem só volta e paga por viagem, uma vez só", () => {
    expect(cobrancaSoVolta(ida, "x", "por_viagem", 25)).toBe(25);
    expect(cobrancaSoVolta(ida, "b", "por_viagem", 30)).toBe(0);
    expect(cobrancaSoVolta(ida, "x", "mensal", 25)).toBe(0);
    expect(totalCobrado({ ...ida, volta: { ...novaVolta(0), extras: [{ pid: "x", cobrou: 25 }] } })).toBe(55);
  });
});

import { horarioNaParada } from "./viagens";
describe("horário na parada do passageiro", () => {
  const trajeto = ["Jacarezinho", "Cambará", "Andirá", "Bandeirantes", "Londrina"];
  it("primeira cidade sai no horário; cada cidade a mais soma 20 minutos", () => {
    expect(horarioNaParada("17:30", "Jacarezinho", trajeto)).toBe("17:30");
    expect(horarioNaParada("17:30", "Cambará", trajeto)).toBe("17:50");
    expect(horarioNaParada("17:30", "Bandeirantes", trajeto)).toBe("18:30");
  });
  it("cidade fora do trajeto usa a saída; passa da meia-noite sem quebrar", () => {
    expect(horarioNaParada("17:30", "Marte", trajeto)).toBe("17:30");
    expect(horarioNaParada("23:50", "Andirá", trajeto)).toBe("00:30");
  });
  it("aceita bairro/cidade com complemento no trajeto", () => {
    expect(horarioNaParada("06:40", "Jacarezinho", ["Jacarezinho (Centro)", "Vila São Pedro"])).toBe("06:40");
  });
});
