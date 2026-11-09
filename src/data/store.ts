// Guarda vans e motoristas na memória da tela (voltam ao original ao recarregar).
import { useSyncExternalStore } from "react";
import { vans as vansIniciais, motoristas as motoristasIniciais, linhas as linhasIniciais, passageiros as passageirosIniciais, detalhesPassageiros, cobrancasEmAberto, type DetalhePassageiro, type FormaPagamento } from "./exemplo";

export const TIPOS_LINHA = ["Visita", "Faculdade", "Escolar", "Excursão", "Outro"] as const;
export const DIAS = [
  { id: "seg", curto: "Seg" }, { id: "ter", curto: "Ter" }, { id: "qua", curto: "Qua" }, { id: "qui", curto: "Qui" },
  { id: "sex", curto: "Sex" }, { id: "sab", curto: "Sáb" }, { id: "dom", curto: "Dom" },
] as const;
const DIA_NOME: Record<string, string> = { segunda: "seg", "terça": "ter", quarta: "qua", quinta: "qui", sexta: "sex", "sábado": "sab", domingo: "dom" };

export type Linha = {
  id: string; nome: string; tipo: (typeof TIPOS_LINHA)[number]; frequencia: "semanal" | "unica"; dias: string[]; data: string;
  saida: string; volta: string; paradas: string[]; destino: string; vanId: string; motoristaId: string;
  valorViagem: number | null; valorMensal: number | null; ativa: boolean; observacoes: string;
};
export type Passageiro = {
  id: string; nome: string; telefone: string; endereco: string; cidade: string; linhaIds: string[];
  formaPagamento: FormaPagamento; valor: number; emAberto: number; ativo: boolean;
} & DetalhePassageiro;
export const estaDevendo = (p: Passageiro) => p.emAberto > 0;

export type Van = {
  id: string; apelido: string; modelo: string; placa: string; lugares: number; ano: number | null;
  cor: string; motoristaId: string; situacao: "rodando" | "manutencao"; observacoes: string;
};
export type Motorista = { id: string; nome: string; telefone: string; cnh: string; cnhValidade: string; proprio: boolean; vanId?: string };

type Estado = { vans: Van[]; motoristas: Motorista[]; linhas: Linha[]; passageiros: Passageiro[] };
let estado: Estado = {
  vans: vansIniciais.map((v) => ({ ...v, situacao: v.situacao as Van["situacao"] })),
  motoristas: motoristasIniciais.map((m) => ({ ...m, vanId: vansIniciais.find((v) => v.motoristaId === m.id)?.id ?? "" })),
  linhas: linhasIniciais.map((l) => ({
    id: l.id, nome: l.nome, tipo: l.tipo as Linha["tipo"], frequencia: "semanal", dias: l.dias.map((d) => DIA_NOME[d] ?? d), data: "",
    saida: l.saida, volta: l.volta, paradas: [...l.paradas], destino: l.destino, vanId: l.vanId, motoristaId: l.motoristaId,
    valorViagem: l.valorPorViagem || null, valorMensal: l.valorMensal || null, ativa: true, observacoes: l.observacoes,
  })),
  passageiros: passageirosIniciais.map(({ linhaId, situacao: _s, ...p }) => ({
    ...p, endereco: p.endereco.split(",")[0]!, ...detalhesPassageiros[p.id]!, linhaIds: linhaId ? [linhaId] : [], ativo: true,
    emAberto: cobrancasEmAberto.find((c) => c.passageiroId === p.id)?.valor ?? 0,
  })),
};
const ouvintes = new Set<() => void>();
const set = (e: Estado) => { estado = e; ouvintes.forEach((f) => f()); };
const assinar = (f: () => void) => { ouvintes.add(f); return () => ouvintes.delete(f); };

export const useFrota = () => useSyncExternalStore(assinar, () => estado, () => estado);

const novoId = (p: string) => `${p}${Date.now().toString(36)}`;

export function salvarVan(v: Omit<Van, "id"> & { id?: string | undefined }) {
  const van = { ...v, id: v.id || novoId("van") } as Van;
  set({ ...estado, vans: v.id ? estado.vans.map((x) => (x.id === v.id ? van : x)) : [...estado.vans, van] });
}
export function excluirVan(id: string) {
  set({ ...estado, linhas: estado.linhas.map((l) => (l.vanId === id ? { ...l, vanId: "" } : l)), vans: estado.vans.filter((v) => v.id !== id), motoristas: estado.motoristas.map((m) => (m.vanId === id ? { ...m, vanId: "" } : m)) });
}
export function salvarMotorista(m: Omit<Motorista, "id" | "proprio"> & { id?: string | undefined }) {
  const atual = estado.motoristas.find((x) => x.id === m.id);
  const mot: Motorista = { ...m, id: m.id || novoId("m"), proprio: atual?.proprio ?? false };
  set({ ...estado, motoristas: atual ? estado.motoristas.map((x) => (x.id === mot.id ? mot : x)) : [...estado.motoristas, mot] });
}
export function excluirMotorista(id: string) {
  if (estado.motoristas.find((m) => m.id === id)?.proprio) return;
  set({ ...estado, linhas: estado.linhas.map((l) => (l.motoristaId === id ? { ...l, motoristaId: "" } : l)), motoristas: estado.motoristas.filter((m) => m.id !== id), vans: estado.vans.map((v) => (v.motoristaId === id ? { ...v, motoristaId: "" } : v)) });
}

export function salvarLinha(l: Omit<Linha, "id"> & { id?: string | undefined }) {
  const linha = { ...l, id: l.id || novoId("l") } as Linha;
  set({ ...estado, linhas: l.id ? estado.linhas.map((x) => (x.id === l.id ? linha : x)) : [...estado.linhas, linha] });
}
export function alternarLinha(id: string) {
  set({ ...estado, linhas: estado.linhas.map((l) => (l.id === id ? { ...l, ativa: !l.ativa } : l)) });
}
export function excluirLinha(id: string) {
  set({ ...estado, linhas: estado.linhas.filter((l) => l.id !== id), passageiros: estado.passageiros.map((p) => ({ ...p, linhaIds: p.linhaIds.filter((x) => x !== id) })) });
}
export function colocarNaLinha(linhaId: string, ids: string[]) {
  set({ ...estado, passageiros: estado.passageiros.map((p) => (ids.includes(p.id) && !p.linhaIds.includes(linhaId) ? { ...p, linhaIds: [...p.linhaIds, linhaId], ativo: true } : p)) });
}
export function tirarDaLinha(passageiroId: string, linhaId: string) {
  set({ ...estado, passageiros: estado.passageiros.map((p) => (p.id === passageiroId ? { ...p, linhaIds: p.linhaIds.filter((x) => x !== linhaId) } : p)) });
}
export function salvarPassageiro(p: Omit<Passageiro, "id"> & { id?: string | undefined }): string {
  const pas = { ...p, id: p.id || novoId("p") } as Passageiro;
  set({ ...estado, passageiros: p.id ? estado.passageiros.map((x) => (x.id === p.id ? pas : x)) : [...estado.passageiros, pas] });
  return pas.id;
}
export function atualizarPassageiro(id: string, mud: Partial<Passageiro>) {
  set({ ...estado, passageiros: estado.passageiros.map((p) => (p.id === id ? { ...p, ...mud } : p)) });
}
export function desativarPassageiro(id: string) { atualizarPassageiro(id, { ativo: false, linhaIds: [] }); }
export function excluirPassageiro(id: string) {
  set({ ...estado, passageiros: estado.passageiros.filter((p) => p.id !== id) });
}
