// Operações pequenas sobre UMA viagem. Cada uma mexe só no que é dela e é aplicada sobre o dado MAIS RECENTE
// (nunca sobre uma cópia antiga da tela). Assim, passageiro e vanzeiro mexendo ao mesmo tempo não se apagam.
// São funções puras (Ajuste → Ajuste); `null` significa "nada a fazer / não se aplica". Com banco, cada uma vira
// uma operação (RPC) no servidor, com a mesma regra.
import {
  aplicarNovaVan,
  definirResposta,
  encerrarParada,
  encerrarParadaVolta,
  type Ajuste,
  type Entrega,
  type Ida,
  type Marca,
  type ParadaAtiva,
  type Resposta,
  type StatusVolta,
  type Volta,
} from "./viagens";

export type Trecho = "ida" | "volta";
export type Via = "manual" | "app";

const comIda = (aj: Ajuste, f: (ida: Ida) => Ida | null): Ajuste | null => {
  if (!aj.ida) return null;
  const nova = f(aj.ida);
  return nova ? { ...aj, ida: nova } : null;
};
const comVolta = (aj: Ajuste, f: (v: Volta) => Volta | null): Ajuste | null =>
  comIda(aj, (ida) => {
    if (!ida.volta) return null;
    const nova = f(ida.volta);
    return nova ? { ...ida, volta: nova } : null;
  });
/** A parada em andamento do trecho (na ida ou na volta). */
const comParada = (
  aj: Ajuste,
  trecho: Trecho,
  f: (p: ParadaAtiva) => ParadaAtiva | null,
): Ajuste | null =>
  trecho === "ida"
    ? comIda(aj, (ida) => {
        if (!ida.parada) return null;
        const p = f(ida.parada);
        return p ? { ...ida, parada: p } : null;
      })
    : comVolta(aj, (v) => {
        if (!v.parada) return null;
        const p = f(v.parada);
        return p ? { ...v, parada: p } : null;
      });

// ===== A viagem em geral =====
/** O vanzeiro marca a resposta de um passageiro (Vai / Não vai / Sem resposta), respeitando lotação e fila de espera. */
export function opDefinirResposta(
  aj: Ajuste,
  pid: string,
  r: Exclude<Resposta, "espera">,
  lugares: number,
): { ajuste: Ajuste; foiParaEspera: boolean; subiu?: string } {
  return definirResposta(aj, pid, r, lugares);
}
export const opExtraNaViagem = (aj: Ajuste, pid: string): Ajuste | null =>
  aj.extras.includes(pid) ? null : { ...aj, extras: [...aj.extras, pid] };
export const opCancelarViagem = (aj: Ajuste): Ajuste | null =>
  aj.cancelada ? null : { ...aj, cancelada: true };
/** Troca motorista e, se mudou, a van (quem não cabe vai para a lista de espera). */
export function opTrocarVanOuMotorista(
  aj: Ajuste,
  motoristaId: string,
  vanId: string | undefined,
  lugares: number,
): Ajuste {
  const base: Ajuste = { ...aj, motoristaId };
  return vanId ? aplicarNovaVan(base, vanId, lugares) : base;
}

// ===== Ida =====
export const opIniciarIda = (aj: Ajuste, ordem: string[], agora: number): Ajuste | null =>
  aj.ida || aj.cancelada
    ? null
    : { ...aj, ida: { ordem, marcas: [], fase: "paradas", inicio: agora } };
export const opMarcarEmbarque = (aj: Ajuste, pid: string, r: Marca["r"], cobrou: number) =>
  comIda(aj, (ida) =>
    ida.marcas.some((m) => m.pid === pid)
      ? null
      : { ...ida, marcas: [...ida.marcas, { pid, r, cobrou }] },
  );
/** Desfaz a última marcação e volta para a fase de paradas. Devolve também qual marcação foi desfeita. */
export function opDesfazerMarcacao(aj: Ajuste): { ajuste: Ajuste; desfeita: Marca } | null {
  const ult = aj.ida?.marcas[aj.ida.marcas.length - 1];
  if (!aj.ida || !ult) return null;
  return {
    ajuste: { ...aj, ida: { ...aj.ida, marcas: aj.ida.marcas.slice(0, -1), fase: "paradas" } },
    desfeita: ult,
  };
}
/** Nova ordem de quem ainda falta embarcar (quem já foi marcado fica na frente). */
export const opReordenarFaltam = (aj: Ajuste, faltam: string[]) =>
  comIda(aj, (ida) => ({ ...ida, ordem: [...ida.marcas.map((m) => m.pid), ...faltam] }));
export const opMudarFase = (aj: Ajuste, fase: Ida["fase"]) =>
  comIda(aj, (ida) => (ida.fase === fase ? null : { ...ida, fase }));
export const opIniciarVolta = (aj: Ajuste, volta: Volta) =>
  comIda(aj, (ida) => (ida.volta ? null : { ...ida, volta }));
export const opEncerrarViagem = (aj: Ajuste, agora: number) =>
  comIda(aj, (ida) => (ida.encerrada ? null : { ...ida, encerrada: agora }));

// ===== Parada no caminho (ida ou volta) =====
export function opIniciarParada(
  aj: Ajuste,
  trecho: Trecho,
  minutos: number,
  local: string,
  agora: number,
): Ajuste | null {
  const parada: ParadaAtiva = { inicio: agora, minutos, local, chamada: false, naVan: {} };
  return trecho === "ida"
    ? comIda(aj, (ida) => (ida.parada ? null : { ...ida, parada }))
    : comVolta(aj, (v) => (v.parada ? null : { ...v, parada }));
}
/** Marca (ou desmarca, com `null`) quem está na van durante a parada, SEM apagar o que os outros já marcaram. */
export const opPresencasNaParada = (
  aj: Ajuste,
  trecho: Trecho,
  mudancas: Record<string, Via | null>,
) =>
  comParada(aj, trecho, (p) => {
    const naVan = { ...p.naVan };
    for (const [pid, via] of Object.entries(mudancas)) {
      if (via) naVan[pid] = via;
      else delete naVan[pid];
    }
    return { ...p, naVan };
  });
export const opChamadaNaParada = (aj: Ajuste, trecho: Trecho) =>
  comParada(aj, trecho, (p) => (p.chamada ? null : { ...p, chamada: true }));
export function opEncerrarParada(
  aj: Ajuste,
  trecho: Trecho,
  motivo: string,
  agora: number,
): Ajuste | null {
  return trecho === "ida"
    ? comIda(aj, (ida) => (ida.parada ? encerrarParada(ida, motivo, agora) : null))
    : comVolta(aj, (v) => (v.parada ? encerrarParadaVolta(v, motivo, agora) : null));
}

// ===== Volta =====
/** Marca (ou desmarca, com `null`) o status de quem volta, SEM apagar o que os outros já responderam. */
export const opStatusNaVolta = (aj: Ajuste, mudancas: Record<string, StatusVolta | null>) =>
  comVolta(aj, (v) => {
    const status = { ...v.status };
    for (const [pid, s] of Object.entries(mudancas)) {
      if (s) status[pid] = s;
      else delete status[pid];
    }
    return { ...v, status };
  });
export const opIniciarEntregas = (aj: Ajuste, ordem: string[]) =>
  comVolta(aj, (v) => ({ ...v, fase: "entrega", ordem }));
export const opExtraNaVolta = (aj: Ajuste, pid: string, cobrou: number) =>
  comVolta(aj, (v) =>
    v.extras.some((e) => e.pid === pid) ? null : { ...v, extras: [...v.extras, { pid, cobrou }] },
  );
export const opEntregar = (aj: Ajuste, pid: string, r: Entrega["r"], onde?: string) =>
  comVolta(aj, (v) =>
    v.entregas.some((e) => e.pid === pid)
      ? null
      : { ...v, entregas: [...v.entregas, { pid, r, ...(onde ? { onde } : {}) }] },
  );
export const opDesfazerEntrega = (aj: Ajuste) =>
  comVolta(aj, (v) => (v.entregas.length ? { ...v, entregas: v.entregas.slice(0, -1) } : null));
/** Nova ordem de quem ainda não foi entregue (quem já foi entregue fica na frente). */
export const opReordenarEntregas = (aj: Ajuste, ainda: string[]) =>
  comVolta(aj, (v) => ({
    ...v,
    ordem: [...v.entregas.map((x) => x.pid).filter((id) => v.ordem.includes(id)), ...ainda],
  }));
