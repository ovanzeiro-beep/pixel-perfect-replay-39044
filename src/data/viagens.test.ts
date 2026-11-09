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
