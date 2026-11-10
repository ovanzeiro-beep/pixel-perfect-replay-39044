import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Estado } from "./tipos";

type Modulos = {
  backup: typeof import("./backup");
  store: typeof import("./store");
};
async function carregar(): Promise<Modulos> {
  localStorage.clear();
  vi.resetModules();
  const store = await import("./store");
  const backup = await import("./backup");
  return { store, backup };
}

const clonar = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe("arquivo de backup", () => {
  let m: Modulos;
  let estado: Estado;
  beforeEach(async () => {
    m = await carregar();
    estado = clonar(m.store.obterEstado());
  });

  it("guarda e lê de volta exatamente os mesmos dados", () => {
    const b = m.backup.criarBackup(estado, new Date("2026-11-09T18:30:00Z"));
    const r = m.backup.validarBackup(m.backup.serializarBackup(b));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.dados).toEqual(estado);
    expect(r.backup.criadoEm).toBe("2026-11-09T18:30:00.000Z");
    expect(r.backup.resumo).toEqual(m.backup.resumoDoEstado(estado));
  });

  it("o resumo conta o que tem dentro", () => {
    const r = m.backup.resumoDoEstado(estado);
    expect(r).toMatchObject({ passageiros: 22, linhas: 3, vans: 2, motoristas: 2 });
    expect(r.cobrancas).toBeGreaterThan(50);
    expect(r.viagensRealizadas).toBeGreaterThan(0);
  });

  it("o nome do arquivo tem a data", () => {
    expect(m.backup.nomeDoArquivoDeBackup(new Date(2026, 10, 9))).toBe(
      "vanzeiro-backup-2026-11-09.json",
    );
    expect(m.backup.nomeDoArquivoDeBackup(new Date(2027, 0, 5))).toBe(
      "vanzeiro-backup-2027-01-05.json",
    );
  });

  it("a assinatura não depende da ordem das chaves, mas muda com qualquer valor", () => {
    expect(m.backup.assinatura({ a: 1, b: [1, 2], c: { x: 1, y: 2 } })).toBe(
      m.backup.assinatura({ c: { y: 2, x: 1 }, b: [1, 2], a: 1 }),
    );
    expect(m.backup.assinatura({ a: 1 })).not.toBe(m.backup.assinatura({ a: 2 }));
    expect(m.backup.assinatura({ a: [1, 2] })).not.toBe(m.backup.assinatura({ a: [2, 1] }));
    expect(m.backup.assinatura({ a: 1, b: undefined })).toBe(m.backup.assinatura({ a: 1 }));
  });

  it("ida e volta pelo texto não muda a assinatura (mesmo com chaves de número e acentos)", () => {
    const e = clonar(estado);
    e.ajustes["10"] = { respostas: { "2": "vai", "10": "nao" }, espera: [], extras: [] };
    e.passageiros[0]!.nome = "José Ângelo Çalçada";
    const r = m.backup.validarBackup(m.backup.serializarBackup(m.backup.criarBackup(e)));
    expect(r.ok).toBe(true);
  });

  describe("recusa arquivo ruim, com mensagem clara", () => {
    const erroDe = (texto: string) => {
      const r = m.backup.validarBackup(texto);
      return r.ok ? null : r.erro;
    };
    type Reg = Record<string, unknown>;
    const lista = (d: Reg, nome: string) => d[nome] as Reg[];
    const bom = () =>
      JSON.parse(m.backup.serializarBackup(m.backup.criarBackup(estado))) as Reg & { dados: Reg };
    const refazer = (b: Reg) => JSON.stringify(b);
    /** Muda os dados e recalcula a assinatura, como um arquivo "bem formado" porém estragado. */
    const comDados = (muda: (d: Reg) => void) => {
      const b = bom();
      muda(b["dados"]);
      b["integridade"] = m.backup.assinatura(b["dados"]);
      return refazer(b);
    };

    it("vazio e não-JSON", () => {
      expect(erroDe("")).toBe("O arquivo está vazio.");
      expect(erroDe("   \n")).toBe("O arquivo está vazio.");
      expect(erroDe("isto não é json")).toMatch(
        /não é um backup do O Vanzeiro \(não deu para ler\)/,
      );
    });
    it("JSON de outra coisa", () => {
      expect(erroDe("[]")).toMatch(/não é um backup do O Vanzeiro/);
      expect(erroDe('{"app":"outro-app","tipo":"backup"}')).toMatch(
        /não é um backup do O Vanzeiro/,
      );
      expect(erroDe('{"app":"o-vanzeiro","tipo":"relatorio"}')).toMatch(
        /não é um backup do O Vanzeiro/,
      );
    });
    it("versão de formato futura", () => {
      const b = bom();
      b["formato"] = 99;
      expect(erroDe(refazer(b))).toMatch(/versão mais nova do app/);
    });
    it("sem a versão do formato", () => {
      const b = bom();
      delete b["formato"];
      expect(erroDe(refazer(b))).toMatch(/sem a versão do formato/);
    });
    it("arquivo alterado à mão (assinatura não confere)", () => {
      const b = bom();
      lista(b["dados"], "passageiros")[0]!["nome"] = "Alterado";
      expect(erroDe(refazer(b))).toMatch(/alterado ou está corrompido/);
    });
    it("dados sem uma lista", () => {
      expect(erroDe(comDados((d) => delete d["passageiros"]))).toMatch(/lista "passageiros"/);
      expect(erroDe(comDados((d) => (d["gastos"] = "nada")))).toMatch(/lista "gastos"/);
    });
    it("registro inválido: diz qual lista e qual número", () => {
      expect(erroDe(comDados((d) => (lista(d, "vans")[1] = { id: "x" })))).toMatch(
        /registro inválido em "vans" \(número 2\)/,
      );
      expect(erroDe(comDados((d) => (lista(d, "cobrancas")[4]!["valor"] = "cem")))).toMatch(
        /"cobrancas" \(número 5\)/,
      );
      expect(
        erroDe(
          comDados(
            (d) => (lista(d, "cobrancas")[0]!["pagamentos"] = [{ valor: "x", data: "2026-01-01" }]),
          ),
        ),
      ).toMatch(/"cobrancas" \(número 1\)/);
      expect(
        erroDe(comDados((d) => (lista(d, "passageiros")[0] = null as unknown as Reg))),
      ).toMatch(/"passageiros" \(número 1\)/);
    });
    it("registro sem id ou com id repetido", () => {
      expect(erroDe(comDados((d) => delete lista(d, "motoristas")[0]!["id"]))).toMatch(
        /sem identificação em "motoristas"/,
      );
      expect(
        erroDe(
          comDados((d) => (lista(d, "passageiros")[1]!["id"] = lista(d, "passageiros")[0]!["id"])),
        ),
      ).toMatch(/repetidos em "passageiros"/);
    });
    it("faltam viagens ajustadas ou chave Pix", () => {
      expect(erroDe(comDados((d) => delete d["ajustes"]))).toMatch(/viagens ajustadas/);
      expect(erroDe(comDados((d) => (d["chavePix"] = 5)))).toMatch(/chave Pix/);
    });
    it("alertas dispensados inválidos", () => {
      expect(erroDe(comDados((d) => (d["alertasDispensados"] = [])))).toMatch(
        /alertas dispensados/,
      );
    });
    it("aceita backup sem alertasDispensados (feito por versão antiga)", () => {
      const r = m.backup.validarBackup(comDados((d) => delete d["alertasDispensados"]));
      expect(r.ok).toBe(true);
    });
  });
});

describe("último backup e alterações desde então", () => {
  it("conta alterações, zera ao fazer backup e lembra depois de recarregar", async () => {
    const { backup } = await carregar();
    expect(backup.useBackupMeta).toBeDefined();
    const { renderHook, act } = await import("@testing-library/react");
    const { result } = renderHook(() => backup.useBackupMeta());
    expect(result.current).toEqual({ ultimoBackup: null, alteracoes: 0 });
    act(() => {
      backup.registrarAlteracao();
      backup.registrarAlteracao();
    });
    expect(result.current.alteracoes).toBe(2);
    act(() => backup.marcarBackupFeito("2026-11-09T12:00:00.000Z"));
    expect(result.current).toEqual({ ultimoBackup: "2026-11-09T12:00:00.000Z", alteracoes: 0 });
    act(() => backup.registrarAlteracao());
    backup.salvarMeta();

    vi.resetModules();
    const depois = await import("./backup");
    const { result: r2 } = renderHook(() => depois.useBackupMeta());
    expect(r2.current).toEqual({ ultimoBackup: "2026-11-09T12:00:00.000Z", alteracoes: 1 });
  });

  it("dado ilegível no aparelho vira 'nunca fez backup'", async () => {
    localStorage.setItem("vanzeiro:backup", "{quebrado");
    vi.resetModules();
    const backup = await import("./backup");
    const { renderHook } = await import("@testing-library/react");
    expect(renderHook(() => backup.useBackupMeta()).result.current).toEqual({
      ultimoBackup: null,
      alteracoes: 0,
    });
  });

  it("o app conta cada mudança nos dados (só com a persistência ligada)", async () => {
    localStorage.clear();
    vi.resetModules();
    const store = await import("./store");
    const backup = await import("./backup");
    const { renderHook } = await import("@testing-library/react");
    const { act } = await import("@testing-library/react");
    const parar = store.iniciarPersistencia();
    const { result } = renderHook(() => backup.useBackupMeta());
    const antes = result.current.alteracoes;
    act(() => {
      store.salvarChavePix("a");
      store.salvarChavePix("b");
    });
    expect(result.current.alteracoes).toBe(antes + 2);
    parar();
  });
});

describe("cópia de segurança", () => {
  it("guarda, lê (inclusive depois de recarregar) e apaga", async () => {
    const { backup, store } = await carregar();
    expect(backup.lerCopiaDeSeguranca()).toBeNull();
    const dados = clonar(store.obterEstado());
    backup.guardarCopiaDeSeguranca(
      dados,
      "restauração de backup",
      new Date("2026-11-09T12:00:00Z"),
    );
    expect(backup.lerCopiaDeSeguranca()).toMatchObject({
      motivo: "restauração de backup",
      salvoEm: "2026-11-09T12:00:00.000Z",
    });

    vi.resetModules();
    const depois = await import("./backup");
    expect(depois.lerCopiaDeSeguranca()?.dados).toEqual(dados);
    depois.apagarCopiaDeSeguranca();
    expect(depois.lerCopiaDeSeguranca()).toBeNull();
    expect(localStorage.getItem("vanzeiro:copia-seguranca")).toBeNull();
  });

  it("cópia estragada no aparelho é ignorada", async () => {
    localStorage.setItem(
      "vanzeiro:copia-seguranca",
      JSON.stringify({ motivo: "x", salvoEm: "y", dados: { vans: "não" } }),
    );
    vi.resetModules();
    const backup = await import("./backup");
    expect(backup.lerCopiaDeSeguranca()).toBeNull();
  });
});

describe("substituir todos os dados (restaurar)", () => {
  it("troca tudo, recalcula o que cada passageiro deve e mantém o resto do app funcionando", async () => {
    const { store } = await carregar();
    const original = clonar(store.obterEstado());
    store.salvarChavePix("antes");
    store.excluirPassageiro("p3");
    const alterado = clonar(store.obterEstado());
    expect(alterado.passageiros).toHaveLength(21);

    store.substituirTodosOsDados(original);
    const e = store.obterEstado();
    expect(e.passageiros).toHaveLength(22);
    expect(e.chavePix).toBe("");
    for (const p of e.passageiros) {
      const deve = e.cobrancas
        .filter((c) => c.pid === p.id)
        .reduce(
          (s, c) =>
            s +
            Math.max(0, c.valor - c.pagamentos.reduce((t, x) => t + x.valor, 0)) *
              (c.cancelada ? 0 : 1),
          0,
        );
      expect(p.emAberto).toBeCloseTo(deve, 2);
    }
  });

  it("backup feito antes dos alertas dispensados (campo ausente) restaura sem quebrar", async () => {
    const { store } = await carregar();
    const { alertasDispensados: _x, ...antigo } = clonar(store.obterEstado());
    store.substituirTodosOsDados(antigo as Estado);
    expect(store.obterEstado().alertasDispensados).toEqual({});
  });

  it("restaura dados com o campo antigo passageiroAtualId, sem deixá-lo no estado", async () => {
    const { store } = await carregar();
    const velho = { ...clonar(store.obterEstado()), passageiroAtualId: "p9" } as Estado;
    store.substituirTodosOsDados(velho);
    expect("passageiroAtualId" in store.obterEstado()).toBe(false);
  });
});
