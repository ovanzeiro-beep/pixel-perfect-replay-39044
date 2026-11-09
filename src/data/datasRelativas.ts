// Os dados de exemplo foram escritos com "hoje" = ANCORA. Estas funções empurram essas datas
// para perto do dia real, sem mudar o dia da semana (semanas) ou o dia do mês (meses).
export const ANCORA = "2026-11-09";

const dias = (a: number, m: number, d: number) => Math.floor(Date.UTC(a, m - 1, d) / 86400000);
const partes = (s: string) => s.split("-").map(Number) as [number, number, number];
const fmt = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const isoDe = (d: Date) => fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());

/** Desloca em semanas inteiras: segunda continua segunda, sexta continua sexta. Nunca passa de hoje. */
export function deslocarSemanas(data: string, hoje: Date = new Date()): string {
  const [aa, am, ad] = partes(ANCORA);
  const semanas = Math.floor((dias(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()) - dias(aa, am, ad)) / 7);
  const [a, m, d] = partes(data);
  const t = new Date(Date.UTC(a, m - 1, d + semanas * 7));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Desloca em meses inteiros mantendo o dia do mês (ajustado ao tamanho do mês). `limitar` não deixa passar de hoje. */
export function deslocarMeses(data: string, hoje: Date = new Date(), limitar = false): string {
  const [aa, am] = partes(ANCORA);
  const delta = hoje.getFullYear() * 12 + hoje.getMonth() - (aa * 12 + am - 1);
  const [a, m, d] = partes(data);
  const alvo = a * 12 + (m - 1) + delta;
  const ano = Math.floor(alvo / 12);
  const mes = (alvo % 12) + 1;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const r = fmt(ano, mes, Math.min(d, ultimo));
  const h = isoDe(hoje);
  return limitar && r > h ? h : r;
}

/** Data de hoje (ou de `base`) somada a `n` dias, no formato AAAA-MM-DD. */
export function somarDias(base: Date, n: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
