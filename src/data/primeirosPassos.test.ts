import { describe, expect, it } from "vitest";
import { guiaVisivel, passosIniciais } from "./primeirosPassos";

const vazio = { vans: [], linhas: [], passageiros: [], chavePix: "" };
const semBackup = { ultimoBackup: null };
const van = { id: "v" } as never;
const linha = { id: "l" } as never;
const pas = (convite: "nao_enviado" | "enviado" | "no_app") => ({ id: "p", convite }) as never;

describe("passos iniciais", () => {
  it("conta nova: tudo por fazer, na ordem certa", () => {
    const p = passosIniciais(vazio, semBackup);
    expect(p.map((x) => x.id)).toEqual([
      "van",
      "linha",
      "passageiros",
      "convites",
      "pix",
      "backup",
    ]);
    expect(p.every((x) => !x.feito)).toBe(true);
    expect(p.filter((x) => x.essencial).map((x) => x.id)).toEqual(["van", "linha", "passageiros"]);
  });
  it("marca o que já foi feito", () => {
    const p = passosIniciais(
      { vans: [van], linhas: [linha], passageiros: [pas("enviado")], chavePix: "abc" },
      { ultimoBackup: "2026-11-09T10:00:00Z" },
    );
    expect(p.every((x) => x.feito)).toBe(true);
  });
  it("convite só conta se algum passageiro já recebeu", () => {
    const f = (c: "nao_enviado" | "enviado" | "no_app") =>
      passosIniciais({ ...vazio, passageiros: [pas(c)] }, semBackup).find(
        (x) => x.id === "convites",
      )!.feito;
    expect(f("nao_enviado")).toBe(false);
    expect(f("enviado")).toBe(true);
    expect(f("no_app")).toBe(true);
  });
  it("chave Pix só com espaços não conta", () => {
    expect(
      passosIniciais({ ...vazio, chavePix: "   " }, semBackup).find((x) => x.id === "pix")!.feito,
    ).toBe(false);
  });
  it("cada passo leva a uma tela que existe", () => {
    const destinos = new Set(passosIniciais(vazio, semBackup).map((x) => x.destino));
    expect([...destinos].sort()).toEqual([
      "/vanzeiro/linhas",
      "/vanzeiro/passageiros",
      "/vanzeiro/perfil",
      "/vanzeiro/vans",
    ]);
  });
});

describe("quando o guia aparece", () => {
  it("aparece enquanto falta algum passo essencial", () => {
    expect(guiaVisivel(passosIniciais(vazio, semBackup), false)).toBe(true);
    expect(
      guiaVisivel(passosIniciais({ ...vazio, vans: [van], linhas: [linha] }, semBackup), false),
    ).toBe(true);
  });
  it("some quando van, linha e passageiros estão cadastrados, mesmo faltando Pix e backup", () => {
    const p = passosIniciais(
      { vans: [van], linhas: [linha], passageiros: [pas("nao_enviado")], chavePix: "" },
      semBackup,
    );
    expect(guiaVisivel(p, false)).toBe(false);
  });
  it("some se a pessoa escondeu", () => {
    expect(guiaVisivel(passosIniciais(vazio, semBackup), true)).toBe(false);
  });
});
