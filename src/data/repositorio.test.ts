import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Repositorio } from "./repositorio";

/** Itens do store que NÃO fazem parte do contrato: ajudas internas e regras de domínio. */
const FORA_DO_CONTRATO = ["criarEstadoExemplo", "ehEstado", "TIPOS_LINHA", "DIAS", "estaDevendo"];

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

  it("cada operação do contrato é a do mock (a tela usa o contrato, o contrato usa o mock)", async () => {
    const { mock, repositorio } = await carregar();
    for (const [nome, fn] of Object.entries(repositorio)) {
      expect(fn, nome).toBe((mock as Record<string, unknown>)[nome]);
    }
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

  it("vans: criar, editar e excluir", () => {
    const antes = r.obterEstado().vans.length;
    r.salvarVan(novaVan("Van Nova"));
    const criada = r.obterEstado().vans.find((v) => v.apelido === "Van Nova")!;
    expect(r.obterEstado().vans).toHaveLength(antes + 1);
    r.salvarVan({ ...novaVan("Van Editada"), id: criada.id });
    expect(r.obterEstado().vans.find((v) => v.id === criada.id)?.apelido).toBe("Van Editada");
    expect(r.obterEstado().vans).toHaveLength(antes + 1);
    r.excluirVan(criada.id);
    expect(r.obterEstado().vans).toHaveLength(antes);
  });

  it("passageiros: salvar devolve id único; excluir apaga cobranças e recibos dele", () => {
    const a = r.salvarPassageiro(novoPassageiro("Ana"));
    const b = r.salvarPassageiro(novoPassageiro("Beto"));
    expect(a).not.toBe(b);
    expect(r.lancarCobranca(a, 150, "l1")).toBe(true);
    const recibo = r.marcarPagamento(a, 150, "pix", "2026-11-09");
    expect(recibo?.pid).toBe(a);
    r.excluirPassageiro(a);
    const e = r.obterEstado();
    expect(e.passageiros.some((p) => p.id === a)).toBe(false);
    expect(e.cobrancas.some((c) => c.pid === a)).toBe(false);
    expect(e.recibos.some((x) => x.pid === a)).toBe(false);
    expect(e.passageiros.some((p) => p.id === b)).toBe(true);
  });

  it("dinheiro: lançar, pagar (recibos com número crescente), desfazer e cancelar", () => {
    const p = r.salvarPassageiro(novoPassageiro());
    r.lancarCobranca(p, 100, "l1");
    r.lancarCobranca(p, 50, "l1");
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.emAberto).toBe(150);
    const r1 = r.marcarPagamento(p, 100, "dinheiro", "2026-11-09")!;
    const r2 = r.marcarPagamento(p, 50, "pix", "2026-11-09")!;
    expect(r2.numero).toBeGreaterThan(r1.numero);
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.emAberto).toBe(0);
    r.desfazerRecibo(r2.numero);
    expect(r.obterEstado().recibos.some((x) => x.numero === r2.numero)).toBe(false);
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.emAberto).toBe(50);
    const cob = r.obterEstado().cobrancas.find((c) => c.pid === p && c.valor === 50)!;
    r.cancelarCob(cob.id, "erro");
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.emAberto).toBe(0);
  });

  it("lançar cobrança negativa que não existe devolve false", () => {
    const p = r.salvarPassageiro(novoPassageiro());
    expect(r.lancarCobranca(p, -999)).toBe(false);
  });

  it("pagamento sem nada em aberto não gera recibo", () => {
    const p = r.salvarPassageiro(novoPassageiro());
    expect(r.marcarPagamento(p, 100, "pix", "2026-11-09")).toBeNull();
  });

  it("gastos: salvar e excluir", () => {
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
    r.salvarGasto(g);
    const criado = r.obterEstado().gastos.at(-1)!;
    expect(r.obterEstado().gastos).toHaveLength(antes + 1);
    r.excluirGasto(criado.id);
    expect(r.obterEstado().gastos).toHaveLength(antes);
  });

  it("chave Pix e alertas dispensados", () => {
    r.salvarChavePix("  minha@chave  ");
    expect(r.obterEstado().chavePix).toBe("minha@chave");
    r.dispensarAlerta("cnh_m2", "x");
    expect(r.obterEstado().alertasDispensados).toEqual({ cnh_m2: "x" });
    r.restaurarAlertas();
    expect(r.obterEstado().alertasDispensados).toEqual({});
  });

  it("linhas: o passageiro entra e sai da linha; excluir a linha tira dele", () => {
    const p = r.salvarPassageiro({ ...novoPassageiro(), linhaIds: [] });
    r.colocarNaLinha("l2", [p]);
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.linhaIds).toEqual(["l2"]);
    r.tirarDaLinha(p, "l2");
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.linhaIds).toEqual([]);
    r.colocarNaLinha("l3", [p]);
    r.excluirLinha("l3");
    expect(r.obterEstado().passageiros.find((x) => x.id === p)?.linhaIds).toEqual([]);
    expect(r.obterEstado().linhas.some((l) => l.id === "l3")).toBe(false);
  });

  it("restaurar exemplo volta ao início", () => {
    r.salvarChavePix("x");
    r.salvarPassageiro(novoPassageiro());
    r.restaurarExemplo();
    expect(r.obterEstado().chavePix).toBe("");
    expect(r.obterEstado().passageiros).toHaveLength(22);
  });
});
