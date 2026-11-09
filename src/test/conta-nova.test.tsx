import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearContaVazia } from "./apoio";

async function abrir(caminho: string, papel: "vanzeiro" | "passageiro" = "vanzeiro") {
  vi.resetModules();
  await semearContaVazia();
  const { routeTree } = await import("@/routeTree.gen");
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  if (papel === "vanzeiro") sessao.entrarComoVanzeiro();
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [caminho] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const TELAS_DO_VANZEIRO = [
  "/vanzeiro",
  "/vanzeiro/viagens",
  "/vanzeiro/passageiros",
  "/vanzeiro/dinheiro",
  "/vanzeiro/mais",
  "/vanzeiro/vans",
  "/vanzeiro/motoristas",
  "/vanzeiro/linhas",
  "/vanzeiro/gastos",
  "/vanzeiro/historico",
  "/vanzeiro/relatorios",
  "/vanzeiro/perfil",
  "/ida/l1_2026-11-13",
];

describe("conta nova (sem nenhum dado cadastrado)", () => {
  it.each(TELAS_DO_VANZEIRO)("%s abre sem quebrar", async (rota) => {
    const router = await abrir(rota);
    await waitFor(() => expect(router.state.resolvedLocation?.pathname).toBe(rota));
    // espera o app sair da tela de carregamento e desenhar a tela de verdade
    await waitFor(() => expect(document.body.textContent?.length ?? 0).toBeGreaterThan(15));
    expect(document.body.textContent).not.toMatch(/Não conseguimos abrir esta página/);
    expect(document.body.textContent).not.toMatch(/Página não encontrada/);
  });
});
