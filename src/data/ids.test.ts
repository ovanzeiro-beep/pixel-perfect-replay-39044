import { expect, it } from "vitest";
import { novoId } from "./ids";

it("gera ids únicos mesmo no mesmo milissegundo", () => {
  const ids = new Set(Array.from({ length: 5000 }, () => novoId("p")));
  expect(ids.size).toBe(5000);
});

it("mantém o prefixo", () => {
  expect(novoId("van").startsWith("van")).toBe(true);
});
