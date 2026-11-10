import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG_COBRANCA_PADRAO, configDaCobranca } from "./tipos";
import { TEXTO_COBRANCA_PADRAO, mensagemCobrar, preencherTextoCobranca } from "./cobrancas";

type Loja = typeof import("./store");
let s: Loja;
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  s = await import("./store");
});

describe("configuração de cobrança", () => {
  it("sem nada salvo valem os padrões", () => {
    expect(configDaCobranca({})).toEqual(CONFIG_COBRANCA_PADRAO);
    expect(configDaCobranca(s.obterEstado())).toEqual(CONFIG_COBRANCA_PADRAO);
  });

  it("muda só o que foi informado e guarda o resto", () => {
    s.salvarConfigCobranca({ diasDeAviso: 5 });
    s.salvarConfigCobranca({ pagaNaHoraPadrao: true });
    expect(configDaCobranca(s.obterEstado())).toEqual({
      diasDeAviso: 5,
      textoCobranca: "",
      pagaNaHoraPadrao: true,
    });
  });

  it("dias de aviso ficam entre 1 e 7 e são inteiros", () => {
    s.salvarConfigCobranca({ diasDeAviso: 0 });
    expect(configDaCobranca(s.obterEstado()).diasDeAviso).toBe(1);
    s.salvarConfigCobranca({ diasDeAviso: 30 });
    expect(configDaCobranca(s.obterEstado()).diasDeAviso).toBe(7);
    s.salvarConfigCobranca({ diasDeAviso: 3.6 });
    expect(configDaCobranca(s.obterEstado()).diasDeAviso).toBe(4);
    s.salvarConfigCobranca({ diasDeAviso: Number.NaN });
    expect(configDaCobranca(s.obterEstado()).diasDeAviso).toBe(4);
  });

  it("o texto da mensagem é limitado a 600 caracteres", () => {
    s.salvarConfigCobranca({ textoCobranca: "x".repeat(900) });
    expect(configDaCobranca(s.obterEstado()).textoCobranca).toHaveLength(600);
  });

  it("a configuração entra no backup e volta na restauração (faz parte do estado)", () => {
    s.salvarConfigCobranca({ diasDeAviso: 3, textoCobranca: "Oi {nome}, são {valor}." });
    const copia = JSON.parse(JSON.stringify(s.obterEstado()));
    s.restaurarExemplo();
    expect(configDaCobranca(s.obterEstado()).diasDeAviso).toBe(2);
    s.substituirTodosOsDados(copia);
    expect(configDaCobranca(s.obterEstado())).toMatchObject({
      diasDeAviso: 3,
      textoCobranca: "Oi {nome}, são {valor}.",
    });
  });
});

describe("texto da mensagem de cobrança", () => {
  const d = { nome: "Ana", valor: "R$ 90,00", referencia: "Semana 02", pix: "chave" };

  it("troca os quatro marcadores, todas as vezes que aparecem", () => {
    expect(preencherTextoCobranca("{nome}! {nome}, {valor} ({referencia}) Pix {pix}", d)).toBe(
      "Ana! Ana, R$ 90,00 (Semana 02) Pix chave",
    );
  });

  it("marcador desconhecido fica como está (não some nem quebra)", () => {
    expect(preencherTextoCobranca("Oi {nome} {foo}", d)).toBe("Oi Ana {foo}");
  });

  it("modelo vazio ou só espaços usa o padrão", () => {
    const padrao = mensagemCobrar("Ana", 90, ["Semana 02"], "chave");
    expect(mensagemCobrar("Ana", 90, ["Semana 02"], "chave", null, "")).toBe(padrao);
    expect(mensagemCobrar("Ana", 90, ["Semana 02"], "chave", null, "   ")).toBe(padrao);
    expect(padrao).toBe(
      preencherTextoCobranca(TEXTO_COBRANCA_PADRAO, {
        ...d,
        valor: padrao.match(/R\$\s90,00/)![0],
      }),
    );
  });

  it("modelo próprio vale, e o Pix copia e cola continua indo no fim", () => {
    const m = mensagemCobrar(
      "Ana",
      90,
      ["Semana 02"],
      "chave",
      "CODIGO123",
      "Oi {nome}, são {valor}.",
    );
    expect(m.startsWith("Oi Ana, são R$")).toBe(true);
    expect(m.endsWith("\n\nPix copia e cola (já com o valor):\nCODIGO123")).toBe(true);
  });
});
