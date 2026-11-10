import { describe, expect, it } from "vitest";
import {
  cnpjValido,
  cpfValido,
  crc16,
  gerarPixCopiaECola,
  interpretarChavePix,
  pixComValor,
} from "./pix";

/** Lê o código Pix campo a campo (id, tamanho, valor) e confere que os tamanhos batem. */
function campos(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2);
    const n = Number(s.slice(i + 2, i + 4));
    expect(Number.isInteger(n), `tamanho do campo ${id}`).toBe(true);
    out[id] = s.slice(i + 4, i + 4 + n);
    expect(out[id]!.length, `campo ${id}`).toBe(n);
    i += 4 + n;
  }
  return out;
}

describe("CRC do Pix", () => {
  it("bate com o valor de referência do CRC-16/CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
  it("bate com o exemplo do manual do Banco Central", () => {
    const corpo =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(crc16(corpo)).toBe("1D3D");
  });
});

describe("Pix copia e cola", () => {
  const base = { chave: "12345678909", nome: "João da Silva", cidade: "Jacarezinho" };

  it("leva chave, valor, nome e cidade; nome e cidade sem acento e em maiúsculas", () => {
    const c = campos(gerarPixCopiaECola({ ...base, valor: 150 }));
    expect(c["00"]).toBe("01");
    expect(c["01"]).toBe("11"); // código estático, reutilizável
    expect(campos(c["26"]!)).toEqual({ "00": "br.gov.bcb.pix", "01": "12345678909" });
    expect(c["53"]).toBe("986");
    expect(c["54"]).toBe("150.00");
    expect(c["58"]).toBe("BR");
    expect(c["59"]).toBe("JOAO DA SILVA");
    expect(c["60"]).toBe("JACAREZINHO");
    expect(campos(c["62"]!)).toEqual({ "05": "***" });
  });

  it("o CRC no fim confere com o resto do código", () => {
    const cod = gerarPixCopiaECola({ ...base, valor: 87.5 });
    expect(cod.slice(-8, -4)).toBe("6304");
    expect(cod.slice(-4)).toBe(crc16(cod.slice(0, -4)));
  });

  it("valor com centavos arredondado; sem valor, o campo some (o passageiro digita)", () => {
    expect(campos(gerarPixCopiaECola({ ...base, valor: 10.005 }))["54"]).toBe("10.01");
    expect(campos(gerarPixCopiaECola({ ...base, valor: 0 }))["54"]).toBeUndefined();
    expect(campos(gerarPixCopiaECola(base))["54"]).toBeUndefined();
  });

  it("limita o nome a 25 e a cidade a 15 caracteres, e aceita identificador", () => {
    const c = campos(
      gerarPixCopiaECola({
        ...base,
        valor: 1,
        nome: "Maria Aparecida de Souza Albuquerque Lima",
        cidade: "São José do Rio Preto",
        txid: "ab-12 cd",
      }),
    );
    expect(c["59"]!.length).toBe(25);
    expect(c["60"]!.length).toBe(15);
    expect(campos(c["62"]!)["05"]).toBe("ab12cd");
  });

  it("nome ou cidade vazios caem em valores válidos", () => {
    const c = campos(gerarPixCopiaECola({ chave: "a@b.co", valor: 5, nome: "", cidade: "" }));
    expect(c["59"]).toBe("VANZEIRO");
    expect(c["60"]).toBe("BRASIL");
  });
});

describe("interpretar a chave Pix digitada", () => {
  it.each([
    ["maria@exemplo.com", { tipo: "email", chave: "maria@exemplo.com" }],
    ["Maria@Exemplo.com", { tipo: "email", chave: "maria@exemplo.com" }],
    [
      "123E4567-E12B-12D1-A456-426655440000",
      { tipo: "aleatoria", chave: "123e4567-e12b-12d1-a456-426655440000" },
    ],
    ["123.456.789-09", { tipo: "cpf", chave: "12345678909" }],
    ["11.222.333/0001-81", { tipo: "cnpj", chave: "11222333000181" }],
    ["(43) 99999-0001", { tipo: "celular", chave: "+5543999990001" }],
    ["43 3522-1234", { tipo: "celular", chave: "+554335221234" }],
    ["+55 43 99999-0001", { tipo: "celular", chave: "+5543999990001" }],
    ["5543999990001", { tipo: "celular", chave: "+5543999990001" }],
  ])("%s", (entrada, esperado) => {
    expect(interpretarChavePix(entrada)).toEqual(esperado);
  });

  it("11 números que são CPF válido e também parecem celular: pergunta", () => {
    expect(interpretarChavePix("43900000042")).toEqual({
      tipo: "ambigua",
      cpf: "43900000042",
      celular: "+5543900000042",
    });
    // Se só um dos dois serve, não precisa perguntar.
    expect(interpretarChavePix("12345678909")).toEqual({ tipo: "cpf", chave: "12345678909" });
    expect(interpretarChavePix("43999990001")).toEqual({
      tipo: "celular",
      chave: "+5543999990001",
    });
    // E ambíguo nunca vira código Pix sem a pessoa escolher.
    expect(pixComValor("43900000042", 10, { nome: "A", cidade: "B" })).toBeNull();
  });

  it.each(["", "   ", "minha chave", "123", "000.000.000-00", "abc@", "12.345.678/0001-00"])(
    "'%s' não é uma chave reconhecida",
    (entrada) => {
      expect(interpretarChavePix(entrada)).toEqual({ tipo: "invalida" });
    },
  );

  it("valida os dígitos do CPF e do CNPJ", () => {
    expect(cpfValido("123.456.789-09")).toBe(true);
    expect(cpfValido("123.456.789-10")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
  });
});

describe("pixComValor", () => {
  const van = { nome: "João Batista", cidade: "Jacarezinho" };
  it("gera o código a partir do que o vanzeiro digitou", () => {
    const cod = pixComValor("(43) 99999-0001", 150, van, "cob1")!;
    const c = campos(cod);
    expect(campos(c["26"]!)["01"]).toBe("+5543999990001");
    expect(c["54"]).toBe("150.00");
    expect(campos(c["62"]!)["05"]).toBe("cob1");
  });
  it("chave não reconhecida ou ambígua: não gera (melhor sem código do que um código errado)", () => {
    expect(pixComValor("minha chave", 10, van)).toBeNull();
    expect(pixComValor("", 10, van)).toBeNull();
  });
});
