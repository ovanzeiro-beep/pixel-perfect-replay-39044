// Tamanho da letra: preferência do aparelho (não entra no backup). Escala todo o app, que usa unidades "rem".
import { useSyncExternalStore } from "react";

export type TamanhoLetra = "normal" | "grande" | "muito-grande";

export const TAMANHOS: { id: TamanhoLetra; nome: string; percentual: number }[] = [
  { id: "normal", nome: "Normal", percentual: 100 },
  { id: "grande", nome: "Grande", percentual: 115 },
  { id: "muito-grande", nome: "Muito grande", percentual: 130 },
];

export const CHAVE_LETRA = "vanzeiro:letra";
const ehTamanho = (x: unknown): x is TamanhoLetra => TAMANHOS.some((t) => t.id === x);
const percentualDe = (t: TamanhoLetra) => TAMANHOS.find((x) => x.id === t)!.percentual;

/** Aplica o tamanho na página inteira (muda o tamanho-base; tudo em rem acompanha). */
export function aplicarTamanhoLetra(t: TamanhoLetra) {
  if (typeof document === "undefined") return;
  if (t === "normal") document.documentElement.style.removeProperty("font-size");
  else document.documentElement.style.fontSize = `${percentualDe(t)}%`;
}

export function lerTamanhoLetra(): TamanhoLetra {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(CHAVE_LETRA) : null;
    return ehTamanho(v) ? v : "normal";
  } catch {
    return "normal";
  }
}

/**
 * Script que roda no <head>, antes de a página aparecer, para a letra já nascer no tamanho escolhido
 * (sem "piscar" no normal). Gerado a partir da mesma tabela de tamanhos.
 */
export const SCRIPT_TAMANHO_LETRA = `try{var t=localStorage.getItem(${JSON.stringify(CHAVE_LETRA)});var m=${JSON.stringify(
  Object.fromEntries(
    TAMANHOS.filter((x) => x.id !== "normal").map((x) => [x.id, `${x.percentual}%`]),
  ),
)};if(m[t])document.documentElement.style.fontSize=m[t]}catch(e){}`;

let atual: TamanhoLetra | undefined;
const ouvintes = new Set<() => void>();
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};
const obter = () => (atual ??= lerTamanhoLetra());

export function definirTamanhoLetra(t: TamanhoLetra) {
  atual = t;
  aplicarTamanhoLetra(t);
  try {
    if (t === "normal") window.localStorage.removeItem(CHAVE_LETRA);
    else window.localStorage.setItem(CHAVE_LETRA, t);
  } catch {
    /* sem armazenamento: vale só até fechar o app */
  }
  ouvintes.forEach((f) => f());
}

/** Aplica o tamanho salvo (chamar uma vez, no início do app). */
export function iniciarTamanhoLetra() {
  atual = lerTamanhoLetra();
  aplicarTamanhoLetra(atual);
  ouvintes.forEach((f) => f());
}

export const useTamanhoLetra = () =>
  useSyncExternalStore(assinar, obter, () => "normal" as TamanhoLetra);
