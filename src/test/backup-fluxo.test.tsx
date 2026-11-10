import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

/** Arquivos "baixados" pela tela durante o teste (nome e conteúdo). */
const baixados: { nome: string; arquivo: File }[] = [];

async function abrir(caminho = "/vanzeiro/perfil") {
  vi.resetModules();
  await semearExemploNoAparelho();
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
  // O app só mostra o menu depois de carregar os dados salvos: espere isso antes de mexer nos dados.
  if (caminho.startsWith("/vanzeiro")) await screen.findByRole("navigation");
  return { router, store, backup };
}

const lerTexto = (f: File) =>
  new Promise<string>((ok) => {
    const l = new FileReader();
    l.onload = () => ok(String(l.result));
    l.readAsText(f);
  });

async function salvarEPegarArquivo() {
  const antes = baixados.length;
  fireEvent.click(await screen.findByRole("button", { name: /Salvar backup/ }));
  await waitFor(() => expect(baixados.length).toBe(antes + 1));
  return baixados.at(-1)!;
}

function escolherArquivo(texto: string, nome = "backup.json") {
  const entrada = screen.getByLabelText("Escolher arquivo de backup") as HTMLInputElement;
  const arquivo = new File([texto], nome, { type: "application/json" });
  fireEvent.change(entrada, { target: { files: [arquivo] } });
}

beforeEach(() => {
  baixados.length = 0;
  const urls = new Map<string, File>();
  let n = 0;
  vi.stubGlobal("open", vi.fn());
  URL.createObjectURL = vi.fn((f: Blob) => {
    const u = `blob:teste-${++n}`;
    urls.set(u, f as File);
    return u;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    baixados.push({ nome: this.download, arquivo: urls.get(this.href)! });
  });
});
afterEach(() => {
  Reflect.deleteProperty(navigator, "canShare");
  Reflect.deleteProperty(navigator, "share");
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("backup pela tela", () => {
  it("salvar baixa um arquivo válido com a data no nome e registra o último backup", async () => {
    const { backup } = await abrir();
    expect(await screen.findByText("Você ainda não fez backup.")).toBeInTheDocument();
    const { nome, arquivo } = await salvarEPegarArquivo();
    expect(nome).toMatch(/^vanzeiro-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const r = backup.validarBackup(await lerTexto(arquivo));
    expect(r.ok).toBe(true);
    expect(await screen.findByText(/Último backup: /)).toBeInTheDocument();
    expect(screen.queryByText("Você ainda não fez backup.")).toBeNull();
  });

  it("'Só baixar o arquivo' também funciona", async () => {
    await abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Só baixar o arquivo" }));
    await waitFor(() => expect(baixados).toHaveLength(1));
  });

  it("com o compartilhar do celular, usa ele em vez de baixar; cancelar não conta como backup", async () => {
    await abrir();
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" }));
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    fireEvent.click(await screen.findByRole("button", { name: /Salvar backup/ }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(share.mock.calls[0]![0].files[0].name).toMatch(/^vanzeiro-backup-/);
    expect(baixados).toHaveLength(0);
    expect(screen.getByText("Você ainda não fez backup.")).toBeInTheDocument();
  });

  it("restaurar: mostra a prévia (no backup × agora), troca os dados e dá para desfazer", async () => {
    const { store } = await abrir();
    act(() => store.salvarChavePix("chave-A"));
    const { arquivo } = await salvarEPegarArquivo();
    const texto = await lerTexto(arquivo);

    act(() => {
      store.salvarChavePix("chave-B");
      store.excluirPassageiro("p3");
    });
    expect(store.obterEstado().passageiros).toHaveLength(21);

    escolherArquivo(texto);
    await screen.findByText("Restaurar este backup?");
    const tabela = screen.getByRole("table");
    const linha = within(tabela).getByText("passageiros").closest("tr")!;
    const celulas = within(linha).getAllByRole("cell");
    expect(celulas[0]).toHaveTextContent("22"); // no backup
    expect(celulas[1]).toHaveTextContent("21"); // agora neste aparelho
    expect(within(tabela).getByRole("columnheader", { name: "No backup" })).toBeInTheDocument();
    expect(within(tabela).getByRole("columnheader", { name: "Agora" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sim, restaurar" }));
    await waitFor(() => expect(store.obterEstado().chavePix).toBe("chave-A"));
    expect(store.obterEstado().passageiros).toHaveLength(22);
    expect(screen.queryByText("Restaurar este backup?")).toBeNull();

    fireEvent.click(
      await screen.findByRole("button", { name: /Desfazer e voltar aos dados de antes/ }),
    );
    await waitFor(() => expect(store.obterEstado().chavePix).toBe("chave-B"));
    expect(store.obterEstado().passageiros).toHaveLength(21);
    expect(screen.queryByText(/Dá para desfazer a última substituição/)).toBeNull();
  });

  it("cancelar a prévia não muda nada", async () => {
    const { store } = await abrir();
    const { arquivo } = await salvarEPegarArquivo();
    act(() => store.salvarChavePix("mudou"));
    escolherArquivo(await lerTexto(arquivo));
    await screen.findByText("Restaurar este backup?");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(store.obterEstado().chavePix).toBe("mudou");
    expect(screen.queryByText(/Dá para desfazer a última substituição/)).toBeNull();
  });

  it("arquivo que não é backup mostra o erro e não troca nada", async () => {
    const { store } = await abrir();
    await screen.findByRole("button", { name: /Salvar backup/ });
    escolherArquivo("isto não é um backup");
    expect((await screen.findByRole("alert")).textContent).toMatch(/não é um backup do O Vanzeiro/);
    expect(screen.queryByText("Restaurar este backup?")).toBeNull();
    expect(store.obterEstado().passageiros).toHaveLength(22);
  });

  it("arquivo alterado à mão é recusado", async () => {
    await abrir();
    const { arquivo } = await salvarEPegarArquivo();
    const b = JSON.parse(await lerTexto(arquivo)) as { dados: { passageiros: { nome: string }[] } };
    b.dados.passageiros[0]!.nome = "Mexido";
    escolherArquivo(JSON.stringify(b));
    expect((await screen.findByRole("alert")).textContent).toMatch(/alterado ou está corrompido/);
  });

  it("depois de um erro, escolher um arquivo bom limpa o aviso", async () => {
    await abrir();
    const { arquivo } = await salvarEPegarArquivo();
    const bom = await lerTexto(arquivo);
    escolherArquivo("lixo");
    await screen.findByRole("alert");
    escolherArquivo(bom);
    await screen.findByText("Restaurar este backup?");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("'Restaurar dados de exemplo' guarda uma cópia e dá para desfazer", async () => {
    const { store } = await abrir();
    act(() => store.salvarChavePix("minha-chave"));
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar dados de exemplo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sim, restaurar exemplo" }));
    await waitFor(() => expect(store.obterEstado().chavePix).toBe(""));
    fireEvent.click(
      await screen.findByRole("button", { name: /Desfazer e voltar aos dados de antes/ }),
    );
    await waitFor(() => expect(store.obterEstado().chavePix).toBe("minha-chave"));
  });
});

describe("alerta de backup no início", () => {
  it("aparece depois de muitas alterações, leva ao perfil e some depois do backup", async () => {
    const { store, router } = await abrir("/vanzeiro");
    await screen.findByRole("region", { name: "Alertas" });
    expect(screen.queryByText("Faça um backup dos seus dados")).toBeNull();

    act(() => {
      for (let i = 0; i < 15; i++) store.salvarChavePix(`chave-${i}`);
    });
    // Com os dados de exemplo há vários alertas: os menos urgentes ficam atrás de "Ver mais".
    fireEvent.click(await screen.findByRole("button", { name: /Ver mais \d+ alertas?/ }));
    expect(await screen.findByText("Faça um backup dos seus dados")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Fazer backup" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro/perfil"));
    await salvarEPegarArquivo();
    await act(async () => {
      await router.navigate({ to: "/vanzeiro" });
    });
    await screen.findByRole("region", { name: "Alertas" });
    expect(screen.queryByText("Faça um backup dos seus dados")).toBeNull();
  });
});

describe("alertas do início: lista curta", () => {
  it("mostra poucos alertas, com os urgentes sempre à vista, e abre o resto em 'Ver mais'", async () => {
    await abrir("/vanzeiro");
    const regiao = await screen.findByRole("region", { name: "Alertas" });
    const antes = within(regiao).getAllByRole("listitem").length;
    expect(antes).toBeLessThan(6);
    const botao = within(regiao).getByRole("button", { name: /Ver mais (\d+) alertas?/ });
    const escondidos = Number(/(\d+)/.exec(botao.textContent ?? "")![1]);
    fireEvent.click(botao);
    expect(within(regiao).getAllByRole("listitem").length).toBe(antes + escondidos);
    expect(within(regiao).queryByRole("button", { name: /Ver mais/ })).toBeNull();
  });
});
