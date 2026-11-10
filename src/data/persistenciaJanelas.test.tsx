import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAVE, gravar } from "./persistencia";

type Loja = typeof import("./store");
type Gravacao = typeof import("./gravacao");
let s: Loja;
let g: Gravacao;
let parar: () => void;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.useFakeTimers();
  s = await import("./store");
  g = await import("./gravacao");
  // Começa com dados de exemplo já salvos, como num aparelho em uso.
  gravar(localStorage, s.criarEstadoExemplo());
  parar = s.iniciarPersistencia();
});
afterEach(() => {
  parar();
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const chaveDeDados = (chamadas: unknown[][]) => chamadas.filter((c) => c[0] === CHAVE);

describe("falha ao guardar neste aparelho", () => {
  it("armazenamento cheio: marca 'não salvou'; quando volta a funcionar, desmarca", () => {
    const espiao = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    act(() => s.salvarChavePix("chave-1"));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(chaveDeDados(espiao.mock.calls).length).toBeGreaterThan(0);
    espiao.mockRestore();
    // Ainda marcado como falha até a próxima gravação dar certo.
    act(() => s.salvarChavePix("chave-2"));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(JSON.parse(localStorage.getItem(CHAVE)!).dados.chavePix).toBe("chave-2");
  });

  it("o aviso na tela aparece quando não salvou e some quando volta a salvar", async () => {
    const { AvisoNaoSalvou } = await import("@/components/app/AvisoNaoSalvou");
    render(<AvisoNaoSalvou />);
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => g.marcarNaoSalvou(true));
    expect(screen.getByRole("alert")).toHaveTextContent("Seus dados não estão sendo salvos");
    act(() => g.marcarNaoSalvou(false));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a gravação que falha liga o aviso de verdade (e a seguinte que dá certo desliga)", async () => {
    const { AvisoNaoSalvou } = await import("@/components/app/AvisoNaoSalvou");
    render(<AvisoNaoSalvou />);
    const espiao = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cheio");
    });
    act(() => s.salvarChavePix("falha"));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    espiao.mockRestore();
    act(() => s.salvarChavePix("sucesso"));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("duas janelas do app (instalado + navegador)", () => {
  it("quando a outra janela grava, esta acompanha sem devolver o dado (sem ficar um mandando para o outro)", () => {
    const outra = { ...s.criarEstadoExemplo(), chavePix: "veio-da-outra-janela" };
    const espiao = vi.spyOn(Storage.prototype, "setItem");
    gravar(localStorage, outra);
    espiao.mockClear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: CHAVE }));
    });
    expect(s.obterEstado().chavePix).toBe("veio-da-outra-janela");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(chaveDeDados(espiao.mock.calls)).toEqual([]);
  });

  it("mudança em outra chave do armazenamento não mexe nos dados", () => {
    const antes = s.obterEstado();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "vanzeiro:letra" }));
    });
    expect(s.obterEstado()).toBe(antes);
  });

  it("uma janela parada, sem mudanças, não sobrescreve o que a outra gravou ao ficar oculta", () => {
    const outra = { ...s.criarEstadoExemplo(), chavePix: "mais-nova" };
    gravar(localStorage, outra); // a outra janela guardou, mas esta ainda não recebeu o aviso
    const espiao = vi.spyOn(Storage.prototype, "setItem");
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(chaveDeDados(espiao.mock.calls)).toEqual([]);
    expect(JSON.parse(localStorage.getItem(CHAVE)!).dados.chavePix).toBe("mais-nova");
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("uma janela com mudança própria ainda guarda ao ficar oculta", () => {
    act(() => s.salvarChavePix("minha-mudanca"));
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(JSON.parse(localStorage.getItem(CHAVE)!).dados.chavePix).toBe("minha-mudanca");
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });
});
