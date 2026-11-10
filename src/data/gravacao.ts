// Acompanha as gravações em andamento. Com banco, cada gravação leva um tempo e pode falhar (sem internet,
// servidor fora do ar): as telas mostram "Salvando…" e avisam quando não deu certo. No mock tudo é imediato.
import { useSyncExternalStore } from "react";

/** Erro de uma gravação que não deu certo (o motivo original fica em `cause`). */
export class FalhaDeGravacao extends Error {
  constructor(cause: unknown) {
    super("Não foi possível salvar.", { cause });
    this.name = "FalhaDeGravacao";
  }
}

let emAndamento = 0;
let aoFalhar: ((e: FalhaDeGravacao) => void) | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};

/** O app registra aqui o que fazer quando uma gravação falha (mostrar o aviso). Devolve como desfazer. */
export function registrarFalhaDeGravacao(f: (e: FalhaDeGravacao) => void): () => void {
  aoFalhar = f;
  return () => {
    if (aoFalhar === f) aoFalhar = null;
  };
}

/**
 * Executa uma gravação contando-a como "em andamento". O trabalho começa na hora (o mock é imediato);
 * se der erro, avisa o app e rejeita com `FalhaDeGravacao`.
 */
export async function gravando<T>(trabalho: () => T | Promise<T>): Promise<T> {
  emAndamento++;
  avisar();
  try {
    return await trabalho();
  } catch (e) {
    const falha = e instanceof FalhaDeGravacao ? e : new FalhaDeGravacao(e);
    aoFalhar?.(falha);
    throw falha;
  } finally {
    emAndamento--;
    avisar();
  }
}

/** Transforma uma operação síncrona do mock em operação do contrato (devolve Promise). */
export const escrever =
  <A extends unknown[], R>(f: (...a: A) => R) =>
  (...a: A): Promise<Awaited<R>> =>
    gravando(() => f(...a)) as Promise<Awaited<R>>;

/** Verdadeiro enquanto há alguma gravação em andamento. */
export const useSalvando = () =>
  useSyncExternalStore(
    assinar,
    () => emAndamento > 0,
    () => false,
  );
