// Sessão simulada: guarda quem entrou (vanzeiro ou qual passageiro) neste aparelho.
// Quando houver login de verdade, só este módulo muda; as telas continuam usando os mesmos hooks.
import { useSyncExternalStore } from "react";
import { armazenamentoLocal } from "./persistencia";

export type Sessao = { papel: "vanzeiro" } | { papel: "passageiro"; passageiroId: string };
export type Papel = Sessao["papel"];

export const CHAVE_SESSAO = "vanzeiro:sessao";
const VERSAO_SESSAO = 1;

type Leitura = Pick<Storage, "getItem">;
type Escrita = Pick<Storage, "setItem">;
type Remocao = Pick<Storage, "removeItem">;

export function ehSessao(x: unknown): x is Sessao {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  if (s["papel"] === "vanzeiro") return true;
  return s["papel"] === "passageiro" && typeof s["passageiroId"] === "string" && s["passageiroId"] !== "";
}

export function lerSessao(armazem: Leitura): Sessao | null {
  try {
    const bruto = armazem.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    const pacote = JSON.parse(bruto) as { versao?: number; sessao?: unknown } | null;
    return pacote?.versao === VERSAO_SESSAO && ehSessao(pacote.sessao) ? pacote.sessao : null;
  } catch {
    return null;
  }
}

export function gravarSessao(armazem: Escrita, sessao: Sessao): boolean {
  try {
    armazem.setItem(CHAVE_SESSAO, JSON.stringify({ versao: VERSAO_SESSAO, entrouEm: new Date().toISOString(), sessao }));
    return true;
  } catch {
    return false;
  }
}

export function apagarSessao(armazem: Remocao): void {
  try {
    armazem.removeItem(CHAVE_SESSAO);
  } catch {
    /* sem armazenamento: nada a apagar */
  }
}

export const caminhoInicial = (s: Sessao) => (s.papel === "vanzeiro" ? "/vanzeiro" : "/passageiro");

/** Para onde mandar quem não pode ver a área `papel`. null = pode ver (ou ainda não dá para saber, como no servidor). */
export function destinoSeNegado(papel: Papel, s: Sessao | null | undefined): string | null {
  if (s === undefined) return null;
  if (s === null) return "/";
  return s.papel === papel ? null : caminhoInicial(s);
}

// undefined = ainda não lida (servidor ou primeira renderização); null = sem sessão.
let sessao: Sessao | null | undefined;
const ouvintes = new Set<() => void>();
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };
const definir = (s: Sessao | null) => { sessao = s; ouvintes.forEach((f) => f()); };

export function sessaoAtual(): Sessao | null | undefined {
  if (sessao === undefined) {
    const armazem = armazenamentoLocal();
    if (armazem) sessao = lerSessao(armazem);
  }
  return sessao;
}

export function entrarComoVanzeiro() { entrar({ papel: "vanzeiro" }); }
export function entrarComoPassageiro(passageiroId: string) { entrar({ papel: "passageiro", passageiroId }); }
function entrar(s: Sessao) {
  const armazem = armazenamentoLocal();
  if (armazem) gravarSessao(armazem, s);
  definir(s);
}
export function encerrarSessao() {
  const armazem = armazenamentoLocal();
  if (armazem) apagarSessao(armazem);
  definir(null);
}

export const useSessao = () => useSyncExternalStore(assinar, sessaoAtual, () => undefined);

/** Id do passageiro que está usando o app (vazio se quem entrou é o vanzeiro). */
export function usePassageiroId(): string {
  const s = useSessao();
  return s?.papel === "passageiro" ? s.passageiroId : "";
}
