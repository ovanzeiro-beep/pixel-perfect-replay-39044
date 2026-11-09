// Regras das cobranças: situação, pagamentos (quitando as mais antigas primeiro), recibos e mensagens.
export type Forma = "dinheiro" | "pix";
export type Pagto = { valor: number; data: string; forma: Forma; recibo: number };
export type TipoCobranca = "viagem" | "semana" | "mes";
export type Cobranca = {
  id: string; pid: string; tipo: TipoCobranca; ref: string; vencimento: string; valor: number;
  pagamentos: Pagto[]; cancelada?: string; linhaId?: string; // motivo
};
export type Recibo = { numero: number; pid: string; valor: number; refs: string[]; forma: Forma; data: string };
type PassageiroCob = { id: string; formaPagamento: string; valor: number; vencimento: string; ativo: boolean };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const p2 = (n: number) => String(n).padStart(2, "0");
export const isoDe = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const dataDe = (s: string) => { const [a, m, d] = s.split("-").map(Number); return new Date(a!, m! - 1, d!); };
const somaDias = (s: string, n: number) => { const d = dataDe(s); d.setDate(d.getDate() + n); return isoDe(d); };
export const diasEntre = (de: string, ate: string) => Math.round((dataDe(ate).getTime() - dataDe(de).getTime()) / 86400000);
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
export const dataBR = (s: string) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "—");
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const refViagem = (dia: string) => `Viagem ${ddmm(dia)}`;
export function refSemana(inicio: string) {
  const fim = somaDias(inicio, 6);
  return inicio.slice(5, 7) === fim.slice(5, 7) ? `Semana ${inicio.slice(8, 10)} a ${ddmm(fim)}` : `Semana ${ddmm(inicio)} a ${ddmm(fim)}`;
}
export const refMes = (dia: string) => MESES[Number(dia.slice(5, 7)) - 1]!;
export const idCobranca = (pid: string, tipo: TipoCobranca, venc: string) => `${pid}_${tipo}_${venc}`;

export const pago = (c: Cobranca) => c.pagamentos.reduce((s, p) => s + p.valor, 0);
export const aberto = (c: Cobranca) => (c.cancelada ? 0 : Math.max(0, Math.round((c.valor - pago(c)) * 100) / 100));

export type EstadoCob = "paga" | "cancelada" | "atrasada" | "vence_logo" | "a_vencer";
export function estadoCob(c: Cobranca, hoje: string): EstadoCob {
  if (c.cancelada) return "cancelada";
  if (aberto(c) === 0) return "paga";
  const d = diasEntre(hoje, c.vencimento);
  return d < 0 ? "atrasada" : d <= 7 ? "vence_logo" : "a_vencer";
}
export function nomeEstado(c: Cobranca, hoje: string) {
  const e = estadoCob(c, hoje);
  if (e === "paga" || e === "cancelada") return e === "paga" ? "Paga" : "Cancelada";
  const parte = pago(c) > 0 ? " · paga em parte" : "";
  return (e === "atrasada" ? `Atrasada ${diasEntre(c.vencimento, hoje)} dias` : c.vencimento === hoje ? "Vence hoje" : `Vence ${ddmm(c.vencimento)}`) + parte;
}

export type Cor = "verde" | "amarelo" | "vermelho";
export function resumoPassageiro(cobs: Cobranca[], pid: string, hoje: string) {
  const abertas = cobs.filter((c) => c.pid === pid && aberto(c) > 0).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const total = abertas.reduce((s, c) => s + aberto(c), 0);
  const atrasadas = abertas.filter((c) => estadoCob(c, hoje) === "atrasada");
  const diasAtraso = atrasadas[0] ? diasEntre(atrasadas[0].vencimento, hoje) : 0;
  const cor: Cor = atrasadas.length ? "vermelho" : abertas.some((c) => estadoCob(c, hoje) === "vence_logo") ? "amarelo" : "verde";
  return { total, qtd: abertas.length, diasAtraso, cor, refs: abertas.map((c) => c.ref) };
}

/** Marca um pagamento: quita primeiro as cobranças mais antigas; o resto continua em aberto. */
export function pagar(cobs: Cobranca[], pid: string, valor: number, forma: Forma, data: string, numero: number, soIds?: string[] | undefined): { cobs: Cobranca[]; recibo: Recibo | null } {
  let resta = Math.round(valor * 100) / 100;
  if (resta <= 0) return { cobs, recibo: null };
  const ordem = cobs.filter((c) => c.pid === pid && aberto(c) > 0 && (!soIds || soIds.includes(c.id))).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const parte: Record<string, number> = {};
  for (const c of ordem) {
    if (resta <= 0) break;
    const v = Math.min(resta, aberto(c));
    parte[c.id] = v; resta = Math.round((resta - v) * 100) / 100;
  }
  const usado = Math.round((valor - resta) * 100) / 100;
  if (usado <= 0) return { cobs, recibo: null };
  const novas = cobs.map((c) => (parte[c.id] ? { ...c, pagamentos: [...c.pagamentos, { valor: parte[c.id]!, data, forma, recibo: numero }] } : c));
  return { cobs: novas, recibo: { numero, pid, valor: usado, refs: ordem.filter((c) => parte[c.id]).map((c) => c.ref), forma, data } };
}
/** Desfaz um pagamento inteiro (pelo número do recibo). */
export const desfazerPagamento = (cobs: Cobranca[], numero: number) =>
  cobs.map((c) => (c.pagamentos.some((p) => p.recibo === numero) ? { ...c, pagamentos: c.pagamentos.filter((p) => p.recibo !== numero) } : c));
export const cancelarCobranca = (cobs: Cobranca[], id: string, motivo: string) => cobs.map((c) => (c.id === id ? { ...c, cancelada: motivo } : c));

/** Cria as cobranças semanais e mensais no dia do vencimento (com `frente` > 0, prevê as dos próximos dias). */
export function gerarPeriodicas(cobs: Cobranca[], passageiros: PassageiroCob[], hoje: string, frente = 0): Cobranca[] {
  const existe = new Set(cobs.map((c) => c.id));
  const novas: Cobranca[] = [];
  const add = (p: PassageiroCob, tipo: TipoCobranca, venc: string, ref: string) => {
    const id = idCobranca(p.id, tipo, venc);
    if (existe.has(id)) return;
    existe.add(id); novas.push({ id, pid: p.id, tipo, ref, vencimento: venc, valor: p.valor, pagamentos: [] });
  };
  for (const p of passageiros) {
    if (!p.ativo || !p.vencimento) continue;
    if (p.formaPagamento === "semanal") {
      const dia = SEMANA.indexOf(p.vencimento);
      if (dia < 0) continue;
      for (let n = 0; n <= frente; n++) {
        const d = somaDias(hoje, n);
        if (dataDe(d).getDay() === dia) add(p, "semana", d, refSemana(d));
      }
      const ult = Array.from({ length: 7 }, (_, n) => somaDias(hoje, -n)).find((d) => dataDe(d).getDay() === dia);
      if (ult) add(p, "semana", ult, refSemana(ult));
    } else if (p.formaPagamento === "mensal") {
      const dia = Math.min(28, Number(p.vencimento) || 1);
      const este = `${hoje.slice(0, 8)}${p2(dia)}`;
      const h = dataDe(hoje); const prox = isoDe(new Date(h.getFullYear(), h.getMonth() + 1, dia));
      if (este <= hoje) add(p, "mes", este, refMes(este));
      for (const d of [este, prox]) if (d > hoje && diasEntre(hoje, d) <= frente) add(p, "mes", d, refMes(d));
    }
  }
  return novas.length ? [...cobs, ...novas] : cobs;
}

export const recebidoNoMes = (cobs: Cobranca[], hoje: string) =>
  cobs.reduce((s, c) => s + c.pagamentos.filter((p) => p.data.slice(0, 7) === hoje.slice(0, 7)).reduce((t, p) => t + p.valor, 0), 0);
/** Em aberto que vence nos próximos 7 dias + semanais/mensais que ainda vão ser cobradas nesse prazo. */
export const venceEm7Dias = (cobs: Cobranca[], hoje: string, passageiros: PassageiroCob[] = []) =>
  gerarPeriodicas(cobs, passageiros, hoje, 7).filter((c) => aberto(c) > 0 && diasEntre(hoje, c.vencimento) >= 0 && diasEntre(hoje, c.vencimento) <= 7).reduce((s, c) => s + aberto(c), 0);
export const totalEmAberto = (cobs: Cobranca[]) => cobs.reduce((s, c) => s + aberto(c), 0);

export const juntarRefs = (refs: string[]) => (refs.length <= 1 ? refs[0] ?? "" : `${refs.slice(0, -1).join(", ")} e ${refs[refs.length - 1]}`);
export const mensagemCobrar = (nome: string, valor: number, refs: string[], pix: string) =>
  `Olá, ${nome}! Tudo bem? Passando pra lembrar do valor em aberto da van: ${brl(valor)}, referente a ${juntarRefs(refs)}. Pix: ${pix}. Obrigado!`;
export const textoRecibo = (r: Recibo, vanzeiro: string, passageiro: string) =>
  [`RECIBO Nº ${String(r.numero).padStart(4, "0")}`, `Recebi de ${passageiro} o valor de ${brl(r.valor)}.`, `Referente a: ${juntarRefs(r.refs)}`,
    `Forma: ${r.forma === "pix" ? "Pix" : "Dinheiro"}`, `Data: ${dataBR(r.data)}`, `${vanzeiro} — O Vanzeiro`].join("\n");
