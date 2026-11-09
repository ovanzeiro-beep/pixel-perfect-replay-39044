/** Link do convite do passageiro: abre o app (neste endereço) já na tela de aceitar o convite. */
export function linkConvite(passageiroId: string, origem?: string): string {
  const base = origem ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/convite/${encodeURIComponent(passageiroId)}`;
}

/** Só quem já recebeu o convite (e segue ativo) pode entrar pelo link. */
export function conviteValido(p: { ativo: boolean; convite: "nao_enviado" | "enviado" | "no_app" } | undefined): boolean {
  return !!p && p.ativo && p.convite !== "nao_enviado";
}
