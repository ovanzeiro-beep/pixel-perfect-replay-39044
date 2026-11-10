import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Repositorio } from "./repositorio";
import { prazoViagem } from "./alertas";
import { montarViagens } from "./viagens";

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

  it("a suíte de contrato chama de verdade cada operação de escrita (nenhuma fica só nos testes de tela)", async () => {
    const { repositorio } = await carregar();
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
    const fonte = readFileSync(join("src", "data", "repositorio.test.ts"), "utf8");
    const semTeste = Object.keys(repositorio)
      .filter((nome) => !IMEDIATAS.includes(nome))
      .filter((nome) => !new RegExp(`\\br\\.${nome}\\(`).test(fonte));
    expect(semTeste, "Escreva um teste de contrato para estas operações.").toEqual([]);
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

  // ===== Viagem: as operações pequenas que o teste de contrato ainda não cobria diretamente =====
  /** Uma viagem futura com pelo menos 3 passageiros, tirada só do que o contrato devolve. */
  const viagem = () => {
    const e = r.obterEstado();
    const v = montarViagens(
      e.linhas,
      e.passageiros,
      e.vans,
      e.ajustes,
      new Date(),
      e.pausas ?? [],
    ).find(
      (x) => !x.passada && x.passageiroIds.length >= 3 && !x.ajuste.ida && !x.ajuste.cancelada,
    )!;
    return {
      id: v.id,
      linhaId: v.linhaId,
      pids: v.passageiroIds.slice(0, 3) as [string, string, string],
    };
  };
  const ajusteDe = (id: string) => r.obterEstado().ajustes[id];
  const ida = (id: string) => ajusteDe(id)?.ida;

  it("linhas: alternar pausa e reativa; as viagens somem e voltam", async () => {
    const { linhaId } = viagem();
    const viagensDa = () => {
      const e = r.obterEstado();
      return montarViagens(
        e.linhas,
        e.passageiros,
        e.vans,
        e.ajustes,
        new Date(),
        e.pausas ?? [],
      ).filter((v) => v.linhaId === linhaId).length;
    };
    const antes = viagensDa();
    expect(antes).toBeGreaterThan(0);
    await r.alternarLinha(linhaId);
    expect(r.obterEstado().linhas.find((l) => l.id === linhaId)!.ativa).toBe(false);
    expect(viagensDa()).toBe(0);
    await r.alternarLinha(linhaId);
    expect(r.obterEstado().linhas.find((l) => l.id === linhaId)!.ativa).toBe(true);
    expect(viagensDa()).toBe(antes);
  });

  it("convite: aceitar marca só aquele passageiro como no app", async () => {
    const a = await r.salvarPassageiro(novoPassageiro("Ana"));
    const b = await r.salvarPassageiro(novoPassageiro("Beto"));
    await r.aceitarConvite(a);
    const por = (id: string) => r.obterEstado().passageiros.find((p) => p.id === id)!;
    expect(por(a).convite).toBe("no_app");
    expect(por(b).convite).toBe("nao_enviado");
  });

  it("viagem: extra entra uma vez só; viagem que não existe recusa", async () => {
    const v = viagem();
    const fora = r.obterEstado().passageiros.find((p) => !v.pids.includes(p.id))!;
    expect(await r.adicionarExtraNaViagem(v.id, fora.id)).toBe(true);
    expect(ajusteDe(v.id)?.extras).toEqual([fora.id]);
    expect(await r.adicionarExtraNaViagem(v.id, fora.id)).toBe(false);
    expect(ajusteDe(v.id)?.extras).toEqual([fora.id]);
    expect(await r.adicionarExtraNaViagem("naoexiste_2099-01-01", fora.id)).toBe(false);
  });

  it("viagem: trocar motorista e van vale só para aquela viagem", async () => {
    const v = viagem();
    const e = r.obterEstado();
    const linha = e.linhas.find((l) => l.id === v.linhaId)!;
    const outraVan = e.vans.find((x) => x.id !== linha.vanId)!;
    const outroMot = e.motoristas.find((m) => m.id !== linha.motoristaId)!;
    expect(await r.trocarVanOuMotoristaDaViagem(v.id, outroMot.id, outraVan.id)).toBe(true);
    expect(ajusteDe(v.id)).toMatchObject({ motoristaId: outroMot.id, vanId: outraVan.id });
    const depois = r.obterEstado().linhas.find((l) => l.id === v.linhaId)!;
    expect(depois.vanId).toBe(linha.vanId);
    expect(depois.motoristaId).toBe(linha.motoristaId);
    // Só o motorista: a van da viagem não muda.
    expect(await r.trocarVanOuMotoristaDaViagem(v.id, linha.motoristaId)).toBe(true);
    expect(ajusteDe(v.id)).toMatchObject({ motoristaId: linha.motoristaId, vanId: outraVan.id });
  });

  it("viagem: van menor manda quem não cabe para a lista de espera, sem perder ninguém", async () => {
    const v = viagem();
    const e = r.obterEstado();
    const linha = e.linhas.find((l) => l.id === v.linhaId)!;
    const pequena = e.vans.find((x) => x.id !== linha.vanId)!;
    await r.salvarVan({ ...pequena, lugares: 1 });
    for (const id of v.pids) await r.definirRespostaDoPassageiro(v.id, id, "vai");
    const vai = (aj: NonNullable<ReturnType<typeof ajusteDe>>) =>
      Object.entries(aj.respostas)
        .filter(([, x]) => x === "vai")
        .map(([id]) => id);
    const confirmadosAntes = vai(ajusteDe(v.id)!);
    expect(confirmadosAntes.length).toBeGreaterThanOrEqual(3);
    await r.trocarVanOuMotoristaDaViagem(v.id, linha.motoristaId, pequena.id);
    const aj = ajusteDe(v.id)!;
    expect(vai(aj)).toHaveLength(1);
    // Quem não coube não some: continua na viagem, na lista de espera.
    expect([...vai(aj), ...aj.espera].sort()).toEqual([...confirmadosAntes].sort());
  });

  it("ida: reordenar quem falta mantém na frente quem já embarcou", async () => {
    const v = viagem();
    const [a, b, c] = v.pids;
    expect(await r.reordenarFaltamNaIda(v.id, [c, b, a])).toBe(false); // ainda não começou
    await r.iniciarIda(v.id, [a, b, c]);
    await r.marcarEmbarque(v.id, a, "embarcou");
    expect(await r.reordenarFaltamNaIda(v.id, [c, b])).toBe(true);
    expect(ida(v.id)?.ordem).toEqual([a, c, b]);
  });

  it("ida: mudar a fase; repetir a mesma fase não faz nada", async () => {
    const v = viagem();
    expect(await r.mudarFaseDaIda(v.id, "a_caminho")).toBe(false); // ainda não começou
    await r.iniciarIda(v.id, v.pids);
    expect(ida(v.id)?.fase).toBe("paradas");
    expect(await r.mudarFaseDaIda(v.id, "a_caminho")).toBe(true);
    expect(ida(v.id)?.fase).toBe("a_caminho");
    expect(await r.mudarFaseDaIda(v.id, "a_caminho")).toBe(false);
    expect(await r.mudarFaseDaIda(v.id, "chegou")).toBe(true);
    expect(ida(v.id)?.fase).toBe("chegou");
  });

  it("encerrar a viagem: só depois de iniciada e uma vez só", async () => {
    const v = viagem();
    expect(await r.encerrarViagem(v.id)).toBe(false);
    await r.iniciarIda(v.id, v.pids);
    expect(ida(v.id)?.encerrada).toBeUndefined();
    expect(await r.encerrarViagem(v.id)).toBe(true);
    const quando = ida(v.id)?.encerrada;
    expect(quando).toBeGreaterThan(0);
    expect(await r.encerrarViagem(v.id)).toBe(false);
    expect(ida(v.id)?.encerrada).toBe(quando);
  });

  it("parada: o pedido de chamada vale só com parada em andamento e uma vez só", async () => {
    const v = viagem();
    await r.iniciarIda(v.id, v.pids);
    expect(await r.pedirChamadaNaParada(v.id, "ida")).toBe(false); // sem parada
    await r.iniciarParada(v.id, "ida", 15, "Posto");
    expect(ida(v.id)?.parada?.chamada).toBe(false);
    expect(await r.pedirChamadaNaParada(v.id, "ida")).toBe(true);
    expect(ida(v.id)?.parada?.chamada).toBe(true);
    expect(await r.pedirChamadaNaParada(v.id, "ida")).toBe(false);
  });

  it("volta: entregar, desfazer e reordenar, na ordem em que a van anda", async () => {
    const v = viagem();
    const [a, b, c] = v.pids;
    await r.iniciarIda(v.id, [a, b, c]);
    await r.iniciarVolta(v.id);
    expect(await r.iniciarEntregas(v.id, [a, b, c])).toBe(true);
    expect(ida(v.id)?.volta?.fase).toBe("entrega");

    expect(await r.entregarNaVolta(v.id, a, "entregue")).toBe(true);
    expect(await r.entregarNaVolta(v.id, a, "entregue")).toBe(false); // já entregue
    expect(await r.entregarNaVolta(v.id, b, "outro", "Casa da avó")).toBe(true);
    expect(ida(v.id)?.volta?.entregas).toEqual([
      { pid: a, r: "entregue" },
      { pid: b, r: "outro", onde: "Casa da avó" },
    ]);

    expect(await r.desfazerEntregaNaVolta(v.id)).toBe(true); // tira a de b
    expect(ida(v.id)?.volta?.entregas.map((x) => x.pid)).toEqual([a]);

    expect(await r.reordenarEntregasDaVolta(v.id, [c, b])).toBe(true);
    expect(ida(v.id)?.volta?.ordem).toEqual([a, c, b]);

    await r.desfazerEntregaNaVolta(v.id);
    expect(await r.desfazerEntregaNaVolta(v.id)).toBe(false); // não há mais o que desfazer
  });

  it("volta: sem a ida e a volta iniciadas, as operações de entrega recusam", async () => {
    const v = viagem();
    const [a] = v.pids;
    expect(await r.iniciarEntregas(v.id, v.pids)).toBe(false);
    expect(await r.entregarNaVolta(v.id, a, "entregue")).toBe(false);
    expect(await r.desfazerEntregaNaVolta(v.id)).toBe(false);
    expect(await r.reordenarEntregasDaVolta(v.id, v.pids)).toBe(false);
  });

  // ===== Demais operações: cobertas aqui para valerem também para o banco =====
  it("perfil: salvar conclui o primeiro acesso e cria o motorista próprio", async () => {
    await r.comecarDoZero();
    expect(r.obterEstado().passageiros).toHaveLength(0);
    expect(r.obterEstado().perfil.configurado).toBe(false);
    await r.salvarPerfil({
      nome: "  Maria Souza ",
      cidade: "Londrina",
      estado: "pr",
      telefone: "(43) 99999-0000",
      email: "",
    });
    const e = r.obterEstado();
    expect(e.perfil).toMatchObject({ nome: "Maria Souza", estado: "PR", configurado: true });
    expect(e.motoristas.filter((m) => m.proprio)).toHaveLength(1);
    expect(e.motoristas.find((m) => m.proprio)!.nome).toBe("Maria Souza");
  });

  it("substituir todos os dados troca tudo de uma vez (e desfaz com a cópia anterior)", async () => {
    const copia = structuredClone(r.obterEstado());
    await r.comecarDoZero();
    expect(r.obterEstado().passageiros).toHaveLength(0);
    await r.substituirTodosOsDados(copia);
    expect(r.obterEstado().passageiros).toHaveLength(copia.passageiros.length);
    expect(r.obterEstado().linhas).toHaveLength(copia.linhas.length);
  });

  it("motoristas: salvar e editar; o próprio vanzeiro não pode ser excluído", async () => {
    const base = {
      nome: "Carlos",
      telefone: "(43) 98888-0000",
      cnh: "D",
      cnhValidade: "2030-01-01",
      vanId: "",
    };
    const antes = r.obterEstado().motoristas.length;
    await r.salvarMotorista(base);
    const criado = r.obterEstado().motoristas.find((m) => m.nome === "Carlos")!;
    expect(criado.proprio).toBe(false);
    await r.salvarMotorista({ ...base, nome: "Carlos Dias", id: criado.id });
    expect(r.obterEstado().motoristas.find((m) => m.id === criado.id)!.nome).toBe("Carlos Dias");
    await r.excluirMotorista(criado.id);
    expect(r.obterEstado().motoristas).toHaveLength(antes);
    const proprio = r.obterEstado().motoristas.find((m) => m.proprio);
    if (proprio) {
      await r.excluirMotorista(proprio.id);
      expect(r.obterEstado().motoristas.some((m) => m.id === proprio.id)).toBe(true);
    }
  });

  it("linhas: salvar cria e edita sem duplicar", async () => {
    const base = {
      nome: "Linha Nova",
      tipo: "Escolar" as const,
      frequencia: "semanal" as const,
      dias: ["seg", "qua"],
      data: "",
      saida: "07:00",
      volta: "12:00",
      paradas: ["A", "B"],
      destino: "Centro",
      vanId: "",
      motoristaId: "",
      valorViagem: 20,
      valorMensal: null,
      ativa: true,
      observacoes: "",
    };
    const antes = r.obterEstado().linhas.length;
    await r.salvarLinha(base);
    const criada = r.obterEstado().linhas.find((l) => l.nome === "Linha Nova")!;
    expect(r.obterEstado().linhas).toHaveLength(antes + 1);
    await r.salvarLinha({ ...base, nome: "Linha Editada", id: criada.id });
    expect(r.obterEstado().linhas).toHaveLength(antes + 1);
    expect(r.obterEstado().linhas.find((l) => l.id === criada.id)).toMatchObject({
      nome: "Linha Editada",
      paradas: ["A", "B"],
    });
  });

  it("passageiros: importar vários de uma vez devolve um id novo para cada um", async () => {
    const antes = r.obterEstado().passageiros.length;
    const { nome: _a, ...semNome } = novoPassageiro();
    const ids = await r.importarPassageiros([
      { ...semNome, nome: "Imp A" },
      { ...semNome, nome: "Imp B" },
    ]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(r.obterEstado().passageiros).toHaveLength(antes + 2);
    expect(
      r
        .obterEstado()
        .passageiros.filter((p) => ids.includes(p.id))
        .map((p) => p.nome)
        .sort(),
    ).toEqual(["Imp A", "Imp B"]);
  });

  it("passageiros: atualizar muda só o que foi pedido; desativar guarda a dívida e tira das linhas", async () => {
    const p = await r.salvarPassageiro(novoPassageiro("Duda"));
    await r.lancarCobranca(p, 150, "l1");
    await r.atualizarPassageiro(p, { observacoes: "alérgica" });
    const dela = () => r.obterEstado().passageiros.find((x) => x.id === p)!;
    expect(dela()).toMatchObject({ nome: "Duda", observacoes: "alérgica", ativo: true });
    await r.desativarPassageiro(p);
    expect(dela()).toMatchObject({ ativo: false, linhaIds: [], emAberto: 150 });
    expect(r.obterEstado().cobrancas.some((c) => c.pid === p)).toBe(true);
  });

  it("viagem: cancelar vale uma vez, e viagem cancelada não inicia a ida", async () => {
    const v = viagem();
    expect(await r.cancelarViagem(v.id)).toBe(true);
    expect(ajusteDe(v.id)?.cancelada).toBe(true);
    expect(await r.cancelarViagem(v.id)).toBe(false);
    expect(await r.iniciarIda(v.id, v.pids)).toBe(false);
    expect(await r.cancelarViagem("naoexiste_2099-01-01")).toBe(false);
  });

  it("passageiro pelo app: responde antes do prazo e é recusado depois dele", async () => {
    const e = r.obterEstado();
    const longe = montarViagens(
      e.linhas,
      e.passageiros,
      e.vans,
      e.ajustes,
      new Date(),
      e.pausas ?? [],
    )
      .filter((x) => !x.passada && x.passageiroIds.length > 0)
      .at(-1)!;
    const pid = longe.passageiroIds[0]!;
    expect(prazoViagem(longe.data, new Date()).encerrado).toBe(false);
    expect(await r.responderViagemApp(pid, longe.id, true)).toBe(true);
    expect(ajusteDe(longe.id)?.respostas[pid]).toBe("vai");
    expect(await r.responderViagemApp(pid, longe.id, false)).toBe(true);
    expect(ajusteDe(longe.id)?.respostas[pid]).toBe("nao");

    const limite = prazoViagem(longe.data, new Date()).limite;
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(limite.getTime() + 60_000));
      expect(await r.responderViagemApp(pid, longe.id, true)).toBe(false);
      expect(ajusteDe(longe.id)?.respostas[pid]).toBe("nao"); // não mudou
    } finally {
      vi.useRealTimers();
    }
  });

  it("ida: desfazer a última marcação tira também a cobrança e volta para as paradas", async () => {
    const v = viagem();
    const [a] = v.pids;
    await r.salvarPassageiro({ ...novoPassageiro(), linhaIds: [] }); // ruído
    await r.atualizarPassageiro(a, { formaPagamento: "por_viagem", valor: 40 });
    await r.iniciarIda(v.id, v.pids);
    const antes = r.obterEstado().passageiros.find((p) => p.id === a)!.emAberto;
    const m = await r.marcarEmbarque(v.id, a, "embarcou");
    expect(m).toMatchObject({ ok: true, cobrou: 40 });
    expect(r.obterEstado().passageiros.find((p) => p.id === a)!.emAberto).toBe(antes + 40);
    await r.mudarFaseDaIda(v.id, "a_caminho");
    expect(await r.desfazerUltimaMarcacaoDaIda(v.id)).toMatchObject({
      ok: true,
      cobrancaAchada: true,
    });
    expect(ida(v.id)?.marcas).toEqual([]);
    expect(ida(v.id)?.fase).toBe("paradas");
    expect(r.obterEstado().passageiros.find((p) => p.id === a)!.emAberto).toBe(antes);
    expect((await r.desfazerUltimaMarcacaoDaIda(v.id)).ok).toBe(false); // nada mais a desfazer
  });

  it("parada: presenças somam, desmarcam e a parada encerra guardando o histórico", async () => {
    const v = viagem();
    const [a, b] = v.pids;
    await r.iniciarIda(v.id, v.pids);
    expect(await r.marcarPresencasNaParada(v.id, "ida", { [a]: "manual" })).toBe(false); // sem parada
    expect(await r.encerrarParada(v.id, "ida", "x")).toBe(false);
    await r.iniciarParada(v.id, "ida", 10, "Lanchonete");
    await r.marcarPresencasNaParada(v.id, "ida", { [a]: "manual" });
    await r.marcarPresencasNaParada(v.id, "ida", { [b]: "app" });
    expect(ida(v.id)?.parada?.naVan).toEqual({ [a]: "manual", [b]: "app" });
    await r.marcarPresencasNaParada(v.id, "ida", { [a]: null });
    expect(ida(v.id)?.parada?.naVan).toEqual({ [b]: "app" });
    expect(await r.encerrarParada(v.id, "ida", "todos de volta")).toBe(true);
    expect(ida(v.id)?.parada).toBeUndefined();
    expect(ida(v.id)?.paradas).toHaveLength(1);
    expect(await r.encerrarParada(v.id, "ida", "de novo")).toBe(false);
  });

  it("passageiro pelo app: confirma presença na parada", async () => {
    const v = viagem();
    const [a] = v.pids;
    await r.iniciarIda(v.id, v.pids);
    await r.iniciarParada(v.id, "ida", 10, "Posto");
    expect(await r.confirmarParadaApp(a, v.id)).toBe(true);
    expect(ida(v.id)?.parada?.naVan[a]).toBe("app");
  });

  it("volta: marcar status soma e desmarca; o passageiro responde pelo app; extra cobra uma vez", async () => {
    const v = viagem();
    const [a, b, c] = v.pids;
    await r.atualizarPassageiro(c, { formaPagamento: "por_viagem", valor: 25 });
    await r.iniciarIda(v.id, [a, b]);
    expect(await r.marcarStatusNaVolta(v.id, { [a]: { r: "na_van", via: "manual" } })).toBe(false); // sem volta
    await r.iniciarVolta(v.id);
    await r.marcarStatusNaVolta(v.id, { [a]: { r: "na_van", via: "manual" } });
    expect(await r.responderVoltaApp(b, v.id, false, "vou ficar")).toBe(true);
    expect(ida(v.id)?.volta?.status).toEqual({
      [a]: { r: "na_van", via: "manual" },
      [b]: { r: "nao", motivo: "vou ficar" },
    });
    await r.marcarStatusNaVolta(v.id, { [a]: null });
    expect(Object.keys(ida(v.id)?.volta?.status ?? {})).toEqual([b]);
    expect(await r.responderVoltaApp(b, v.id, true)).toBe(true);
    expect(ida(v.id)?.volta?.status[b]).toEqual({ r: "na_van", via: "app" });

    const antes = r.obterEstado().passageiros.find((p) => p.id === c)!.emAberto;
    expect(await r.adicionarExtraNaVolta(v.id, c)).toEqual({ ok: true, cobrou: 25 });
    expect(r.obterEstado().passageiros.find((p) => p.id === c)!.emAberto).toBe(antes + 25);
    expect((await r.adicionarExtraNaVolta(v.id, c)).ok).toBe(false); // já está na chamada
    expect(r.obterEstado().passageiros.find((p) => p.id === c)!.emAberto).toBe(antes + 25);
  });

  it("cobrança: a configuração mantém o limite de 1 a 7 dias e só muda o que foi informado", async () => {
    await r.salvarConfigCobranca({ diasDeAviso: 4, pagaNaHoraPadrao: true });
    expect(r.obterEstado().configCobranca).toMatchObject({
      diasDeAviso: 4,
      pagaNaHoraPadrao: true,
    });
    await r.salvarConfigCobranca({ diasDeAviso: 99 });
    expect(r.obterEstado().configCobranca?.diasDeAviso).toBe(7);
    await r.salvarConfigCobranca({ diasDeAviso: 0 });
    expect(r.obterEstado().configCobranca?.diasDeAviso).toBe(1);
    await r.salvarConfigCobranca({ textoCobranca: "Oi {nome}, {valor}" });
    expect(r.obterEstado().configCobranca).toMatchObject({
      diasDeAviso: 1,
      pagaNaHoraPadrao: true,
      textoCobranca: "Oi {nome}, {valor}",
    });
  });

  it("pausas: valem só com datas boas e linha que existe; sem viagem nos dias; excluir devolve as viagens", async () => {
    const v = viagem();
    const dia = v.id.split("_")[1]!;
    const viagensNoDia = () => {
      const e = r.obterEstado();
      return montarViagens(
        e.linhas,
        e.passageiros,
        e.vans,
        e.ajustes,
        new Date(),
        e.pausas ?? [],
      ).filter((x) => x.id === v.id).length;
    };
    expect(viagensNoDia()).toBe(1);
    expect(await r.salvarPausa({ de: "2030-02-10", ate: "2030-02-01", motivo: "" })).toBe(false);
    expect(await r.salvarPausa({ de: "ontem", ate: "hoje", motivo: "" })).toBe(false);
    expect(await r.salvarPausa({ de: dia, ate: dia, motivo: "", linhaId: "nao-existe" })).toBe(
      false,
    );
    expect(await r.salvarPausa({ de: "2030-01-01", ate: "2032-01-01", motivo: "" })).toBe(false);
    expect(r.obterEstado().pausas ?? []).toHaveLength(0);

    expect(await r.salvarPausa({ de: dia, ate: dia, motivo: "Feriado", linhaId: v.linhaId })).toBe(
      true,
    );
    const pausa = (r.obterEstado().pausas ?? [])[0]!;
    expect(viagensNoDia()).toBe(0);
    // Editar mantém o mesmo registro; a viagem de um dia pausado também não aceita resposta.
    expect(await r.salvarPausa({ ...pausa, motivo: "Feriado municipal" })).toBe(true);
    expect(r.obterEstado().pausas).toHaveLength(1);
    expect(r.obterEstado().pausas![0]!.motivo).toBe("Feriado municipal");
    expect(await r.definirRespostaDoPassageiro(v.id, v.pids[0], "vai")).toBeNull();
    await r.excluirPausa(pausa.id);
    expect(r.obterEstado().pausas).toHaveLength(0);
    expect(viagensNoDia()).toBe(1);
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
