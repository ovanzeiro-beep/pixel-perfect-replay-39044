import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

afterEach(cleanup);

async function abrir(caminho: string) {
  vi.resetModules();
  await semearExemploNoAparelho();
  const { routeTree } = await import("@/routeTree.gen");
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  const store = await import("@/data/store");
  sessao.entrarComoVanzeiro();
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [caminho] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("navigation");
  return { store, estado: () => store.obterEstado() };
}
const clicar = async (nome: RegExp | string) => {
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: nome }));
  });
};
const digitar = async (rotulo: RegExp | string, valor: string) => {
  await act(async () => {
    fireEvent.change(await screen.findByLabelText(rotulo), { target: { value: valor } });
  });
};

describe("vans", () => {
  it("cadastra uma van, mostra na lista e não aceita cadastro incompleto", async () => {
    const { estado } = await abrir("/vanzeiro/vans");
    const antes = estado().vans.length;
    await clicar(/Adicionar van/);
    await clicar(/Salvar van/);
    expect(estado().vans).toHaveLength(antes);
    expect(
      (await screen.findAllByText(/obrigat|Escreva|Informe|Digite|Dê/i)).length,
    ).toBeGreaterThan(0);

    await digitar(/Apelido/, "Van Teste");
    await digitar(/Placa/, "ABC1D23");
    await digitar(/Número de lugares/, "9");
    await clicar(/Salvar van/);
    await waitFor(() => expect(estado().vans).toHaveLength(antes + 1));
    const nova = estado().vans.at(-1)!;
    expect(nova).toMatchObject({ apelido: "Van Teste", lugares: 9 });
    expect(await screen.findByText("Van Teste")).toBeInTheDocument();
  });

  it("exclui a van só depois de confirmar", async () => {
    const { estado } = await abrir("/vanzeiro/vans");
    const antes = estado().vans.length;
    await act(async () => {
      fireEvent.click((await screen.findAllByText(estado().vans[0]!.apelido))[0]!);
    });
    await clicar(/Excluir/);
    expect(estado().vans).toHaveLength(antes);
    await clicar(/Sim, excluir/);
    await waitFor(() => expect(estado().vans).toHaveLength(antes - 1));
  });
});

describe("motoristas", () => {
  it("cadastra um motorista e recusa telefone inválido", async () => {
    const { estado } = await abrir("/vanzeiro/motoristas");
    const antes = estado().motoristas.length;
    await clicar(/Adicionar motorista/);
    await digitar(/^Nome/, "Motorista Teste");
    await digitar(/^Telefone/, "123");
    await clicar(/Salvar motorista/);
    expect(estado().motoristas).toHaveLength(antes);

    await digitar(/^Telefone/, "43999990000");
    await clicar(/Salvar motorista/);
    await waitFor(() => expect(estado().motoristas).toHaveLength(antes + 1));
    expect(estado().motoristas.at(-1)).toMatchObject({ nome: "Motorista Teste", proprio: false });
    expect(await screen.findByText("Motorista Teste")).toBeInTheDocument();
  });
});

describe("gastos", () => {
  it("lança um gasto e ele entra na lista do mês", async () => {
    const { estado } = await abrir("/vanzeiro/gastos");
    const antes = estado().gastos.length;
    await clicar(/Lançar gasto/);
    await digitar(/Valor \(R\$\)/, "120,50");
    await clicar(/^Diesel$/);
    await act(async () => {
      fireEvent.change(await screen.findByLabelText(/Descrição/), {
        target: { value: "Posto Teste" },
      });
    });
    const enviar = (await screen.findAllByRole("button", { name: /Lançar gasto/ })).at(-1)!;
    await act(async () => {
      fireEvent.click(enviar);
    });
    await waitFor(() => expect(estado().gastos).toHaveLength(antes + 1));
    expect(estado().gastos.at(-1)).toMatchObject({ valor: 120.5, categoria: "Diesel" });
  });
});

describe("dinheiro", () => {
  it("marcar como pago gera o recibo e tira a dívida", async () => {
    const { estado } = await abrir("/vanzeiro/dinheiro");
    const recibosAntes = estado().recibos.length;
    const devia = new Map(estado().passageiros.map((p) => [p.id, p.emAberto]));
    await act(async () => {
      fireEvent.click((await screen.findAllByRole("button", { name: /Marcar pago/ }))[0]!);
    });
    await clicar(/Confirmar pagamento/);
    await waitFor(() => expect(estado().recibos).toHaveLength(recibosAntes + 1));
    expect(estado().recibos.at(-1)!.valor).toBeGreaterThan(0);
    const pago = estado().recibos.at(-1)!;
    expect(estado().passageiros.find((p) => p.id === pago.pid)!.emAberto).toBeLessThan(
      devia.get(pago.pid)!,
    );
    expect(await screen.findByText(/RECIBO Nº/)).toBeInTheDocument();
  });

  it("a aba Financeiro mostra recebido, gastos e lucro do mês", async () => {
    await abrir("/vanzeiro/dinheiro");
    await clicar(/^Financeiro$/);
    expect(await screen.findByText("Recebido no mês")).toBeInTheDocument();
    expect(screen.getByText("Gastos do mês")).toBeInTheDocument();
    expect(screen.getAllByText("Lucro").length).toBeGreaterThan(0);
    expect(document.body.textContent).toMatch(/R\$\s?\d/);
  });
});
