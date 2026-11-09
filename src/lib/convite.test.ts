import { expect, it } from "vitest";
import { conviteValido, linkConvite } from "./convite";

it("o link usa o endereço do app e protege o id", () => {
  expect(linkConvite("p3", "https://app.exemplo.com")).toBe("https://app.exemplo.com/convite/p3");
  expect(linkConvite("a b/c", "https://x.com")).toBe("https://x.com/convite/a%20b%2Fc");
});
it("no navegador usa o endereço atual", () => {
  expect(linkConvite("p3")).toBe(`${window.location.origin}/convite/p3`);
});
it("só entra quem recebeu o convite e está ativo", () => {
  expect(conviteValido({ ativo: true, convite: "enviado" })).toBe(true);
  expect(conviteValido({ ativo: true, convite: "no_app" })).toBe(true);
  expect(conviteValido({ ativo: true, convite: "nao_enviado" })).toBe(false);
  expect(conviteValido({ ativo: false, convite: "enviado" })).toBe(false);
  expect(conviteValido(undefined)).toBe(false);
});
