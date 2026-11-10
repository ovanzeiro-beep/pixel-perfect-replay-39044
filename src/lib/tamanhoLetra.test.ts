import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CHAVE_LETRA,
  SCRIPT_TAMANHO_LETRA,
  TAMANHOS,
  aplicarTamanhoLetra,
  definirTamanhoLetra,
  iniciarTamanhoLetra,
  lerTamanhoLetra,
} from "./tamanhoLetra";

const raiz = () => document.documentElement.style.fontSize;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty("font-size");
});
afterEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty("font-size");
});

describe("tamanho da letra", () => {
  it("tem três tamanhos crescentes, começando em 100%", () => {
    expect(TAMANHOS.map((t) => t.percentual)).toEqual([100, 115, 130]);
  });

  it("aplica o percentual na raiz e volta ao normal sem deixar rastro", () => {
    aplicarTamanhoLetra("grande");
    expect(raiz()).toBe("115%");
    aplicarTamanhoLetra("muito-grande");
    expect(raiz()).toBe("130%");
    aplicarTamanhoLetra("normal");
    expect(raiz()).toBe("");
  });

  it("guarda a escolha e a lê de volta; normal apaga o registro", () => {
    definirTamanhoLetra("grande");
    expect(localStorage.getItem(CHAVE_LETRA)).toBe("grande");
    expect(lerTamanhoLetra()).toBe("grande");
    definirTamanhoLetra("normal");
    expect(localStorage.getItem(CHAVE_LETRA)).toBeNull();
    expect(lerTamanhoLetra()).toBe("normal");
  });

  it("valor salvo inválido vira normal", () => {
    localStorage.setItem(CHAVE_LETRA, "gigante");
    expect(lerTamanhoLetra()).toBe("normal");
    iniciarTamanhoLetra();
    expect(raiz()).toBe("");
  });

  it("ao iniciar, aplica o tamanho salvo", () => {
    localStorage.setItem(CHAVE_LETRA, "muito-grande");
    iniciarTamanhoLetra();
    expect(raiz()).toBe("130%");
  });

  it("o script do <head> aplica o mesmo percentual da tabela, e ignora valores inválidos", () => {
    for (const t of TAMANHOS) {
      document.documentElement.style.removeProperty("font-size");
      localStorage.setItem(CHAVE_LETRA, t.id);
      new Function(SCRIPT_TAMANHO_LETRA)();
      expect(raiz()).toBe(t.id === "normal" ? "" : `${t.percentual}%`);
    }
    document.documentElement.style.removeProperty("font-size");
    localStorage.setItem(CHAVE_LETRA, "xxx");
    new Function(SCRIPT_TAMANHO_LETRA)();
    expect(raiz()).toBe("");
  });
});
