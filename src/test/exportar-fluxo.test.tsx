import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

const baixados: { nome: string; arquivo: File }[] = [];

async function abrir() {
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
    history: createMemoryHistory({ initialEntries: ["/vanzeiro/relatorios"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("navigation");
  return { router, store };
}

const lerTexto = (f: File) =>
  new Promise<string>((ok) => {
    const l = new FileReader();
    l.onload = () => ok(String(l.result));
    l.readAsText(f);
  });

const primeirosBytes = (f: File) =>
  new Promise<number[]>((ok) => {
    const l = new FileReader();
    l.onload = () => ok(Array.from(new Uint8Array(l.result as ArrayBuffer).slice(0, 3)));
    l.readAsArrayBuffer(f);
  });

const baixar = async (rotulo: RegExp) => {
  const antes = baixados.length;
  fireEvent.click(await screen.findByRole("button", { name: rotulo }));
  await waitFor(() => expect(baixados.length).toBe(antes + 1));
  const { nome, arquivo } = baixados.at(-1)!;
  return { nome, texto: await lerTexto(arquivo), arquivo };
};

beforeEach(() => {
  baixados.length = 0;
  const urls = new Map<string, File>();
  let n = 0;
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
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("exportar relatórios pela tela", () => {
  it("o cartão Exportar tem as três planilhas e o botão de imprimir/PDF", async () => {
    await abrir();
    const cartao = await screen.findByRole("region", { name: "Exportar" });
    expect(cartao).toHaveTextContent("Planilha de recebimentos");
    expect(cartao).toHaveTextContent("Planilha de gastos");
    expect(cartao).toHaveTextContent("Planilha do resumo");
    expect(cartao).toHaveTextContent("Imprimir ou salvar em PDF");
  });

  it("planilha de recebimentos: baixa um CSV com o período no nome, cabeçalho e total que bate com a tela", async () => {
    const { store } = await abrir();
    const { nome, texto, arquivo } = await baixar(/Planilha de recebimentos/);
    expect(nome).toMatch(/^vanzeiro-recebimentos-\d{4}-\d{2}-01_a_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(await primeirosBytes(arquivo)).toEqual([0xef, 0xbb, 0xbf]); // BOM UTF-8: o Excel lê os acentos certo
    const linhas = texto.trim().split("\r\n");
    expect(linhas[0]).toBe("Data;Passageiro;Referência;Forma;Valor (R$);Recibo nº;Linha;Van");
    expect(linhas.length).toBeGreaterThan(2);
    const total = Number(linhas.at(-1)!.split(";")[4]!.replace(",", "."));
    const { relatorioPeriodo, periodoPreset } = await import("@/data/relatorios");
    const e = store.obterEstado();
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const rel = relatorioPeriodo(
      {
        cobrancas: e.cobrancas,
        gastos: e.gastos,
        linhas: e.linhas,
        vans: e.vans,
        linhaDoPassageiro: (pid) => e.passageiros.find((p) => p.id === pid)?.linhaIds[0] ?? "",
      },
      periodoPreset("mes", iso),
    );
    expect(total).toBeCloseTo(rel.recebido, 2);
  });

  it("planilha de gastos e do resumo", async () => {
    await abrir();
    const gastos = await baixar(/Planilha de gastos/);
    expect(gastos.nome).toMatch(/^vanzeiro-gastos-/);
    expect(gastos.texto).toContain(
      "Data;Categoria;Descrição;Van;Linha;Litros;Km;Valor (R$);Repete todo mês",
    );
    const resumo = await baixar(/Planilha do resumo/);
    expect(resumo.nome).toMatch(/^vanzeiro-resumo-/);
    expect(resumo.texto).toContain("Resumo do período;");
    expect(resumo.texto).toContain("Recebido (R$);");
    expect(resumo.texto).toContain("Por van");
    expect(resumo.texto).toContain("Por linha");
    expect(resumo.texto).toContain("Vanzeiro;João Batista");
  });

  it("o período escolhido vale para a planilha (3 meses → arquivo com o período de 3 meses)", async () => {
    await abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Últimos 3 meses" }));
    const { nome } = await baixar(/Planilha de recebimentos/);
    const [, de, ate] = nome.match(/recebimentos-(\d{4}-\d{2}-\d{2})_a_(\d{4}-\d{2}-\d{2})/)!;
    const meses =
      Number(ate!.slice(0, 4)) * 12 +
      Number(ate!.slice(5, 7)) -
      (Number(de!.slice(0, 4)) * 12 + Number(de!.slice(5, 7)));
    expect(meses).toBe(2);
  });

  it("período inválido: some o relatório e as planilhas não podem ser baixadas", async () => {
    await abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Outro período" }));
    const [de, ate] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
    fireEvent.change(de!, { target: { value: "2026-11-20" } });
    fireEvent.change(ate!, { target: { value: "2026-11-01" } });
    expect(await screen.findByText(/início antes do fim/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Exportar" })).toBeNull();
  });

  it("com o compartilhar do celular, usa ele e cancelar não baixa nada", async () => {
    await abrir();
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" }));
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    fireEvent.click(await screen.findByRole("button", { name: /Planilha de gastos/ }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(share.mock.calls[0]![0].files[0].name).toMatch(/^vanzeiro-gastos-.*\.csv$/);
    expect(share.mock.calls[0]![0].files[0].type).toMatch(/text\/csv/);
    expect(baixados).toHaveLength(0);
    Reflect.deleteProperty(navigator, "canShare");
    Reflect.deleteProperty(navigator, "share");
  });

  it("Imprimir chama a impressão do navegador", async () => {
    await abrir();
    const imprimir = vi.fn();
    vi.stubGlobal("print", imprimir);
    fireEvent.click(await screen.findByRole("button", { name: /Imprimir ou salvar em PDF/ }));
    expect(imprimir).toHaveBeenCalledOnce();
  });

  it("o cabeçalho de impressão traz o nome do vanzeiro e o período", async () => {
    await abrir();
    expect(await screen.findByText("O Vanzeiro — Relatório")).toBeInTheDocument();
    expect(screen.getAllByText(/João Batista/).length).toBeGreaterThan(0);
  });
});
