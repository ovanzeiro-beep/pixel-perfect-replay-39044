import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IndicadorSalvando } from "@/components/app/IndicadorSalvando";
import { FalhaDeGravacao, escrever, gravando, registrarFalhaDeGravacao } from "./gravacao";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("gravações do contrato", () => {
  it("o trabalho começa na hora e o resultado vem em Promise", async () => {
    let feito = false;
    const op = escrever((x: number) => {
      feito = true;
      return x * 2;
    });
    const p = op(21);
    expect(feito).toBe(true);
    expect(p).toBeInstanceOf(Promise);
    await expect(p).resolves.toBe(42);
  });

  it("quando falha: avisa o app uma vez e rejeita com FalhaDeGravacao (motivo em cause)", async () => {
    const aviso = vi.fn();
    const tirar = registrarFalhaDeGravacao(aviso);
    const motivo = new Error("sem rede");
    const op = escrever(() => {
      throw motivo;
    });
    const erro = await op().catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(FalhaDeGravacao);
    expect((erro as FalhaDeGravacao).cause).toBe(motivo);
    expect(aviso).toHaveBeenCalledTimes(1);
    tirar();
    await op().catch(() => {});
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it("uma falha que já é FalhaDeGravacao não é embrulhada de novo", async () => {
    const original = new FalhaDeGravacao(new Error("x"));
    const erro = await gravando(() => {
      throw original;
    }).catch((e: unknown) => e);
    expect(erro).toBe(original);
  });

  it("uma operação que devolve Promise também é esperada", async () => {
    const op = escrever(async () => "ok");
    await expect(op()).resolves.toBe("ok");
  });
});

describe("<IndicadorSalvando />", () => {
  it("só aparece se a gravação demorar, e some quando termina", async () => {
    vi.useFakeTimers();
    render(<IndicadorSalvando atrasoMs={400} />);
    expect(screen.queryByText("Salvando…")).toBeNull();
    let terminar!: () => void;
    const lenta = gravando(() => new Promise<void>((ok) => (terminar = ok)));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(screen.queryByText("Salvando…")).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByText("Salvando…")).toBeInTheDocument();
    await act(async () => {
      terminar();
      await lenta;
    });
    expect(screen.queryByText("Salvando…")).toBeNull();
  });

  it("gravação rápida nunca mostra o aviso", async () => {
    vi.useFakeTimers();
    render(<IndicadorSalvando atrasoMs={400} />);
    await act(async () => {
      await gravando(() => 1);
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.queryByText("Salvando…")).toBeNull();
  });
});
