import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { crc16 } from "@/lib/pix";
import { semearExemploNoAparelho } from "./apoio";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function abrir(
  caminho: string,
  papel: "vanzeiro" | "passageiro",
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
const digitarPix = async (v: string) => {
  await act(async () => {
    fireEvent.change(await screen.findByLabelText(/Chave Pix/), { target: { value: v } });
  });
};
const devedor = (e: import("@/data/tipos").Estado) => e.passageiros.find((p) => p.emAberto > 0)!.id;

describe("configurar a chave Pix", () => {
  it("reconhece o tipo, mostra como vai ser guardada e guarda do jeito que o Pix exige", async () => {
    const { estado } = await abrir("/vanzeiro/perfil", "vanzeiro");
    await digitarPix("(43) 99999-0001");
    expect(
      await screen.findByText(/Reconhecida como celular\. Vai ser guardada como \+5543999990001/),
    ).toBeInTheDocument();
    await clicar(/Salvar chave Pix/);
    await waitFor(() => expect(estado().chavePix).toBe("+5543999990001"));

    await digitarPix("123.456.789-09");
    expect(await screen.findByText(/Reconhecida como CPF/)).toBeInTheDocument();
    await clicar(/Salvar chave Pix/);
    await waitFor(() => expect(estado().chavePix).toBe("12345678909"));
  });

  it("número que serve como CPF e como celular: pergunta qual é, e só então guarda", async () => {
    const { estado } = await abrir("/vanzeiro/perfil", "vanzeiro");
    await digitarPix("43900000042");
    expect(await screen.findByText(/Esse número pode ser CPF ou celular/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Salvar chave Pix/ })).toBeNull();
    await clicar(/É celular/);
    await waitFor(() => expect(estado().chavePix).toBe("+5543900000042"));
  });

  it("formato desconhecido avisa, mas deixa salvar assim mesmo; vazio remove a chave", async () => {
    const { estado } = await abrir("/vanzeiro/perfil", "vanzeiro");
    await digitarPix("minha chave");
    expect(await screen.findByText(/Não reconheci esse formato/)).toBeInTheDocument();
    await clicar(/Salvar chave Pix/);
    await waitFor(() => expect(estado().chavePix).toBe("minha chave"));
    await digitarPix("");
    await clicar(/Salvar chave Pix/);
    await waitFor(() => expect(estado().chavePix).toBe(""));
  });
});

describe("passageiro: Pix com o valor", () => {
  const copiado = () => {
    const escrever = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: escrever },
      configurable: true,
    });
    return escrever;
  };

  it("em Pagamentos, copia o Pix já com o valor em aberto, com CRC certo", async () => {
    const escrever = copiado();
    const { store, estado } = await abrir("/passageiro/pagamentos", "passageiro", devedor);
    await act(async () => {
      store.salvarChavePix("+5543999990001");
    });
    const total = estado().passageiros.find((p) => p.emAberto > 0)!.emAberto;
    const botao = await screen.findByRole("button", { name: /Copiar Pix com o valor/ });
    expect(botao.textContent).toMatch(/R\$\s?\d/);
    await act(async () => {
      fireEvent.click(botao);
    });
    expect(escrever).toHaveBeenCalledTimes(1);
    const codigo = String((escrever.mock.calls[0] as unknown[])[0]);
    expect(codigo.startsWith("000201")).toBe(true);
    expect(codigo).toContain(
      "54" + String(total.toFixed(2)).length.toString().padStart(2, "0") + total.toFixed(2),
    );
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
    expect(codigo).toContain("+5543999990001");
  });

  it("sem chave, ou com chave que não dá para usar, só a chave é copiável (nada de código errado)", async () => {
    await abrir("/passageiro/pagamentos", "passageiro", devedor);
    expect(screen.queryByRole("button", { name: /Copiar Pix com o valor/ })).toBeNull();
  });

  it("chave em formato desconhecido: só copia a chave, sem o Pix com valor", async () => {
    const { store } = await abrir("/passageiro/pagamentos", "passageiro", devedor);
    await act(async () => {
      store.salvarChavePix("minha chave");
    });
    expect(await screen.findByRole("button", { name: /Copiar chave Pix/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copiar Pix com o valor/ })).toBeNull();
  });
});

describe("vanzeiro: cobrar leva o Pix copia e cola", () => {
  it("a mensagem de cobrança traz o código com o valor da dívida", async () => {
    const abrirJanela = vi.fn();
    vi.stubGlobal("open", abrirJanela);
    const { store } = await abrir("/vanzeiro/dinheiro", "vanzeiro");
    await act(async () => {
      store.salvarChavePix("12345678909");
    });
    await act(async () => {
      fireEvent.click((await screen.findAllByRole("button", { name: /^Cobrar$/ }))[0]!);
    });
    await waitFor(() => expect(abrirJanela).toHaveBeenCalled());
    const url = String(abrirJanela.mock.calls[0]![0]);
    const texto = decodeURIComponent(url.split("text=")[1]!);
    expect(texto).toContain("Pix copia e cola (já com o valor):");
    expect(texto).toMatch(/\n000201[^\n]+6304[0-9A-F]{4}$/);
  });
});
