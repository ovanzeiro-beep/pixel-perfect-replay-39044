import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

vi.setConfig({ testTimeout: 30_000 });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function abrir(
  caminho: string,
  papel: "vanzeiro" | "passageiro" = "vanzeiro",
  pid?: (e: import("@/data/tipos").Estado) => string,
) {
  vi.resetModules();
  await semearExemploNoAparelho();
  const { routeTree } = await import("@/routeTree.gen");
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  const store = await import("@/data/store");
  if (papel === "vanzeiro") sessao.entrarComoVanzeiro();
  else sessao.entrarComoPassageiro(pid!(store.obterEstado()));
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
const marcar = async (nome: RegExp | string) => {
  await act(async () => {
    fireEvent.click(await screen.findByRole("radio", { name: nome }));
  });
};

describe("tela Configurar cobrança", () => {
  it("abre pelo menu Mais", async () => {
    await abrir("/vanzeiro/mais");
    await act(async () => {
      fireEvent.click(await screen.findByRole("link", { name: /Configurar cobrança/ }));
    });
    expect(await screen.findByRole("heading", { name: "Configurar cobrança" })).toBeInTheDocument();
  });

  it("mostra o padrão, deixa mudar dias, texto e 'paga na hora', e guarda", async () => {
    const { estado } = await abrir("/vanzeiro/cobranca");
    expect(await screen.findByRole("radio", { name: "2 dias" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const texto = screen.getByLabelText("Texto da mensagem de cobrança") as HTMLTextAreaElement;
    expect(texto.value).toContain("Passando pra lembrar do valor em aberto");

    await marcar("5 dias");
    await act(async () => {
      fireEvent.change(texto, { target: { value: "Oi {nome}, são {valor} da van. Pix: {pix}" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: /Passageiro novo já paga na hora/ }));
    });
    await clicar(/Salvar configuração/);
    await waitFor(() => expect(estado().configCobranca).toBeDefined());
    expect(estado().configCobranca).toEqual({
      diasDeAviso: 5,
      textoCobranca: "Oi {nome}, são {valor} da van. Pix: {pix}",
      pagaNaHoraPadrao: true,
    });
  });

  it("o exemplo muda com o texto, e avisa quando falta o {valor}", async () => {
    await abrir("/vanzeiro/cobranca");
    const texto = (await screen.findByLabelText(
      "Texto da mensagem de cobrança",
    )) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(texto, { target: { value: "Oi {nome}!" } });
    });
    expect(screen.getByText("Oi Ana!")).toBeInTheDocument();
    expect(screen.getByText(/não diz quanto/)).toBeInTheDocument();
    await act(async () => {
      fireEvent.change(texto, { target: { value: "Oi {nome}, {valor}" } });
    });
    expect(screen.queryByText(/não diz quanto/)).toBeNull();
    expect(screen.getByText(/Oi Ana, R\$\s150,00/)).toBeInTheDocument();
  });

  it("os botões de marcador colocam o campo no texto; 'Voltar ao texto padrão' desfaz", async () => {
    await abrir("/vanzeiro/cobranca");
    const texto = (await screen.findByLabelText(
      "Texto da mensagem de cobrança",
    )) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(texto, { target: { value: "Olá" } });
    });
    await clicar("{referencia}");
    expect(texto.value).toBe("Olá {referencia}");
    await clicar(/Voltar ao texto padrão/);
    expect(texto.value).toContain("Passando pra lembrar");
  });

  it("texto igual ao padrão é guardado como 'padrão' (vazio), para acompanhar melhorias", async () => {
    const { estado } = await abrir("/vanzeiro/cobranca");
    await clicar(/Salvar configuração/);
    await waitFor(() => expect(estado().configCobranca).toBeDefined());
    expect(estado().configCobranca!.textoCobranca).toBe("");
  });
});

describe("a configuração vale de verdade", () => {
  it("dias de aviso: o passageiro é avisado mais cedo", async () => {
    const { store } = await abrir("/passageiro", "passageiro", (e) => e.passageiros[0]!.id);
    const eu = store.obterEstado().passageiros[0]!;
    const longe = new Date();
    longe.setDate(longe.getDate() + 4);
    const venc = longe.toISOString().slice(0, 10);
    await act(async () => {
      store.substituirTodosOsDados({
        ...store.obterEstado(),
        cobrancas: [
          ...store.obterEstado().cobrancas.filter((c) => c.pid !== eu.id),
          {
            id: "cob-longe",
            pid: eu.id,
            tipo: "mes",
            ref: "Nov",
            vencimento: venc,
            valor: 90,
            pagamentos: [],
          },
        ],
      });
    });
    expect(screen.queryByText(/Seu pagamento vence/)).toBeNull();
    await act(async () => {
      store.salvarConfigCobranca({ diasDeAviso: 5 });
    });
    expect(await screen.findByText(/Seu pagamento vence em 4 dias/)).toBeInTheDocument();
  });

  it("texto próprio: o Cobrar usa a mensagem do vanzeiro", async () => {
    const abrirJanela = vi.fn();
    vi.stubGlobal("open", abrirJanela);
    const { store } = await abrir("/vanzeiro/dinheiro");
    await act(async () => {
      store.salvarChavePix("12345678909");
      store.salvarConfigCobranca({ textoCobranca: "Fala {nome}! Faltam {valor}." });
    });
    await act(async () => {
      fireEvent.click((await screen.findAllByRole("button", { name: /^Cobrar$/ }))[0]!);
    });
    await waitFor(() => expect(abrirJanela).toHaveBeenCalled());
    const texto = decodeURIComponent(String(abrirJanela.mock.calls[0]![0]).split("text=")[1]!);
    expect(texto).toMatch(/^Fala \w+! Faltam R\$\s[\d.,]+\./);
  });

  it("'paga na hora' como padrão: o cadastro novo já vem ligado", async () => {
    const { store } = await abrir("/vanzeiro/passageiros");
    await act(async () => {
      store.salvarConfigCobranca({ pagaNaHoraPadrao: true });
    });
    await clicar(/Novo passageiro/);
    expect(await screen.findByRole("switch", { name: /Paga na hora da viagem/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("Cobrar todos os atrasados", () => {
  it("lista os atrasados, abre o WhatsApp de cada um e conta quem já foi avisado", async () => {
    const abrirJanela = vi.fn();
    vi.stubGlobal("open", abrirJanela);
    const { store, estado } = await abrir("/vanzeiro/dinheiro");
    await act(async () => {
      store.salvarChavePix("12345678909");
    });
    const botao = await screen.findByRole("button", {
      name: /Cobrar todos os atrasados \((\d+)\)/,
    });
    const n = Number(/\((\d+)\)/.exec(botao.textContent ?? "")![1]);
    expect(n).toBeGreaterThanOrEqual(2);
    await act(async () => {
      fireEvent.click(botao);
    });
    const painel = (await screen.findByText(/de \d+ avisados/)).closest("div")!.parentElement!;
    expect(within(painel).getByText(`0 de ${n} avisados`)).toBeInTheDocument();

    const cobrar = within(painel).getAllByRole("button", { name: /^Cobrar / });
    expect(cobrar).toHaveLength(n);
    await act(async () => {
      fireEvent.click(cobrar[0]!);
    });
    expect(abrirJanela).toHaveBeenCalledTimes(1);
    const url = String(abrirJanela.mock.calls[0]![0]);
    const primeiro = estado().passageiros.find((p) =>
      cobrar[0]!.getAttribute("aria-label")?.includes(p.nome),
    )!;
    expect(url).toContain(`wa.me/55${primeiro.telefone.replace(/\D/g, "")}`);
    expect(within(painel).getByText(`1 de ${n} avisados`)).toBeInTheDocument();
    expect(
      within(painel).getByRole("button", { name: `Cobrar ${primeiro.nome} de novo` }),
    ).toHaveTextContent("Avisado ✓");
  });

  it("sem chave Pix cadastrada não abre WhatsApp nem marca ninguém como avisado", async () => {
    const abrirJanela = vi.fn();
    vi.stubGlobal("open", abrirJanela);
    await abrir("/vanzeiro/dinheiro");
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /Cobrar todos os atrasados/ }));
    });
    const painel = (await screen.findByText(/de \d+ avisados/)).closest("div")!.parentElement!;
    await act(async () => {
      fireEvent.click(within(painel).getAllByRole("button", { name: /^Cobrar / })[0]!);
    });
    expect(abrirJanela).not.toHaveBeenCalled();
    expect(within(painel).getByText(/^0 de \d+ avisados/)).toBeInTheDocument();
  });
});
