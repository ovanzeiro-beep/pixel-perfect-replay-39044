import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

afterEach(cleanup);

async function abrir(caminho: string, papel: "vanzeiro" | "passageiro") {
  vi.resetModules();
  await semearExemploNoAparelho();
  const { routeTree } = await import("@/routeTree.gen");
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  if (papel === "vanzeiro") sessao.entrarComoVanzeiro();
  else sessao.entrarComoPassageiro("p1");
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [caminho] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("navigation");
  return router;
}

describe("ajuda: como usar", () => {
  it("vanzeiro: Mais → Como usar o app abre os passos, e Voltar volta ao Mais", async () => {
    const router = await abrir("/vanzeiro/mais", "vanzeiro");
    fireEvent.click(await screen.findByRole("link", { name: /Como usar o app/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro/ajuda"));
    expect(await screen.findByRole("heading", { name: "Como usar" })).toBeInTheDocument();
    expect(screen.getByText("Fazer uma viagem")).toBeInTheDocument();
    expect(screen.getByText("Cobranças e recibos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /Voltar/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro/mais"));
  });

  it("passageiro: Meu perfil → Como usar o app abre a ajuda dele (não a do vanzeiro)", async () => {
    const router = await abrir("/passageiro/perfil", "passageiro");
    fireEvent.click(await screen.findByRole("link", { name: /Como usar o app/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/passageiro/ajuda"));
    expect(await screen.findByText("Avisar se vai viajar")).toBeInTheDocument();
    expect(screen.queryByText("Fazer uma viagem")).toBeNull();
  });

  it("passageiro não abre a ajuda do vanzeiro", async () => {
    const router = await abrir("/vanzeiro/ajuda", "passageiro");
    await waitFor(() => expect(router.state.location.pathname).toBe("/passageiro"));
  });
});
