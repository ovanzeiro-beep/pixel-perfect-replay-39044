// Guarda todos os dados do app. Ficam salvos no aparelho (localStorage) e "Restaurar exemplo" volta ao início.
import { useMemo, useSyncExternalStore } from "react";
import { novoId } from "./ids";
import { armazenamentoLocal, gravar, ler, limpar } from "./persistencia";
import { registrarAlteracao, salvarMeta } from "./backup";
import {
  vans as vansIniciais,
  motoristas as motoristasIniciais,
  linhas as linhasIniciais,
  passageiros as passageirosIniciais,
  detalhesPassageiros,
  cobrancasEmAberto,
  type DetalhePassageiro,
  type FormaPagamento,
  detalheVazio,
  exemploViagens,
  cobrancasExemplo,
  gastosMes,
  gastosExemplo,
} from "./exemplo";
import type { Categoria, Gasto } from "./financeiro";
import {
  aberto,
  cancelarCobranca,
  desfazerPagamento,
  gerarPeriodicas,
  idCobranca,
  isoDe,
  pagar,
  refMes,
  refSemana,
  refViagem,
  type Cobranca,
  type Forma,
  type Recibo,
} from "./cobrancas";
import {
  definirResposta,
  semearAjustes,
  montarViagens,
  semPassageiro,
  type Ajuste,
} from "./viagens";
import { semearHistorico } from "./historico";

export const TIPOS_LINHA = ["Visita", "Faculdade", "Escolar", "Excursão", "Outro"] as const;
export const DIAS = [
  { id: "seg", curto: "Seg" },
  { id: "ter", curto: "Ter" },
  { id: "qua", curto: "Qua" },
  { id: "qui", curto: "Qui" },
  { id: "sex", curto: "Sex" },
  { id: "sab", curto: "Sáb" },
  { id: "dom", curto: "Dom" },
] as const;
const DIA_NOME: Record<string, string> = {
  segunda: "seg",
  terça: "ter",
  quarta: "qua",
  quinta: "qui",
  sexta: "sex",
  sábado: "sab",
  domingo: "dom",
};

export type Linha = {
  id: string;
  nome: string;
  tipo: (typeof TIPOS_LINHA)[number];
  frequencia: "semanal" | "unica";
  dias: string[];
  data: string;
  saida: string;
  volta: string;
  paradas: string[];
  destino: string;
  vanId: string;
  motoristaId: string;
  valorViagem: number | null;
  valorMensal: number | null;
  ativa: boolean;
  observacoes: string;
};
export type Passageiro = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  cidade: string;
  linhaIds: string[];
  formaPagamento: FormaPagamento;
  valor: number;
  emAberto: number;
  ativo: boolean;
} & DetalhePassageiro;
export const estaDevendo = (p: Passageiro) => p.emAberto > 0;

export type Van = {
  id: string;
  apelido: string;
  modelo: string;
  placa: string;
  lugares: number;
  ano: number | null;
  cor: string;
  motoristaId: string;
  situacao: "rodando" | "manutencao";
  observacoes: string;
};
export type Motorista = {
  id: string;
  nome: string;
  telefone: string;
  cnh: string;
  cnhValidade: string;
  proprio: boolean;
  vanId?: string;
};

export type Estado = {
  vans: Van[];
  motoristas: Motorista[];
  linhas: Linha[];
  passageiros: Passageiro[];
  ajustes: Record<string, Ajuste>;
  cobrancas: Cobranca[];
  recibos: Recibo[];
  chavePix: string;
  gastos: Gasto[];
  alertasDispensados: Record<string, string>;
};

export function criarEstadoExemplo(): Estado {
  const base: Estado = {
    vans: vansIniciais.map((v) => ({ ...v, situacao: v.situacao as Van["situacao"] })),
    motoristas: motoristasIniciais.map((m) => ({
      ...m,
      vanId: vansIniciais.find((v) => v.motoristaId === m.id)?.id ?? "",
    })),
    linhas: linhasIniciais.map((l) => ({
      id: l.id,
      nome: l.nome,
      tipo: l.tipo as Linha["tipo"],
      frequencia: "semanal",
      dias: l.dias.map((d) => DIA_NOME[d] ?? d),
      data: "",
      saida: l.saida,
      volta: l.volta,
      paradas: [...l.paradas],
      destino: l.destino,
      vanId: l.vanId,
      motoristaId: l.motoristaId,
      valorViagem: l.valorPorViagem || null,
      valorMensal: l.valorMensal || null,
      ativa: true,
      observacoes: l.observacoes,
    })),
    passageiros: passageirosIniciais.map(({ linhaId, situacao: _s, ...p }) => ({
      ...p,
      endereco: p.endereco.split(",")[0]!,
      ...(detalhesPassageiros[p.id] ?? detalheVazio),
      linhaIds: linhaId ? [linhaId] : [],
      ativo: true,
      emAberto: cobrancasEmAberto.find((c) => c.passageiroId === p.id)?.valor ?? 0,
    })),
    ajustes: {},
    cobrancas: [],
    recibos: [],
    chavePix: "",
    alertasDispensados: {},
    gastos: [
      ...gastosMes.map((g) => ({
        id: g.id,
        valor: g.valor,
        data: g.data,
        categoria: (g.descricao === "Diesel"
          ? "Diesel"
          : g.descricao === "Pedágio"
            ? "Pedágio"
            : "Manutenção") as Categoria,
        vanId: g.vanId,
        linhaId: g.descricao === "Pedágio" ? "l1" : "",
        descricao: g.descricao === "Diesel" || g.descricao === "Pedágio" ? "" : g.descricao,
        litros: null,
        km: null,
        mensal: false,
      })),
      ...gastosExemplo.map(
        ([valor, data, categoria, vanId, linhaId, descricao, litros, km, mensal], i) => ({
          id: `ge${i + 1}`,
          valor,
          data,
          categoria: categoria as Categoria,
          vanId,
          linhaId,
          descricao,
          litros: litros ?? null,
          km: km ?? null,
          mensal: !!mensal,
        }),
      ),
    ],
  };
  const agora = new Date();
  const comAjustes: Estado = {
    ...base,
    ajustes: semearAjustes(base.linhas, base.passageiros, base.vans, agora, exemploViagens),
  };
  // Cobranças de exemplo: cada pagamento de exemplo vira um recibo
  const ref = (t: Cobranca["tipo"], v: string) =>
    t === "viagem" ? refViagem(v) : t === "semana" ? refSemana(v) : refMes(v);
  const recibos: Recibo[] = [];
  const cobrancas: Cobranca[] = cobrancasExemplo.map((c) => {
    const linhaIdCob =
      c.tipo === "viagem"
        ? (comAjustes.passageiros.find((p) => p.id === c.pid)?.linhaIds[0] ?? undefined)
        : undefined;
    const cob: Cobranca = {
      id: idCobranca(c.pid, c.tipo, c.venc),
      pid: c.pid,
      tipo: c.tipo,
      ref: ref(c.tipo, c.venc),
      vencimento: c.venc,
      valor: c.valor,
      pagamentos: [],
      ...(linhaIdCob ? { linhaId: linhaIdCob } : {}),
    };
    if (c.pago) {
      const numero = recibos.length + 1;
      recibos.push({
        numero,
        pid: c.pid,
        valor: c.pago[0],
        refs: [cob.ref],
        forma: c.pago[2],
        data: c.pago[1],
      });
      cob.pagamentos.push({ valor: c.pago[0], data: c.pago[1], forma: c.pago[2], recibo: numero });
    }
    return cob;
  });
  const todas = gerarPeriodicas(cobrancas, comAjustes.passageiros, isoDe(agora));
  const ajustes = semearHistorico(comAjustes.ajustes, comAjustes.linhas, todas, isoDe(agora));
  return comAberto({ ...comAjustes, ajustes, recibos, cobrancas: todas });
}

let estado: Estado;
// O servidor e a primeira renderização do navegador usam sempre este estado (evita erro de hidratação);
// os dados salvos entram logo depois, em iniciarPersistencia().
/** O "deve agora" de cada passageiro vem sempre das cobranças. */
function comAberto(e: Estado): Estado {
  const tot: Record<string, number> = {};
  for (const c of e.cobrancas) tot[c.pid] = (tot[c.pid] ?? 0) + aberto(c);
  const ult: Record<string, string> = {};
  for (const c of e.cobrancas)
    for (const p of c.pagamentos) if (p.data > (ult[c.pid] ?? "")) ult[c.pid] = p.data;
  return {
    ...e,
    passageiros: e.passageiros.map((p) => ({
      ...p,
      emAberto: tot[p.id] ?? 0,
      ultimoPagamento: ult[p.id] ?? p.ultimoPagamento,
    })),
  };
}
estado = criarEstadoExemplo();
const estadoServidor = estado;
/** Aplica `f` a cada ajuste de viagem; devolve o mapa novo. */
const mapAjustes = (a: Record<string, Ajuste>, f: (aj: Ajuste, id: string) => Ajuste | null) =>
  Object.fromEntries(
    Object.entries(a).flatMap(([id, aj]) => {
      const n = f(aj, id);
      return n ? [[id, n] as const] : [];
    }),
  );
const ouvintes = new Set<() => void>();
const set = (e: Estado) => {
  estado = e;
  ouvintes.forEach((f) => f());
};
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};

export const useFrota = () =>
  useSyncExternalStore(
    assinar,
    () => estado,
    () => estadoServidor,
  );
export const obterEstado = () => estado;

// Fica true depois que os dados salvos no aparelho foram carregados (ou se não há como carregar).
let dadosProntos = false;
export const useDadosProntos = () =>
  useSyncExternalStore(
    assinar,
    () => dadosProntos,
    () => false,
  );
const marcarProntos = () => {
  dadosProntos = true;
  ouvintes.forEach((f) => f());
};

const ehLista = (x: unknown) => Array.isArray(x);
export function ehEstado(x: unknown): x is Estado {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    ["vans", "motoristas", "linhas", "passageiros", "cobrancas", "recibos", "gastos"].every((k) =>
      ehLista(e[k]),
    ) &&
    !!e["ajustes"] &&
    typeof e["ajustes"] === "object" &&
    typeof e["chavePix"] === "string"
  );
}

/** Deixa um estado vindo de fora (salvo no aparelho ou de um backup) pronto para uso. */
function normalizarEstado(lido: Estado): Estado {
  // Dados salvos antes da Etapa 2 traziam "passageiroAtualId"; agora quem é o passageiro vem da sessão.
  const { passageiroAtualId: _antigo, ...resto } = lido as Estado & { passageiroAtualId?: string };
  const base: Estado = { ...resto, alertasDispensados: resto.alertasDispensados ?? {} };
  return comAberto({
    ...base,
    cobrancas: gerarPeriodicas(base.cobrancas, base.passageiros, isoDe(new Date())),
  });
}

/** Troca todos os dados de uma vez (restaurar um backup ou desfazer uma restauração). */
export function substituirTodosOsDados(novo: Estado) {
  set(normalizarEstado(novo));
}

/** Carrega os dados salvos no aparelho e passa a salvar a cada mudança. Chamar uma vez, no navegador. */
let persistenciaAtiva = false;
export function iniciarPersistencia(): () => void {
  if (persistenciaAtiva) return () => {};
  const armazem = armazenamentoLocal();
  if (!armazem) {
    marcarProntos();
    return () => {};
  }
  persistenciaAtiva = true;
  const lido = ler(armazem, ehEstado);
  if (lido) set(normalizarEstado(lido));
  marcarProntos();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gravarAgora = () => {
    clearTimeout(timer);
    timer = undefined;
    gravar(armazem, estado);
    salvarMeta();
  };
  const aoOcultar = () => {
    if (document.visibilityState === "hidden") gravarAgora();
  };
  const desassinar = assinar(() => {
    registrarAlteracao();
    clearTimeout(timer);
    timer = setTimeout(gravarAgora, 250);
  });
  window.addEventListener("pagehide", gravarAgora);
  document.addEventListener("visibilitychange", aoOcultar);
  return () => {
    if (timer) gravarAgora();
    desassinar();
    window.removeEventListener("pagehide", gravarAgora);
    document.removeEventListener("visibilitychange", aoOcultar);
    persistenciaAtiva = false;
  };
}

/** Volta tudo para os dados de exemplo e apaga o que estava salvo. */
export function restaurarExemplo() {
  const armazem = armazenamentoLocal();
  if (armazem) limpar(armazem);
  set(criarEstadoExemplo());
}

export function salvarVan(v: Omit<Van, "id"> & { id?: string | undefined }) {
  const van = { ...v, id: v.id || novoId("van") } as Van;
  set({
    ...estado,
    vans: v.id ? estado.vans.map((x) => (x.id === v.id ? van : x)) : [...estado.vans, van],
  });
}
export function excluirVan(id: string) {
  set({
    ...estado,
    linhas: estado.linhas.map((l) => (l.vanId === id ? { ...l, vanId: "" } : l)),
    vans: estado.vans.filter((v) => v.id !== id),
    motoristas: estado.motoristas.map((m) => (m.vanId === id ? { ...m, vanId: "" } : m)),
    gastos: estado.gastos.map((g) => (g.vanId === id ? { ...g, vanId: "" } : g)),
    ajustes: mapAjustes(estado.ajustes, (aj) => {
      if (aj.vanId !== id) return aj;
      const { vanId: _v, ...resto } = aj;
      return resto;
    }),
  });
}
export function salvarMotorista(
  m: Omit<Motorista, "id" | "proprio"> & { id?: string | undefined },
) {
  const atual = estado.motoristas.find((x) => x.id === m.id);
  const mot: Motorista = { ...m, id: m.id || novoId("m"), proprio: atual?.proprio ?? false };
  set({
    ...estado,
    motoristas: atual
      ? estado.motoristas.map((x) => (x.id === mot.id ? mot : x))
      : [...estado.motoristas, mot],
  });
}
export function excluirMotorista(id: string) {
  if (estado.motoristas.find((m) => m.id === id)?.proprio) return;
  set({
    ...estado,
    linhas: estado.linhas.map((l) => (l.motoristaId === id ? { ...l, motoristaId: "" } : l)),
    motoristas: estado.motoristas.filter((m) => m.id !== id),
    vans: estado.vans.map((v) => (v.motoristaId === id ? { ...v, motoristaId: "" } : v)),
    ajustes: mapAjustes(estado.ajustes, (aj) => {
      if (aj.motoristaId !== id) return aj;
      const { motoristaId: _m, ...resto } = aj;
      return resto;
    }),
  });
}

export function salvarLinha(l: Omit<Linha, "id"> & { id?: string | undefined }) {
  const linha = { ...l, id: l.id || novoId("l") } as Linha;
  set({
    ...estado,
    linhas: l.id
      ? estado.linhas.map((x) => (x.id === l.id ? linha : x))
      : [...estado.linhas, linha],
  });
}
export function alternarLinha(id: string) {
  set({
    ...estado,
    linhas: estado.linhas.map((l) => (l.id === id ? { ...l, ativa: !l.ativa } : l)),
  });
}
/** As viagens da linha somem; o dinheiro já movimentado fica, só que sem linha. */
export function excluirLinha(id: string) {
  set(
    comAberto({
      ...estado,
      linhas: estado.linhas.filter((l) => l.id !== id),
      passageiros: estado.passageiros.map((p) => ({
        ...p,
        linhaIds: p.linhaIds.filter((x) => x !== id),
      })),
      ajustes: mapAjustes(estado.ajustes, (aj, chave) => (chave.split("_")[0] === id ? null : aj)),
      gastos: estado.gastos.map((g) => (g.linhaId === id ? { ...g, linhaId: "" } : g)),
      cobrancas: estado.cobrancas.map((c) => {
        if (c.linhaId !== id) return c;
        const { linhaId: _l, ...resto } = c;
        return resto;
      }),
    }),
  );
}
export function colocarNaLinha(linhaId: string, ids: string[]) {
  set({
    ...estado,
    passageiros: estado.passageiros.map((p) =>
      ids.includes(p.id) && !p.linhaIds.includes(linhaId)
        ? { ...p, linhaIds: [...p.linhaIds, linhaId], ativo: true }
        : p,
    ),
  });
}
export function tirarDaLinha(passageiroId: string, linhaId: string) {
  set({
    ...estado,
    passageiros: estado.passageiros.map((p) =>
      p.id === passageiroId ? { ...p, linhaIds: p.linhaIds.filter((x) => x !== linhaId) } : p,
    ),
  });
}
export function salvarPassageiro(p: Omit<Passageiro, "id"> & { id?: string | undefined }): string {
  const pas = { ...p, id: p.id || novoId("p") } as Passageiro;
  set({
    ...estado,
    passageiros: p.id
      ? estado.passageiros.map((x) => (x.id === p.id ? pas : x))
      : [...estado.passageiros, pas],
  });
  return pas.id;
}
export function atualizarPassageiro(id: string, mud: Partial<Passageiro>) {
  set({
    ...estado,
    passageiros: estado.passageiros.map((p) => (p.id === id ? { ...p, ...mud } : p)),
  });
}
export function desativarPassageiro(id: string) {
  atualizarPassageiro(id, { ativo: false, linhaIds: [] });
}
/** Apaga o passageiro e tudo dele: cobranças, recibos e marcações em viagens. (Para guardar o histórico, use desativar.) */
export function excluirPassageiro(id: string) {
  set(
    comAberto({
      ...estado,
      passageiros: estado.passageiros.filter((p) => p.id !== id),
      cobrancas: estado.cobrancas.filter((c) => c.pid !== id),
      recibos: estado.recibos.filter((r) => r.pid !== id),
      ajustes: mapAjustes(estado.ajustes, (aj) => semPassageiro(aj, id)),
    }),
  );
}

export function useViagens() {
  const e = useFrota();
  return useMemo(
    () => montarViagens(e.linhas, e.passageiros, e.vans, e.ajustes, new Date()),
    [e.linhas, e.passageiros, e.vans, e.ajustes],
  );
}
export function ajustarViagem(id: string, aj: Ajuste) {
  set({ ...estado, ajustes: { ...estado.ajustes, [id]: aj } });
}

/**
 * Soma (ou tira, com valor negativo) uma cobrança de viagem no que o passageiro deve.
 * Ao tirar: remove a mais recente ainda sem pagamento; se já foi paga, cancela a cobrança (o recibo fica, pois o dinheiro entrou).
 * Devolve false se não achou cobrança para tirar.
 */
export function lancarCobranca(passageiroId: string, valor: number, linhaId?: string): boolean {
  const hoje = isoDe(new Date());
  let cobrancas = estado.cobrancas;
  if (valor > 0) {
    cobrancas = [
      ...cobrancas,
      {
        id: novoId(`${passageiroId}_viagem_`),
        pid: passageiroId,
        tipo: "viagem",
        ref: refViagem(hoje),
        vencimento: hoje,
        valor,
        pagamentos: [],
        ...(linhaId ? { linhaId } : {}),
      },
    ];
  } else if (valor < 0) {
    const iguais = [...cobrancas]
      .reverse()
      .filter(
        (c) => c.pid === passageiroId && c.tipo === "viagem" && !c.cancelada && c.valor === -valor,
      );
    const livre = iguais.find((c) => c.pagamentos.length === 0);
    const alvo = livre ?? iguais[0];
    if (!alvo) return false;
    cobrancas = livre
      ? cobrancas.filter((c) => c !== alvo)
      : cobrancas.map((c) => (c === alvo ? { ...c, cancelada: "Marcação da viagem desfeita" } : c));
  }
  set(comAberto({ ...estado, cobrancas }));
  return true;
}

/** Marca pagamento (quita as mais antigas primeiro) e devolve o recibo. */
export function marcarPagamento(
  pid: string,
  valor: number,
  forma: Forma,
  data: string,
  soIds?: string[] | undefined,
): Recibo | null {
  const numero = estado.recibos.reduce((m, r) => Math.max(m, r.numero), 0) + 1;
  const r = pagar(estado.cobrancas, pid, valor, forma, data, numero, soIds);
  if (!r.recibo) return null;
  set(comAberto({ ...estado, cobrancas: r.cobs, recibos: [...estado.recibos, r.recibo] }));
  return r.recibo;
}
export function desfazerRecibo(numero: number) {
  set(
    comAberto({
      ...estado,
      cobrancas: desfazerPagamento(estado.cobrancas, numero),
      recibos: estado.recibos.filter((r) => r.numero !== numero),
    }),
  );
}
export function cancelarCob(id: string, motivo: string) {
  set(comAberto({ ...estado, cobrancas: cancelarCobranca(estado.cobrancas, id, motivo) }));
}
export function dispensarAlerta(id: string, assinatura: string) {
  set({ ...estado, alertasDispensados: { ...estado.alertasDispensados, [id]: assinatura } });
}
export function restaurarAlertas() {
  set({ ...estado, alertasDispensados: {} });
}
export function salvarChavePix(chave: string) {
  set({ ...estado, chavePix: chave.trim() });
}

export function salvarGasto(g: Omit<Gasto, "id"> & { id?: string | undefined }) {
  const id = g.id ?? novoId("g");
  set({
    ...estado,
    gastos: g.id
      ? estado.gastos.map((x) => (x.id === g.id ? { ...g, id } : x))
      : [...estado.gastos, { ...g, id }],
  });
}
export function excluirGasto(id: string) {
  set({ ...estado, gastos: estado.gastos.filter((g) => g.id !== id) });
}

export function aceitarConvite(pid: string) {
  set({
    ...estado,
    passageiros: estado.passageiros.map((p) =>
      p.id === pid ? { ...p, convite: "no_app" as const } : p,
    ),
  });
}
export function responderViagemApp(pid: string, viagemId: string, vai: boolean) {
  const aj = estado.ajustes[viagemId];
  if (!aj) return;
  const [linhaId] = viagemId.split("_");
  const linha = estado.linhas.find((l) => l.id === linhaId);
  const vanId = aj.vanId ?? linha?.vanId ?? "";
  const lugares = estado.vans.find((v) => v.id === vanId)?.lugares ?? 0;
  const { ajuste } = definirResposta(aj, pid, vai ? "vai" : "nao", lugares);
  set({ ...estado, ajustes: { ...estado.ajustes, [viagemId]: ajuste } });
}
export function confirmarParadaApp(pid: string, viagemId: string) {
  const aj = estado.ajustes[viagemId];
  if (!aj?.ida?.parada) return;
  const parada = { ...aj.ida.parada, naVan: { ...aj.ida.parada.naVan, [pid]: "app" as const } };
  set({
    ...estado,
    ajustes: { ...estado.ajustes, [viagemId]: { ...aj, ida: { ...aj.ida, parada } } },
  });
}
export function responderVoltaApp(pid: string, viagemId: string, naVan: boolean, motivo?: string) {
  const aj = estado.ajustes[viagemId];
  if (!aj?.ida?.volta) return;
  const novoStatus = naVan
    ? { r: "na_van" as const, via: "app" as const }
    : { r: "nao" as const, motivo: motivo ?? "" };
  const status = { ...aj.ida.volta.status, [pid]: novoStatus };
  set({
    ...estado,
    ajustes: {
      ...estado.ajustes,
      [viagemId]: { ...aj, ida: { ...aj.ida, volta: { ...aj.ida.volta, status } } },
    },
  });
}
