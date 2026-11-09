import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHAVE, VERSAO } from "./persistencia";
import { ESTADOS_BR, validarPerfil } from "@/lib/validacao";

async function carregar() {
  localStorage.clear();
  vi.resetModules();
  return await import("./store");
}

const perfil = {
  nome: "  Maria Souza ",
  cidade: " Londrina ",
  estado: "pr",
  telefone: "(43) 99999-0000",
  email: "",
};

describe("conta vazia", () => {
  it("não tem nenhum dado e o perfil está por preencher", async () => {
    const s = await carregar();
    const v = s.criarEstadoVazio();
    expect(v.perfil).toEqual({
      nome: "",
      cidade: "",
      estado: "",
      telefone: "",
      email: "",
      configurado: false,
    });
    for (const k of [
      "vans",
      "motoristas",
      "linhas",
      "passageiros",
      "cobrancas",
      "recibos",
      "gastos",
    ] as const)
      expect(v[k]).toEqual([]);
    expect(v.ajustes).toEqual({});
    expect(v.chavePix).toBe("");
  });

  it("o estado de exemplo traz o vanzeiro de exemplo já configurado", async () => {
    const s = await carregar();
    expect(s.criarEstadoExemplo().perfil).toMatchObject({
      nome: "João Batista",
      cidade: "Jacarezinho",
      estado: "PR",
      configurado: true,
    });
  });
});

describe("primeiro acesso x quem já usa o app", () => {
  it("nada salvo (primeiro acesso): a conta começa vazia e sem perfil", async () => {
    const s = await carregar();
    const parar = s.iniciarPersistencia();
    expect(s.obterEstado().perfil.configurado).toBe(false);
    expect(s.obterEstado().passageiros).toEqual([]);
    parar();
  });

  it("quem tem dados salvos continua com os dados dele", async () => {
    const s = await carregar();
    const { gravar } = await import("./persistencia");
    gravar(localStorage, s.criarEstadoExemplo());
    vi.resetModules();
    const s2 = await import("./store");
    const parar = s2.iniciarPersistencia();
    expect(s2.obterEstado().passageiros).toHaveLength(22);
    expect(s2.obterEstado().perfil.configurado).toBe(true);
    parar();
  });

  it("dados salvos por versões antigas (sem perfil) continuam como estão, com o vanzeiro de exemplo já configurado", async () => {
    const s = await carregar();
    const { perfil: _antigo, ...semPerfil } = JSON.parse(JSON.stringify(s.criarEstadoExemplo()));
    localStorage.setItem(CHAVE, JSON.stringify({ versao: VERSAO, salvoEm: "x", dados: semPerfil }));
    vi.resetModules();
    const s2 = await import("./store");
    const parar = s2.iniciarPersistencia();
    expect(s2.obterEstado().passageiros).toHaveLength(22);
    expect(s2.obterEstado().perfil).toMatchObject({ nome: "João Batista", configurado: true });
    parar();
  });

  it("restaurar um backup antigo (sem perfil) também não derruba nada", async () => {
    const s = await carregar();
    const { perfil: _antigo, ...semPerfil } = JSON.parse(JSON.stringify(s.criarEstadoExemplo()));
    s.substituirTodosOsDados(semPerfil);
    expect(s.obterEstado().perfil.configurado).toBe(true);
  });
});

describe("salvar o perfil", () => {
  it("conclui o primeiro acesso, limpa os espaços e põe o estado em maiúsculas", async () => {
    const s = await carregar();
    s.substituirTodosOsDados(s.criarEstadoVazio());
    s.salvarPerfil(perfil);
    expect(s.obterEstado().perfil).toEqual({
      nome: "Maria Souza",
      cidade: "Londrina",
      estado: "PR",
      telefone: "(43) 99999-0000",
      email: "",
      configurado: true,
    });
  });

  it("cria o motorista 'próprio' (o vanzeiro dirige) na primeira vez", async () => {
    const s = await carregar();
    s.substituirTodosOsDados(s.criarEstadoVazio());
    s.salvarPerfil(perfil);
    const m = s.obterEstado().motoristas;
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({
      nome: "Maria Souza",
      telefone: "(43) 99999-0000",
      proprio: true,
      cnhValidade: "",
    });
  });

  it("salvar de novo atualiza o mesmo motorista, sem duplicar nem mexer nos outros", async () => {
    const s = await carregar();
    s.substituirTodosOsDados(s.criarEstadoVazio());
    s.salvarPerfil(perfil);
    s.salvarMotorista({
      nome: "Carlos",
      telefone: "(43) 98888-0000",
      cnh: "D",
      cnhValidade: "2030-01-01",
      vanId: "",
    });
    s.salvarPerfil({ ...perfil, nome: "Maria Souza Lima", telefone: "(43) 97777-1111" });
    const m = s.obterEstado().motoristas;
    expect(m).toHaveLength(2);
    expect(m.find((x) => x.proprio)).toMatchObject({
      nome: "Maria Souza Lima",
      telefone: "(43) 97777-1111",
    });
    expect(m.find((x) => !x.proprio)).toMatchObject({ nome: "Carlos", cnhValidade: "2030-01-01" });
  });

  it("com dados de exemplo, atualiza o motorista próprio que já existe", async () => {
    const s = await carregar();
    s.salvarPerfil({ ...perfil, nome: "Outro Nome" });
    const proprios = s.obterEstado().motoristas.filter((m) => m.proprio);
    expect(proprios).toHaveLength(1);
    expect(proprios[0]!.nome).toBe("Outro Nome");
  });

  it("o motorista próprio continua não podendo ser excluído", async () => {
    const s = await carregar();
    s.substituirTodosOsDados(s.criarEstadoVazio());
    s.salvarPerfil(perfil);
    const id = s.obterEstado().motoristas[0]!.id;
    s.excluirMotorista(id);
    expect(s.obterEstado().motoristas).toHaveLength(1);
  });

  it("o perfil vai junto no backup e volta na restauração", async () => {
    const s = await carregar();
    const b = await import("./backup");
    s.substituirTodosOsDados(s.criarEstadoVazio());
    s.salvarPerfil(perfil);
    const r = b.validarBackup(b.serializarBackup(b.criarBackup(s.obterEstado())));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s.comecarDoZero();
    expect(s.obterEstado().perfil.configurado).toBe(false);
    s.substituirTodosOsDados(r.backup.dados);
    expect(s.obterEstado().perfil).toMatchObject({ nome: "Maria Souza", configurado: true });
  });

  it("backup com o perfil estragado é recusado", async () => {
    const s = await carregar();
    const b = await import("./backup");
    const bk = JSON.parse(b.serializarBackup(b.criarBackup(s.criarEstadoExemplo())));
    bk.dados.perfil = { nome: 5 };
    bk.integridade = b.assinatura(bk.dados);
    const r = b.validarBackup(JSON.stringify(bk));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/dados do vanzeiro/);
  });
});

describe("começar do zero", () => {
  it("apaga tudo e volta ao primeiro acesso", async () => {
    const s = await carregar();
    expect(s.obterEstado().passageiros.length).toBeGreaterThan(0);
    s.comecarDoZero();
    expect(s.obterEstado()).toEqual(s.criarEstadoVazio());
  });
});

describe("validar o perfil", () => {
  const ok = { nome: "Maria", telefone: "(43) 99999-0000", cidade: "Londrina", estado: "PR" };
  it("aceita dados completos", () => {
    expect(validarPerfil(ok)).toEqual({});
    expect(validarPerfil({ ...ok, estado: "pr" })).toEqual({});
  });
  it("pede cada campo que falta, em português", () => {
    expect(validarPerfil({ nome: "", telefone: "", cidade: "", estado: "" })).toEqual({
      nome: "Escreva seu nome.",
      telefone: "Escreva seu celular, com DDD.",
      cidade: "Escreva a sua cidade.",
      estado: "Escolha o estado.",
    });
  });
  it("nome de uma letra só e telefone sem DDD são recusados", () => {
    expect(validarPerfil({ ...ok, nome: "M" }).nome).toBeDefined();
    expect(validarPerfil({ ...ok, telefone: "99999-0000" }).telefone).toMatch(/incompleto/);
    expect(validarPerfil({ ...ok, estado: "XX" }).estado).toBeDefined();
  });
  it("tem os 27 estados", () => {
    expect(ESTADOS_BR).toHaveLength(27);
    expect(new Set(ESTADOS_BR).size).toBe(27);
  });
});

describe("as telas não usam mais o vanzeiro fixo", () => {
  it("só o exemplo (e a criação do estado de exemplo) conhecem o 'João Batista'", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const c = join(dir, n);
        if (statSync(c).isDirectory()) varrer(c);
        else if (
          /\.(ts|tsx)$/.test(n) &&
          !/\.test\./.test(n) &&
          !/(exemplo|store)\.ts$/.test(n) &&
          !c.includes("routeTree")
        ) {
          const t = readFileSync(c, "utf8");
          if (
            /import \{[^}]*\bvanzeiro\b[^}]*\} from "@\/data\/exemplo"/.test(t) ||
            /João Batista/.test(t)
          )
            achados.push(c);
        }
      }
    };
    varrer("src");
    expect(achados).toEqual([]);
  });
});
