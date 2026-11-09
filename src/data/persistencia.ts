// Guarda os dados do app no aparelho (localStorage). Se a versão do formato mudar, os dados antigos são ignorados.
export const CHAVE = "vanzeiro:dados";
export const VERSAO = 1;

type Pacote<T> = { versao: number; salvoEm: string; dados: T };
type Leitura = Pick<Storage, "getItem">;
type Escrita = Pick<Storage, "setItem">;
type Remocao = Pick<Storage, "removeItem">;

/** O localStorage pode não existir (servidor) ou estar bloqueado (aba anônima); nesses casos devolve null. */
export function armazenamentoLocal(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function gravar<T>(armazem: Escrita, dados: T): boolean {
  try {
    const pacote: Pacote<T> = { versao: VERSAO, salvoEm: new Date().toISOString(), dados };
    armazem.setItem(CHAVE, JSON.stringify(pacote));
    return true;
  } catch {
    return false;
  }
}

export function ler<T>(armazem: Leitura, valido: (x: unknown) => x is T): T | null {
  try {
    const bruto = armazem.getItem(CHAVE);
    if (!bruto) return null;
    const pacote = JSON.parse(bruto) as Partial<Pacote<unknown>> | null;
    if (!pacote || pacote.versao !== VERSAO) return null;
    return valido(pacote.dados) ? pacote.dados : null;
  } catch {
    return null;
  }
}

export function limpar(armazem: Remocao): void {
  try {
    armazem.removeItem(CHAVE);
  } catch {
    /* sem armazenamento: nada a limpar */
  }
}
