// O que UM passageiro pode ver. É a "fatia" do estado que pertence a ele: com banco, é isto (e só isto)
// que o servidor entrega ao passageiro. Nenhum dado de outro passageiro entra aqui.
import type { Cobranca, Recibo } from "./cobrancas";
import type { Estado, Linha, Passageiro } from "./store";
import {
  montarViagens,
  type Entrega,
  type Ida,
  type Marca,
  type Resposta,
  type Situacao,
  type StatusVolta,
  type Volta,
} from "./viagens";

/** A parte da linha que o passageiro precisa ver (sem valores nem observações do vanzeiro). */
export type MinhaLinha = Pick<Linha, "id" | "nome" | "paradas" | "destino">;

/** A viagem em andamento, do ponto de vista do passageiro: só o que é dele. */
export type MinhaIda = {
  encerrada: boolean;
  fase: Ida["fase"];
  /** Como o vanzeiro marcou o embarque dele (ausente: ainda não marcou). */
  minhaMarca?: Marca["r"];
  /** Parada em andamento (o passageiro confirma "estou na van"). */
  parada?: { local: string; inicio: number; minutos: number; confirmei: boolean };
  volta?: {
    fase: Volta["fase"];
    meuStatus?: StatusVolta;
    minhaEntrega?: Entrega["r"];
    /** Quantas entregas faltam antes da dele (0: a próxima é a dele). */
    faltamParadas: number;
  };
};

export type MinhaViagem = {
  id: string;
  linhaId: string;
  data: string;
  saida: string;
  situacao: Situacao;
  passada: boolean;
  cancelada: boolean;
  resposta: Resposta;
  /** Posição na lista de espera (0 se não está nela). */
  posicaoEspera: number;
  /** A viagem já começou (existe ida em andamento ou encerrada). */
  iniciada: boolean;
  ida?: MinhaIda;
};

export type VisaoPassageiro = {
  /** O próprio cadastro (ausente: passageiro não existe). */
  eu: Passageiro | undefined;
  linhas: MinhaLinha[];
  viagens: MinhaViagem[];
  cobrancas: Cobranca[];
  recibos: Recibo[];
  chavePix: string;
};

function minhaIda(ida: Ida, pid: string): MinhaIda {
  const marca = ida.marcas.find((m) => m.pid === pid)?.r;
  const out: MinhaIda = { encerrada: !!ida.encerrada, fase: ida.fase };
  if (marca) out.minhaMarca = marca;
  if (ida.parada) {
    out.parada = {
      local: ida.parada.local,
      inicio: ida.parada.inicio,
      minutos: ida.parada.minutos,
      confirmei: !!ida.parada.naVan[pid],
    };
  }
  if (ida.volta) {
    const v = ida.volta;
    const posicao = v.ordem.indexOf(pid);
    const volta: NonNullable<MinhaIda["volta"]> = {
      fase: v.fase,
      faltamParadas: posicao >= 0 ? posicao - v.entregas.length : 0,
    };
    const status = v.status[pid];
    if (status) volta.meuStatus = status;
    const entrega = v.entregas.find((e) => e.pid === pid)?.r;
    if (entrega) volta.minhaEntrega = entrega;
    out.volta = volta;
  }
  return out;
}

export function visaoDoPassageiro(estado: Estado, pid: string, agora: Date): VisaoPassageiro {
  const eu = estado.passageiros.find((p) => p.id === pid);
  if (!eu)
    return { eu: undefined, linhas: [], viagens: [], cobrancas: [], recibos: [], chavePix: "" };
  const viagens = montarViagens(
    estado.linhas,
    estado.passageiros,
    estado.vans,
    estado.ajustes,
    agora,
  )
    .filter((v) => v.passageiroIds.includes(pid))
    .map((v): MinhaViagem => {
      const m: MinhaViagem = {
        id: v.id,
        linhaId: v.linhaId,
        data: v.data,
        saida: v.saida,
        situacao: v.situacao,
        passada: v.passada,
        cancelada: !!v.ajuste.cancelada,
        resposta: v.ajuste.respostas[pid] ?? "sem",
        posicaoEspera: v.ajuste.espera.indexOf(pid) + 1,
        iniciada: !!v.ajuste.ida,
      };
      if (v.ajuste.ida) m.ida = minhaIda(v.ajuste.ida, pid);
      return m;
    });
  const linhaIds = new Set([...eu.linhaIds, ...viagens.map((v) => v.linhaId)]);
  return {
    eu,
    linhas: estado.linhas
      .filter((l) => linhaIds.has(l.id))
      .map((l) => ({ id: l.id, nome: l.nome, paradas: l.paradas, destino: l.destino })),
    viagens,
    cobrancas: estado.cobrancas.filter((c) => c.pid === pid),
    recibos: estado.recibos.filter((r) => r.pid === pid),
    chavePix: estado.chavePix,
  };
}

/** O que a tela do convite (aberta antes do login) precisa saber, sem nenhum dado pessoal. */
export type ConvitePreview = { existe: boolean; valido: boolean; jaNoApp: boolean };

export function previaDoConvite(estado: Estado, pid: string): ConvitePreview {
  const p = estado.passageiros.find((x) => x.id === pid);
  const valido = !!p && p.ativo && p.convite !== "nao_enviado";
  return { existe: !!p, valido, jaNoApp: !!p && p.convite === "no_app" };
}
