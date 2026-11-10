// Testes de tela das telas principais do vanzeiro: início, viagens e linhas.
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  const { montarViagens } = await import("@/data/viagens");
  sessao.entrarComoVanzeiro();
  const proximaViagem = () => {
    const e = store.obterEstado();
    return montarViagens(
      e.linhas,
      e.passageiros,
      e.vans,
      e.ajustes,
      new Date(),
      e.pausas ?? [],
    ).find((x) => !x.passada && x.passageiroIds.length > 0)!;
  };
  const alvo = caminho.replace("{viagem}", proximaViagem().id);
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [alvo] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("navigation");
  return { store, router, proximaViagem, estado: () => store.obterEstado() };
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

const cidade = async (nome: string) => {
  await act(async () => {
    fireEvent.change(await screen.findByPlaceholderText("Nome da cidade"), {
      target: { value: nome },
    });
  });
  await clicar("Adicionar cidade");
};

describe("tela inicial do vanzeiro", () => {
  it("mostra a próxima viagem com os lugares confirmados e leva para a ficha dela", async () => {
    const { proximaViagem, router } = await abrir("/vanzeiro");
    const v = proximaViagem();
    expect(await screen.findByText("Próxima viagem")).toBeInTheDocument();
    expect(await screen.findByText(`${v.vao.length} de ${v.lugares}`)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(await screen.findByRole("link", { name: "Ver viagem" }));
    });
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro/viagens"));
    expect(router.state.location.search).toMatchObject({ v: expect.any(String) });
  });

  it("o total devido bate com o que cada passageiro deve", async () => {
    const { estado } = await abrir("/vanzeiro");
    const devendo = estado().passageiros.filter((p) => p.emAberto > 0);
    expect(await screen.findByText("Quem está devendo")).toBeInTheDocument();
    expect(
      await screen.findByText(new RegExp(`${devendo.length} pessoas? com pagamento em aberto`)),
    ).toBeInTheDocument();
  });

  it("os atalhos levam às telas certas", async () => {
    const { router } = await abrir("/vanzeiro");
    await act(async () => {
      fireEvent.click(await screen.findByRole("link", { name: /Novo passageiro/ }));
    });
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro/passageiros"));
  });

  it("uma viagem em andamento aparece em destaque, com o botão para abri-la", async () => {
    const { store, proximaViagem } = await abrir("/vanzeiro");
    const v = proximaViagem();
    await act(async () => {
      await store.iniciarIda(v.id, v.passageiroIds);
    });
    expect(await screen.findByText("Viagem em andamento")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Abrir viagem" })).toBeInTheDocument();
  });
});

describe("tela de viagens", () => {
  it("alterna entre Próximas e Anteriores", async () => {
    await abrir("/vanzeiro/viagens");
    expect(await screen.findByRole("heading", { name: "Viagens" })).toBeInTheDocument();
    await clicar("Anteriores");
    expect(
      (await screen.findAllByText(/Nenhuma viagem anterior ainda|Saída/)).length,
    ).toBeGreaterThan(0);
    await clicar("Próximas");
    expect((await screen.findAllByText(/Saída/)).length).toBeGreaterThan(0);
  });

  it("o vanzeiro muda a resposta de um passageiro pela ficha da viagem", async () => {
    const { estado, proximaViagem } = await abrir("/vanzeiro/viagens?v={viagem}");
    const v = proximaViagem();
    const pid = v.vao[0] ?? v.passageiroIds[0]!;
    const nome = estado().passageiros.find((p) => p.id === pid)!.nome;
    await act(async () => {
      fireEvent.click((await screen.findAllByText(nome))[0]!);
    });
    await clicar("Não vai");
    await waitFor(() => expect(estado().ajustes[v.id]?.respostas[pid]).toBe("nao"));
  });

  it("cancelar a viagem só vale depois de confirmar", async () => {
    const { estado, proximaViagem } = await abrir("/vanzeiro/viagens?v={viagem}");
    const v = proximaViagem();
    await clicar(/Cancelar viagem/);
    expect(estado().ajustes[v.id]?.cancelada).toBeFalsy();
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /^Sim/ }));
    });
    await waitFor(() => expect(estado().ajustes[v.id]?.cancelada).toBe(true));
  });

  it("troca a van só desta viagem", async () => {
    const { estado, proximaViagem } = await abrir("/vanzeiro/viagens?v={viagem}");
    const v = proximaViagem();
    const outra = estado().vans.find((x) => x.id !== v.vanId)!;
    await clicar(/Trocar van ou motorista/);
    const painel = (await screen.findByRole("heading", { name: "Trocar só nesta viagem" }))
      .parentElement!.parentElement!;
    const [selVan] = within(painel).getAllByRole("combobox");
    await act(async () => {
      fireEvent.change(selVan!, { target: { value: outra.id } });
    });
    await act(async () => {
      fireEvent.click(within(painel).getByRole("button", { name: "Salvar" }));
    });
    // Se a van nova for menor que o grupo, o app avisa antes; confirmar nesse caso.
    const trocarMesmo = screen.queryByRole("button", { name: "Trocar mesmo assim" });
    if (trocarMesmo)
      await act(async () => {
        fireEvent.click(trocarMesmo);
      });
    await waitFor(() => expect(estado().ajustes[v.id]?.vanId).toBe(outra.id));
    expect(estado().linhas.find((l) => l.id === v.linhaId)!.vanId).not.toBe(outra.id);
  });

  it("avisa antes de trocar para uma van que não comporta quem já confirmou", async () => {
    const { store, estado, proximaViagem } = await abrir("/vanzeiro/viagens?v={viagem}");
    const v = proximaViagem();
    const pequena = estado().vans.find((x) => x.id !== v.vanId)!;
    await act(async () => {
      await store.salvarVan({ ...pequena, lugares: 1 });
    });
    await act(async () => {
      for (const id of v.passageiroIds.slice(0, 2))
        await store.definirRespostaDoPassageiro(v.id, id, "vai");
    });
    await clicar(/Trocar van ou motorista/);
    const painel = (await screen.findByRole("heading", { name: "Trocar só nesta viagem" }))
      .parentElement!.parentElement!;
    await act(async () => {
      fireEvent.change(within(painel).getAllByRole("combobox")[0]!, {
        target: { value: pequena.id },
      });
    });
    await act(async () => {
      fireEvent.click(within(painel).getByRole("button", { name: "Salvar" }));
    });
    expect(await screen.findByText("Vai faltar lugar")).toBeInTheDocument();
    expect(estado().ajustes[v.id]?.vanId).not.toBe(pequena.id);
  });

  it("acrescenta um passageiro só nesta viagem", async () => {
    const { estado, proximaViagem } = await abrir("/vanzeiro/viagens?v={viagem}");
    const v = proximaViagem();
    const fora = estado().passageiros.find((p) => !v.passageiroIds.includes(p.id))!;
    await clicar(/Adicionar passageiro só nesta viagem/);
    await act(async () => {
      fireEvent.click(await screen.findByText(fora.nome));
    });
    await waitFor(() => expect(estado().ajustes[v.id]?.extras).toContain(fora.id));
  });
});

describe("tela de linhas", () => {
  it("cria uma linha com trajeto, recusa cadastro incompleto e a mostra na lista", async () => {
    const { estado } = await abrir("/vanzeiro/linhas");
    const antes = estado().linhas.length;
    await clicar(/Nova linha/);
    await clicar(/Salvar linha/);
    expect(estado().linhas).toHaveLength(antes);
    expect(await screen.findByText("Escreva o nome da linha.")).toBeInTheDocument();
    expect(await screen.findByText("Escolha pelo menos um dia da semana.")).toBeInTheDocument();

    await digitar(/Nome da linha/, "Linha de Teste");
    await clicar("Seg");
    await clicar("Qua");
    await cidade("Cambará");
    await cidade("Londrina");
    await digitar(/Valor por viagem/, "30,50");
    await clicar(/Salvar linha/);
    await waitFor(() => expect(estado().linhas).toHaveLength(antes + 1));
    expect(estado().linhas.at(-1)).toMatchObject({
      nome: "Linha de Teste",
      dias: ["seg", "qua"],
      paradas: ["Cambará", "Londrina"],
      valorViagem: 30.5,
      ativa: true,
    });
    expect(await screen.findByText("Linha de Teste")).toBeInTheDocument();
  });

  it("viagem única exige a data", async () => {
    const { estado } = await abrir("/vanzeiro/linhas");
    const antes = estado().linhas.length;
    await clicar(/Nova linha/);
    await digitar(/Nome da linha/, "Excursão");
    await clicar("Viagem única");
    await clicar(/Salvar linha/);
    expect(await screen.findByText("Escolha a data da viagem.")).toBeInTheDocument();
    expect(estado().linhas).toHaveLength(antes);
  });

  it("pausa e ativa uma linha", async () => {
    const { estado } = await abrir("/vanzeiro/linhas");
    const l = estado().linhas.find((x) => x.ativa)!;
    await act(async () => {
      fireEvent.click((await screen.findAllByText(l.nome))[0]!);
    });
    await clicar(/Pausar/);
    await waitFor(() => expect(estado().linhas.find((x) => x.id === l.id)!.ativa).toBe(false));
    await clicar(/Ativar/);
    await waitFor(() => expect(estado().linhas.find((x) => x.id === l.id)!.ativa).toBe(true));
  });

  it("tira um passageiro da linha só depois de confirmar", async () => {
    const { estado } = await abrir("/vanzeiro/linhas");
    const l = estado().linhas.find((x) =>
      estado().passageiros.some((p) => p.linhaIds.includes(x.id)),
    )!;
    const p = estado().passageiros.find((x) => x.linhaIds.includes(l.id))!;
    await act(async () => {
      fireEvent.click((await screen.findAllByText(l.nome))[0]!);
    });
    await clicar(new RegExp(`Tirar ${p.nome} da linha`));
    expect(estado().passageiros.find((x) => x.id === p.id)!.linhaIds).toContain(l.id);
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /^Sim/ }));
    });
    await waitFor(() =>
      expect(estado().passageiros.find((x) => x.id === p.id)!.linhaIds).not.toContain(l.id),
    );
    expect(estado().passageiros.find((x) => x.id === p.id)!.ativo).toBeDefined();
  });

  it("adiciona um passageiro que está fora da linha", async () => {
    const { estado } = await abrir("/vanzeiro/linhas");
    const l = estado().linhas[0]!;
    const fora = estado().passageiros.find((x) => !x.linhaIds.includes(l.id))!;
    await act(async () => {
      fireEvent.click((await screen.findAllByText(l.nome))[0]!);
    });
    await clicar(/Adicionar passageiro à linha/);
    await act(async () => {
      fireEvent.click(await screen.findByText(fora.nome));
    });
    await clicar(/^Adicionar \(1\)/);
    await waitFor(() =>
      expect(estado().passageiros.find((x) => x.id === fora.id)!.linhaIds).toContain(l.id),
    );
  });

  it("excluir uma linha avisa quantos passageiros ficam sem linha e leva as viagens e pausas dela", async () => {
    const { store, estado } = await abrir("/vanzeiro/linhas");
    const l = estado().linhas.find((x) =>
      estado().passageiros.some((p) => p.linhaIds.includes(x.id)),
    )!;
    const quantos = estado().passageiros.filter((p) => p.linhaIds.includes(l.id)).length;
    await act(async () => {
      await store.salvarPausa({
        de: "2031-01-01",
        ate: "2031-01-05",
        motivo: "Teste",
        linhaId: l.id,
      });
    });
    await act(async () => {
      fireEvent.click((await screen.findAllByText(l.nome))[0]!);
    });
    await clicar(/Excluir/);
    expect(
      await screen.findByText(new RegExp(`${quantos} passageiros estão nesta linha`)),
    ).toBeInTheDocument();
    await clicar(/Sim, excluir/);
    await waitFor(() => expect(estado().linhas.some((x) => x.id === l.id)).toBe(false));
    expect(estado().passageiros.every((p) => !p.linhaIds.includes(l.id))).toBe(true);
    expect((estado().pausas ?? []).some((z) => z.linhaId === l.id)).toBe(false);
  });
});
