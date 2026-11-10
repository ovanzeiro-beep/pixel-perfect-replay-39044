import { describe, expect, it } from "vitest";
import {
  analisarImportacao,
  formatarTelefone,
  lerForma,
  lerTabela,
  lerValor,
  mapearColunas,
  modeloDeImportacao,
  type Contexto,
} from "./importacao";

const ctx: Contexto = {
  linhas: [
    { id: "l1", nome: "Manhã Centro", valorViagem: 12, valorMensal: 220 },
    { id: "l2", nome: "Tarde Escola", valorViagem: 10, valorMensal: 200 },
  ],
  existentes: [{ nome: "Ana Antiga", telefone: "(43) 99999-0001" }],
  cidadePadrao: "Londrina",
  pagaNaHoraPadrao: false,
};
const analisar = (texto: string, c: Contexto = ctx) => analisarImportacao(lerTabela(texto), c);

describe("lerTabela", () => {
  it("detecta ponto e vírgula, vírgula e tabulação", () => {
    expect(lerTabela("a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(lerTabela("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(lerTabela("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  it("respeita aspas e tira a marca BOM", () => {
    const bom = String.fromCharCode(0xfeff);
    expect(lerTabela(`${bom}nome;obs\n"Silva; João";"diz ""oi"""`)).toEqual([
      ["nome", "obs"],
      ["Silva; João", 'diz "oi"'],
    ]);
  });
  it("ignora linhas vazias e aceita quebra de linha do Windows", () => {
    expect(lerTabela("a;b\r\n\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("leitura de campos", () => {
  it("formata telefone com e sem 55 e recusa incompleto", () => {
    expect(formatarTelefone("43999990002")).toBe("(43) 99999-0002");
    expect(formatarTelefone("+55 (43) 99999-0002")).toBe("(43) 99999-0002");
    expect(formatarTelefone("9999-0002")).toBeNull();
  });
  it("lê valores em formato brasileiro", () => {
    expect(lerValor("R$ 150,00")).toBe(150);
    expect(lerValor("1.250,50")).toBe(1250.5);
    expect(lerValor("abc")).toBeNull();
  });
  it("entende a forma de pagamento", () => {
    expect(lerForma("Mensal")).toBe("mensal");
    expect(lerForma("por viagem")).toBe("por_viagem");
    expect(lerForma("Semanal")).toBe("semanal");
    expect(lerForma("outra")).toBeNull();
  });
  it("reconhece sinônimos de cabeçalho e assume ordem sem cabeçalho", () => {
    const a = mapearColunas(["Nome completo", "Celular", "Xpto"]);
    expect(a.temCabecalho).toBe(true);
    expect(a.ignoradas).toEqual(["Xpto"]);
    expect(mapearColunas(["Maria", "43999990009", "150"]).temCabecalho).toBe(false);
  });
});

describe("analisarImportacao", () => {
  const cab = "Nome;Telefone;Linha;Forma de pagamento;Valor;Vencimento";

  it("aceita uma linha completa mensal", () => {
    const { itens } = analisar(`${cab}\nBia Souza;43999990002;Manhã Centro;mensal;220;10`);
    expect(itens).toHaveLength(1);
    expect(itens[0]!.situacao).toBe("novo");
    expect(itens[0]!.linhaNaPlanilha).toBe(2);
    expect(itens[0]!.dados).toMatchObject({
      nome: "Bia Souza",
      telefone: "(43) 99999-0002",
      linhaIds: ["l1"],
      formaPagamento: "mensal",
      valor: 220,
      vencimento: "10",
      cidade: "Londrina",
      convite: "nao_enviado",
      ativo: true,
    });
  });

  it("usa o valor da linha quando a planilha não traz e avisa", () => {
    const { itens } = analisar(`${cab}\nCaio;43999990003;Tarde Escola;mensal;;5`);
    expect(itens[0]!.situacao).toBe("novo");
    expect(itens[0]!.dados!.valor).toBe(200);
    expect(itens[0]!.avisos.join(" ")).toMatch(/valor da linha/);
  });

  it("limita o vencimento mensal ao dia 28 com aviso", () => {
    const { itens } = analisar(`${cab}\nDeda;43999990004;;mensal;100;31`);
    expect(itens[0]!.dados!.vencimento).toBe("28");
    expect(itens[0]!.avisos.join(" ")).toMatch(/dia 28/);
  });

  it("aceita semanal com o dia da semana", () => {
    const { itens } = analisar(`${cab}\nEdu;43999990005;;semanal;50;sexta`);
    expect(itens[0]!.situacao).toBe("novo");
    expect(itens[0]!.dados!.formaPagamento).toBe("semanal");
  });

  it("marca erro: sem nome, telefone incompleto, valor inválido, forma desconhecida", () => {
    const { itens } = analisar(
      [
        cab,
        ";43999990006;;mensal;100;5",
        "Fábio;9999;;mensal;100;5",
        "Gina;43999990007;;mensal;abc;5",
        "Hugo;43999990008;;quinzenal;100;5",
      ].join("\n"),
    );
    expect(itens.map((i) => i.situacao)).toEqual(["erro", "erro", "erro", "erro"]);
    expect(itens.every((i) => i.dados === null)).toBe(true);
    expect(itens[0]!.problemas.join(" ")).toMatch(/nome/);
    expect(itens[1]!.problemas.join(" ")).toMatch(/Telefone incompleto/);
    expect(itens[2]!.problemas.join(" ")).toMatch(/Valor inválido/);
    expect(itens[3]!.problemas.join(" ")).toMatch(/Forma de pagamento/);
  });

  it("marca duplicado contra o cadastro e dentro da própria planilha", () => {
    const { itens } = analisar(
      [
        cab,
        "Outra Ana;(43) 99999-0001;;mensal;100;5",
        "Iara;43999990010;;mensal;100;5",
        "Iara de novo;+55 43 99999-0010;;mensal;100;5",
      ].join("\n"),
    );
    expect(itens.map((i) => i.situacao)).toEqual(["duplicado", "novo", "duplicado"]);
    expect(itens[0]!.avisos[0]).toMatch(/Ana Antiga/);
    expect(itens[2]!.avisos[0]).toMatch(/linha 3/);
    expect(itens[2]!.dados).toBeNull();
  });

  it("avisa linha não encontrada mas ainda importa", () => {
    const { itens } = analisar(`${cab}\nJoão;43999990011;Linha Fantasma;mensal;100;5`);
    expect(itens[0]!.situacao).toBe("novo");
    expect(itens[0]!.dados!.linhaIds).toEqual([]);
    expect(itens[0]!.avisos.join(" ")).toMatch(/não encontrada/);
  });

  it("marca pagaNaHora só por viagem e com o padrão ligado", () => {
    const t = `${cab}\nKaren;43999990012;;por viagem;12;\nLeo;43999990013;;mensal;100;5`;
    const on = analisar(t, { ...ctx, pagaNaHoraPadrao: true }).itens;
    expect(on[0]!.dados!.pagaNaHora).toBe(true);
    expect(on[1]!.dados!.pagaNaHora).toBeUndefined();
    expect(analisar(t).itens[0]!.dados!.pagaNaHora).toBeUndefined();
  });

  it("texto vazio não gera itens", () => {
    expect(analisar("").itens).toEqual([]);
  });

  it("o modelo de exemplo é aceito sem erros", () => {
    const { itens } = analisar(modeloDeImportacao());
    expect(itens.length).toBeGreaterThan(0);
    expect(itens.filter((i) => i.situacao === "erro")).toEqual([]);
  });
});
