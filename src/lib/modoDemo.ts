// Modo demonstração: mostra atalhos que simulam respostas dos passageiros. Desligado por padrão.
import { useSyncExternalStore } from "react";

const CHAVE = "vanzeiro:demo";
let ligado: boolean | undefined;
const ouvintes = new Set<() => void>();
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

function lerLigado(): boolean {
  if (ligado === undefined) {
    try { ligado = typeof window !== "undefined" && window.localStorage.getItem(CHAVE) === "1"; } catch { ligado = false; }
  }
  return ligado;
}

export function definirModoDemo(v: boolean) {
  ligado = v;
  try { if (v) window.localStorage.setItem(CHAVE, "1"); else window.localStorage.removeItem(CHAVE); } catch { /* sem armazenamento: vale só nesta aba */ }
  ouvintes.forEach((f) => f());
}

export const useModoDemo = () => useSyncExternalStore(assinar, lerLigado, () => false);
