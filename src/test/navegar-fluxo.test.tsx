import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

afterEach(cleanup);

describe("viagem: navegar com Google Maps ou Waze", () => {
  it("na próxima parada da ida aparecem os dois, e a rota completa avisa que o Waze vai parada por parada", async () => {
    vi.resetModules();
    await semearExemploNoAparelho();
    const { routeTree } = await import("@/routeTree.gen");
    (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
    const sessao = await import("@/data/sessao");
    const store = await import("@/data/store");
    const { montarViagens } = await import("@/data/viagens");
    sessao.entrarComoVanzeiro();
    const e = store.obterEstado();
    const viagem = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, new Date()).find(
      (v) => !v.passada && !v.ajuste.cancelada && v.vao.length > 0 && v.vao.length >= 2,
    )!;
    expect(viagem).toBeTruthy();
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: [`/ida/${viagem.id}`] }),
    });
    render(<RouterProvider router={router} />);
    const proxima = (await screen.findByText("Próxima parada")).closest("section")!;
    expect(
      within(proxima).getByRole("link", { name: "Navegar com Google Maps" }),
    ).toBeInTheDocument();
    expect(within(proxima).getByRole("link", { name: "Navegar com Waze" })).toBeInTheDocument();
    expect(screen.getByText(/O Waze abre uma parada por vez/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Rota completa no Google Maps/ }).length,
    ).toBeGreaterThan(0);
  });
});
