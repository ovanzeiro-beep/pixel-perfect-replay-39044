import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { montarViagens } from "@/data/viagens";
import { semearExemploNoAparelho } from "./apoio";

/** Monta o app inteiro (rotas reais) começando em `caminho`, com dados limpos de exemplo. */
async function abrir(
  caminho: string,
  entrarComo?: string | ((store: typeof import("@/data/store")) => string),
) {
  vi.resetModules();
  await semearExemploNoAparelho();
  const { routeTree } = await import("@/routeTree.gen");
  // O "casco" <html> da raiz só vale no servidor; dentro do jsdom ele impede qualquer tela de aparecer.
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  const store = await import("@/data/store");
  const id = typeof entrarComo === "function" ? entrarComo(store) : entrarComo;
  if (id) sessao.entrarComoPassageiro(id);
  // Preparações feitas na memória precisam estar salvas no aparelho: o app carrega os dados salvos ao abrir.
  if (typeof entrarComo === "function") {
    const { gravar } = await import("@/data/persistencia");
    gravar(localStorage, store.obterEstado());
  }
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [caminho] }),
  });
  render(<RouterProvider router={router} />);
  return { router, sessao, store };
}

beforeEach(() => {
  vi.stubGlobal("open", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("passageiro: pagamentos e recibos", () => {
  it("vê os próprios recibos e abre um para compartilhar ou copiar", async () => {
    const { store } = await abrir("/passageiro/pagamentos", "p1");
    await screen.findByRole("heading", { name: "Pagamentos" });
    const meus = store.obterEstado().recibos.filter((r) => r.pid === "p1");
    expect(meus.length).toBeGreaterThan(0);
    const secao = await screen.findByRole("region", { name: "Meus recibos" });
    expect(within(secao).getAllByText(/^Recibo nº/)).toHaveLength(meus.length);

    fireEvent.click(within(secao).getAllByText(/^Recibo nº/)[0]!);
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(/RECIBO Nº \d{4}/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/Recebi de Maria Aparecida Lima/)).toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: /Compartilhar/ })).toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: /Copiar/ })).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("só aparecem recibos dele, nunca de outro passageiro", async () => {
    const { store } = await abrir("/passageiro/pagamentos", "p2");
    const secao = await screen.findByRole("region", { name: "Meus recibos" });
    const meus = store.obterEstado().recibos.filter((r) => r.pid === "p2");
    const todos = store.obterEstado().recibos.length;
    expect(meus.length).toBeLessThan(todos);
    expect(within(secao).getAllByText(/^Recibo nº/)).toHaveLength(meus.length);
  });

  it("devendo: mostra o aviso de atraso e o total em aberto", async () => {
    const { store } = await abrir("/passageiro/pagamentos", "p3");
    await screen.findByRole("heading", { name: "Pagamentos" });
    const deve = store.obterEstado().passageiros.find((p) => p.id === "p3")!.emAberto;
    expect(deve).toBeGreaterThan(0);
    const avisos = await screen.findByRole("region", { name: "Avisos" });
    expect(within(avisos).getByText(/Pagamento atrasado há \d+ dias?/)).toBeInTheDocument();
    expect(screen.getByText("Total em aberto")).toBeInTheDocument();
  });

  it("passageiro novo, sem pagamentos: explica quando o recibo aparece", async () => {
    const { store } = await abrir("/passageiro/pagamentos", (st) =>
      st.salvarPassageiro({
        nome: "Novo Passageiro",
        telefone: "(43) 99999-0001",
        endereco: "Rua A",
        cidade: "Jacarezinho",
        linhaIds: ["l1"],
        formaPagamento: "por_viagem",
        valor: 150,
        emAberto: 0,
        ativo: true,
        numero: "",
        bairro: "",
        referencia: "",
        vencimento: "",
        emergenciaNome: "",
        emergenciaTelefone: "",
        observacoes: "",
        convite: "no_app",
        ultimoPagamento: "",
      }),
    );
    await screen.findByRole("heading", { name: "Pagamentos" });
    expect(store.obterEstado().recibos.some((r) => r.pid.startsWith("p") && r.pid.length > 3)).toBe(
      false,
    );
    expect(await screen.findByText(/o recibo aparece aqui/)).toBeInTheDocument();
    expect(screen.getByText("Em dia!")).toBeInTheDocument();
  });
});

describe("passageiro: confirmar presença", () => {
  it("responder 'Vou' grava a resposta na viagem e muda a tela", async () => {
    vi.resetModules();
    localStorage.clear();
    const { montarViagens } = await import("@/data/viagens");
    const store0 = await import("@/data/store");
    const e = store0.obterEstado();
    const proximaSem = (pid: string) =>
      montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, new Date()).filter(
        (v) => v.passageiroIds.includes(pid) && !v.passada && !v.ajuste.cancelada,
      )[0];
    const quem = e.passageiros.find(
      (p) =>
        p.ativo &&
        (proximaSem(p.id)?.ajuste.respostas[p.id] ?? "sem") === "sem" &&
        proximaSem(p.id)!.lugares > proximaSem(p.id)!.vao.length,
    );
    expect(quem).toBeDefined();
    const pid = quem!.id;
    const alvo = proximaSem(pid)!;

    const { store } = await abrir("/passageiro/viagens", pid);
    await screen.findByRole("heading", { name: "Minhas viagens" });
    expect(
      (await screen.findAllByText(/Confirmações até|Prazo de confirmação encerrado/)).length,
    ).toBeGreaterThan(0);
    const botoes = await screen.findAllByRole("button", { name: /Vou$/ });
    fireEvent.click(botoes[0]!);

    await waitFor(() => expect(store.obterEstado().ajustes[alvo.id]?.respostas[pid]).toBe("vai"));
    expect(await screen.findAllByText("Confirmado")).not.toHaveLength(0);
  });

  it("em 'Minhas viagens' mostra o prazo e o horário na parada", async () => {
    const { store } = await abrir("/passageiro/viagens", "p2");
    await screen.findByRole("heading", { name: "Minhas viagens" });
    const p2 = store.obterEstado().passageiros.find((p) => p.id === "p2")!;
    expect(p2.cidade).toBe("Cambará");
    expect(await screen.findAllByText(/Na sua parada: ~\d\d:\d\d/)).not.toHaveLength(0);
  });
});

describe("convite pelo link", () => {
  it("convite enviado: abre a tela do convite, confirma os dados e entra no app", async () => {
    const { router, store, sessao } = await abrir("/convite/p3");
    await screen.findByText(/convidou você para a van dele/);
    expect(router.state.location.pathname).toBe("/passageiro/convite");
    expect(sessao.sessaoAtual()).toEqual({ papel: "passageiro", passageiroId: "p3" });
    expect(store.obterEstado().passageiros.find((p) => p.id === "p3")!.convite).toBe("enviado");

    fireEvent.click(screen.getByRole("button", { name: /Entrar com Google/ }));
    await screen.findByText("Confirme seus dados");
    expect(screen.getByText("Rosângela Ferreira")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sim, sou eu/ }));

    await screen.findByText("Bem-vindo(a)!");
    expect(store.obterEstado().passageiros.find((p) => p.id === "p3")!.convite).toBe("no_app");
  });

  it("quem já aceitou vai direto para o app", async () => {
    const { router } = await abrir("/convite/p1");
    await waitFor(() => expect(router.state.location.pathname).toBe("/passageiro"));
    await screen.findByText(/Olá, Maria/);
  });

  it("convite não enviado ou passageiro inexistente: tela de convite não encontrado e sem sessão", async () => {
    for (const id of ["p4", "nao-existe"]) {
      const { sessao } = await abrir(`/convite/${id}`);
      await screen.findByText("Convite não encontrado");
      expect(sessao.sessaoAtual()).toBeNull();
      cleanup();
    }
  });

  it("passageiro desativado não entra pelo convite", async () => {
    const { sessao } = await abrir("/convite/p3", (st) => {
      st.desativarPassageiro("p3");
      return "";
    });
    await screen.findByText("Convite não encontrado");
    expect(sessao.sessaoAtual()).toBeNull();
  });

  it("a tela de convite não mostra aviso técnico de banco de dados", async () => {
    await abrir("/convite/p3");
    await screen.findByText(/convidou você/);
    expect(screen.queryByText(/banco de dados/i)).toBeNull();
    expect(screen.getByText(/o login ainda é simulado/)).toBeInTheDocument();
  });
});

describe("passageiro: acesso", () => {
  it("não entra na área do vanzeiro", async () => {
    const { router } = await abrir("/vanzeiro/dinheiro", "p1");
    await waitFor(() => expect(router.state.location.pathname).toBe("/passageiro"));
  });
  it("sem sessão, volta para o login", async () => {
    const { router } = await abrir("/passageiro/pagamentos");
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });
});

describe("passageiro: telas sem repetição e Pix", () => {
  it("sem chave Pix no início: não oferece copiar (nem copia texto de aviso) e orienta", async () => {
    const copiar = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: copiar },
      configurable: true,
    });
    await abrir("/passageiro", "p1");
    expect(await screen.findByText(/ainda não informou a chave Pix/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar chave Pix" })).toBeNull();
    expect(copiar).not.toHaveBeenCalled();
  });

  it("com chave Pix no início: copia a chave de verdade", async () => {
    const copiar = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: copiar },
      configurable: true,
    });
    const { store } = await abrir("/passageiro", "p1");
    await screen.findByRole("navigation");
    const { act } = await import("@testing-library/react");
    act(() => store.salvarChavePix("chave-do-joao"));
    fireEvent.click(await screen.findByRole("button", { name: "Copiar chave Pix" }));
    expect(copiar).toHaveBeenCalledWith("chave-do-joao");
  });

  it("em 'Pagamentos' não mostra avisos de viagem; em 'Minhas viagens' também não repete os avisos", async () => {
    await abrir("/passageiro/pagamentos", "p4");
    await screen.findByRole("navigation");
    expect(screen.queryByText(/Responda a viagem/)).toBeNull();
    cleanup();
    await abrir("/passageiro/viagens", "p4");
    await screen.findByRole("navigation");
    expect(screen.queryByRole("region", { name: "Avisos" })).toBeNull();
  });
});

describe("passageiro: depois do prazo", () => {
  it("sem os botões Vou / Não vou: explica e oferece falar com o vanzeiro", async () => {
    const meioDia = new Date();
    meioDia.setHours(12, 0, 0, 0);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(meioDia);
    try {
      // Um passageiro com viagem hoje à tarde/noite: o prazo era ontem às 20h.
      await abrir("/passageiro/viagens", (store) => {
        const e = store.obterEstado();
        const v = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, new Date()).find(
          (x) => !x.passada && !x.ajuste.cancelada && x.passageiroIds.length > 0,
        )!;
        return v.passageiroIds[0]!;
      });
      await screen.findByRole("navigation");
      expect((await screen.findAllByText("O prazo para responder acabou.")).length).toBeGreaterThan(
        0,
      );
      const cartao = screen
        .getAllByText("O prazo para responder acabou.")[0]!
        .closest("div.rounded-2xl")!;
      expect(within(cartao as HTMLElement).queryByRole("button", { name: /^Vou$/ })).toBeNull();
      expect(screen.getAllByRole("link", { name: /Falar com o vanzeiro/ })[0]).toHaveAttribute(
        "href",
        expect.stringContaining("wa.me/55"),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
