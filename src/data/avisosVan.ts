// Textos dos avisos que o vanzeiro manda pelo WhatsApp quando a van está a caminho.
// O horário vem da escala combinada (saída + tempo por cidade): é uma previsão, não a posição real da van.

const primeiro = (nome: string) => nome.split(" (")[0]!.split(" ")[0]!;

/** Aviso para UM passageiro: a van está chegando. */
export function textoChegando(nome: string, horarioCombinado?: string): string {
  const prev = horarioCombinado ? ` (horário combinado: ${horarioCombinado})` : "";
  return `Olá, ${primeiro(nome)}! A van está chegando aí${prev}. Fique pronto(a) na parada, por favor.`;
}

/** Aviso para o GRUPO: a van saiu, com a previsão de cada um que ainda falta. */
export function textoSaida({
  linha,
  quem,
}: {
  linha: string;
  quem: { nome: string; horario: string }[];
}): string {
  const lista = quem.map((q) => `• ${primeiro(q.nome)} — ${q.horario}`).join("\n");
  return [
    `🚐 A van saiu! (${linha})`,
    quem.length ? `Previsão da escala para cada um:\n${lista}` : "",
    "Fiquem prontos nas paradas, por favor.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
