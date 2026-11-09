// Alertas dentro do app: CNH, pagamentos atrasados, prazo de confirmação das viagens e lotação.
import { aberto, brl, dataBR, diasEntre, estadoCob, isoDe, type Cobranca } from "./cobrancas";
import { dataCurta, diaSemana, rotuloDia, type Viagem } from "./viagens";

export type Nivel = "urgente" | "atencao" | "info";
export type TipoAlerta = "cnh" | "cobranca" | "confirmacao" | "lotacao";
export type Alerta = {
  id: string; tipo: TipoAlerta; nivel: Nivel; titulo: string; detalhe: string;
  /** Muda quando a situação muda (ex.: mais gente atrasada); um alerta dispensado volta se a assinatura for outra. */
  assinatura: string;
  destino: { to: "/vanzeiro/motoristas" | "/vanzeiro/dinheiro" | "/vanzeiro/viagens"; search?: { v: string } };
  acao: string;
};

/** Confirmações fecham na véspera, às 20h. */
export const PRAZO = { diasAntes: 1, hora: 20 } as const;
export const CNH_URGENTE_DIAS = 15;
export const CNH_AVISO_DIAS = 60;
export const COBRANCA_URGENTE_DIAS = 15;

const ORDEM_NIVEL: Record<Nivel, number> = { urgente: 0, atencao: 1, info: 2 };
const ORDEM_TIPO: Record<TipoAlerta, number> = { cnh: 0, confirmacao: 1, cobranca: 2, lotacao: 3 };

const doIso = (s: string) => { const [a, m, d] = s.split("-").map(Number); return new Date(a!, m! - 1, d!); };
const inicioDaViagem = (data: string, saida: string) => {
  const d = doIso(data);
  const [h, m] = (saida || "00:00").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

/** Até quando os passageiros podem confirmar uma viagem. */
export function prazoViagem(data: string, agora: Date): { limite: Date; encerrado: boolean; rotulo: string } {
  const limite = doIso(data);
  limite.setDate(limite.getDate() - PRAZO.diasAntes);
  limite.setHours(PRAZO.hora, 0, 0, 0);
  const encerrado = agora.getTime() >= limite.getTime();
  const dia = rotuloDia(isoDe(limite), agora).toLowerCase();
  return { limite, encerrado, rotulo: encerrado ? "Prazo de confirmação encerrado" : `Confirmações até ${dia} às ${PRAZO.hora}h` };
}

const tempoRestante = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return "menos de 1 hora";
  const h = Math.floor(min / 60);
  return `${h} ${h === 1 ? "hora" : "horas"}`;
};
const lista = (nomes: string[], max = 3) => (nomes.length <= max ? nomes.join(", ") : `${nomes.slice(0, max).join(", ")} e mais ${nomes.length - max}`);
const primeiro = (n: string) => n.split(" (")[0]!.split(" ")[0]!;

export type EntradaAlertas = {
  motoristas: { id: string; nome: string; cnhValidade: string }[];
  cobrancas: Cobranca[];
  passageiros: { id: string; nome: string }[];
  linhas: { id: string; nome: string }[];
  viagens: Viagem[];
  agora: Date;
};

export function gerarAlertas({ motoristas, cobrancas, passageiros, linhas, viagens, agora }: EntradaAlertas): Alerta[] {
  const hoje = isoDe(agora);
  const nomePas = (id: string) => passageiros.find((p) => p.id === id)?.nome ?? "Passageiro";
  const out: Alerta[] = [];

  for (const m of motoristas) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.cnhValidade)) continue;
    const dias = diasEntre(hoje, m.cnhValidade);
    if (dias > CNH_AVISO_DIAS) continue;
    const nivel: Nivel = dias <= CNH_URGENTE_DIAS ? "urgente" : "atencao";
    out.push({
      id: `cnh_${m.id}`, tipo: "cnh", nivel, assinatura: `${m.cnhValidade}:${nivel}`, acao: "Ver motorista",
      titulo: dias < 0 ? `CNH de ${primeiro(m.nome)} vencida` : dias === 0 ? `CNH de ${primeiro(m.nome)} vence hoje` : `CNH de ${primeiro(m.nome)} vence em ${dias} ${dias === 1 ? "dia" : "dias"}`,
      detalhe: dias < 0 ? `Venceu há ${-dias} ${-dias === 1 ? "dia" : "dias"} (${dataBR(m.cnhValidade)}). Renove antes de dirigir.` : `Validade: ${dataBR(m.cnhValidade)}. Renove a tempo.`,
      destino: { to: "/vanzeiro/motoristas" },
    });
  }

  const atrasadas = cobrancas.filter((c) => estadoCob(c, hoje) === "atrasada");
  if (atrasadas.length) {
    const porPas = new Map<string, { total: number; dias: number }>();
    for (const c of atrasadas) {
      const a = porPas.get(c.pid) ?? { total: 0, dias: 0 };
      a.total += aberto(c); a.dias = Math.max(a.dias, diasEntre(c.vencimento, hoje));
      porPas.set(c.pid, a);
    }
    const total = Math.round([...porPas.values()].reduce((s, a) => s + a.total, 0) * 100) / 100;
    const maisAntigo = [...porPas.entries()].sort((a, b) => b[1].dias - a[1].dias || b[1].total - a[1].total)[0]!;
    const nivel: Nivel = maisAntigo[1].dias >= COBRANCA_URGENTE_DIAS ? "urgente" : "atencao";
    const n = porPas.size;
    out.push({
      id: "cobrancas", tipo: "cobranca", nivel, assinatura: `${n}:${total}:${nivel}`, acao: "Ver cobranças",
      titulo: n === 1 ? `${primeiro(nomePas(maisAntigo[0]))} está com pagamento atrasado` : `${n} passageiros com pagamento atrasado`,
      detalhe: `${brl(total)} em atraso. O mais antigo é ${primeiro(nomePas(maisAntigo[0]))}, há ${maisAntigo[1].dias} ${maisAntigo[1].dias === 1 ? "dia" : "dias"}.`,
      destino: { to: "/vanzeiro/dinheiro" },
    });
  }

  for (const v of viagens) {
    if (v.passada || v.ajuste.cancelada || v.ajuste.ida || v.sem.length === 0) continue;
    const inicio = inicioDaViagem(v.data, v.saida);
    if (inicio.getTime() <= agora.getTime()) continue;
    const { limite, encerrado } = prazoViagem(v.data, agora);
    if (limite.getTime() - agora.getTime() > 24 * 3600000) continue;
    const nl = linhas.find((l) => l.id === v.linhaId)?.nome ?? "Viagem";
    const quando = `${diaSemana(v.data).toLowerCase()}, ${dataCurta(v.data)} às ${v.saida}`;
    out.push({
      id: `conf_${v.id}`, tipo: "confirmacao", nivel: encerrado ? "urgente" : "atencao", assinatura: `${v.sem.length}:${encerrado ? 1 : 0}`, acao: "Lembrar quem não respondeu",
      titulo: encerrado ? `Prazo encerrado: ${v.sem.length} sem resposta` : `Confirmações fecham em ${tempoRestante(limite.getTime() - agora.getTime())}`,
      detalhe: `${nl}, ${quando}. Sem resposta: ${lista(v.sem.map((id) => primeiro(nomePas(id))))}.`,
      destino: { to: "/vanzeiro/viagens", search: { v: v.id } },
    });
  }

  const lotada = viagens.find((v) => !v.passada && !v.ajuste.cancelada && v.situacao === "lotada" && v.espera.length > 0);
  if (lotada) {
    out.push({
      id: `lotada_${lotada.id}`, tipo: "lotacao", nivel: "info", assinatura: `${lotada.espera.length}`, acao: "Ver viagem",
      titulo: `Viagem de ${diaSemana(lotada.data).toLowerCase()} lotada`,
      detalhe: `${lotada.espera.length} ${lotada.espera.length === 1 ? "pessoa" : "pessoas"} na lista de espera.`,
      destino: { to: "/vanzeiro/viagens", search: { v: lotada.id } },
    });
  }

  return out.sort((a, b) => ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel] || ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo] || a.id.localeCompare(b.id));
}

/** Tira os alertas que o vanzeiro dispensou, a menos que a situação tenha mudado desde então. */
export const filtrarDispensados = (alertas: Alerta[], dispensados: Record<string, string>) => alertas.filter((a) => dispensados[a.id] !== a.assinatura);

/** Quantos alertas pedem atenção (os informativos não contam no selo). */
export const contarAtencao = (alertas: Alerta[]) => alertas.filter((a) => a.nivel !== "info").length;

// ===== Avisos para o passageiro =====
export type AvisoPassageiro = {
  id: string; nivel: Nivel; titulo: string; detalhe: string;
  destino?: "/passageiro/pagamentos" | "/passageiro/viagens"; acao?: string;
};

/** Avisos do próprio passageiro: pagamento atrasado, prazo para responder e viagem cancelada. */
export function gerarAvisosPassageiro({ pid, cobrancas, viagens, agora }: { pid: string; cobrancas: Cobranca[]; viagens: Viagem[]; agora: Date }): AvisoPassageiro[] {
  const hoje = isoDe(agora);
  const out: AvisoPassageiro[] = [];

  const atrasadas = cobrancas.filter((c) => c.pid === pid && estadoCob(c, hoje) === "atrasada");
  if (atrasadas.length) {
    const dias = Math.max(...atrasadas.map((c) => diasEntre(c.vencimento, hoje)));
    const total = Math.round(atrasadas.reduce((s, c) => s + aberto(c), 0) * 100) / 100;
    out.push({
      id: "atraso", nivel: dias >= COBRANCA_URGENTE_DIAS ? "urgente" : "atencao", destino: "/passageiro/pagamentos", acao: "Ver pagamentos",
      titulo: `Pagamento atrasado há ${dias} ${dias === 1 ? "dia" : "dias"}`,
      detalhe: `Você deve ${brl(total)}. Pague pelo Pix e avise o vanzeiro.`,
    });
  }

  const minhas = viagens.filter((v) => v.passageiroIds.includes(pid) && !v.ajuste.cancelada && !v.passada && !v.ajuste.ida);
  for (const v of minhas) {
    if ((v.ajuste.respostas[pid] ?? "sem") !== "sem") continue;
    if (inicioDaViagem(v.data, v.saida).getTime() <= agora.getTime()) continue;
    const { limite, encerrado } = prazoViagem(v.data, agora);
    if (limite.getTime() - agora.getTime() > 24 * 3600000) continue;
    const quando = `${diaSemana(v.data).toLowerCase()}, ${dataCurta(v.data)}`;
    out.push({
      id: `responder_${v.id}`, nivel: "atencao", destino: "/passageiro/viagens", acao: encerrado ? "Ver viagem" : "Responder",
      titulo: encerrado ? `Prazo encerrado: viagem de ${quando}` : `Responda a viagem de ${quando}`,
      detalhe: encerrado ? "O prazo para confirmar já passou. Fale com o vanzeiro se ainda quiser ir." : `Faltam ${tempoRestante(limite.getTime() - agora.getTime())} para o prazo (${PRAZO.hora}h).`,
    });
  }

  const canceladas = viagens.filter((v) => v.passageiroIds.includes(pid) && v.ajuste.cancelada && v.data >= hoje && diasEntre(hoje, v.data) <= 7);
  for (const v of canceladas) {
    out.push({
      id: `cancelada_${v.id}`, nivel: "info", destino: "/passageiro/viagens", acao: "Ver viagens",
      titulo: `A viagem de ${diaSemana(v.data).toLowerCase()}, ${dataCurta(v.data)} foi cancelada`, detalhe: "O vanzeiro cancelou esta viagem. Você não precisa fazer nada.",
    });
  }

  return out.sort((a, b) => ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel] || a.id.localeCompare(b.id));
}
