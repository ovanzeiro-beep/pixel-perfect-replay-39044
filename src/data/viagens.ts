// Regras das viagens: geração a partir das linhas, lotação e lista de espera.
import type { Linha, Passageiro, Van } from "./store";

export type Resposta = "vai" | "nao" | "sem" | "espera";
export type Ajuste = {
  vanId?: string;
  motoristaId?: string;
  cancelada?: boolean;
  respostas: Record<string, Resposta>; // ordem das chaves = ordem de confirmação
  espera: string[]; // ordem de chegada
  extras: string[]; // só nesta viagem
  ida?: Ida;
};
export type Marca = { pid: string; r: "embarcou" | "faltou" | "ficou"; cobrou: number };
export type Ficou = { pid: string; motivo: string; hora: string };
export type ParadaFeita = { inicio: number; minutos: number; local: string; ficaram: Ficou[] };
export type ParadaAtiva = {
  inicio: number;
  minutos: number;
  local: string;
  chamada: boolean;
  naVan: Record<string, "manual" | "app">;
};
export type StatusVolta = { r: "na_van"; via: "manual" | "app" } | { r: "nao"; motivo: string };
export type Entrega = { pid: string; r: "entregue" | "outro" | "ficou"; onde?: string };
export type Volta = {
  fase: "chamada" | "entrega";
  inicio: number;
  status: Record<string, StatusVolta>;
  extras: { pid: string; cobrou: number }[];
  ordem: string[];
  entregas: Entrega[];
  parada?: ParadaAtiva | undefined;
  paradas?: ParadaFeita[];
};
export type Ida = {
  ordem: string[];
  marcas: Marca[];
  fase: "paradas" | "a_caminho" | "chegou";
  parada?: ParadaAtiva | undefined;
  paradas?: ParadaFeita[];
  inicio?: number;
  volta?: Volta;
  encerrada?: number;
};

const hm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const horaDe = hm;
/** Horário de saída da parada (início + duração). */
export const saidaParada = (inicio: number, minutos: number) => hm(inicio + minutos * 60000);
export const avisoParada = (minutos: number, saida: string) =>
  `Parada de ${minutos} minutos. Saída às ${saida}. Não se atrase!`;
/** "Faltam 2: Maria e Joana" */
export function textoFaltam(nomes: string[]): string {
  if (nomes.length === 0) return "";
  const lista =
    nomes.length === 1
      ? nomes[0]!
      : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  return `Falta${nomes.length > 1 ? "m" : ""} ${nomes.length}: ${lista}`;
}
/** Abre a chamada da volta. */
export const novaVolta = (agora: number): Volta => ({
  fase: "chamada",
  inicio: agora,
  status: {},
  extras: [],
  ordem: [],
  entregas: [],
});
/** Quem precisa estar marcado na chamada da volta (embarcou na ida + só volta). */
export const chamadaVolta = (ida: Ida, volta: Volta) => [
  ...ida.marcas.filter((m) => m.r === "embarcou").map((m) => m.pid),
  ...volta.extras.map((e) => e.pid),
];
/** Quem ainda falta marcar "Na van" ou "Não volta". */
export const pendentesVolta = (ida: Ida, volta: Volta) =>
  chamadaVolta(ida, volta).filter((id) => !volta.status[id]);
/** Rota de entrega: ordem contrária da ida, só com quem está na van; quem só volta vai no fim. */
export function rotaVolta(ida: Ida, volta: Volta): string[] {
  const naVan = (id: string) => volta.status[id]?.r === "na_van";
  const daIda = [...ida.ordem].reverse().filter(naVan);
  return [
    ...daIda,
    ...volta.extras.map((e) => e.pid).filter((id) => naVan(id) && !daIda.includes(id)),
  ];
}
/** Quem ainda não foi entregue. */
export const aindaNaVan = (volta: Volta) =>
  volta.ordem.filter((id) => !volta.entregas.some((e) => e.pid === id));
/** Cobrança automática para quem só volta e paga por viagem (se ainda não foi cobrado nesta viagem). */
export const cobrancaSoVolta = (ida: Ida, pid: string, formaPagamento: string, valor: number) =>
  formaPagamento === "por_viagem" && !ida.marcas.some((m) => m.pid === pid && m.cobrou > 0)
    ? valor
    : 0;
/** Total cobrado na viagem (ida + volta). */
export const totalCobrado = (ida: Ida) =>
  ida.marcas.reduce((s, m) => s + m.cobrou, 0) +
  (ida.volta?.extras.reduce((s, e) => s + e.cobrou, 0) ?? 0);
/** Parada da volta: quem não foi marcado "Na van" fica registrado e sai da van. */
export function encerrarParadaVolta(volta: Volta, motivo: string, agora: number): Volta {
  const p = volta.parada;
  if (!p) return volta;
  const ficaram = aindaNaVan(volta).filter((id) => !p.naVan[id]);
  const hora = hm(agora);
  return {
    ...volta,
    parada: undefined,
    entregas: [
      ...volta.entregas,
      ...ficaram.map((pid) => ({ pid, r: "ficou" as const, onde: motivo })),
    ],
    paradas: [
      ...(volta.paradas ?? []),
      {
        inicio: p.inicio,
        minutos: p.minutos,
        local: p.local,
        ficaram: ficaram.map((pid) => ({ pid, motivo, hora })),
      },
    ],
  };
}

/** Encerra a parada: quem não foi marcado "Na van" passa a "Ficou na parada". */
export function encerrarParada(ida: Ida, motivo: string, agora: number): Ida {
  const p = ida.parada;
  if (!p) return ida;
  const ficaramIds = ida.marcas
    .filter((m) => m.r === "embarcou" && !p.naVan[m.pid])
    .map((m) => m.pid);
  const hora = hm(agora);
  return {
    ...ida,
    parada: undefined,
    marcas: ida.marcas.map((m) => (ficaramIds.includes(m.pid) ? { ...m, r: "ficou" } : m)),
    paradas: [
      ...(ida.paradas ?? []),
      {
        inicio: p.inicio,
        minutos: p.minutos,
        local: p.local,
        ficaram: ficaramIds.map((pid) => ({ pid, motivo, hora })),
      },
    ],
  };
}
export type Situacao = "agendada" | "lotada" | "andamento" | "concluida" | "cancelada";
export type Viagem = {
  id: string;
  linhaId: string;
  data: string;
  saida: string;
  volta: string;
  vanId: string;
  motoristaId: string;
  lugares: number;
  passageiroIds: string[];
  ajuste: Ajuste;
  situacao: Situacao;
  passada: boolean;
  vao: string[];
  sem: string[];
  nao: string[];
  espera: string[];
};

const COD = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const doIso = (s: string) => {
  const [a, m, d] = s.split("-").map(Number);
  return new Date(a!, m! - 1, d!);
};
export const vazio = (): Ajuste => ({ respostas: {}, espera: [], extras: [] });
export const idViagem = (linhaId: string, data: string) => `${linhaId}_${data}`;

/** Dias (de -7 a +13 a partir de hoje) em que cada linha ativa tem viagem. */
export function datasDaLinha(l: Linha, hoje: Date): string[] {
  if (!l.ativa) return [];
  const out: string[] = [];
  for (let i = -7; i <= 13; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    const s = iso(d);
    if (l.frequencia === "unica" ? l.data === s : l.dias.includes(COD[d.getDay()]!)) out.push(s);
  }
  return out;
}

const qtd = (aj: Ajuste, r: Resposta) => Object.values(aj.respostas).filter((x) => x === r).length;

/** Muda a resposta de um passageiro respeitando os lugares. Retorna quem subiu da lista de espera, se alguém. */
export function definirResposta(
  aj: Ajuste,
  pid: string,
  r: Exclude<Resposta, "espera">,
  lugares: number,
): { ajuste: Ajuste; foiParaEspera: boolean; subiu?: string } {
  const anterior = aj.respostas[pid] ?? "sem";
  const respostas = { ...aj.respostas };
  let espera = aj.espera.filter((x) => x !== pid);
  delete respostas[pid];
  if (r === "vai") {
    if (anterior === "vai") return { ajuste: aj, foiParaEspera: false };
    if (qtd({ ...aj, respostas }, "vai") >= lugares) {
      respostas[pid] = "espera";
      espera = [...espera, pid];
      return { ajuste: { ...aj, respostas, espera }, foiParaEspera: true };
    }
    respostas[pid] = "vai";
    return { ajuste: { ...aj, respostas, espera }, foiParaEspera: false };
  }
  respostas[pid] = r;
  let subiu: string | undefined;
  if (anterior === "vai" && espera.length > 0 && qtd({ ...aj, respostas }, "vai") < lugares) {
    subiu = espera[0]!;
    espera = espera.slice(1);
    delete respostas[subiu];
    respostas[subiu] = "vai";
  }
  return {
    ajuste: { ...aj, respostas, espera },
    foiParaEspera: false,
    ...(subiu ? { subiu } : {}),
  };
}

/** Quantas pessoas confirmadas sobram se a viagem passar a ter `lugares`. */
export const sobram = (aj: Ajuste, lugares: number) => Math.max(0, qtd(aj, "vai") - lugares);

/** Troca a van: quem sobrar (os últimos a confirmar) vai para o começo da lista de espera. */
export function aplicarNovaVan(aj: Ajuste, vanId: string, lugares: number): Ajuste {
  const vao = Object.keys(aj.respostas).filter((k) => aj.respostas[k] === "vai");
  const excedentes = vao.slice(lugares);
  const respostas = { ...aj.respostas };
  excedentes.forEach((p) => (respostas[p] = "espera"));
  return { ...aj, vanId, respostas, espera: [...excedentes, ...aj.espera] };
}

export function montarViagens(
  linhas: Linha[],
  passageiros: Passageiro[],
  vans: Van[],
  ajustes: Record<string, Ajuste>,
  agora: Date,
): Viagem[] {
  const hojeIso = iso(agora);
  const hhmm = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const out: Viagem[] = [];
  for (const l of linhas) {
    const daLinha = passageiros
      .filter((p) => p.ativo && p.linhaIds.includes(l.id))
      .map((p) => p.id);
    for (const data of datasDaLinha(l, agora)) {
      const id = idViagem(l.id, data);
      const ajuste = ajustes[id] ?? vazio();
      const vanId = ajuste.vanId ?? l.vanId;
      const lugares = vans.find((v) => v.id === vanId)?.lugares ?? 0;
      const existe = new Set(passageiros.map((p) => p.id));
      const ids = [...new Set([...daLinha, ...ajuste.extras])].filter((p) => existe.has(p));
      const resp = (p: string) => ajuste.respostas[p] ?? "sem";
      const vao = Object.keys(ajuste.respostas).filter((p) => ids.includes(p) && resp(p) === "vai");
      const espera = ajuste.espera.filter((p) => ids.includes(p));
      const passada = ajuste.ida?.encerrada
        ? true
        : !ajuste.ida && (data < hojeIso || (data === hojeIso && !!l.volta && hhmm > l.volta));
      const situacao: Situacao = ajuste.cancelada
        ? "cancelada"
        : ajuste.ida?.encerrada
          ? "concluida"
          : ajuste.ida
            ? "andamento"
            : passada
              ? "concluida"
              : data === hojeIso && !!l.saida && hhmm >= l.saida
                ? "andamento"
                : lugares > 0 && vao.length >= lugares
                  ? "lotada"
                  : "agendada";
      out.push({
        id,
        linhaId: l.id,
        data,
        saida: l.saida,
        volta: l.volta,
        vanId,
        motoristaId: ajuste.motoristaId ?? l.motoristaId,
        lugares,
        passageiroIds: ids,
        ajuste,
        situacao,
        passada: passada || !!ajuste.cancelada,
        vao,
        espera,
        sem: ids.filter((p) => resp(p) === "sem"),
        nao: ids.filter((p) => resp(p) === "nao"),
      });
    }
  }
  return out.sort((a, b) => (a.data + a.saida).localeCompare(b.data + b.saida));
}

/** Respostas de exemplo: variadas, mas sempre iguais para o mesmo passageiro e dia. */
export function semearAjustes(
  linhas: Linha[],
  passageiros: Passageiro[],
  vans: Van[],
  agora: Date,
  especial: {
    lotada: { linhaId: string; diaSemana: string; extras: string[] };
    canceladaLinhaId: string;
  },
): Record<string, Ajuste> {
  const hojeIso = iso(agora);
  const aj: Record<string, Ajuste> = {};
  const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);
  let lotadaFeita = false;
  let ultimaPassadaCancel = "";
  for (const l of linhas) {
    const lugares = vans.find((v) => v.id === l.vanId)?.lugares ?? 0;
    const daLinha = passageiros
      .filter((p) => p.ativo && p.linhaIds.includes(l.id))
      .map((p) => p.id);
    for (const data of datasDaLinha(l, agora)) {
      const id = idViagem(l.id, data);
      let a = vazio();
      const passada = data < hojeIso;
      const ehLotada =
        !lotadaFeita &&
        !passada &&
        l.id === especial.lotada.linhaId &&
        COD[doIso(data).getDay()] === especial.lotada.diaSemana;
      if (ehLotada) {
        lotadaFeita = true;
        a.extras = especial.lotada.extras;
        for (const p of [...daLinha, ...a.extras]) a = definirResposta(a, p, "vai", lugares).ajuste;
      } else {
        for (const p of daLinha) {
          const n = hash(p + data) % 10;
          const r = n < 6 ? "vai" : n < 8 ? (passada ? "vai" : "sem") : "nao";
          a = definirResposta(a, p, r, lugares).ajuste;
        }
      }
      aj[id] = a;
      if (passada && l.id === especial.canceladaLinhaId) ultimaPassadaCancel = id;
    }
  }
  if (ultimaPassadaCancel)
    aj[ultimaPassadaCancel] = { ...aj[ultimaPassadaCancel]!, cancelada: true };
  return aj;
}

const SEM = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export function rotuloDia(data: string, agora: Date) {
  const hoje = iso(agora);
  const amanha = iso(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1));
  const ontem = iso(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1));
  const d = doIso(data);
  const dm = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (data === hoje) return `Hoje, ${dm}`;
  if (data === amanha) return `Amanhã, ${dm}`;
  if (data === ontem) return `Ontem, ${dm}`;
  return `${SEM[d.getDay()]}, ${dm}`;
}
export const diaSemana = (data: string) => SEM[doIso(data).getDay()]!;
export const dataCurta = (data: string) => {
  const d = doIso(data);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Ordena os confirmados seguindo as cidades do trajeto da linha (cidades fora do trajeto vão para o fim). */
export function ordenarParadas(
  ids: string[],
  cidadeDe: (id: string) => string,
  trajeto: string[],
): string[] {
  const pos = (id: string) => {
    const i = trajeto.findIndex((c) => c.toLowerCase().startsWith(cidadeDe(id).toLowerCase()));
    return i < 0 ? 999 : i;
  };
  return [...ids].sort((a, b) => pos(a) - pos(b));
}

/** Divide as paradas em partes que o Google Maps consegue abrir de uma vez (até `max` paradas por parte). */
export function partesRota(enderecos: string[], max = 10): string[] {
  const out: string[] = [];
  for (let i = 0; i < enderecos.length; i += max) {
    const parte = enderecos.slice(i, i + max);
    const origem = i > 0 ? enderecos[i - 1] : undefined;
    const destino = parte[parte.length - 1]!;
    const meio = parte.slice(0, -1);
    const q = new URLSearchParams({ api: "1", destination: destino, travelmode: "driving" });
    if (origem) q.set("origin", origem);
    if (meio.length) q.set("waypoints", meio.join("|"));
    out.push(`https://www.google.com/maps/dir/?${q.toString()}`);
  }
  return out;
}

/** Tira um passageiro de tudo o que a viagem guardou dele (respostas, espera, ida e volta). */
export function semPassageiro(aj: Ajuste, pid: string): Ajuste {
  const tira = <T>(r: Record<string, T> | undefined) =>
    r ? (Object.fromEntries(Object.entries(r).filter(([k]) => k !== pid)) as Record<string, T>) : r;
  const limpaParada = <P extends { naVan?: Record<string, unknown> }>(
    p: P | undefined,
  ): P | undefined => (p ? { ...p, ...(p.naVan ? { naVan: tira(p.naVan) } : {}) } : p);
  const limpaFeitas = (ps: ParadaFeita[] | undefined) =>
    ps?.map((p) => ({ ...p, ficaram: p.ficaram.filter((f) => f.pid !== pid) }));
  const { ida, ...resto } = aj;
  const novo: Ajuste = {
    ...resto,
    respostas: tira(aj.respostas)!,
    espera: aj.espera.filter((x) => x !== pid),
    extras: aj.extras.filter((x) => x !== pid),
  };
  if (!ida) return novo;
  const { volta, parada, paradas, ...restoIda } = ida;
  const novaIda: Ida = {
    ...restoIda,
    ordem: ida.ordem.filter((x) => x !== pid),
    marcas: ida.marcas.filter((m) => m.pid !== pid),
  };
  const p = limpaParada(parada);
  if (p) novaIda.parada = p;
  const ps = limpaFeitas(paradas);
  if (ps) novaIda.paradas = ps;
  if (volta) {
    const { parada: vp, paradas: vps, ...restoVolta } = volta;
    const nv: Volta = {
      ...restoVolta,
      status: tira(volta.status)!,
      extras: volta.extras.filter((x) => x.pid !== pid),
      ordem: volta.ordem.filter((x) => x !== pid),
      entregas: volta.entregas.filter((x) => x.pid !== pid),
    };
    const vpp = limpaParada(vp);
    if (vpp) nv.parada = vpp;
    const vpf = limpaFeitas(vps);
    if (vpf) nv.paradas = vpf;
    novaIda.volta = nv;
  }
  return { ...novo, ida: novaIda };
}

const somaMinutos = (hhmm: string, min: number) => {
  if (!hhmm.includes(":")) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h! * 60 + m! + min) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
export const MINUTOS_ENTRE_PARADAS = 20;

/** Horário aproximado na parada do passageiro: a saída mais 20 minutos por cidade até a dele no trajeto. */
export function horarioNaParada(
  saida: string,
  cidadeDoPassageiro: string,
  trajeto: string[],
): string {
  const pos = trajeto.findIndex((c) =>
    c.toLowerCase().startsWith(cidadeDoPassageiro.toLowerCase()),
  );
  return pos <= 0 ? saida : somaMinutos(saida, pos * MINUTOS_ENTRE_PARADAS);
}
