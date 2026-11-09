import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { semearContaVazia, semearExemploNoAparelho } from "./apoio";

type Modo = "primeiro-acesso" | "exemplo" | "vazia-configurada";

async function abrir(caminho: string, modo: Modo = "primeiro-acesso") {
  vi.resetModules();
  localStorage.clear();
  if (modo === "exemplo") await semearExemploNoAparelho();
  if (modo === "vazia-configurada") await semearContaVazia();
  const { routeTree } = await import("@/routeTree.gen");
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  const store = await import("@/data/store");
  const backup = await import("@/data/backup");
  sessao.entrarComoVanzeiro();
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [caminho] }),
  });
  render(<RouterProvider router={router} />);
  return { router, store, backup };
}

const preencher = (nome = "Maria Souza") => {
  fireEvent.change(screen.getByPlaceholderText("Seu nome completo"), { target: { value: nome } });
  fireEvent.change(screen.getByPlaceholderText("(43) 99999-9999"), {
    target: { value: "(43) 98888-7777" },
  });
  const form = screen.getByRole("button", { name: "Começar" }).closest("form")!;
  fireEvent.change(within(form).getAllByRole("textbox")[2]!, { target: { value: "Londrina" } });
  fireEvent.change(within(form).getByRole("combobox"), { target: { value: "PR" } });
};

const van = {
  apelido: "Van Azul",
  modelo: "X",
  placa: "AAA1B23",
  lugares: 10,
  ano: null,
  cor: "",
  motoristaId: "",
  situacao: "rodando" as const,
  observacoes: "",
};

beforeEach(() => {
  vi.stubGlobal("open", vi.fn());
});
afterEach(() => {
  Reflect.deleteProperty(navigator, "canShare");
  cleanup();
  vi.unstubAllGlobals();
});

describe("primeiro acesso (nada salvo no aparelho)", () => {
  it.each([
    "/vanzeiro",
    "/vanzeiro/viagens",
    "/vanzeiro/dinheiro",
    "/vanzeiro/perfil",
    "/ida/l1_2026-11-13",
  ])("%s leva para as boas-vindas", async (rota) => {
    const { router } = await abrir(rota);
    await waitFor(() => expect(router.state.location.pathname).toBe("/boas-vindas"));
    expect(
      await screen.findByRole("heading", { name: "Bem-vindo ao O Vanzeiro" }),
    ).toBeInTheDocument();
  });

  it("campos vazios: mostra o que falta, em português, e não segue", async () => {
    const { router, store } = await abrir("/vanzeiro");
    fireEvent.click(await screen.findByRole("button", { name: "Começar" }));
    expect(await screen.findByText("Escreva seu nome.")).toBeInTheDocument();
    expect(screen.getByText("Escreva seu celular, com DDD.")).toBeInTheDocument();
    expect(screen.getByText("Escreva a sua cidade.")).toBeInTheDocument();
    expect(screen.getByText("Escolha o estado.")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/boas-vindas");
    expect(store.obterEstado().perfil.configurado).toBe(false);
  });

  it("telefone sem DDD é recusado", async () => {
    await abrir("/vanzeiro");
    await screen.findByRole("button", { name: "Começar" });
    preencher();
    fireEvent.change(screen.getByPlaceholderText("(43) 99999-9999"), {
      target: { value: "99999-0000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(await screen.findByText(/Telefone incompleto/)).toBeInTheDocument();
  });

  it("preenchendo, entra no app com o nome da pessoa e o guia de primeiros passos", async () => {
    const { router, store } = await abrir("/vanzeiro");
    await screen.findByRole("button", { name: "Começar" });
    preencher();
    fireEvent.change(screen.getByPlaceholderText(/CPF, telefone/), {
      target: { value: "maria@pix.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro"));
    expect(await screen.findByRole("heading", { level: 1, name: /Maria/ })).toBeInTheDocument();
    expect(screen.queryByText(/João/)).toBeNull();
    const e = store.obterEstado();
    expect(e.perfil).toMatchObject({
      nome: "Maria Souza",
      cidade: "Londrina",
      estado: "PR",
      telefone: "(43) 98888-7777",
      configurado: true,
    });
    expect(e.chavePix).toBe("maria@pix.com");
    expect(e.motoristas).toHaveLength(1);
    expect(e.motoristas[0]).toMatchObject({ nome: "Maria Souza", proprio: true });
    expect(e.passageiros).toEqual([]);

    const guia = await screen.findByRole("region", { name: "Primeiros passos" });
    expect(within(guia).getByText(/0 de 6 feitos|1 de 6 feitos/)).toBeInTheDocument();
    expect(within(guia).getByText("Cadastre sua van")).toBeInTheDocument();
  });

  it("'Prefiro ver o app com dados de exemplo' abre o app com os dados de exemplo", async () => {
    const { router, store } = await abrir("/vanzeiro");
    fireEvent.click(
      await screen.findByRole("button", { name: "Prefiro ver o app com dados de exemplo" }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro"));
    expect(await screen.findByRole("heading", { level: 1, name: /João/ })).toBeInTheDocument();
    expect(store.obterEstado().passageiros).toHaveLength(22);
    expect(screen.queryByRole("region", { name: "Primeiros passos" })).toBeNull();
  });

  it("quem já preencheu não volta para as boas-vindas", async () => {
    const { router } = await abrir("/boas-vindas", "vazia-configurada");
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro"));
  });
});

describe("troca de celular: restaurar o backup já nas boas-vindas", () => {
  it("escolhe o arquivo, confere a prévia e entra com todos os dados", async () => {
    const { router, store, backup } = await abrir("/vanzeiro");
    const arquivo = backup.serializarBackup(backup.criarBackup(store.criarEstadoExemplo()));
    await screen.findByRole("button", { name: "Começar" });
    expect(screen.getByText(/Trocou de celular/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Salvar backup/ })).toBeNull();

    const entrada = screen.getByLabelText("Escolher arquivo de backup");
    fireEvent.change(entrada, {
      target: {
        files: [new File([arquivo], "vanzeiro-backup.json", { type: "application/json" })],
      },
    });
    await screen.findByText("Restaurar este backup?");
    fireEvent.click(screen.getByRole("button", { name: "Sim, restaurar" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro"));
    expect(store.obterEstado().passageiros).toHaveLength(22);
    expect(await screen.findByRole("heading", { level: 1, name: /João/ })).toBeInTheDocument();
  });

  it("arquivo ruim mostra o erro e fica nas boas-vindas", async () => {
    const { router } = await abrir("/vanzeiro");
    await screen.findByRole("button", { name: "Começar" });
    fireEvent.change(screen.getByLabelText("Escolher arquivo de backup"), {
      target: { files: [new File(["isto não é um backup"], "x.json")] },
    });
    expect((await screen.findByRole("alert")).textContent).toMatch(/não é um backup/);
    expect(router.state.location.pathname).toBe("/boas-vindas");
  });
});

describe("guia de primeiros passos", () => {
  it("acompanha o que a pessoa cadastra e some quando o essencial está pronto", async () => {
    const { store } = await abrir("/vanzeiro", "vazia-configurada");
    const guia = await screen.findByRole("region", { name: "Primeiros passos" });
    expect(within(guia).getByText(/0 de 6 feitos/)).toBeInTheDocument();
    expect(within(guia).getAllByRole("link")).toHaveLength(6);

    act(() => store.salvarVan(van));
    expect(await within(guia).findByText(/1 de 6 feitos/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");

    act(() => {
      store.salvarLinha({
        nome: "Linha 1",
        tipo: "Escolar",
        frequencia: "semanal",
        dias: ["seg"],
        data: "",
        saida: "07:00",
        volta: "12:00",
        paradas: ["Londrina"],
        destino: "Colégio",
        vanId: "",
        motoristaId: "",
        valorViagem: null,
        valorMensal: 200,
        ativa: true,
        observacoes: "",
      });
    });
    expect(await within(guia).findByText(/2 de 6 feitos/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Primeiros passos" })).toBeInTheDocument();

    act(() => {
      store.salvarPassageiro({
        nome: "Ana",
        telefone: "(43) 99999-0001",
        endereco: "Rua A",
        cidade: "Londrina",
        linhaIds: [],
        formaPagamento: "mensal",
        valor: 200,
        emAberto: 0,
        ativo: true,
        numero: "",
        bairro: "",
        referencia: "",
        vencimento: "5",
        emergenciaNome: "",
        emergenciaTelefone: "",
        observacoes: "",
        convite: "nao_enviado",
        ultimoPagamento: "",
      });
    });
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Primeiros passos" })).toBeNull(),
    );
  });

  it("'Esconder este guia' esconde e o app lembra", async () => {
    const { store } = await abrir("/vanzeiro", "vazia-configurada");
    await screen.findByRole("region", { name: "Primeiros passos" });
    fireEvent.click(screen.getByRole("button", { name: "Esconder este guia" }));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Primeiros passos" })).toBeNull(),
    );
    expect(store.obterEstado().alertasDispensados["primeiros-passos"]).toBeDefined();
  });

  it("os passos levam às telas de cadastro", async () => {
    const { router } = await abrir("/vanzeiro", "vazia-configurada");
    const guia = await screen.findByRole("region", { name: "Primeiros passos" });
    fireEvent.click(within(guia).getByRole("link", { name: /Cadastre sua van/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro/vans"));
  });

  it("quem tem os dados de exemplo (já completos) não vê o guia", async () => {
    await abrir("/vanzeiro", "exemplo");
    await screen.findByRole("heading", { level: 1, name: /João/ });
    expect(screen.queryByRole("region", { name: "Primeiros passos" })).toBeNull();
  });
});

describe("perfil do vanzeiro", () => {
  it("editar os próprios dados atualiza o cabeçalho e o motorista próprio", async () => {
    const { store } = await abrir("/vanzeiro/perfil", "vazia-configurada");
    const form = await screen.findByRole("form", { name: "Seus dados" });
    fireEvent.change(within(form).getAllByRole("textbox")[0]!, {
      target: { value: "Maria Souza Lima" },
    });
    fireEvent.change(within(form).getAllByRole("textbox")[2]!, { target: { value: "Cambé" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar meus dados" }));
    await waitFor(() => expect(store.obterEstado().perfil.nome).toBe("Maria Souza Lima"));
    expect(store.obterEstado().perfil.cidade).toBe("Cambé");
    expect(store.obterEstado().motoristas.find((m) => m.proprio)?.nome).toBe("Maria Souza Lima");
    expect(await screen.findByText("Vanzeiro · Cambé - PR")).toBeInTheDocument();
  });

  it("não deixa salvar o nome em branco", async () => {
    const { store } = await abrir("/vanzeiro/perfil", "vazia-configurada");
    const form = await screen.findByRole("form", { name: "Seus dados" });
    fireEvent.change(within(form).getAllByRole("textbox")[0]!, { target: { value: "" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar meus dados" }));
    expect(await within(form).findByText("Escreva seu nome.")).toBeInTheDocument();
    expect(store.obterEstado().perfil.nome).toBe("Maria Souza");
  });
});

describe("começar do zero", () => {
  it("pede confirmação, apaga tudo, leva às boas-vindas e dá para desfazer", async () => {
    const { router, store } = await abrir("/vanzeiro/perfil", "exemplo");
    await screen.findByRole("navigation");
    fireEvent.click(await screen.findByRole("button", { name: "Começar do zero" }));
    expect(screen.getByText(/apaga todos os passageiros/)).toBeInTheDocument();
    expect(store.obterEstado().passageiros).toHaveLength(22);

    fireEvent.click(screen.getByRole("button", { name: "Sim, apagar tudo e começar do zero" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/boas-vindas"));
    expect(store.obterEstado().passageiros).toEqual([]);
    expect(store.obterEstado().perfil.configurado).toBe(false);

    expect(await screen.findByText(/Dá para desfazer a última substituição/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Desfazer e voltar aos dados de antes/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro"));
    expect(store.obterEstado().passageiros).toHaveLength(22);
    expect(store.obterEstado().perfil.nome).toBe("João Batista");
  });

  it("cancelar não apaga nada", async () => {
    const { store } = await abrir("/vanzeiro/perfil", "exemplo");
    await screen.findByRole("navigation");
    fireEvent.click(await screen.findByRole("button", { name: "Começar do zero" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(store.obterEstado().passageiros).toHaveLength(22);
    expect(screen.getByRole("button", { name: "Começar do zero" })).toBeInTheDocument();
  });
});
