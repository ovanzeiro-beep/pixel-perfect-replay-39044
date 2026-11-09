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
