// Guarda todos os dados do app. Ficam salvos no aparelho (localStorage) e "Restaurar exemplo" volta ao início.
import { useMemo, useSyncExternalStore } from "react";
import { prazoViagem } from "./alertas";
import { marcarNaoSalvou } from "./gravacao";
import {
  opCancelarViagem,
  opChamadaNaParada,
  opDefinirResposta,
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
import {
  previaDoConvite,
  visaoDoPassageiro,
  type ConvitePreview,
  type VisaoPassageiro,
} from "./visaoPassageiro";
import { novoId } from "./ids";
import { CHAVE, armazenamentoLocal, gravar, ler, limpar } from "./persistencia";
import { registrarAlteracao, salvarMeta } from "./backup";
import {
  vans as vansIniciais,
  motoristas as motoristasIniciais,
  linhas as linhasIniciais,
  passageiros as passageirosIniciais,
  detalhesPassageiros,
  cobrancasEmAberto,
  detalheVazio,
  exemploViagens,
  cobrancasExemplo,
  gastosMes,
  gastosExemplo,
  vanzeiro as vanzeiroExemplo,
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
  cobrancaSoVolta,
  datasDaLinha,
  novaVolta,
  semearAjustes,
  montarViagens,
  semPassageiro,
  type Ajuste,
  type Resposta,
  type StatusVolta,
} from "./viagens";
import { semearHistorico } from "./historico";
import {
  DIAS,
  TIPOS_LINHA,
  type Estado,
  type Linha,
  type Motorista,
  type Passageiro,
  type PerfilVanzeiro,
  type Van,
} from "./tipos";

const DIA_NOME: Record<string, string> = {
  segunda: "seg",
  terça: "ter",
  quarta: "qua",
  quinta: "qui",
  sexta: "sex",
  sábado: "sab",
  domingo: "dom",
};

const perfilDoExemplo = (): PerfilVanzeiro => ({
  nome: vanzeiroExemplo.nome,
  cidade: vanzeiroExemplo.cidade,
  estado: vanzeiroExemplo.estado,
  telefone: vanzeiroExemplo.telefone,
  email: vanzeiroExemplo.email,
  configurado: true,
});

/** Conta nova: sem vans, linhas nem passageiros, e com o perfil ainda por preencher. */
export function criarEstadoVazio(): Estado {
  return {
    perfil: { nome: "", cidade: "", estado: "", telefone: "", email: "", configurado: false },
    vans: [],
    motoristas: [],
    linhas: [],
    passageiros: [],
    ajustes: {},
    cobrancas: [],
    recibos: [],
    chavePix: "",
    gastos: [],
    alertasDispensados: {},
  };
}

export function criarEstadoExemplo(): Estado {
  const base: Estado = {
    perfil: perfilDoExemplo(),
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

/** Só o que o passageiro `pid` pode ver (ele, as linhas e viagens dele, as cobranças e recibos dele). */
export function usePassageiroVisao(pid: string): VisaoPassageiro {
  const e = useFrota();
  return useMemo(() => visaoDoPassageiro(e, pid, new Date()), [e, pid]);
}
/** Prévia do convite, sem dados pessoais: existe, está válido e se o passageiro já entrou no app. */
export function useConvite(pid: string): ConvitePreview {
  const e = useFrota();
  return useMemo(() => previaDoConvite(e, pid), [e, pid]);
}

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
  // Dados salvos antes do perfil existir (versões de demonstração) mantêm o vanzeiro de exemplo, já configurado.
  const base: Estado = {
    ...resto,
    alertasDispensados: resto.alertasDispensados ?? {},
    perfil: resto.perfil ?? perfilDoExemplo(),
  };
  return comAberto({
    ...base,
    cobrancas: gerarPeriodicas(base.cobrancas, base.passageiros, isoDe(new Date())),
  });
}

export const useVanzeiro = (): PerfilVanzeiro => useFrota().perfil;

/**
 * Salva os dados do vanzeiro e conclui o primeiro acesso. O vanzeiro também é um motorista (o "próprio"),
 * então esse cadastro é criado ou atualizado junto, para a CNH e as viagens já terem de onde partir.
 */
export function salvarPerfil(p: Omit<PerfilVanzeiro, "configurado">) {
  const perfil: PerfilVanzeiro = {
    nome: p.nome.trim(),
    cidade: p.cidade.trim(),
    estado: p.estado.trim().toUpperCase(),
    telefone: p.telefone.trim(),
    email: p.email.trim(),
    configurado: true,
  };
  const temProprio = estado.motoristas.some((m) => m.proprio);
  const motoristas = temProprio
    ? estado.motoristas.map((m) =>
        m.proprio ? { ...m, nome: perfil.nome, telefone: perfil.telefone } : m,
      )
    : [
        ...estado.motoristas,
        {
          id: novoId("m"),
          nome: perfil.nome,
          telefone: perfil.telefone,
          cnh: "D",
          cnhValidade: "",
          proprio: true,
          vanId: "",
        },
      ];
  set({ ...estado, perfil, motoristas });
}

/** Apaga tudo e volta ao primeiro acesso (conta vazia). Quem chama deve guardar antes uma cópia de segurança. */
export function comecarDoZero() {
  set(criarEstadoVazio());
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
    set(criarEstadoVazio());
    marcarNaoSalvou(true);
    marcarProntos();
    return () => {};
  }
  persistenciaAtiva = true;
  const lido = ler(armazem, ehEstado);
  if (lido) {
    set(normalizarEstado(lido));
  } else {
    // Primeiro acesso (nada salvo): a conta começa vazia. Se havia algo ilegível, guarda uma cópia antes que seja sobrescrito.
    try {
      const bruto = armazem.getItem(CHAVE);
      if (bruto) armazem.setItem("vanzeiro:dados-ilegiveis", bruto);
    } catch {
      /* sem espaço: segue sem a cópia */
    }
    set(criarEstadoVazio());
  }
  marcarProntos();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // `sujo`: há mudança ainda não guardada. Sem ela, uma janela parada (com dado velho) não sobrescreve a outra.
  let sujo = false;
  // Mudança que veio de outra janela do app: só mostra, não guarda de volta (evita um ficar "devolvendo" ao outro).
  let aplicandoDeFora = false;
  const gravarAgora = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!sujo) return;
    sujo = false;
    marcarNaoSalvou(!gravar(armazem, estado));
    salvarMeta();
  };
  const aoOcultar = () => {
    if (document.visibilityState === "hidden") gravarAgora();
  };
  const desassinar = assinar(() => {
    if (aplicandoDeFora) return;
    sujo = true;
    registrarAlteracao();
    clearTimeout(timer);
    timer = setTimeout(gravarAgora, 250);
  });
  // O app instalado e o navegador (ou duas abas) compartilham os mesmos dados: quando um muda, o outro acompanha.
  const aoMudarDeFora = (e: StorageEvent) => {
    if (e.key !== CHAVE) return;
    const novo = ler(armazem, ehEstado);
    if (!novo) return;
    aplicandoDeFora = true;
    try {
      set(normalizarEstado(novo));
    } finally {
      aplicandoDeFora = false;
    }
  };
  window.addEventListener("pagehide", gravarAgora);
  window.addEventListener("storage", aoMudarDeFora);
  document.addEventListener("visibilitychange", aoOcultar);
  return () => {
    if (timer) gravarAgora();
    desassinar();
    window.removeEventListener("pagehide", gravarAgora);
    window.removeEventListener("storage", aoMudarDeFora);
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
function cobrancasComViagem(
  cobrancas: Cobranca[],
  passageiroId: string,
  valor: number,
  linhaId?: string,
): Cobranca[] | null {
  const hoje = isoDe(new Date());
  if (valor > 0) {
    return [
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
  }
  if (valor < 0) {
    const iguais = [...cobrancas]
      .reverse()
      .filter(
        (c) => c.pid === passageiroId && c.tipo === "viagem" && !c.cancelada && c.valor === -valor,
      );
    const livre = iguais.find((c) => c.pagamentos.length === 0);
    const alvo = livre ?? iguais[0];
    if (!alvo) return null;
    return livre
      ? cobrancas.filter((c) => c !== alvo)
      : cobrancas.map((c) => (c === alvo ? { ...c, cancelada: "Marcação da viagem desfeita" } : c));
  }
  return cobrancas;
}
export function lancarCobranca(passageiroId: string, valor: number, linhaId?: string): boolean {
  const cobrancas = cobrancasComViagem(estado.cobrancas, passageiroId, valor, linhaId);
  if (!cobrancas) return false;
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
// ===== Operações pequenas sobre uma viagem =====
// Cada uma mexe só no que é dela e é aplicada sobre o dado MAIS RECENTE (veja operacoesViagem.ts).
// Quando mexe também no dinheiro (cobrança), tudo vai numa transição só: ou muda os dois, ou nenhum.
type PedidoCobranca = { pid: string; valor: number; linhaId?: string | undefined };

/**
 * A viagem existe se a linha dela está ativa e roda naquele dia (os dados da viagem são criados na primeira escrita,
 * por isso uma viagem futura ainda sem registro também conta).
 */
const viagemExiste = (viagemId: string) => {
  const [linhaId, data] = viagemId.split("_");
  const linha = estado.linhas.find((l) => l.id === linhaId);
  return (
    !!linha &&
    !!data &&
    (!!estado.ajustes[viagemId] || datasDaLinha(linha, new Date()).includes(data))
  );
};

function mudarViagem(
  viagemId: string,
  f: (aj: Ajuste) => Ajuste | null,
  cobranca?: PedidoCobranca,
): boolean {
  if (!viagemExiste(viagemId)) return false;
  const novo = f(estado.ajustes[viagemId] ?? vaziaDaViagem());
  if (!novo) return false;
  let cobrancas = estado.cobrancas;
  if (cobranca) {
    cobrancas =
      cobrancasComViagem(cobrancas, cobranca.pid, cobranca.valor, cobranca.linhaId) ?? cobrancas;
  }
  set(comAberto({ ...estado, ajustes: { ...estado.ajustes, [viagemId]: novo }, cobrancas }));
  return true;
}
const vaziaDaViagem = (): Ajuste => ({ respostas: {}, espera: [], extras: [] });
const linhaIdDe = (viagemId: string) => viagemId.split("_")[0] ?? "";
const passageiroPorId = (id: string) => estado.passageiros.find((p) => p.id === id);
function lugaresDaViagem(viagemId: string, aj: Ajuste): number {
  const linha = estado.linhas.find((l) => l.id === linhaIdDe(viagemId));
  const vanId = aj.vanId ?? linha?.vanId ?? "";
  return estado.vans.find((v) => v.id === vanId)?.lugares ?? 0;
}

// --- O passageiro (pelo app)
/**
 * O passageiro responde "Vou" / "Não vou". Depois do prazo de confirmação ele não muda mais
 * (devolve `false`); o vanzeiro ainda ajusta a resposta dele na própria viagem.
 */
export function responderViagemApp(pid: string, viagemId: string, vai: boolean): boolean {
  const data = viagemId.split("_")[1] ?? "";
  if (prazoViagem(data, new Date()).encerrado) return false;
  return mudarViagem(
    viagemId,
    (aj) => opDefinirResposta(aj, pid, vai ? "vai" : "nao", lugaresDaViagem(viagemId, aj)).ajuste,
  );
}
export function confirmarParadaApp(pid: string, viagemId: string): boolean {
  return mudarViagem(viagemId, (aj) => opPresencasNaParada(aj, "ida", { [pid]: "app" }));
}
export function responderVoltaApp(
  pid: string,
  viagemId: string,
  naVan: boolean,
  motivo?: string,
): boolean {
  const status: StatusVolta = naVan
    ? { r: "na_van", via: "app" }
    : { r: "nao", motivo: motivo ?? "" };
  return mudarViagem(viagemId, (aj) => opStatusNaVolta(aj, { [pid]: status }));
}

// --- O vanzeiro: a viagem em geral
/** Marca a resposta de um passageiro (Vai / Não vai / Sem resposta) respeitando lotação e fila de espera. */
export function definirRespostaDoPassageiro(
  viagemId: string,
  pid: string,
  r: Exclude<Resposta, "espera">,
): { foiParaEspera: boolean; subiu?: string } | null {
  let resultado: { foiParaEspera: boolean; subiu?: string } | null = null;
  const ok = mudarViagem(viagemId, (aj) => {
    const res = opDefinirResposta(aj, pid, r, lugaresDaViagem(viagemId, aj));
    resultado = { foiParaEspera: res.foiParaEspera, ...(res.subiu ? { subiu: res.subiu } : {}) };
    return res.ajuste;
  });
  return ok ? resultado : null;
}
export const adicionarExtraNaViagem = (viagemId: string, pid: string) =>
  mudarViagem(viagemId, (aj) => opExtraNaViagem(aj, pid));
export const cancelarViagem = (viagemId: string) =>
  mudarViagem(viagemId, (aj) => opCancelarViagem(aj));
/** Troca o motorista da viagem e, se informada, a van (quem não cabe vai para a lista de espera). */
export function trocarVanOuMotoristaDaViagem(
  viagemId: string,
  motoristaId: string,
  vanId?: string,
): boolean {
  const lugares = vanId ? (estado.vans.find((v) => v.id === vanId)?.lugares ?? 0) : 0;
  return mudarViagem(viagemId, (aj) => opTrocarVanOuMotorista(aj, motoristaId, vanId, lugares));
}

// --- O vanzeiro: a ida
export const iniciarIda = (viagemId: string, ordem: string[]) =>
  mudarViagem(viagemId, (aj) => opIniciarIda(aj, ordem, Date.now()));
/** Marca embarcou / não apareceu. Quem paga por viagem e embarcou já recebe a cobrança, na mesma gravação. */
export function marcarEmbarque(
  viagemId: string,
  pid: string,
  r: "embarcou" | "faltou",
): { ok: boolean; cobrou: number } {
  const p = passageiroPorId(pid);
  const cobrou = r === "embarcou" && p?.formaPagamento === "por_viagem" ? p.valor : 0;
  const ok = mudarViagem(
    viagemId,
    (aj) => opMarcarEmbarque(aj, pid, r, cobrou),
    cobrou ? { pid, valor: cobrou, linhaId: linhaIdDe(viagemId) } : undefined,
  );
  return { ok, cobrou: ok ? cobrou : 0 };
}
/** Desfaz a última marcação da ida e a cobrança dela, na mesma gravação. */
export function desfazerUltimaMarcacaoDaIda(viagemId: string): {
  ok: boolean;
  cobrancaAchada: boolean;
} {
  const aj = estado.ajustes[viagemId];
  const desfeito = aj ? opDesfazerMarcacao(aj) : null;
  if (!desfeito) return { ok: false, cobrancaAchada: true };
  const { cobrou, pid } = desfeito.desfeita;
  const cobrancaAchada = !cobrou || cobrancasComViagem(estado.cobrancas, pid, -cobrou) !== null;
  const ok = mudarViagem(
    viagemId,
    (a) => opDesfazerMarcacao(a)?.ajuste ?? null,
    cobrou ? { pid, valor: -cobrou } : undefined,
  );
  return { ok, cobrancaAchada };
}
export const reordenarFaltamNaIda = (viagemId: string, faltam: string[]) =>
  mudarViagem(viagemId, (aj) => opReordenarFaltam(aj, faltam));
export const mudarFaseDaIda = (viagemId: string, fase: "paradas" | "a_caminho" | "chegou") =>
  mudarViagem(viagemId, (aj) => opMudarFase(aj, fase));
export const iniciarVolta = (viagemId: string) =>
  mudarViagem(viagemId, (aj) => opIniciarVolta(aj, novaVolta(Date.now())));
export const encerrarViagem = (viagemId: string) =>
  mudarViagem(viagemId, (aj) => opEncerrarViagem(aj, Date.now()));

// --- O vanzeiro: parada no caminho (ida ou volta)
export const iniciarParada = (
  viagemId: string,
  trecho: "ida" | "volta",
  minutos: number,
  local: string,
) => mudarViagem(viagemId, (aj) => opIniciarParada(aj, trecho, minutos, local, Date.now()));
export const marcarPresencasNaParada = (
  viagemId: string,
  trecho: "ida" | "volta",
  mudancas: Record<string, "manual" | "app" | null>,
) => mudarViagem(viagemId, (aj) => opPresencasNaParada(aj, trecho, mudancas));
export const pedirChamadaNaParada = (viagemId: string, trecho: "ida" | "volta") =>
  mudarViagem(viagemId, (aj) => opChamadaNaParada(aj, trecho));
export const encerrarParada = (viagemId: string, trecho: "ida" | "volta", motivo: string) =>
  mudarViagem(viagemId, (aj) => opEncerrarParada(aj, trecho, motivo, Date.now()));

// --- O vanzeiro: a volta
export const marcarStatusNaVolta = (
  viagemId: string,
  mudancas: Record<string, StatusVolta | null>,
) => mudarViagem(viagemId, (aj) => opStatusNaVolta(aj, mudancas));
export const iniciarEntregas = (viagemId: string, ordem: string[]) =>
  mudarViagem(viagemId, (aj) => opIniciarEntregas(aj, ordem));
/** Quem só volta entra na chamada; quem paga por viagem e ainda não foi cobrado recebe a cobrança, na mesma gravação. */
export function adicionarExtraNaVolta(
  viagemId: string,
  pid: string,
): { ok: boolean; cobrou: number } {
  const p = passageiroPorId(pid);
  const ida = estado.ajustes[viagemId]?.ida;
  const cobrou = ida && p ? cobrancaSoVolta(ida, pid, p.formaPagamento, p.valor) : 0;
  const ok = mudarViagem(
    viagemId,
    (aj) => opExtraNaVolta(aj, pid, cobrou),
    cobrou ? { pid, valor: cobrou, linhaId: linhaIdDe(viagemId) } : undefined,
  );
  return { ok, cobrou: ok ? cobrou : 0 };
}
export const entregarNaVolta = (
  viagemId: string,
  pid: string,
  r: "entregue" | "outro",
  onde?: string,
) => mudarViagem(viagemId, (aj) => opEntregar(aj, pid, r, onde));
export const desfazerEntregaNaVolta = (viagemId: string) =>
  mudarViagem(viagemId, (aj) => opDesfazerEntrega(aj));
export const reordenarEntregasDaVolta = (viagemId: string, ainda: string[]) =>
  mudarViagem(viagemId, (aj) => opReordenarEntregas(aj, ainda));
