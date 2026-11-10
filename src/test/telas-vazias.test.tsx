import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearContaVazia, semearExemploNoAparelho } from "./apoio";

vi.setConfig({ testTimeout: 30_000 });
afterEach(cleanup);

async function abrir(caminho: string, conta: "vazia" | "exemplo") {
  vi.resetModules();
  if (conta === "vazia") await semearContaVazia();
  else await semearExemploNoAparelho();
  const { routeTree } = await import("@/routeTree.gen");
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  sessao.entrarComoVanzeiro();
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [caminho] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("navigation");
  return router;
}

describe("conta nova: cada tela vazia diz o que fazer", () => {
  it("Viagens: explica que as viagens vêm da linha e leva a criá-la", async () => {
    const router = await abrir("/vanzeiro/viagens", "vazia");
    expect(await screen.findByText("Ainda não há viagens")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Criar minha primeira linha" }));
    });
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro/linhas"));
  });

  it("Início: sem linha, oferece criar a primeira", async () => {
    await abrir("/vanzeiro", "vazia");
    expect(
      await screen.findByRole("link", { name: "Criar minha primeira linha" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["/vanzeiro/passageiros", "Você ainda não cadastrou passageiros"],
    ["/vanzeiro/dinheiro", "Ainda não há cobranças"],
    ["/vanzeiro/gastos", "Nenhum gasto lançado ainda"],
    ["/vanzeiro/linhas", "Nenhuma linha cadastrada"],
    ["/vanzeiro/vans", "Nenhuma van cadastrada"],
  ])("%s: '%s' com a orientação de como começar", async (rota, titulo) => {
    await abrir(rota, "vazia");
    const t = await screen.findByText(titulo);
    expect(t.parentElement!.textContent!.length).toBeGreaterThan(titulo.length + 30);
  });

  it("Dinheiro vazio leva a cadastrar passageiros", async () => {
    await abrir("/vanzeiro/dinheiro", "vazia");
    expect(await screen.findByRole("link", { name: "Cadastrar passageiros" })).toBeInTheDocument();
  });
});

describe("com dados: filtro que esconde tudo é diferente de não ter nada", () => {
  it("Passageiros: busca sem resultado avisa e 'Limpar filtros' traz a lista de volta", async () => {
    await abrir("/vanzeiro/passageiros", "exemplo");
    const busca = await screen.findByLabelText("Buscar passageiro por nome");
    await act(async () => {
      fireEvent.change(busca, { target: { value: "zzzzzz" } });
    });
    expect(
      await screen.findByText("Nenhum passageiro com esse filtro ou busca"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Você ainda não cadastrou passageiros")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    });
    expect(await screen.findByText("Maria Aparecida Lima")).toBeInTheDocument();
    expect((busca as HTMLInputElement).value).toBe("");
  });

  it("Dinheiro: busca sem resultado avisa e limpa", async () => {
    await abrir("/vanzeiro/dinheiro", "exemplo");
    const busca = await screen.findByPlaceholderText(/Buscar pelo nome/);
    await act(async () => {
      fireEvent.change(busca, { target: { value: "zzzzzz" } });
    });
    expect(await screen.findByText("Ninguém com esse filtro ou busca")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    });
    expect(await screen.findByText(/Isabela Mendes/)).toBeInTheDocument();
  });
});

describe("estado do convite tem um vocabulário só", () => {
  it("etiquetas: No app, Convite enviado e Sem convite; filtros: No app e Ainda não entrou", async () => {
    await abrir("/vanzeiro/passageiros", "exemplo");
    await screen.findByText("Maria Aparecida Lima");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("Convite enviado");
    expect(texto).toContain("Sem convite");
    expect(screen.getByRole("button", { name: "Ainda não entrou" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No app" })).toBeInTheDocument();
    expect(texto).not.toMatch(/Convite aceito|Convite pendente|Não enviado/);
  });
});
