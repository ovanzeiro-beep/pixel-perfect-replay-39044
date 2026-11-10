// Pix "copia e cola" (BR Code estático do Banco Central): o código leva a chave, o valor e o nome de quem recebe.
// O passageiro cola no app do banco e o valor já vem preenchido. Não fala com banco nenhum: só monta o texto.

export type TipoChave = "cpf" | "cnpj" | "celular" | "email" | "aleatoria";
export type ChaveInterpretada =
  | { tipo: TipoChave; chave: string }
  /** 11 números que servem como CPF e como celular: é preciso perguntar. */
  | { tipo: "ambigua"; cpf: string; celular: string }
  | { tipo: "invalida" };

const soDigitos = (s: string) => s.replace(/\D/g, "");

export function cpfValido(cpf: string): boolean {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function cnpjValido(cnpj: string): boolean {
  const d = soDigitos(cnpj);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (n: number) => {
    const pesos =
      n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((t, p, i) => t + p * Number(d[i]), 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

const dddValido = (d: string) => Number(d.slice(0, 2)) >= 11 && Number(d.slice(0, 2)) <= 99;

/** Descobre que tipo de chave foi digitada e a escreve do jeito que o Pix exige. */
export function interpretarChavePix(texto: string): ChaveInterpretada {
  const t = texto.trim();
  if (!t) return { tipo: "invalida" };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length <= 77)
    return { tipo: "email", chave: t.toLowerCase() };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t))
    return { tipo: "aleatoria", chave: t.toLowerCase() };
  if (/^\+\d{10,14}$/.test(t.replace(/[\s()-]/g, "")))
    return { tipo: "celular", chave: t.replace(/[\s()-]/g, "") };
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(t))
    return cpfValido(t) ? { tipo: "cpf", chave: soDigitos(t) } : { tipo: "invalida" };
  if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(t))
    return cnpjValido(t) ? { tipo: "cnpj", chave: soDigitos(t) } : { tipo: "invalida" };
  if (!/^[\d\s().-]+$/.test(t)) return { tipo: "invalida" };
  const d = soDigitos(t);
  // Com parênteses é telefone, sem dúvida.
  if (/[()]/.test(t) && (d.length === 10 || d.length === 11) && dddValido(d))
    return { tipo: "celular", chave: `+55${d}` };
  if (d.length === 14) return cnpjValido(d) ? { tipo: "cnpj", chave: d } : { tipo: "invalida" };
  if (d.length === 11) {
    const cpf = cpfValido(d);
    const cel = dddValido(d) && d[2] === "9";
    if (cpf && cel) return { tipo: "ambigua", cpf: d, celular: `+55${d}` };
    if (cpf) return { tipo: "cpf", chave: d };
    if (cel) return { tipo: "celular", chave: `+55${d}` };
    return { tipo: "invalida" };
  }
  if (d.length === 10 && dddValido(d)) return { tipo: "celular", chave: `+55${d}` };
  if ((d.length === 12 || d.length === 13) && d.startsWith("55") && dddValido(d.slice(2)))
    return { tipo: "celular", chave: `+${d}` };
  return { tipo: "invalida" };
}

export const nomeDoTipo: Record<TipoChave, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  celular: "celular",
  email: "e-mail",
  aleatoria: "chave aleatória",
};

/** CRC-16/CCITT-FALSE, exigido no fim do código Pix. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const campo = (id: string, valor: string) =>
  `${id}${String(valor.length).padStart(2, "0")}${valor}`;
const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .toUpperCase()
    .trim();

/**
 * Monta o Pix copia e cola. `chave` já deve estar escrita do jeito certo (veja `interpretarChavePix`).
 * Sem `valor`, o passageiro digita o valor; com `valor`, ele já vem preenchido.
 */
export function gerarPixCopiaECola({
  chave,
  valor,
  nome,
  cidade,
  txid,
}: {
  chave: string;
  valor?: number;
  nome: string;
  cidade: string;
  txid?: string;
}): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  const id = (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const corpo =
    campo("00", "01") +
    campo("01", "11") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor && valor > 0 ? campo("54", (Math.round(valor * 100) / 100).toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", semAcento(nome).slice(0, 25) || "VANZEIRO") +
    campo("60", semAcento(cidade).slice(0, 15) || "BRASIL") +
    campo("62", campo("05", id)) +
    "6304";
  return corpo + crc16(corpo);
}

/** Pix com valor a partir do que o vanzeiro digitou. `null` se a chave não for reconhecida com certeza. */
export function pixComValor(
  chaveDigitada: string,
  valor: number,
  vanzeiro: { nome: string; cidade: string },
  txid?: string,
): string | null {
  const c = interpretarChavePix(chaveDigitada);
  if (c.tipo === "invalida" || c.tipo === "ambigua") return null;
  return gerarPixCopiaECola({
    chave: c.chave,
    valor,
    nome: vanzeiro.nome,
    cidade: vanzeiro.cidade,
    ...(txid ? { txid } : {}),
  });
}
