let contadorId = 0;

/** Id curto e único: o contador evita colisão mesmo com dois cadastros no mesmo milissegundo. */
export function novoId(prefixo: string): string {
  contadorId += 1;
  return `${prefixo}${Date.now().toString(36)}${contadorId.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
