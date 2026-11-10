import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

vi.setConfig({ testTimeout: 30_000 });
afterEach(cleanup);

const iso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function abrir(caminho: string, papel: "vanzeiro" | "passageiro" = "vanzeiro") {
  vi.resetModules();
  await semearExemploNoAparelho();
  const { routeTree } = await import("@/routeTree.gen");
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  const store = await import("@/data/store");
  if (papel === "vanzeiro") sessao.entrarComoVanzeiro();
  else {
    const { montarViagens } = await import("@/data/viagens");
    const e = store.obterEstado();
    const v = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, new Date()).find(
      (x) => !x.passada && x.passageiroIds.length > 0,
    )!;
    sessao.entrarComoPassageiro(v.passageiroIds[0]!);
  }
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [caminho] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("navigation");
  return { store, router, estado: () => store.obterEstado() };
}
const clicar = async (nome: RegExp | string) => {
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: nome }));
  });
};
const data = async (rotulo: RegExp, valor: string) => {
  await act(async () => {
    fireEvent.change(await screen.findByLabelText(rotulo), { target: { value: valor } });
  });
};

describe("tela Férias e feriados", () => {
  it("abre pelo menu Mais e, sem pausas, explica para que serve", async () => {
    await abrir("/vanzeiro/mais");
    await act(async () => {
      fireEvent.click(await screen.findByRole("link", { name: /Férias e feriados/ }));
    });
    expect(await screen.findByRole("heading", { name: "Férias e feriados" })).toBeInTheDocument();
    expect(await screen.findByText("Nenhuma pausa marcada")).toBeInTheDocument();
  });

  it("cria uma pausa: mostra quantas viagens somem, guarda, lista em 'Em andamento' e as viagens saem da lista", async () => {
    const { estado } = await abrir("/vanzeiro/pausas");
    await clicar(/Nova pausa/);
    await data(/Primeiro dia/, iso(0));
    await data(/Último dia/, iso(10));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Férias escolares" }));
    });
    expect(
      await screen.findByText(/viagens? das próximas semanas deixam? de aparecer/),
    ).toBeInTheDocument();
    await clicar(/Salvar pausa/);
    await waitFor(() => expect(estado().pausas).toHaveLength(1));
    expect(estado().pausas![0]).toMatchObject({
      de: iso(0),
      ate: iso(10),
      motivo: "Férias escolares",
    });
    expect(estado().pausas![0]!.linhaId).toBeUndefined();
    expect(await screen.findByRole("region", { name: "Em andamento" })).toBeInTheDocument();
  });

  it("valida: sem datas e último dia antes do primeiro", async () => {
    const { estado } = await abrir("/vanzeiro/pausas");
    await clicar(/Nova pausa/);
    await clicar(/Salvar pausa/);
    expect(await screen.findByText("Escolha o primeiro dia")).toBeInTheDocument();
    expect(screen.getByText("Escolha o último dia")).toBeInTheDocument();
    await data(/Primeiro dia/, iso(5));
    await data(/Último dia/, iso(2));
    await clicar(/Salvar pausa/);
    expect(await screen.findByText(/não pode ser antes do primeiro/)).toBeInTheDocument();
    expect(estado().pausas ?? []).toHaveLength(0);
  });

  it("pausa de uma linha só: guarda a linha e a opção de não cobrar o plano", async () => {
    const { estado } = await abrir("/vanzeiro/pausas");
    const linha = estado().linhas[0]!;
    await clicar(/Nova pausa/);
    await data(/Primeiro dia/, iso(1));
    await data(/Último dia/, iso(3));
    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: linha.nome }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: /Não cobrar o plano semanal e mensal/ }));
    });
    await clicar(/Salvar pausa/);
    await waitFor(() => expect(estado().pausas).toHaveLength(1));
    expect(estado().pausas![0]).toMatchObject({ linhaId: linha.id, suspenderPlanos: true });
    expect(await screen.findByText(/Plano semanal e mensal não é cobrado/)).toBeInTheDocument();
  });

  it("editar e excluir (com confirmação); excluir devolve as viagens", async () => {
    const { store, estado } = await abrir("/vanzeiro/pausas");
    await act(async () => {
      store.salvarPausa({ de: iso(0), ate: iso(5), motivo: "Feriado" });
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /^Editar pausa/ }));
    });
    await data(/Último dia/, iso(8));
    await clicar(/Salvar pausa/);
    await waitFor(() => expect(estado().pausas![0]!.ate).toBe(iso(8)));

    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /^Excluir pausa/ }));
    });
    expect(estado().pausas).toHaveLength(1); // ainda pede confirmação
    await clicar(/Sim, excluir/);
    await waitFor(() => expect(estado().pausas).toHaveLength(0));
  });
});

describe("o efeito da pausa nas outras telas", () => {
  it("Viagens: com todas as linhas em pausa, 'Próximas' fica vazia e diz o que fazer; ao excluir, voltam", async () => {
    const { store } = await abrir("/vanzeiro/viagens");
    await screen.findAllByText(/Escolar|Faculdade|Londrina/);
    await act(async () => {
      store.salvarPausa({ de: iso(-1), ate: iso(30), motivo: "Férias" });
    });
    expect(await screen.findByText("Nenhuma viagem nos próximos dias")).toBeInTheDocument();
    await act(async () => {
      store.excluirPausa(store.obterEstado().pausas![0]!.id);
    });
    expect((await screen.findAllByText(/Escolar|Faculdade|Londrina/)).length).toBeGreaterThan(0);
  });

  it("Passageiro: vê o aviso 'Sem viagens' na tela inicial", async () => {
    const { store } = await abrir("/passageiro", "passageiro");
    await act(async () => {
      store.salvarPausa({ de: iso(0), ate: iso(12), motivo: "Férias escolares" });
    });
    expect(await screen.findByText(/Sem viagens até .* \(Férias escolares\)/)).toBeInTheDocument();
  });
});
