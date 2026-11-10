import { beforeEach, describe, expect, it, vi } from "vitest";
import { aberto } from "./cobrancas";
import { semPassageiro, type Ajuste } from "./viagens";

type Loja = typeof import("./store");
let s: Loja;
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  s = await import("./store");
});

const totalDe = (pid: string) =>
  s
    .obterEstado()
    .cobrancas.filter((c) => c.pid === pid)
    .reduce((t, c) => t + aberto(c), 0);
const citaPassageiro = (v: unknown, pid: string) => JSON.stringify(v).includes(`"${pid}"`);

/** Uma viagem com o passageiro espalhado por todo lugar: resposta, espera, extra, ida e volta. */
function viagemCheia(pid: string, outro: string): Ajuste {
  return {
    respostas: { [pid]: "vai", [outro]: "vai" },
    espera: [pid, outro],
    extras: [pid],
    ida: {
      ordem: [pid, outro],
      marcas: [
        { pid, r: "embarcou", cobrou: 150 },
        { pid: outro, r: "embarcou", cobrou: 0 },
      ],
      fase: "a_caminho",
      parada: {
        inicio: 1,
        minutos: 5,
        local: "Posto",
        chamada: false,
        naVan: { [pid]: "manual", [outro]: "app" },
      },
      paradas: [
        {
          inicio: 1,
          minutos: 5,
          local: "Posto",
          ficaram: [
            { pid, motivo: "banheiro", hora: "10:00" },
            { pid: outro, motivo: "x", hora: "10:01" },
          ],
        },
      ],
      volta: {
        fase: "entrega",
        inicio: 2,
        status: { [pid]: { r: "na_van", via: "app" }, [outro]: { r: "nao", motivo: "x" } },
        extras: [
          { pid, cobrou: 10 },
          { pid: outro, cobrou: 0 },
        ],
        ordem: [pid, outro],
        entregas: [
          { pid, r: "entregue" },
          { pid: outro, r: "entregue" },
        ],
        parada: { inicio: 3, minutos: 1, local: "Y", chamada: false, naVan: { [pid]: "app" } },
        paradas: [
          { inicio: 3, minutos: 1, local: "Y", ficaram: [{ pid, motivo: "m", hora: "11:00" }] },
        ],
      },
    },
  };
}

describe("semPassageiro (tira o passageiro de uma viagem)", () => {
  it("não sobra nenhuma menção a ele, e o outro passageiro continua", () => {
    const novo = semPassageiro(viagemCheia("pA", "pB"), "pA");
    expect(citaPassageiro(novo, "pA")).toBe(false);
    expect(novo.respostas).toEqual({ pB: "vai" });
    expect(novo.ida?.ordem).toEqual(["pB"]);
    expect(novo.ida?.marcas).toHaveLength(1);
    expect(novo.ida?.volta?.entregas).toHaveLength(1);
    expect(novo.ida?.volta?.status["pB"]).toBeDefined();
  });
  it("funciona em viagem sem ida", () => {
    const novo = semPassageiro({ respostas: { pA: "vai" }, espera: ["pA"], extras: [] }, "pA");
    expect(novo).toEqual({ respostas: {}, espera: [], extras: [] });
  });
});

describe("excluir passageiro", () => {
  it("apaga cobranças, recibos e marcações dele, sem mexer nos outros", () => {
    const antes = s.obterEstado();
    const pid = "p3";
    expect(antes.cobrancas.some((c) => c.pid === pid)).toBe(true);
    const outros = antes.cobrancas.filter((c) => c.pid !== pid).length;
    const recibosOutros = antes.recibos.filter((r) => r.pid !== pid).length;
    const totalOutro = totalDe("p8");
    const chave = Object.keys(antes.ajustes)[0]!;
    s.ajustarViagem(chave, viagemCheia(pid, "p4"));

    s.excluirPassageiro(pid);
    const e = s.obterEstado();

    expect(e.passageiros.some((p) => p.id === pid)).toBe(false);
    expect(e.cobrancas.some((c) => c.pid === pid)).toBe(false);
    expect(e.recibos.some((r) => r.pid === pid)).toBe(false);
    expect(citaPassageiro(e.ajustes, pid)).toBe(false);
    expect(e.cobrancas.filter((c) => c.pid !== pid)).toHaveLength(outros);
    expect(e.recibos).toHaveLength(recibosOutros);
    expect(totalDe("p8")).toBe(totalOutro);
    expect(e.ajustes[chave]?.ida?.ordem).toEqual(["p4"]);
  });

  it("o 'deve agora' dos outros passageiros continua batendo com as cobranças", () => {
    s.excluirPassageiro("p13");
    const e = s.obterEstado();
    for (const p of e.passageiros) expect(p.emAberto).toBeCloseTo(totalDe(p.id), 2);
  });

  it("desativar guarda a dívida e o histórico", () => {
    const antes = s.obterEstado().cobrancas.filter((c) => c.pid === "p3").length;
    const deve = s.obterEstado().passageiros.find((p) => p.id === "p3")!.emAberto;
    s.desativarPassageiro("p3");
    const p = s.obterEstado().passageiros.find((x) => x.id === "p3")!;
    expect(p.ativo).toBe(false);
    expect(p.linhaIds).toEqual([]);
    expect(p.emAberto).toBe(deve);
    expect(s.obterEstado().cobrancas.filter((c) => c.pid === "p3")).toHaveLength(antes);
  });
});

describe("excluir linha, van e motorista", () => {
  it("linha: some das viagens e do cadastro; dinheiro fica sem linha", () => {
    const antes = s.obterEstado();
    const gastosDaLinha = antes.gastos.filter((g) => g.linhaId === "l1").length;
    expect(gastosDaLinha).toBeGreaterThan(0);
    const cobrancasDaLinha = antes.cobrancas.filter((c) => c.linhaId === "l1").length;
    expect(cobrancasDaLinha).toBeGreaterThan(0);
    s.excluirLinha("l1");
    const e = s.obterEstado();
    expect(e.linhas.some((l) => l.id === "l1")).toBe(false);
    expect(Object.keys(e.ajustes).some((k) => k.split("_")[0] === "l1")).toBe(false);
    expect(e.gastos.some((g) => g.linhaId === "l1")).toBe(false);
    expect(e.cobrancas.some((c) => c.linhaId === "l1")).toBe(false);
    expect(e.gastos).toHaveLength(antes.gastos.length);
    expect(e.cobrancas).toHaveLength(antes.cobrancas.length);
    expect(e.passageiros.some((p) => p.linhaIds.includes("l1"))).toBe(false);
  });

  it("van: gastos e viagens deixam de apontar para ela", () => {
    const chave = Object.keys(s.obterEstado().ajustes)[0]!;
    s.ajustarViagem(chave, { ...s.obterEstado().ajustes[chave]!, vanId: "van1" });
    s.excluirVan("van1");
    const e = s.obterEstado();
    expect(e.vans.some((v) => v.id === "van1")).toBe(false);
    expect(e.gastos.some((g) => g.vanId === "van1")).toBe(false);
    expect(e.linhas.some((l) => l.vanId === "van1")).toBe(false);
    expect(e.motoristas.some((m) => m.vanId === "van1")).toBe(false);
    expect(Object.values(e.ajustes).some((a) => a.vanId === "van1")).toBe(false);
  });

  it("motorista: viagens, linhas e vans deixam de apontar para ele (o próprio vanzeiro não pode ser excluído)", () => {
    s.excluirMotorista("m1");
    expect(s.obterEstado().motoristas.some((m) => m.id === "m1")).toBe(true);
    s.excluirMotorista("m2");
    const e = s.obterEstado();
    expect(e.motoristas.some((m) => m.id === "m2")).toBe(false);
    expect(e.linhas.some((l) => l.motoristaId === "m2")).toBe(false);
    expect(e.vans.some((v) => v.motoristaId === "m2")).toBe(false);
    expect(Object.values(e.ajustes).some((a) => a.motoristaId === "m2")).toBe(false);
  });
});

describe("lancar cobrança de viagem", () => {
  const viagensDe = (pid: string) =>
    s.obterEstado().cobrancas.filter((c) => c.pid === pid && c.tipo === "viagem" && !c.cancelada);

  it("somar aumenta o que o passageiro deve", () => {
    const antes = totalDe("p4");
    expect(s.lancarCobranca("p4", 150, "l1")).toBe(true);
    expect(totalDe("p4")).toBe(antes + 150);
    expect(s.obterEstado().passageiros.find((p) => p.id === "p4")!.emAberto).toBe(antes + 150);
  });

  it("tirar remove a cobrança que ainda não foi paga", () => {
    s.lancarCobranca("p4", 150, "l1");
    const n = viagensDe("p4").length;
    expect(s.lancarCobranca("p4", -150)).toBe(true);
    expect(viagensDe("p4")).toHaveLength(n - 1);
  });

  it("tirar uma cobrança que já foi paga cancela (o recibo fica) em vez de deixar cobrança fantasma", () => {
    s.lancarCobranca("p4", 150, "l1");
    s.marcarPagamento("p4", 150, "pix", "2026-11-09", [viagensDe("p4").at(-1)!.id]);
    const recibos = s.obterEstado().recibos.length;
    const totalAntes = totalDe("p4");
    expect(s.lancarCobranca("p4", -150)).toBe(true);
    expect(s.obterEstado().recibos).toHaveLength(recibos);
    expect(totalDe("p4")).toBe(totalAntes);
    expect(
      s.obterEstado().cobrancas.some((c) => c.cancelada === "Marcação da viagem desfeita"),
    ).toBe(true);
  });

  it("tirar o que não existe devolve false e não muda nada", () => {
    const antes = s.obterEstado().cobrancas;
    expect(s.lancarCobranca("p4", -999)).toBe(false);
    expect(s.obterEstado().cobrancas).toBe(antes);
  });
});

describe("dados de exemplo são coerentes", () => {
  it("todo passageiro semanal ou mensal ativo tem vencimento", () => {
    const sem = s
      .obterEstado()
      .passageiros.filter(
        (p) =>
          p.ativo &&
          (p.formaPagamento === "semanal" || p.formaPagamento === "mensal") &&
          !p.vencimento,
      );
    expect(sem.map((p) => p.nome)).toEqual([]);
  });
  it("todo passageiro e todo gasto apontam para algo que existe", () => {
    const e = s.obterEstado();
    const linhas = new Set(e.linhas.map((l) => l.id)),
      vans = new Set(e.vans.map((v) => v.id)),
      pas = new Set(e.passageiros.map((p) => p.id));
    expect(e.passageiros.flatMap((p) => p.linhaIds).filter((id) => !linhas.has(id))).toEqual([]);
    expect(
      e.gastos.filter(
        (g) => (g.vanId && !vans.has(g.vanId)) || (g.linhaId && !linhas.has(g.linhaId)),
      ),
    ).toEqual([]);
    expect(e.cobrancas.filter((c) => !pas.has(c.pid))).toEqual([]);
    expect(e.recibos.filter((r) => !pas.has(r.pid))).toEqual([]);
  });
});

describe("histórico de exemplo", () => {
  it("viagens passadas viram viagens realizadas, e o histórico bate com as cobranças", async () => {
    const { historicoViagens } = await import("./historico");
    const e = s.obterEstado();
    const itens = historicoViagens(e.ajustes);
    expect(itens.length).toBeGreaterThan(0);
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    for (const i of itens) {
      expect(i.data < iso).toBe(true);
      for (const m of i.ida.marcas.filter((x) => x.cobrou > 0)) {
        const c = e.cobrancas.find(
          (x) => x.pid === m.pid && x.tipo === "viagem" && x.vencimento === i.data && !x.cancelada,
        );
        expect(c?.valor).toBe(m.cobrou);
      }
    }
  });

  it("excluir um passageiro também o tira do histórico", async () => {
    const { historicoViagens } = await import("./historico");
    const com = historicoViagens(s.obterEstado().ajustes).find((i) => i.ida.marcas.length > 0)!;
    const pid = com.ida.marcas[0]!.pid;
    s.excluirPassageiro(pid);
    const depois = historicoViagens(s.obterEstado().ajustes);
    expect(depois.some((i) => JSON.stringify(i.ida).includes(`"${pid}"`))).toBe(false);
  });
});

describe("prazo de confirmação do passageiro", () => {
  const PID = "p1";
  const OUTRO = "p2";
  const vazio: Ajuste = { respostas: {}, espera: [], extras: [] };
  const comRelogio = (quando: string, f: () => void) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(quando));
    try {
      f();
    } finally {
      vi.useRealTimers();
    }
  };

  it("antes do prazo o passageiro responde e a resposta é gravada", () => {
    comRelogio("2026-11-10T12:00:00", () => {
      s.ajustarViagem("l1_2026-11-11", vazio);
      expect(s.responderViagemApp("p1", "l1_2026-11-11", true)).toBe(true);
      expect(s.obterEstado().ajustes["l1_2026-11-11"]!.respostas[PID]).toBe("vai");
      expect(s.responderViagemApp("p1", "l1_2026-11-11", false)).toBe(true);
      expect(s.obterEstado().ajustes["l1_2026-11-11"]!.respostas[PID]).toBe("nao");
    });
  });

  it("depois do prazo (20h da véspera) ele não muda mais, e nada é gravado", () => {
    comRelogio("2026-11-10T20:00:00", () => {
      s.ajustarViagem("l1_2026-11-11", { ...vazio, respostas: { p1: "vai" } });
      expect(s.responderViagemApp("p1", "l1_2026-11-11", false)).toBe(false);
      expect(s.obterEstado().ajustes["l1_2026-11-11"]!.respostas[PID]).toBe("vai");
      expect(s.responderViagemApp("p2", "l1_2026-11-11", true)).toBe(false);
      expect(s.obterEstado().ajustes["l1_2026-11-11"]!.respostas[OUTRO]).toBeUndefined();
    });
  });

  it("o vanzeiro continua podendo ajustar a resposta depois do prazo", () => {
    comRelogio("2026-11-10T21:00:00", () => {
      s.ajustarViagem("l1_2026-11-11", { ...vazio, respostas: { p1: "nao" } });
      s.ajustarViagem("l1_2026-11-11", { ...vazio, respostas: { p1: "vai" } });
      expect(s.obterEstado().ajustes["l1_2026-11-11"]!.respostas[PID]).toBe("vai");
    });
  });

  it("viagem que não existe devolve false", () => {
    expect(s.responderViagemApp("p1", "l1_2099-01-01", true)).toBe(false);
  });
});

describe("importarPassageiros", () => {
  it("grava a lista de uma vez, com ids novos e únicos", async () => {
    const store = await import("./store");
    const antes = store.obterEstado().passageiros.length;
    const base = {
      endereco: "",
      numero: "",
      bairro: "",
      cidade: "X",
      referencia: "",
      linhaIds: [],
      formaPagamento: "mensal" as const,
      valor: 100,
      vencimento: "5",
      emergenciaNome: "",
      emergenciaTelefone: "",
      observacoes: "",
      convite: "nao_enviado" as const,
      ativo: true,
      emAberto: 0,
      ultimoPagamento: "",
    };
    const ids = store.importarPassageiros([
      { ...base, nome: "Imp A", telefone: "(43) 90000-0001" },
      { ...base, nome: "Imp B", telefone: "(43) 90000-0002" },
    ]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(store.obterEstado().passageiros).toHaveLength(antes + 2);
  });
});
