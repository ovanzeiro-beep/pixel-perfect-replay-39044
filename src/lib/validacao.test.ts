import { describe, it, expect } from "vitest";
import { placaValida, validarVan, validarMotorista } from "./validacao";

describe("validação", () => {
  it("aceita placa antiga e Mercosul, recusa inválida", () => {
    expect(placaValida("ABC-1234")).toBe(true);
    expect(placaValida("abc1d23")).toBe(true);
    expect(placaValida("AB-12345")).toBe(false);
  });
  it("lugares entre 1 e 30", () => {
    expect(validarVan({ apelido: "A", placa: "ABC1234", lugares: "0" }).lugares).toBeDefined();
    expect(validarVan({ apelido: "A", placa: "ABC1234", lugares: "31" }).lugares).toBeDefined();
    expect(validarVan({ apelido: "A", placa: "ABC1234", lugares: "30" }).lugares).toBeUndefined();
  });
  it("apelido, placa e lugares obrigatórios", () => {
    const e = validarVan({ apelido: "", placa: "", lugares: "" });
    expect(Object.keys(e).sort()).toEqual(["apelido", "lugares", "placa"]);
  });
  it("nome e telefone do motorista obrigatórios", () => {
    expect(Object.keys(validarMotorista({ nome: "", telefone: "" })).sort()).toEqual(["nome", "telefone"]);
  });
});

import { validarLinha } from "./validacao";
describe("validação de linha", () => {
  it("nome obrigatório", () => {
    expect(validarLinha({ nome: "", frequencia: "semanal", dias: ["seg"], data: "" }).nome).toBeDefined();
    expect(validarLinha({ nome: "X", frequencia: "semanal", dias: ["seg"], data: "" })).toEqual({});
  });
});

import { validarPassageiro, mensagemConvite } from "./validacao";
describe("passageiro", () => {
  it("nome e telefone com DDD obrigatórios", () => {
    expect(Object.keys(validarPassageiro({ nome: "", telefone: "", valor: "" })).sort()).toEqual(["nome", "telefone", "valor"]);
    expect(validarPassageiro({ nome: "A", telefone: "99999-9999", valor: "150" }).telefone).toBeDefined();
    expect(validarPassageiro({ nome: "A", telefone: "(43) 99999-9999", valor: "150" })).toEqual({});
  });
  it("mensagem do convite", () => {
    expect(mensagemConvite("Maria", "João Batista", "L")).toBe("Olá, Maria! Aqui é o João Batista, da van. Agora você pode confirmar suas viagens e ver seus pagamentos pelo app O Vanzeiro. É só tocar no link e entrar com sua conta Google: L");
  });
});

import { telefoneValido } from "./validacao";
describe("telefone", () => {
  it("aceita celular e fixo com DDD", () => {
    expect(telefoneValido("(43) 99812-4471")).toBe(true);
    expect(telefoneValido("4333221100")).toBe(true);
  });
  it("recusa DDD inválido, celular sem 9 e tamanhos errados", () => {
    expect(telefoneValido("(03) 99812-4471")).toBe(false);
    expect(telefoneValido("(43) 89812-4471")).toBe(false);
    expect(telefoneValido("99812-4471")).toBe(false);
    expect(telefoneValido("(43) 99812-44711")).toBe(false);
    expect(telefoneValido("")).toBe(false);
  });
});

describe("passageiro: valor e vencimento", () => {
  const base = { nome: "A", telefone: "(43) 99999-9999", valor: "150" };
  it("valor é obrigatório e precisa ser positivo", () => {
    expect(validarPassageiro({ ...base, valor: "" }).valor).toBeDefined();
    expect(validarPassageiro({ ...base, valor: "0" }).valor).toBeDefined();
    expect(validarPassageiro({ ...base, valor: "abc" }).valor).toBeDefined();
    expect(validarPassageiro({ ...base, valor: "150,50" }).valor).toBeUndefined();
  });
  it("semanal e mensal exigem vencimento; por viagem não", () => {
    expect(validarPassageiro({ ...base, formaPagamento: "semanal", vencimento: "" }).vencimento).toBeDefined();
    expect(validarPassageiro({ ...base, formaPagamento: "mensal", vencimento: "" }).vencimento).toBeDefined();
    expect(validarPassageiro({ ...base, formaPagamento: "semanal", vencimento: "sexta" })).toEqual({});
    expect(validarPassageiro({ ...base, formaPagamento: "mensal", vencimento: "5" })).toEqual({});
    expect(validarPassageiro({ ...base, formaPagamento: "por_viagem", vencimento: "" })).toEqual({});
  });
  it("telefone de emergência é opcional, mas se vier precisa estar completo", () => {
    expect(validarPassageiro({ ...base, emergenciaTelefone: "" })).toEqual({});
    expect(validarPassageiro({ ...base, emergenciaTelefone: "1234" }).emergenciaTelefone).toBeDefined();
    expect(validarPassageiro({ ...base, emergenciaTelefone: "(43) 99701-5566" })).toEqual({});
  });
});
