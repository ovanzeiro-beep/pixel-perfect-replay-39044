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
