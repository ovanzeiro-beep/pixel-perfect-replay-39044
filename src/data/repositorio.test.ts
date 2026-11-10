import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Repositorio } from "./repositorio";

/** Itens do store que NÃO fazem parte do contrato: ajudas internas e regras de domínio. */
const FORA_DO_CONTRATO = [
  "criarEstadoExemplo",
  "criarEstadoVazio",
  "ehEstado",
  "TIPOS_LINHA",
  "DIAS",
  "estaDevendo",
  // Só prepara dados (exemplo e testes). As telas usam as operações pequenas de viagem, que mexem só no que é delas.
  "ajustarViagem",
];

async function carregar() {
  localStorage.clear();
  vi.resetModules();
  const mock = await import("./store");
  const rep = await import("./repositorio");
  return { mock, ...rep };
}

describe("o contrato do repositório cobre tudo o que o mock faz", () => {
  it("toda função do store está no contrato (e nada além)", async () => {
    const { mock, repositorio } = await carregar();
    const doStore = Object.keys(mock)
      .filter((k) => !FORA_DO_CONTRATO.includes(k))
      .sort();
    expect(
      Object.keys(repositorio).sort(),
      "Operação nova no store? Coloque-a no contrato Repositorio.",
    ).toEqual(doStore);
  });

  it("leituras e ciclo de vida são do mock; cada escrita passa pelo mock e devolve Promise", async () => {
    const { mock, repositorio } = await carregar();
    const IMEDIATAS = [
      "useFrota",
      "useViagens",
      "useDadosProntos",
      "useVanzeiro",
      "usePassageiroVisao",
      "useConvite",
      "obterEstado",
      "iniciarPersistencia",
    ];
    for (const [nome, fn] of Object.entries(repositorio)) {
      const doMock = (mock as Record<string, unknown>)[nome];
      if (IMEDIATAS.includes(nome)) expect(fn, nome).toBe(doMock);
      else expect(fn, nome).not.toBe(doMock);
    }
    const promessa = repositorio.salvarChavePix("chave-do-teste");
    expect(promessa).toBeInstanceOf(Promise);
    expect(mock.obterEstado().chavePix).toBe("chave-do-teste");
    await expect(promessa).resolves.toBeUndefined();
  });

  it("as telas e componentes não importam o store direto, só o repositório", () => {
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) varrer(caminho);
        else if (
          /\.(ts|tsx)$/.test(nome) &&
          !/\.test\./.test(nome) &&
          !caminho.includes("routeTree.gen")
        ) {
          const texto = readFileSync(caminho, "utf8");
          const dentroDeData = caminho.startsWith(join("src", "data"));
          for (const linha of texto.split("\n")) {
            if (!/from "(@\/data\/store|\.\.\/data\/store|\.\/store)"/.test(linha)) continue;
            // Só o repositório e importações de TIPO (que não puxam o mock) podem apontar para o store.
            const permitido =
              nome === "repositorio.ts" || (dentroDeData && /^import type /.test(linha.trim()));
            if (!permitido) achados.push(`${caminho}: ${linha.trim()}`);
          }
        }
      }
    };
    varrer("src");
    expect(achados).toEqual([]);
  });

  it("todas as operações do contrato estão descritas em docs/MIGRACAO_BANCO.md", async () => {
    const { repositorio } = await carregar();
    const doc = readFileSync("docs/MIGRACAO_BANCO.md", "utf8");
    const faltam = Object.keys(repositorio).filter((nome) => !doc.includes(`\`${nome}\``));
    expect(faltam).toEqual([]);
  });
});

/**
 * Suíte de contrato: só usa a interface `Repositorio`. Quando existir a implementação com banco de dados,
 * basta adicioná-la na lista abaixo e todo o comportamento combinado é conferido contra ela também.
 */
const IMPLEMENTACOES: [string, () => Promise<Repositorio>][] = [
  [
    "mock (dados de exemplo no aparelho)",
    async () => {
      const { repositorio } = await carregar();
      return repositorio;
    },
  ],
];

describe.each(IMPLEMENTACOES)("contrato do repositório: %s", (_nome, criar) => {
  let r: Repositorio;
  beforeEach(async () => {
    r = await criar();
  });

  const novoPassageiro = (nome = "Teste") => ({
    nome,
    telefone: "(43) 99999-0001",
    endereco: "Rua A",
    cidade: "Jacarezinho",
    linhaIds: ["l1"],
    formaPagamento: "por_viagem" as const,
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
    convite: "nao_enviado" as const,
    ultimoPagamento: "",
  });
  const novaVan = (apelido: string) => ({
    apelido,
    modelo: "X",
    placa: "AAA1B23",
    lugares: 10,
    ano: null,
    cor: "",
    motoristaId: "",
    situacao: "rodando" as const,
    observacoes: "",
  });

  it("vans: criar, editar e excluir", async () => {
    const antes = r.obterEstado().vans.length;
    await r.salvarVan(novaVan("Van Nova"));
    const criada = r.obterEstado().vans.find((v) => v.apelido === "Van Nova")!;
    expect(r.obterEstado().vans).toHaveLength(antes + 1);
    await r.salvarVan({ ...novaVan("Van Editada"), id: criada.id });
    expect(r.obterEstado().vans.find((v) => v.id === criada.id)?.apelido).toBe("Van Editada");
    expect(r.obterEstado().vans).toHaveLength(antes + 1);
    await r.excluirVan(criada.id);
    expect(r.obterEstado().vans).toHaveLength(antes);
  });

  it("passageiros: salvar devolve id único; excluir apaga cobranças e recibos dele", async () => {
    const a = await r.salvarPassageiro(novoPassageiro("Ana"));
    const b = await r.salvarPassageiro(novoPassageiro("Beto"));
    expect(a).not.toBe(b);
    expect(await r.lancarCobranca(a, 150, "l1")).toBe(true);
    const recibo = await r.marcarPagamento(a, 150, "pix", "2026-11-09");
    expect(recibo?.pid).toBe(a);
    await r.excluirPassageiro(a);
    const e = r.obterEstado();
    expect(e.passageiros.some((p) => p.id === a)).toBe(false);
    expect(e.cobrancas.some((c) => c.pid === a)).toBe(false);
    expect(e.recibos.some((x) => x.pid === a)).toBe(false);
    expect(e.passageiros.some((p) => p.id === b)).toBe(true);
  });

  it("dinheiro: lançar, pagar (recibos com número crescente), desfazer e cancelar", async () => {
    const p = await r.salvarPassageiro(novoPassageiro());
    await r.lancarCobranca(p, 100, "l1");
    await r.lancarCobranca(p, 50, "l1");
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.emAberto).toBe(150);
    const r1 = (await r.marcarPagamento(p, 100, "dinheiro", "2026-11-09"))!;
    const r2 = (await r.marcarPagamento(p, 50, "pix", "2026-11-09"))!;
    expect(r2.numero).toBeGreaterThan(r1.numero);
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.emAberto).toBe(0);
    await r.desfazerRecibo(r2.numero);
    expect(r.obterEstado().recibos.some((x) => x.numero === r2.numero)).toBe(false);
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.emAberto).toBe(50);
    const cob = r.obterEstado().cobrancas.find((c) => c.pid === p && c.valor === 50)!;
    await r.cancelarCob(cob.id, "erro");
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.emAberto).toBe(0);
  });

  it("lançar cobrança negativa que não existe devolve false", async () => {
    const p = await r.salvarPassageiro(novoPassageiro());
    expect(await r.lancarCobranca(p, -999)).toBe(false);
  });

  it("pagamento sem nada em aberto não gera recibo", async () => {
    const p = await r.salvarPassageiro(novoPassageiro());
    expect(await r.marcarPagamento(p, 100, "pix", "2026-11-09")).toBeNull();
  });

  it("gastos: salvar e excluir", async () => {
    const g = {
      valor: 80,
      data: "2026-11-05",
      categoria: "Pedágio" as const,
      vanId: "",
      linhaId: "",
      descricao: "",
      litros: null,
      km: null,
      mensal: false,
    };
    const antes = r.obterEstado().gastos.length;
    await r.salvarGasto(g);
    const criado = r.obterEstado().gastos.at(-1)!;
    expect(r.obterEstado().gastos).toHaveLength(antes + 1);
    await r.excluirGasto(criado.id);
    expect(r.obterEstado().gastos).toHaveLength(antes);
  });

  it("chave Pix e alertas dispensados", async () => {
    await r.salvarChavePix("  minha@chave  ");
    expect(r.obterEstado().chavePix).toBe("minha@chave");
    await r.dispensarAlerta("cnh_m2", "x");
    expect(r.obterEstado().alertasDispensados).toEqual({ cnh_m2: "x" });
    await r.restaurarAlertas();
    expect(r.obterEstado().alertasDispensados).toEqual({});
  });

  it("linhas: o passageiro entra e sai da linha; excluir a linha tira dele", async () => {
    const p = await r.salvarPassageiro({ ...novoPassageiro(), linhaIds: [] });
    await r.colocarNaLinha("l2", [p]);
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.linhaIds).toEqual(["l2"]);
    await r.tirarDaLinha(p, "l2");
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.linhaIds).toEqual([]);
    await r.colocarNaLinha("l3", [p]);
    await r.excluirLinha("l3");
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.linhaIds).toEqual([]);
    expect(r.obterEstado().linhas.some((l) => l.id === "l3")).toBe(false);
  });

  it("restaurar exemplo volta ao início", async () => {
    await r.salvarChavePix("x");
    await r.salvarPassageiro(novoPassageiro());
    await r.restaurarExemplo();
    expect(r.obterEstado().chavePix).toBe("");
    expect(r.obterEstado().passageiros).toHaveLength(22);
  });
});

describe("tipos e regras de domínio moram num lugar neutro", () => {
  const arquivos = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? arquivos(p) : /\.tsx?$/.test(n) ? [p] : [];
    });

  it("nenhum módulo de src/data (fora o store, o repositório e os testes) importa o store: só tipos.ts", () => {
    const achados = arquivos(join("src", "data"))
      .filter((p) => !/\.test\./.test(p) && !/[\\/](store|repositorio)\.ts$/.test(p))
      .filter((p) => /from "\.\/store"/.test(readFileSync(p, "utf8")));
    expect(achados).toEqual([]);
  });

  it("telas e componentes não dependem dos dados de exemplo", () => {
    const achados = [...arquivos(join("src", "routes")), ...arquivos(join("src", "components"))]
      .filter((p) => !/\.test\./.test(p))
      .filter((p) => /from "@\/data\/exemplo"/.test(readFileSync(p, "utf8")));
    expect(achados).toEqual([]);
  });

  it("o store não declara tipos de domínio (eles vêm de tipos.ts)", () => {
    const store = readFileSync(join("src", "data", "store.ts"), "utf8");
    expect(store).not.toMatch(
      /^export type (Linha|Passageiro|Van|Motorista|Estado|PerfilVanzeiro)\b/m,
    );
    expect(readFileSync(join("src", "data", "tipos.ts"), "utf8")).toMatch(
      /export type Estado = \{/,
    );
  });
});
