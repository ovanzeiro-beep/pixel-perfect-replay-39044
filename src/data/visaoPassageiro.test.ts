import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { criarEstadoExemplo } from "./store";
import type { Estado } from "./tipos";
import { montarViagens, type Ajuste } from "./viagens";
import { previaDoConvite, visaoDoPassageiro } from "./visaoPassageiro";

const AGORA = new Date(2026, 10, 10, 12, 0, 0);
const estado = (): Estado => criarEstadoExemplo();

describe("visão do passageiro: só o que é dele", () => {
  it("não deixa escapar dado de outro passageiro (nome, telefone, endereço, id)", () => {
    const e = estado();
    expect(e.passageiros.length).toBeGreaterThan(10);
    for (const eu of e.passageiros.slice(0, 8)) {
      const json = JSON.stringify(visaoDoPassageiro(e, eu.id, AGORA));
      for (const outro of e.passageiros.filter((p) => p.id !== eu.id)) {
        expect(json, `${eu.nome} não pode ver ${outro.nome}`).not.toContain(outro.nome);
        expect(json).not.toContain(`"${outro.id}"`);
        if (outro.telefone && outro.telefone !== eu.telefone)
          expect(json).not.toContain(outro.telefone);
      }
    }
  });

  it("traz o cadastro, as cobranças e os recibos dele, e só os dele", () => {
    const e = estado();
    const eu = e.passageiros.find((p) => e.cobrancas.some((c) => c.pid === p.id))!;
    const v = visaoDoPassageiro(e, eu.id, AGORA);
    expect(v.eu?.id).toBe(eu.id);
    expect(v.cobrancas.length).toBeGreaterThan(0);
    expect(v.cobrancas.every((c) => c.pid === eu.id)).toBe(true);
    expect(v.recibos.every((r) => r.pid === eu.id)).toBe(true);
    expect(v.chavePix).toBe(e.chavePix);
  });

  it("as viagens são só as dele e a linha não mostra valores do vanzeiro", () => {
    const e = estado();
    const eu = e.passageiros[0]!;
    const v = visaoDoPassageiro(e, eu.id, AGORA);
    const todas = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, AGORA);
    const dele = todas.filter((t) => t.passageiroIds.includes(eu.id));
    expect(v.viagens.map((x) => x.id).sort()).toEqual(dele.map((x) => x.id).sort());
    expect(v.viagens.length).toBeGreaterThan(0);
    for (const l of v.linhas)
      expect(Object.keys(l).sort()).toEqual(["destino", "id", "nome", "paradas"]);
    expect(v.viagens[0]).not.toHaveProperty("passageiroIds");
    expect(v.viagens[0]).not.toHaveProperty("ajuste");
  });

  it("passageiro que não existe recebe uma visão vazia", () => {
    const v = visaoDoPassageiro(estado(), "nao-existe", AGORA);
    expect(v).toEqual({
      eu: undefined,
      linhas: [],
      viagens: [],
      cobrancas: [],
      recibos: [],
      chavePix: "",
      diasDeAviso: 2,
      pausas: [],
    });
  });

  it("resposta e posição na lista de espera são as dele", () => {
    const e = estado();
    const [a, b] = e.passageiros;
    const v0 = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, AGORA).find(
      (t) => !t.passada && t.passageiroIds.includes(a!.id) && t.passageiroIds.includes(b!.id),
    )!;
    const aj: Ajuste = {
      respostas: { [a!.id]: "vai", [b!.id]: "espera" },
      espera: ["x", b!.id],
      extras: [],
    };
    e.ajustes[v0.id] = aj;
    const dele = visaoDoPassageiro(e, a!.id, AGORA).viagens.find((t) => t.id === v0.id)!;
    expect(dele.resposta).toBe("vai");
    expect(dele.posicaoEspera).toBe(0);
    const outro = visaoDoPassageiro(e, b!.id, AGORA).viagens.find((t) => t.id === v0.id)!;
    expect(outro.resposta).toBe("espera");
    expect(outro.posicaoEspera).toBe(2);
  });

  it("durante a viagem: só a marcação, a parada e a volta dele; quantas entregas faltam antes da dele", () => {
    const e = estado();
    const [a, b, c] = e.passageiros;
    const t = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, AGORA).find(
      (x) => !x.passada && x.passageiroIds.includes(a!.id),
    )!;
    e.ajustes[t.id] = {
      respostas: {},
      espera: [],
      extras: [],
      ida: {
        ordem: [a!.id, b!.id, c!.id],
        marcas: [
          { pid: a!.id, r: "embarcou", cobrou: 0 },
          { pid: b!.id, r: "faltou", cobrou: 0 },
        ],
        fase: "chegou",
        parada: {
          inicio: 1000,
          minutos: 5,
          local: "Posto",
          chamada: false,
          naVan: { [b!.id]: "app" },
        },
        volta: {
          fase: "entrega",
          inicio: 2000,
          status: {
            [a!.id]: { r: "na_van", via: "app" },
            [b!.id]: { r: "nao", motivo: "segredo" },
          },
          extras: [],
          ordem: [b!.id, c!.id, a!.id],
          entregas: [{ pid: b!.id, r: "entregue" }],
        },
      },
    };
    const m = visaoDoPassageiro(e, a!.id, AGORA).viagens.find((x) => x.id === t.id)!;
    expect(m.iniciada).toBe(true);
    expect(m.ida).toMatchObject({
      encerrada: false,
      fase: "chegou",
      minhaMarca: "embarcou",
      parada: { local: "Posto", confirmei: false },
      volta: { fase: "entrega", meuStatus: { r: "na_van" }, faltamParadas: 1 },
    });
    expect(m.ida!.volta!.minhaEntrega).toBeUndefined();
    const json = JSON.stringify(m);
    expect(json).not.toContain("segredo");
    expect(json).not.toContain(b!.id);
    expect(json).not.toContain(c!.id);
  });
});

describe("ida em andamento: quantas paradas faltam até a dele", () => {
  it("conta só quem está na frente e ainda não embarcou; some depois que ele embarca", () => {
    const e = estado();
    const [a, b, c] = e.passageiros;
    const t = montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, AGORA).find(
      (x) => !x.passada && x.passageiroIds.includes(c!.id),
    )!;
    const ida = (marcas: { pid: string; r: "embarcou" | "faltou"; cobrou: number }[]) => ({
      ordem: [a!.id, b!.id, c!.id],
      marcas,
      fase: "paradas" as const,
    });
    const falta = (pid: string) =>
      visaoDoPassageiro(e, pid, AGORA).viagens.find((x) => x.id === t.id)!.ida?.faltamParadasIda;

    e.ajustes[t.id] = { respostas: {}, espera: [], extras: [], ida: ida([]) };
    expect(falta(c!.id)).toBe(2);
    expect(falta(a!.id)).toBe(0);
    e.ajustes[t.id] = {
      respostas: {},
      espera: [],
      extras: [],
      ida: ida([{ pid: a!.id, r: "embarcou", cobrou: 0 }]),
    };
    expect(falta(c!.id)).toBe(1);
    // quem faltou à parada também deixa de contar
    e.ajustes[t.id] = {
      respostas: {},
      espera: [],
      extras: [],
      ida: ida([
        { pid: a!.id, r: "embarcou", cobrou: 0 },
        { pid: b!.id, r: "faltou", cobrou: 0 },
      ]),
    };
    expect(falta(c!.id)).toBe(0);
    // depois de marcado ele mesmo, não há mais contagem
    e.ajustes[t.id] = {
      respostas: {},
      espera: [],
      extras: [],
      ida: ida([{ pid: c!.id, r: "embarcou", cobrou: 0 }]),
    };
    expect(falta(c!.id)).toBeUndefined();
    // fora da fase de recolher, também não
    e.ajustes[t.id] = {
      respostas: {},
      espera: [],
      extras: [],
      ida: { ...ida([]), fase: "a_caminho" },
    };
    expect(falta(c!.id)).toBeUndefined();
  });
});

describe("prévia do convite (antes do login): sem dado pessoal", () => {
  it("diz só se existe, se é válido e se já entrou", () => {
    const e = estado();
    const p = e.passageiros.find((x) => x.convite === "enviado" && x.ativo)!;
    expect(previaDoConvite(e, p.id)).toEqual({ existe: true, valido: true, jaNoApp: false });
    const noApp = e.passageiros.find((x) => x.convite === "no_app" && x.ativo)!;
    expect(previaDoConvite(e, noApp.id)).toEqual({ existe: true, valido: true, jaNoApp: true });
    const naoEnviado = e.passageiros.find((x) => x.convite === "nao_enviado")!;
    expect(previaDoConvite(e, naoEnviado.id).valido).toBe(false);
    expect(previaDoConvite(e, "nao-existe")).toEqual({
      existe: false,
      valido: false,
      jaNoApp: false,
    });
    expect(JSON.stringify(previaDoConvite(e, p.id))).not.toContain(p.nome);
  });
});

function fontes(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory()
      ? fontes(p)
      : /\.tsx?$/.test(n) && !/\.test\./.test(n)
        ? [p]
        : [];
  });
}

describe("a área do passageiro só lê a visão dele", () => {
  const arquivos = [
    ...fontes("src/routes").filter((p) => /passageiro\.|convite\./.test(p)),
    "src/components/app/AvisosPassageiro.tsx",
    "src/components/app/ProtegeArea.tsx",
    "src/components/app/ListaRecibos.tsx",
  ];
  it.each(arquivos)("%s não usa useFrota, useViagens nem obterEstado", (arq) => {
    const src = readFileSync(arq, "utf8");
    expect(src).not.toMatch(/\buse(Frota|Viagens)\b|\bobterEstado\b/);
  });
});
