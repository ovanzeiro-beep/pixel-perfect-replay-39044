import { describe, expect, it } from "vitest";
import {
  opCancelarViagem,
  opChamadaNaParada,
  opDesfazerEntrega,
  opDesfazerMarcacao,
  opEncerrarParada,
  opEncerrarViagem,
  opEntregar,
  opExtraNaViagem,
  opExtraNaVolta,
  opIniciarEntregas,
  opIniciarIda,
  opIniciarParada,
  opIniciarVolta,
  opMarcarEmbarque,
  opMudarFase,
  opPresencasNaParada,
  opReordenarEntregas,
  opReordenarFaltam,
  opStatusNaVolta,
  opTrocarVanOuMotorista,
} from "./operacoesViagem";
import { novaVolta, vazio, type Ajuste } from "./viagens";

const base = (): Ajuste => vazio();
const comIda = (): Ajuste => opIniciarIda(base(), ["a", "b", "c"], 1000)!;
const comVolta = (): Ajuste => opIniciarVolta(comIda(), novaVolta(2000))!;

describe("operações pequenas de viagem (puras)", () => {
  it("iniciar a ida só vale uma vez e não em viagem cancelada", () => {
    const aj = comIda();
    expect(aj.ida).toMatchObject({
      ordem: ["a", "b", "c"],
      marcas: [],
      fase: "paradas",
      inicio: 1000,
    });
    expect(opIniciarIda(aj, ["x"], 5)).toBeNull();
    expect(opIniciarIda(opCancelarViagem(base())!, ["x"], 5)).toBeNull();
  });

  it("operações da ida sem ida não fazem nada", () => {
    expect(opMarcarEmbarque(base(), "a", "embarcou", 0)).toBeNull();
    expect(opMudarFase(base(), "chegou")).toBeNull();
    expect(opDesfazerMarcacao(base())).toBeNull();
    expect(opPresencasNaParada(base(), "ida", { a: "app" })).toBeNull();
  });

  it("marcar embarque não marca duas vezes o mesmo passageiro; desfazer tira a última e volta à fase de paradas", () => {
    let aj = opMarcarEmbarque(comIda(), "a", "embarcou", 150)!;
    expect(opMarcarEmbarque(aj, "a", "embarcou", 150)).toBeNull();
    aj = opMarcarEmbarque(aj, "b", "faltou", 0)!;
    aj = opMudarFase(aj, "a_caminho")!;
    const r = opDesfazerMarcacao(aj)!;
    expect(r.desfeita).toEqual({ pid: "b", r: "faltou", cobrou: 0 });
    expect(r.ajuste.ida!.marcas.map((m) => m.pid)).toEqual(["a"]);
    expect(r.ajuste.ida!.fase).toBe("paradas");
  });

  it("reordenar só mexe em quem falta; quem já embarcou fica na frente", () => {
    const aj = opMarcarEmbarque(comIda(), "a", "embarcou", 0)!;
    expect(opReordenarFaltam(aj, ["c", "b"])!.ida!.ordem).toEqual(["a", "c", "b"]);
  });

  it("mudar a fase igual à atual não faz nada; encerrar só vale uma vez", () => {
    const aj = comIda();
    expect(opMudarFase(aj, "paradas")).toBeNull();
    const fim = opEncerrarViagem(aj, 9)!;
    expect(fim.ida!.encerrada).toBe(9);
    expect(opEncerrarViagem(fim, 10)).toBeNull();
  });

  it("parada: iniciar, marcar presenças SOMANDO ao que já existe, chamar e encerrar", () => {
    let aj = opIniciarParada(comIda(), "ida", 10, "Posto", 5000)!;
    expect(opIniciarParada(aj, "ida", 5, "Outro", 6000)).toBeNull();
    aj = opPresencasNaParada(aj, "ida", { a: "app" })!;
    aj = opPresencasNaParada(aj, "ida", { b: "manual" })!;
    expect(aj.ida!.parada!.naVan).toEqual({ a: "app", b: "manual" });
    aj = opPresencasNaParada(aj, "ida", { a: null })!;
    expect(aj.ida!.parada!.naVan).toEqual({ b: "manual" });
    aj = opChamadaNaParada(aj, "ida")!;
    expect(aj.ida!.parada!.chamada).toBe(true);
    expect(opChamadaNaParada(aj, "ida")).toBeNull();
    const fim = opEncerrarParada(aj, "ida", "conta", 9000)!;
    expect(fim.ida!.parada).toBeUndefined();
    expect(opEncerrarParada(fim, "ida", "x", 9500)).toBeNull();
  });

  it("parada da volta é independente da parada da ida", () => {
    let aj = opIniciarParada(comVolta(), "volta", 5, "Praça", 1)!;
    expect(aj.ida!.parada).toBeUndefined();
    aj = opPresencasNaParada(aj, "volta", { a: "manual" })!;
    expect(aj.ida!.volta!.parada!.naVan).toEqual({ a: "manual" });
    expect(opPresencasNaParada(aj, "ida", { a: "manual" })).toBeNull();
  });

  it("volta: status SOMA ao que já existe (a resposta do passageiro não some quando o vanzeiro marca outro)", () => {
    let aj = opStatusNaVolta(comVolta(), { a: { r: "na_van", via: "app" } })!;
    aj = opStatusNaVolta(aj, { b: { r: "nao", motivo: "x" } })!;
    expect(Object.keys(aj.ida!.volta!.status).sort()).toEqual(["a", "b"]);
    aj = opStatusNaVolta(aj, { a: null })!;
    expect(Object.keys(aj.ida!.volta!.status)).toEqual(["b"]);
  });

  it("volta: extras e entregas não repetem a mesma pessoa; desfazer tira a última; reordenar mantém quem já foi", () => {
    let aj = opExtraNaVolta(comVolta(), "z", 50)!;
    expect(opExtraNaVolta(aj, "z", 50)).toBeNull();
    aj = opIniciarEntregas(aj, ["a", "b", "c"])!;
    expect(aj.ida!.volta!.fase).toBe("entrega");
    aj = opEntregar(aj, "a", "entregue")!;
    expect(opEntregar(aj, "a", "entregue")).toBeNull();
    aj = opEntregar(aj, "b", "outro", "Praça")!;
    expect(aj.ida!.volta!.entregas[1]).toEqual({ pid: "b", r: "outro", onde: "Praça" });
    expect(opReordenarEntregas(aj, ["c"])!.ida!.volta!.ordem).toEqual(["a", "b", "c"]);
    aj = opDesfazerEntrega(aj)!;
    expect(aj.ida!.volta!.entregas.map((e) => e.pid)).toEqual(["a"]);
    expect(opDesfazerEntrega(opDesfazerEntrega(aj)!)).toBeNull();
  });

  it("viagem em geral: extra e cancelar não repetem; trocar de van manda o excedente para a espera", () => {
    const aj: Ajuste = { respostas: { a: "vai", b: "vai", c: "vai" }, espera: [], extras: [] };
    expect(opExtraNaViagem(aj, "x")!.extras).toEqual(["x"]);
    expect(opExtraNaViagem({ ...aj, extras: ["x"] }, "x")).toBeNull();
    expect(opCancelarViagem(opCancelarViagem(aj)!)).toBeNull();
    const nova = opTrocarVanOuMotorista(aj, "m2", "v2", 2);
    expect(nova).toMatchObject({ motoristaId: "m2", vanId: "v2" });
    expect(nova.respostas["c"]).toBe("espera");
    expect(nova.espera).toEqual(["c"]);
    expect(opTrocarVanOuMotorista(aj, "m3", undefined, 0)).toMatchObject({ motoristaId: "m3" });
  });

  it("as operações não alteram o objeto original", () => {
    const aj = comIda();
    const copia = JSON.stringify(aj);
    opMarcarEmbarque(aj, "a", "embarcou", 1);
    opIniciarParada(aj, "ida", 5, "x", 1);
    opReordenarFaltam(aj, ["c"]);
    expect(JSON.stringify(aj)).toBe(copia);
  });
});

describe("ninguém grava a viagem inteira", () => {
  it("o contrato não tem ajustarViagem e nenhuma tela ou componente o usa", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const varrer = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        return statSync(p).isDirectory()
          ? varrer(p)
          : /\.tsx?$/.test(n) && !/\.test\./.test(n)
            ? [p]
            : [];
      });
    const usam = [...varrer("src/routes"), ...varrer("src/components")].filter((p) =>
      readFileSync(p, "utf8").includes("ajustarViagem"),
    );
    expect(usam).toEqual([]);
    expect(readFileSync("src/data/repositorio.ts", "utf8")).not.toMatch(/ajustarViagem/);
  });
});
