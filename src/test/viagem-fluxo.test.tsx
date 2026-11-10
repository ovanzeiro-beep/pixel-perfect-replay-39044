import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

// Viagem inteira com dezenas de toques: com medição de cobertura (mais lenta) 5 s não basta.
vi.setConfig({ testTimeout: 30_000 });

afterEach(cleanup);

/** Abre a tela da viagem (ida) de uma viagem de hoje ou futura com 3+ confirmados e sem ida iniciada. */
async function abrirIda(
  quantos = 3,
  filtro: (v: import("@/data/viagens").Viagem, e: import("@/data/tipos").Estado) => boolean = () =>
    true,
) {
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
    (v) =>
      !v.passada && !v.ajuste.cancelada && !v.ajuste.ida && v.vao.length >= quantos && filtro(v, e),
  )!;
  expect(viagem, "precisa de uma viagem com confirmados").toBeTruthy();
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [`/ida/${viagem.id}`] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByText(/Na van:/);
  const ajuste = () => store.obterEstado().ajustes[viagem.id]!;
  const nomes = viagem.vao.map((id) => e.passageiros.find((p) => p.id === id)!.nome);
  return { viagem, store, ajuste, nomes, e };
}

/** "Na van: 3 de 4" vem em pedaços de HTML; confere pelo texto corrido da tela. */
const naVan = (a: number, de: number) =>
  waitFor(() =>
    expect(document.body.textContent?.replace(/\s+/g, " ")).toContain(`Na van: ${a} de ${de}`),
  );

const clicar = async (nome: RegExp | string, indice = 0) => {
  const botoes = await screen.findAllByRole("button", { name: nome });
  await act(async () => {
    fireEvent.click(botoes[indice]!);
  });
};

describe("viagem completa: ida, volta e resumo", () => {
  it("embarca todos, chega, faz a chamada da volta, entrega todos e encerra com o resumo certo", async () => {
    const { viagem, ajuste } = await abrirIda();
    const n = viagem.vao.length;
    expect(ajuste().ida?.fase).toBe("paradas");

    for (let i = 0; i < n; i++) await clicar(/^Embarcou$/);
    await waitFor(() => expect(ajuste().ida!.marcas).toHaveLength(n));
    await naVan(n, n);

    await clicar(/Seguir para o destino/);
    await waitFor(() => expect(ajuste().ida!.fase).toBe("a_caminho"));
    await clicar(/Cheguei ao destino/);
    await waitFor(() => expect(ajuste().ida!.fase).toBe("chegou"));
    await clicar(/Iniciar volta/);
    await waitFor(() => expect(ajuste().ida!.volta?.fase).toBe("chamada"));

    // Chamada da volta: toca em cada nome ("Aguardando" → "Na van").
    expect(await screen.findByText("Chamada da volta")).toBeInTheDocument();
    for (let i = 0; i < n; i++) await clicar(/Aguardando/);
    await waitFor(() => expect(Object.keys(ajuste().ida!.volta!.status)).toHaveLength(n));
    expect(await screen.findByText("Todos marcados!")).toBeInTheDocument();
    await clicar(/Seguir viagem/);
    await waitFor(() => expect(ajuste().ida!.volta!.fase).toBe("entrega"));

    for (let i = 0; i < n; i++) await clicar(/^Entregue$/);
    await waitFor(() => expect(ajuste().ida!.volta!.entregas).toHaveLength(n));
    await clicar(/Encerrar viagem/);
    await waitFor(() => expect(ajuste().ida!.encerrada).toBeTruthy());

    // Resumo da viagem concluída
    expect(await screen.findByText("Viagem concluída")).toBeInTheDocument();
    const resumo = screen.getByText("Resumo da viagem").closest("section")!;
    expect(within(resumo).getByText("Embarcaram").nextSibling).toHaveTextContent(String(n));
    expect(within(resumo).getByText("Entregues").nextSibling).toHaveTextContent(String(n));
    expect(screen.getByRole("button", { name: /Compartilhar resumo/ })).toBeInTheDocument();
  });

  it("'Não apareceu' não cobra; 'Desfazer última marcação' devolve o passageiro à fila", async () => {
    const { viagem, ajuste } = await abrirIda();
    const n = viagem.vao.length;
    await clicar(/Não apareceu/);
    // Pergunta antes de marcar: dá para esperar mais um pouco (não marca nada) ou seguir viagem.
    expect(await screen.findByText("O que você quer fazer?")).toBeInTheDocument();
    await clicar(/Aguardar mais um pouco/);
    expect(ajuste().ida!.marcas).toHaveLength(0);
    await clicar(/Não apareceu/);
    await clicar(/^Seguir viagem$/);
    await waitFor(() => expect(ajuste().ida!.marcas).toHaveLength(1));
    expect(ajuste().ida!.marcas[0]).toMatchObject({ r: "faltou", cobrou: 0 });
    await naVan(0, n);

    await clicar(/Desfazer última marcação/);
    await waitFor(() => expect(ajuste().ida!.marcas).toHaveLength(0));
    await naVan(0, n);
  });
});

describe("parada no caminho", () => {
  it("inicia a parada, chama a turma, marca quem está na van e retoma; quem não voltou fica na parada", async () => {
    const { ajuste } = await abrirIda();
    await clicar(/^Embarcou$/);
    await clicar(/^Embarcou$/);
    await waitFor(() => expect(ajuste().ida!.marcas).toHaveLength(2));

    await clicar(/Fazer parada no caminho/);
    await clicar(/Começar parada de 15 min/);
    await waitFor(() => expect(ajuste().ida!.parada?.minutos).toBe(15));
    expect((await screen.findAllByText(/Parada de 15 minutos/)).length).toBeGreaterThan(0);

    await clicar(/Retomar viagem/);
    await waitFor(() => expect(ajuste().ida!.parada?.chamada).toBe(true));
    expect(await screen.findByText(/Chamada · toque no nome/)).toBeInTheDocument();

    // Marca só o primeiro; o segundo vai ficar na parada.
    await clicar(/Aguardando/);
    await waitFor(() => expect(Object.keys(ajuste().ida!.parada!.naVan)).toHaveLength(1));
    expect(ajuste().ida!.parada!.naVan[Object.keys(ajuste().ida!.parada!.naVan)[0]!]).toBe(
      "manual",
    );
  });
});

describe("volta: passageiro extra e quem não volta", () => {
  it("'Adicionar passageiro na volta' coloca a pessoa na chamada e 'Não volta' registra o motivo", async () => {
    const { viagem, ajuste } = await abrirIda();
    const n = viagem.vao.length;
    for (let i = 0; i < n; i++) await clicar(/^Embarcou$/);
    await waitFor(() => expect(ajuste().ida!.marcas).toHaveLength(n));
    await clicar(/Seguir para o destino/);
    await clicar(/Cheguei ao destino/);
    await clicar(/Iniciar volta/);
    await screen.findByText("Chamada da volta");

    await clicar(/Adicionar passageiro na volta/);
    const lista = await screen.findAllByRole("button", {
      name: /Maria|Antônio|Rosângela|Sebastião|Cleide/,
    });
    await act(async () => {
      fireEvent.click(lista[lista.length - 1]!);
    });
    await waitFor(() => expect(ajuste().ida!.volta!.extras).toHaveLength(1));

    await clicar(/^Não volta$/);
    // Janela de motivo: escolhe a primeira opção e confirma.
    const motivo = await screen.findByRole("button", { name: /Voltou com a família/ });
    await act(async () => {
      fireEvent.click(motivo);
    });
    const confirmar = (await screen.findAllByRole("button", { name: /Confirmar|Salvar/ }))[0]!;
    await act(async () => {
      fireEvent.click(confirmar);
    });
    await waitFor(() =>
      expect(Object.values(ajuste().ida!.volta!.status).some((s) => s.r === "nao")).toBe(true),
    );
  });
});

const ateAVolta = async (n: number, ajuste: () => import("@/data/viagens").Ajuste) => {
  for (let i = 0; i < n; i++) await clicar(/^Embarcou$/);
  await waitFor(() => expect(ajuste().ida!.marcas).toHaveLength(n));
  await clicar(/Seguir para o destino/);
  await clicar(/Cheguei ao destino/);
  await clicar(/Iniciar volta/);
  await screen.findByText("Chamada da volta");
  for (let i = 0; i < n; i++) await clicar(/Aguardando/);
  await clicar(/Seguir viagem/);
  await waitFor(() => expect(ajuste().ida!.volta!.fase).toBe("entrega"));
};

describe("parada: quem não voltou para a van fica", () => {
  it("seguir com alguém faltando pede o motivo e registra quem ficou na parada", async () => {
    const { ajuste } = await abrirIda();
    await clicar(/^Embarcou$/);
    await clicar(/^Embarcou$/);
    await waitFor(() => expect(ajuste().ida!.marcas).toHaveLength(2));
    await clicar(/Fazer parada no caminho/);
    await clicar(/Começar parada de 15 min/);
    await clicar(/Retomar viagem/);
    await clicar(/Aguardando/); // só um volta para a van
    await waitFor(() => expect(Object.keys(ajuste().ida!.parada!.naVan)).toHaveLength(1));

    await clicar(/Seguir viagem/);
    expect(await screen.findByText(/Seguir mesmo assim — por quê\?/)).toBeInTheDocument();
    await clicar(/Avisou que vai seguir por conta própria/);
    await clicar(/^Seguir mesmo assim$/);
    await waitFor(() => expect(ajuste().ida!.parada).toBeUndefined());
    const ida = ajuste().ida!;
    expect(ida.marcas.filter((m) => m.r === "ficou")).toHaveLength(1);
    expect(ida.paradas).toHaveLength(1);
    expect(ida.paradas![0]!.ficaram[0]!.motivo).toBe("Avisou que vai seguir por conta própria");
  });

  it("'Contei todos' confere todo mundo de uma vez", async () => {
    const { ajuste } = await abrirIda();
    await clicar(/^Embarcou$/);
    await clicar(/^Embarcou$/);
    await clicar(/Fazer parada no caminho/);
    await clicar(/Começar parada de 15 min/);
    await clicar(/Retomar viagem/);
    await clicar(/Contei todos/);
    await clicar(/Sim, todos estão/);
    await waitFor(() => expect(Object.keys(ajuste().ida!.parada!.naVan)).toHaveLength(2));
  });
});

describe("volta: entrega em outro lugar, desfazer e parada", () => {
  it("'Desceu em outro lugar' guarda onde; desfazer devolve à fila; parada na volta funciona", async () => {
    const { viagem, ajuste } = await abrirIda(3);
    const n = viagem.vao.length;
    await ateAVolta(n, ajuste);

    await clicar(/Desceu em outro lugar/);
    await act(async () => {
      fireEvent.change(await screen.findByPlaceholderText(/Praça da Matriz/), {
        target: { value: "Praça Central" },
      });
    });
    await clicar(/^Confirmar$/);
    await waitFor(() => expect(ajuste().ida!.volta!.entregas).toHaveLength(1));
    expect(ajuste().ida!.volta!.entregas[0]).toMatchObject({ r: "outro", onde: "Praça Central" });

    await clicar(/Desfazer última marcação/);
    await waitFor(() => expect(ajuste().ida!.volta!.entregas).toHaveLength(0));

    await clicar(/Fazer parada no caminho/);
    await clicar(/Começar parada de 15 min/);
    await waitFor(() => expect(ajuste().ida!.volta!.parada?.minutos).toBe(15));
    await clicar(/Retomar viagem/);
    await clicar(/Contei todos/);
    await clicar(/Sim, todos estão/);
    await waitFor(() => expect(Object.keys(ajuste().ida!.volta!.parada!.naVan)).toHaveLength(n));
    await clicar(/Seguir viagem/);
    await waitFor(() => expect(ajuste().ida!.volta!.parada).toBeUndefined());
    expect(ajuste().ida!.volta!.paradas).toHaveLength(1);
  });
});

describe("resumo com dinheiro", () => {
  it("quem paga por viagem é cobrado ao embarcar e o resumo mostra o total e as cobranças criadas", async () => {
    const { viagem, ajuste, e } = await abrirIda(2, (v, est) =>
      v.vao.some((id) => est.passageiros.find((p) => p.id === id)?.formaPagamento === "por_viagem"),
    );
    const n = viagem.vao.length;
    await ateAVolta(n, ajuste);
    for (let i = 0; i < n; i++) await clicar(/^Entregue$/);
    await waitFor(() => expect(ajuste().ida!.volta!.entregas).toHaveLength(n));
    await clicar(/Encerrar viagem/);
    await screen.findByText("Viagem concluída");
    const cobrado = ajuste().ida!.marcas.reduce((t, m) => t + m.cobrou, 0);
    expect(cobrado).toBeGreaterThan(0);
    expect(await screen.findByText("Cobranças criadas")).toBeInTheDocument();
    const resumo = screen.getByText("Resumo da viagem").closest("section")!;
    expect(resumo.textContent).toMatch(/Total da viagem/);
    expect(resumo.textContent).toMatch(/R\$\s?[1-9]/);
    expect(e.passageiros.length).toBeGreaterThan(0);
  });
});
