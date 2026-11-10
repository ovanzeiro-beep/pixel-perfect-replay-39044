// Os TIPOS e as regras de domínio do app. Não dependem do mock nem do banco: as duas implementações
// (dados no aparelho hoje, banco amanhã) e as telas falam nestes mesmos formatos.
import type { Cobranca, Recibo } from "./cobrancas";
import type { Gasto } from "./financeiro";
import type { Ajuste } from "./viagens";

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
export type FormaPagamento = "por_viagem" | "semanal" | "mensal";

export type DetalhePassageiro = {
  numero: string;
  bairro: string;
  referencia: string;
  vencimento: string; // "sexta" (semanal) ou "10" (mensal)
  emergenciaNome: string;
  emergenciaTelefone: string;
  observacoes: string;
  convite: "nao_enviado" | "enviado" | "no_app";
  /** Paga a viagem na hora (só vale para quem paga por viagem): ao embarcar, o app pergunta como pagou e já gera o recibo. */
  pagaNaHora?: boolean;
  ultimoPagamento: string;
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

/** Dados do próprio vanzeiro (quem usa o app). `configurado` fica falso até o primeiro acesso ser concluído. */
export type PerfilVanzeiro = {
  nome: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  configurado: boolean;
};

/** Período sem viagem (férias, feriado, van na oficina). Vale para uma linha ou, sem `linhaId`, para todas. */
export type Pausa = {
  id: string;
  /** Primeiro e último dia, "AAAA-MM-DD" (os dois entram). */
  de: string;
  ate: string;
  /** Uma linha só; vazio: todas as linhas. */
  linhaId?: string;
  motivo: string;
  /** Não cobrar o plano semanal e mensal que venceria dentro do período. */
  suspenderPlanos?: boolean;
};
/** O dia `data` está dentro de alguma pausa que vale para essa linha? */
export const estaPausada = (pausas: Pausa[] | undefined, linhaId: string, data: string) =>
  (pausas ?? []).some(
    (p) => data >= p.de && data <= p.ate && (!p.linhaId || p.linhaId === linhaId),
  );

/** Como o vanzeiro quer que a cobrança funcione. Cada campo tem um padrão, então dados antigos continuam valendo. */
export type ConfigCobranca = {
  /** Quantos dias antes de vencer o app avisa (o passageiro e o vanzeiro). De 1 a 7. */
  diasDeAviso: number;
  /** Texto da mensagem de cobrança com {nome}, {valor}, {referencia} e {pix}. Vazio: texto padrão. */
  textoCobranca: string;
  /** Passageiros novos que pagam por viagem já vêm marcados como "paga na hora". */
  pagaNaHoraPadrao: boolean;
};
export const CONFIG_COBRANCA_PADRAO: ConfigCobranca = {
  diasDeAviso: 2,
  textoCobranca: "",
  pagaNaHoraPadrao: false,
};
/** A configuração de cobrança com os padrões nos campos que o vanzeiro ainda não mexeu. */
export const configDaCobranca = (e: {
  configCobranca?: Partial<ConfigCobranca> | undefined;
}): ConfigCobranca => ({
  ...CONFIG_COBRANCA_PADRAO,
  ...e.configCobranca,
});

export type Estado = {
  perfil: PerfilVanzeiro;
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
  /** Configuração de cobrança (opcional: sem ela valem os padrões). */
  configCobranca?: Partial<ConfigCobranca>;
  /** Períodos sem viagem (opcional: sem eles, todas as viagens rodam). */
  pausas?: Pausa[];
};
