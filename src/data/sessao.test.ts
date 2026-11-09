import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHAVE_SESSAO,
  apagarSessao,
  caminhoInicial,
  destinoSeNegado,
  ehSessao,
  gravarSessao,
  lerSessao,
} from "./sessao";

function armazemFalso() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("formato da sessão", () => {
  it("aceita vanzeiro e passageiro com id", () => {
    expect(ehSessao({ papel: "vanzeiro" })).toBe(true);
    expect(ehSessao({ papel: "passageiro", passageiroId: "p1" })).toBe(true);
  });
  it("recusa passageiro sem id e papéis inventados", () => {
    expect(ehSessao({ papel: "passageiro" })).toBe(false);
    expect(ehSessao({ papel: "passageiro", passageiroId: "" })).toBe(false);
    expect(ehSessao({ papel: "admin" })).toBe(false);
    expect(ehSessao(null)).toBe(false);
  });
  it("grava, lê e apaga", () => {
    const a = armazemFalso();
    expect(lerSessao(a)).toBeNull();
    gravarSessao(a, { papel: "passageiro", passageiroId: "p3" });
    expect(lerSessao(a)).toEqual({ papel: "passageiro", passageiroId: "p3" });
    apagarSessao(a);
    expect(lerSessao(a)).toBeNull();
  });
  it("ignora sessão adulterada ou de outra versão", () => {
    const a = armazemFalso();
    a.setItem(CHAVE_SESSAO, "{quebrado");
    expect(lerSessao(a)).toBeNull();
    a.setItem(CHAVE_SESSAO, JSON.stringify({ versao: 99, sessao: { papel: "vanzeiro" } }));
    expect(lerSessao(a)).toBeNull();
    a.setItem(CHAVE_SESSAO, JSON.stringify({ versao: 1, sessao: { papel: "dono" } }));
    expect(lerSessao(a)).toBeNull();
  });
});

describe("quem pode ver cada área", () => {
  const van = { papel: "vanzeiro" } as const;
  const pas = { papel: "passageiro", passageiroId: "p1" } as const;
  it("sem sessão vai para o login", () => {
    expect(destinoSeNegado("vanzeiro", null)).toBe("/");
    expect(destinoSeNegado("passageiro", null)).toBe("/");
  });
  it("papel certo entra", () => {
    expect(destinoSeNegado("vanzeiro", van)).toBeNull();
    expect(destinoSeNegado("passageiro", pas)).toBeNull();
  });
  it("papel errado volta para a própria área", () => {
    expect(destinoSeNegado("vanzeiro", pas)).toBe("/passageiro");
    expect(destinoSeNegado("passageiro", van)).toBe("/vanzeiro");
  });
  it("sessão ainda não lida não bloqueia (servidor)", () => {
    expect(destinoSeNegado("vanzeiro", undefined)).toBeNull();
  });
  it("caminho inicial por papel", () => {
    expect(caminhoInicial(van)).toBe("/vanzeiro");
    expect(caminhoInicial(pas)).toBe("/passageiro");
  });
});

describe("sessão no aparelho", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("entrar, sobreviver a recarregar e sair", async () => {
    const a = await import("./sessao");
    expect(a.sessaoAtual()).toBeNull();
    a.entrarComoPassageiro("p7");
    expect(a.sessaoAtual()).toEqual({ papel: "passageiro", passageiroId: "p7" });

    vi.resetModules();
    const b = await import("./sessao");
    expect(b.sessaoAtual()).toEqual({ papel: "passageiro", passageiroId: "p7" });

    b.encerrarSessao();
    expect(b.sessaoAtual()).toBeNull();
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();

    vi.resetModules();
    const c = await import("./sessao");
    expect(c.sessaoAtual()).toBeNull();
  });

  it("trocar de perfil substitui a sessão", async () => {
    const a = await import("./sessao");
    a.entrarComoVanzeiro();
    a.entrarComoPassageiro("p2");
    expect(a.sessaoAtual()).toEqual({ papel: "passageiro", passageiroId: "p2" });
  });

  it("restaurar exemplo não derruba a sessão", async () => {
    const sessao = await import("./sessao");
    const store = await import("./store");
    sessao.entrarComoVanzeiro();
    store.restaurarExemplo();
    expect(sessao.sessaoAtual()).toEqual({ papel: "vanzeiro" });
  });
});
