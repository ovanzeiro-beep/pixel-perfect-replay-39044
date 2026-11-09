// Guarda vans e motoristas na memória da tela (voltam ao original ao recarregar).
import { useSyncExternalStore } from "react";
import { vans as vansIniciais, motoristas as motoristasIniciais } from "./exemplo";

export type Van = {
  id: string; apelido: string; modelo: string; placa: string; lugares: number; ano: number | null;
  cor: string; motoristaId: string; situacao: "rodando" | "manutencao"; observacoes: string;
};
export type Motorista = { id: string; nome: string; telefone: string; cnh: string; cnhValidade: string; proprio: boolean; vanId?: string };

type Estado = { vans: Van[]; motoristas: Motorista[] };
let estado: Estado = {
  vans: vansIniciais.map((v) => ({ ...v, situacao: v.situacao as Van["situacao"] })),
  motoristas: motoristasIniciais.map((m) => ({ ...m, vanId: vansIniciais.find((v) => v.motoristaId === m.id)?.id ?? "" })),
};
const ouvintes = new Set<() => void>();
const set = (e: Estado) => { estado = e; ouvintes.forEach((f) => f()); };
const assinar = (f: () => void) => { ouvintes.add(f); return () => ouvintes.delete(f); };

export const useFrota = () => useSyncExternalStore(assinar, () => estado, () => estado);

const novoId = (p: string) => `${p}${Date.now().toString(36)}`;

export function salvarVan(v: Omit<Van, "id"> & { id?: string }) {
  const van = { ...v, id: v.id || novoId("van") } as Van;
  set({ ...estado, vans: v.id ? estado.vans.map((x) => (x.id === v.id ? van : x)) : [...estado.vans, van] });
}
export function excluirVan(id: string) {
  set({ vans: estado.vans.filter((v) => v.id !== id), motoristas: estado.motoristas.map((m) => (m.vanId === id ? { ...m, vanId: "" } : m)) });
}
export function salvarMotorista(m: Omit<Motorista, "id" | "proprio"> & { id?: string }) {
  const atual = estado.motoristas.find((x) => x.id === m.id);
  const mot: Motorista = { ...m, id: m.id || novoId("m"), proprio: atual?.proprio ?? false };
  set({ ...estado, motoristas: atual ? estado.motoristas.map((x) => (x.id === mot.id ? mot : x)) : [...estado.motoristas, mot] });
}
export function excluirMotorista(id: string) {
  if (estado.motoristas.find((m) => m.id === id)?.proprio) return;
  set({ motoristas: estado.motoristas.filter((m) => m.id !== id), vans: estado.vans.map((v) => (v.motoristaId === id ? { ...v, motoristaId: "" } : v)) });
}
