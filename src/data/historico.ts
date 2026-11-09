// Histórico: as viagens que o vanzeiro realmente fez (ida encerrada). Tudo sai do que já está guardado nas viagens.
import { totalCobrado, type Ajuste, type Ida } from "./viagens";

export const separarIdViagem = (id: string) => {
  const i = id.lastIndexOf("_");
  return { linhaId: id.slice(0, i), data: id.slice(i + 1) };
};

export type EstatIda = {
  embarcaram: number;
  entregues: number;
  faltaram: number;
  naoVoltaram: number;
  paradas: number;
  total: number;
};

export function estatisticasIda(ida: Ida): EstatIda {
  const volta = ida.volta;
  return {
    embarcaram: ida.marcas.filter((m) => m.r !== "faltou").length + (volta?.extras.length ?? 0),
    entregues: volta?.entregas.filter((e) => e.r !== "ficou").length ?? 0,
    faltaram: ida.marcas.filter((m) => m.r === "faltou").length,
    naoVoltaram: volta ? Object.values(volta.status).filter((s) => s.r === "nao").length : 0,
    paradas: (ida.paradas?.length ?? 0) + (volta?.paradas?.length ?? 0),
    total: totalCobrado(ida),
  };
}

export type ItemHistorico = {
  id: string;
  linhaId: string;
  data: string;
  ajuste: Ajuste;
  ida: Ida;
  stats: EstatIda;
  encerrada: number;
};

/** Viagens encerradas, da mais recente para a mais antiga. Com `linhaId`, só as daquela linha. */
export function historicoViagens(
  ajustes: Record<string, Ajuste>,
  linhaId?: string,
): ItemHistorico[] {
  const itens: ItemHistorico[] = [];
  for (const [id, ajuste] of Object.entries(ajustes)) {
    const ida = ajuste.ida;
    if (!ida?.encerrada || ajuste.cancelada) continue;
    const { linhaId: l, data } = separarIdViagem(id);
    if (linhaId && l !== linhaId) continue;
    itens.push({
      id,
      linhaId: l,
      data,
      ajuste,
      ida,
      stats: estatisticasIda(ida),
      encerrada: ida.encerrada,
    });
  }
  return itens.sort((a, b) => b.data.localeCompare(a.data) || b.encerrada - a.encerrada);
}

export function totaisHistorico(itens: ItemHistorico[]) {
  return {
    viagens: itens.length,
    passageiros: itens.reduce((s, i) => s + i.stats.embarcaram, 0),
    cobrado: itens.reduce((s, i) => s + i.stats.total, 0),
  };
}

const quando = (data: string, hhmm: string) => {
  const [a, m, d] = data.split("-").map(Number);
  const [h, mi] = (hhmm || "08:00").split(":").map(Number);
  return new Date(a!, m! - 1, d!, h!, mi!).getTime();
};

type LinhaSemente = { id: string; saida: string; volta: string };
type CobrancaSemente = {
  pid: string;
  tipo: string;
  vencimento: string;
  valor: number;
  cancelada?: string | undefined;
};

/**
 * Dados de exemplo: as viagens passadas em que alguém confirmou viram viagens realizadas.
 * O valor cobrado de cada um só existe se já houver cobrança de viagem daquele dia (o Dinheiro e o histórico concordam).
 */
export function semearHistorico(
  ajustes: Record<string, Ajuste>,
  linhas: LinhaSemente[],
  cobrancas: CobrancaSemente[],
  hojeIso: string,
): Record<string, Ajuste> {
  const out: Record<string, Ajuste> = {};
  for (const [id, aj] of Object.entries(ajustes)) {
    const { linhaId, data } = separarIdViagem(id);
    const linha = linhas.find((l) => l.id === linhaId);
    const vao = Object.keys(aj.respostas).filter((p) => aj.respostas[p] === "vai");
    if (!linha || data >= hojeIso || aj.cancelada || aj.ida || vao.length === 0) {
      out[id] = aj;
      continue;
    }
    const inicio = quando(data, linha.saida);
    let encerrada = quando(data, linha.volta || linha.saida);
    if (encerrada <= inicio) encerrada += 24 * 3600000;
    const cobrou = (pid: string) =>
      cobrancas.find(
        (c) => c.pid === pid && c.tipo === "viagem" && c.vencimento === data && !c.cancelada,
      )?.valor ?? 0;
    const ida: Ida = {
      ordem: vao,
      fase: "chegou",
      inicio,
      encerrada,
      marcas: vao.map((pid) => ({ pid, r: "embarcou" as const, cobrou: cobrou(pid) })),
      volta: {
        fase: "entrega",
        inicio: Math.max(inicio, encerrada - 2 * 3600000),
        status: Object.fromEntries(
          vao.map((p) => [p, { r: "na_van" as const, via: "manual" as const }]),
        ),
        extras: [],
        ordem: [...vao].reverse(),
        entregas: [...vao].reverse().map((pid) => ({ pid, r: "entregue" as const })),
      },
    };
    out[id] = { ...aj, ida };
  }
  return out;
}
