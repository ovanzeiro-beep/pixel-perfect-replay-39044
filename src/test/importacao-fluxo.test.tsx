import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

vi.setConfig({ testTimeout: 30_000 });
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
  return { store };
}
const clicar = async (nome: RegExp | string) => {
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: nome }));
  });
};
const colar = async (texto: string) => {
  await act(async () => {
    fireEvent.change(await screen.findByLabelText(/cole aqui o texto da planilha/), {
      target: { value: texto },
    });
  });
};

const CAB = "Nome;Telefone;Forma de pagamento;Valor;Vencimento";

describe("importar passageiros por planilha", () => {
  it("mostra a conferência e importa só os prontos", async () => {
    const { store } = await abrir("/vanzeiro/passageiros");
    const antes = store.obterEstado().passageiros.length;
    const ja = store.obterEstado().passageiros[0]!;
    await clicar(/Importar de planilha/);
    await colar(
      [
        CAB,
        "Zélia Nova;43988880001;mensal;180;10",
        "Zeca Novo;43988880002;mensal;190;12",
        `${ja.nome};${ja.telefone};mensal;100;5`,
        "Sem Fone;;mensal;100;5",
      ].join("\n"),
    );
    expect(await screen.findByText(/2 prontos para importar/)).toBeInTheDocument();
    expect(screen.getByText(/1 já cadastrado/)).toBeInTheDocument();
    expect(screen.getByText(/1 para corrigir/)).toBeInTheDocument();
    expect(screen.getByText("Falta o telefone.")).toBeInTheDocument();

    await clicar("Importar 2 passageiros");
    const depois = store.obterEstado().passageiros;
    expect(depois).toHaveLength(antes + 2);
    const nova = depois.find((p) => p.nome === "Zélia Nova")!;
    expect(nova).toMatchObject({
      valor: 180,
      vencimento: "10",
      convite: "nao_enviado",
      ativo: true,
    });
    expect(screen.queryByRole("button", { name: /Importar 2/ })).not.toBeInTheDocument();
  });

  it("sem nada para importar, o botão fica desligado", async () => {
    await abrir("/vanzeiro/passageiros");
    await clicar(/Importar de planilha/);
    await colar(`${CAB}\nSem Fone;;mensal;100;5`);
    expect(await screen.findByRole("button", { name: "Nada para importar" })).toBeDisabled();
  });

  it("texto sem passageiros explica o que fazer", async () => {
    await abrir("/vanzeiro/passageiros");
    await clicar(/Importar de planilha/);
    await colar("Nome;Telefone");
    expect(await screen.findByRole("alert")).toHaveTextContent(/Não encontrei passageiros/);
  });

  it("oferece exportar a lista em planilha", async () => {
    await abrir("/vanzeiro/passageiros");
    expect(
      await screen.findByRole("button", { name: /Exportar para planilha/ }),
    ).toBeInTheDocument();
  });
});
