import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAVE, VERSAO, gravar, ler, limpar } from "./persistencia";

const ehNum = (x: unknown): x is { n: number } =>
  !!x && typeof x === "object" && typeof (x as { n?: unknown }).n === "number";

function armazemFalso() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

describe("persistencia (funções puras)", () => {
  it("grava e lê de volta", () => {
    const a = armazemFalso();
    expect(gravar(a, { n: 7 })).toBe(true);
    expect(ler(a, ehNum)).toEqual({ n: 7 });
  });
  it("ignora dados de outra versão", () => {
    const a = armazemFalso();
    a.setItem(CHAVE, JSON.stringify({ versao: VERSAO + 1, salvoEm: "x", dados: { n: 1 } }));
    expect(ler(a, ehNum)).toBeNull();
  });
  it("ignora JSON quebrado e formato inválido", () => {
    const a = armazemFalso();
    a.setItem(CHAVE, "{não é json");
    expect(ler(a, ehNum)).toBeNull();
    a.setItem(CHAVE, JSON.stringify({ versao: VERSAO, dados: { n: "texto" } }));
    expect(ler(a, ehNum)).toBeNull();
  });
  it("não quebra se o armazenamento estiver cheio ou bloqueado", () => {
    const cheio = {
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(gravar(cheio, { n: 1 })).toBe(false);
    expect(
      ler(
        {
          getItem: () => {
            throw new Error("bloqueado");
          },
        },
        ehNum,
      ),
    ).toBeNull();
  });
  it("limpar remove o que foi salvo", () => {
    const a = armazemFalso();
    gravar(a, { n: 1 });
    limpar(a);
    expect(ler(a, ehNum)).toBeNull();
  });
});

describe("persistencia do app (store)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("o que o usuário muda sobrevive a um 'recarregar'", async () => {
    const s1 = await import("./store");
    const parar1 = s1.iniciarPersistencia();
    s1.salvarChavePix("minha-chave-pix");
    s1.salvarVan({
      apelido: "Van Nova",
      modelo: "X",
      placa: "AAA1B23",
      lugares: 10,
      ano: null,
      cor: "",
      motoristaId: "",
      situacao: "rodando",
      observacoes: "",
    });
    vi.advanceTimersByTime(400);
    parar1();
    expect(localStorage.getItem(CHAVE)).toContain("minha-chave-pix");

    vi.resetModules();
    const s2 = await import("./store");
    expect(s2.obterEstado().chavePix).toBe("");
    const parar2 = s2.iniciarPersistencia();
    expect(s2.obterEstado().chavePix).toBe("minha-chave-pix");
    expect(s2.obterEstado().vans.some((v) => v.apelido === "Van Nova")).toBe(true);
    parar2();
  });

  it("restaurar exemplo apaga o que estava salvo e volta ao início", async () => {
    const s = await import("./store");
    const parar = s.iniciarPersistencia();
    s.salvarChavePix("x");
    vi.advanceTimersByTime(400);
    s.restaurarExemplo();
    expect(s.obterEstado().chavePix).toBe("");
    expect(s.obterEstado().passageiros.length).toBe(22);
    parar();
  });

  it("dados salvos corrompidos são ignorados e o exemplo continua valendo", async () => {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({ versao: VERSAO, salvoEm: "x", dados: { vans: "não é lista" } }),
    );
    const s = await import("./store");
    const parar = s.iniciarPersistencia();
    expect(s.obterEstado().vans.length).toBe(2);
    parar();
  });

  it("estado de exemplo é válido para salvar e ler", async () => {
    const s = await import("./store");
    const ex = s.criarEstadoExemplo();
    expect(s.ehEstado(JSON.parse(JSON.stringify(ex)))).toBe(true);
  });

  it("as datas do exemplo ficam perto de hoje (cobranças e gastos)", async () => {
    const s = await import("./store");
    const ex = s.criarEstadoExemplo();
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    expect(ex.gastos.every((g) => g.data <= iso)).toBe(true);
    const recente = ex.gastos
      .map((g) => g.data)
      .sort()
      .at(-1)!;
    const dias = (new Date(iso).getTime() - new Date(recente).getTime()) / 86400000;
    expect(dias).toBeLessThan(31);
  });
});
