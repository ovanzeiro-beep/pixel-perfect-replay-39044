import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { semearExemploNoAparelho } from "./apoio";

type Papel = "vanzeiro" | "passageiro";

/** Quem pode abrir cada rota. Rota nova que não estiver aqui faz o teste falhar de propósito. */
const ACESSO: Record<string, "publica" | Papel> = {
  "/": "publica",
  "/perfil": "publica",
  "/boas-vindas": "vanzeiro",
  "/convite/$passageiroId": "publica",
  "/vanzeiro": "vanzeiro",
  "/vanzeiro/": "vanzeiro",
  "/vanzeiro/dinheiro": "vanzeiro",
  "/vanzeiro/gastos": "vanzeiro",
  "/vanzeiro/historico": "vanzeiro",
  "/vanzeiro/linhas": "vanzeiro",
  "/vanzeiro/mais": "vanzeiro",
  "/vanzeiro/motoristas": "vanzeiro",
  "/vanzeiro/passageiros": "vanzeiro",
  "/vanzeiro/perfil": "vanzeiro",
  "/vanzeiro/relatorios": "vanzeiro",
  "/vanzeiro/vans": "vanzeiro",
  "/vanzeiro/viagens": "vanzeiro",
  "/ida/$viagemId": "vanzeiro",
  "/vanzeiro/ajuda": "vanzeiro",
  "/passageiro": "passageiro",
  "/passageiro/ajuda": "passageiro",
  "/passageiro/": "passageiro",
  "/passageiro/convite": "passageiro",
  "/passageiro/pagamentos": "passageiro",
  "/passageiro/perfil": "passageiro",
  "/passageiro/viagens": "passageiro",
};

// Quem já aceitou o convite (como a passageira de teste) é levado direto para o início em vez de ver a tela do convite.
const DESTINO_FINAL: Record<string, string> = {
  "/passageiro/convite": "/passageiro",
  // Quem já preencheu o perfil (como o vanzeiro de exemplo) não volta para as boas-vindas.
  "/boas-vindas": "/vanzeiro",
};

const real = (rota: string) =>
  rota.replace("$viagemId", "l1_2026-11-13").replace("$passageiroId", "p1").replace(/\/$/, "") ||
  "/";
const casa = (rota: string) => (ACESSO[rota] === "publica" ? "/" : `/${rota.split("/")[1]}`);

async function montar(caminho: string, papel?: Papel) {
  vi.resetModules();
  await semearExemploNoAparelho();
  const { routeTree } = await import("@/routeTree.gen");
  (routeTree.options as { shellComponent?: unknown }).shellComponent = undefined;
  const sessao = await import("@/data/sessao");
  if (papel === "vanzeiro") sessao.entrarComoVanzeiro();
  if (papel === "passageiro") sessao.entrarComoPassageiro("p1");
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [caminho] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("todas as rotas do app", () => {
  it("toda rota do app está classificada (pública, vanzeiro ou passageiro)", async () => {
    const { routeTree } = await import("@/routeTree.gen");
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const rotas = Object.keys(router.routesByPath).sort();
    const semClasse = rotas.filter((r) => !(r in ACESSO));
    expect(
      semClasse,
      `Classifique a(s) rota(s) nova(s) em ACESSO: ${semClasse.join(", ")}`,
    ).toEqual([]);
    const sumidas = Object.keys(ACESSO).filter(
      (r) => !rotas.includes(r) && !rotas.includes(r.replace(/\/$/, "")),
    );
    expect(sumidas).toEqual([]);
  });

  it("toda rota existente resolve para uma tela (nenhuma cai no 404)", async () => {
    const { routeTree } = await import("@/routeTree.gen");
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const rota of Object.keys(ACESSO)) {
      const achadas = router.matchRoutes(real(rota));
      expect(achadas.at(-1)?.routeId, rota).not.toBe("__root__");
    }
  });

  it("toda tela tem título próprio (aba do navegador e compartilhamento)", () => {
    const layouts = new Set(["__root.tsx", "vanzeiro.tsx", "passageiro.tsx"]);
    const sem = readdirSync("src/routes")
      .filter((f) => f.endsWith(".tsx") && !layouts.has(f))
      .filter((f) => !/title:/.test(readFileSync(`src/routes/${f}`, "utf8")));
    expect(sem).toEqual([]);
  });
});

describe("controle de acesso de cada rota", () => {
  const protegidas = Object.entries(ACESSO).filter(([, a]) => a !== "publica") as [string, Papel][];

  it.each(protegidas)("sem entrar, %s manda para o login", async (rota) => {
    const router = await montar(real(rota));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });

  it.each(protegidas)("%s abre para o papel certo (%s)", async (rota, papel) => {
    const esperado = DESTINO_FINAL[rota] ?? real(rota);
    const router = await montar(real(rota), papel);
    await waitFor(() => expect(router.state.resolvedLocation?.pathname).toBe(esperado));
    expect(router.state.location.pathname).toBe(esperado);
  });

  it.each(protegidas)(
    "%s não abre para o outro papel: volta para a área dele",
    async (rota, papel) => {
      const outro: Papel = papel === "vanzeiro" ? "passageiro" : "vanzeiro";
      const router = await montar(real(rota), outro);
      await waitFor(() => expect(router.state.location.pathname).toBe(`/${outro}`));
    },
  );

  it("quem já entrou e abre o login vai direto para a própria área", async () => {
    const router = await montar("/", "vanzeiro");
    await waitFor(() => expect(router.state.location.pathname).toBe("/vanzeiro"));
    cleanup();
    const router2 = await montar("/", "passageiro");
    await waitFor(() => expect(router2.state.location.pathname).toBe("/passageiro"));
  });

  it("rotas públicas abrem sem entrar", async () => {
    for (const rota of ["/", "/perfil"]) {
      const router = await montar(rota);
      await waitFor(() => expect(router.state.resolvedLocation?.pathname).toBe(rota));
      cleanup();
    }
  });
});

describe("página não encontrada (404)", () => {
  it("endereço que não existe mostra a tela em português, com a marca e o caminho de volta", async () => {
    await montar("/isto-nao-existe");
    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("img", { name: "O Vanzeiro" })).toBeInTheDocument();
  });

  it("dentro das áreas também: tela não existente do vanzeiro", async () => {
    await montar("/vanzeiro/nao-existe", "vanzeiro");
    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" }),
    ).toBeInTheDocument();
  });

  it("sem nenhum texto em inglês nas telas de erro", async () => {
    await montar("/xyz");
    await screen.findByRole("heading", { name: "Página não encontrada" });
    expect(document.body.textContent).not.toMatch(
      /Page not found|Go home|Try again|didn't load|Something went wrong/i,
    );
  });
});

describe("página de erro do servidor", () => {
  it("é toda em português e tem os dois caminhos (tentar de novo e início)", async () => {
    const { renderErrorPage } = await import("@/lib/error-page");
    const html = renderErrorPage();
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("Não conseguimos abrir esta página");
    expect(html).toContain("Tentar de novo");
    expect(html).toContain('href="/"');
    expect(html).toContain("Ir para o início");
    expect(html).not.toMatch(/This page didn't load|Something went wrong|Try again|Go home/);
  });
});

describe("nenhum texto de interface em inglês sobrou", () => {
  it("telas, componentes e erros não usam frases-padrão em inglês", () => {
    const frases =
      /Page not found|Go home|Try again|didn't load|Something went wrong|Loading\.\.\./;
    const arquivos = [
      ...readdirSync("src/routes").map((f) => `src/routes/${f}`),
      ...readdirSync("src/components/app").map((f) => `src/components/app/${f}`),
      "src/lib/error-page.ts",
    ].filter((f) => /\.(tsx?|md)$/.test(f) && !f.endsWith("README.md"));
    const achados = arquivos.filter((f) => frases.test(readFileSync(f, "utf8")));
    expect(achados).toEqual([]);
  });
});
