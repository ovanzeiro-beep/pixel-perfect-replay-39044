import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const trabalhador = () =>
  ({ postMessage: vi.fn() }) as unknown as ServiceWorker & {
    postMessage: ReturnType<typeof vi.fn>;
  };

describe("conexão", () => {
  it("acompanha o aparelho ficando sem internet e voltando", async () => {
    const { useOnline } = await import("./pwa");
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("a faixa 'Sem internet' só aparece offline", async () => {
    const { SemConexao } = await import("@/components/app/SemConexao");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    render(<SemConexao />);
    expect(screen.queryByRole("status")).toBeNull();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Sem internet/);
    expect(screen.getByRole("status")).toHaveTextContent(/dados salvos neste aparelho/);
  });
});

describe("aviso de nova versão", () => {
  it("só aparece quando existe versão esperando", async () => {
    const pwa = await import("./pwa");
    const { AtualizacaoApp } = await import("@/components/app/AtualizacaoApp");
    render(<AtualizacaoApp />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => pwa.__definirVersaoEsperando(trabalhador()));
    expect(screen.getByRole("status")).toHaveTextContent("Nova versão do app disponível");
    expect(screen.getByRole("status")).toHaveTextContent("Seus dados continuam salvos");
  });

  it("'Depois' esconde o aviso sem trocar de versão", async () => {
    const pwa = await import("./pwa");
    const { AtualizacaoApp } = await import("@/components/app/AtualizacaoApp");
    const w = trabalhador();
    render(<AtualizacaoApp />);
    act(() => pwa.__definirVersaoEsperando(w));
    fireEvent.click(screen.getByRole("button", { name: "Depois" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(w.postMessage).not.toHaveBeenCalled();
  });

  it("'Atualizar agora' manda a versão nova assumir (SKIP_WAITING)", async () => {
    const pwa = await import("./pwa");
    const { AtualizacaoApp } = await import("@/components/app/AtualizacaoApp");
    const w = trabalhador();
    render(<AtualizacaoApp />);
    act(() => pwa.__definirVersaoEsperando(w));
    fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
    expect(w.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("sem versão esperando, atualizar não faz nada", async () => {
    const pwa = await import("./pwa");
    expect(() => pwa.atualizarApp()).not.toThrow();
  });
});

describe("instalar o app", () => {
  const eventoInstalacao = (resultado: "accepted" | "dismissed" = "accepted") => {
    const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: ReturnType<typeof vi.fn>;
      userChoice: Promise<{ outcome: string }>;
    };
    e.prompt = vi.fn().mockResolvedValue(undefined);
    e.userChoice = Promise.resolve({ outcome: resultado });
    return e;
  };

  it("guarda o aviso do navegador (que vem uma vez só) e o cartão do perfil também o enxerga", async () => {
    const pwa = await import("./pwa");
    const { InstalarApp } = await import("@/components/app/InstalarApp");
    const e = eventoInstalacao();
    window.dispatchEvent(e); // chega ANTES de qualquer tela existir
    expect(e.defaultPrevented).toBe(true);
    render(<InstalarApp claro lembrar={false} />);
    expect(await screen.findByText("Instale o app no celular")).toBeInTheDocument();
    expect(screen.queryByLabelText("Dispensar")).toBeNull();
    const { result } = renderHook(() => pwa.useInstalarApp());
    expect(result.current.podeInstalar).toBe(true);
  });

  it("instalar chama o pedido do navegador e depois não oferece de novo", async () => {
    const pwa = await import("./pwa");
    const e = eventoInstalacao("accepted");
    window.dispatchEvent(e);
    const { result } = renderHook(() => pwa.useInstalarApp());
    await act(async () => {
      await result.current.instalar();
    });
    expect(e.prompt).toHaveBeenCalledOnce();
    expect(result.current.podeInstalar).toBe(false);
    expect(result.current.instalado).toBe(true);
  });

  it("recusar a instalação não marca como instalado", async () => {
    const pwa = await import("./pwa");
    window.dispatchEvent(eventoInstalacao("dismissed"));
    const { result } = renderHook(() => pwa.useInstalarApp());
    await act(async () => {
      await result.current.instalar();
    });
    expect(result.current.instalado).toBe(false);
  });

  it("depois de instalado (appinstalled) o cartão some", async () => {
    const pwa = await import("./pwa");
    const { InstalarApp } = await import("@/components/app/InstalarApp");
    window.dispatchEvent(eventoInstalacao());
    render(<InstalarApp />);
    expect(await screen.findByText("Instale o app no celular")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByText("Instale o app no celular")).toBeNull();
    expect(pwa).toBeDefined();
  });

  it("no iPhone mostra o passo a passo em vez do botão", async () => {
    vi.stubGlobal(
      "navigator",
      Object.create(navigator, {
        userAgent: { value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari" },
      }),
    );
    const { InstalarApp } = await import("@/components/app/InstalarApp");
    render(<InstalarApp />);
    fireEvent.click(await screen.findByRole("button", { name: /Como instalar no iPhone/ }));
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar agora" })).toBeNull();
  });
});
