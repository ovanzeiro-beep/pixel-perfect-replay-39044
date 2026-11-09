// Placa antiga (ABC-1234) ou Mercosul (ABC1D23)
export function normalizarPlaca(p: string) {
  return p.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
export function placaValida(p: string) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizarPlaca(p));
}
export function formatarPlaca(p: string) {
  const n = normalizarPlaca(p);
  return /^[A-Z]{3}[0-9]{4}$/.test(n) ? `${n.slice(0, 3)}-${n.slice(3)}` : n;
}

export function validarVan(v: { apelido: string; placa: string; lugares: string }) {
  const e: Partial<Record<"apelido" | "placa" | "lugares", string>> = {};
  if (!v.apelido.trim()) e.apelido = "Escreva um apelido para a van.";
  if (!v.placa.trim()) e.placa = "Escreva a placa da van.";
  else if (!placaValida(v.placa)) e.placa = "Placa inválida. Use o jeito ABC-1234 ou ABC1D23.";
  const n = Number(v.lugares);
  if (!v.lugares.trim()) e.lugares = "Escreva quantos lugares a van tem.";
  else if (!Number.isInteger(n) || n < 1 || n > 30) e.lugares = "O número de lugares deve ser de 1 a 30.";
  return e;
}

export function validarMotorista(m: { nome: string; telefone: string }) {
  const e: Partial<Record<"nome" | "telefone", string>> = {};
  if (!m.nome.trim()) e.nome = "Escreva o nome do motorista.";
  const dig = m.telefone.replace(/\D/g, "");
  if (!dig) e.telefone = "Escreva o telefone do motorista.";
  else if (dig.length < 10 || dig.length > 11) e.telefone = "Telefone incompleto. Coloque o DDD, ex.: (43) 99999-9999.";
  return e;
}

export function linkWhatsApp(tel: string) {
  return `https://wa.me/55${tel.replace(/\D/g, "")}`;
}
