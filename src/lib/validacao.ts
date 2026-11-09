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
  else if (!Number.isInteger(n) || n < 1 || n > 30)
    e.lugares = "O número de lugares deve ser de 1 a 30.";
  return e;
}

/** Telefone brasileiro com DDD: 10 dígitos (fixo) ou 11 (celular, começa com 9 depois do DDD). */
export function telefoneValido(t: string) {
  const d = t.replace(/\D/g, "");
  if (!/^[1-9][1-9]/.test(d)) return false;
  return d.length === 10 || (d.length === 11 && d[2] === "9");
}

export function validarMotorista(m: { nome: string; telefone: string }) {
  const e: Partial<Record<"nome" | "telefone", string>> = {};
  if (!m.nome.trim()) e.nome = "Escreva o nome do motorista.";
  const dig = m.telefone.replace(/\D/g, "");
  if (!dig) e.telefone = "Escreva o telefone do motorista.";
  else if (!telefoneValido(m.telefone))
    e.telefone = "Telefone incompleto. Coloque o DDD, ex.: (43) 99999-9999.";
  return e;
}

export function linkWhatsApp(tel: string) {
  return `https://wa.me/55${tel.replace(/\D/g, "")}`;
}

export function validarLinha(l: {
  nome: string;
  frequencia: "semanal" | "unica";
  dias: string[];
  data: string;
}) {
  const e: Partial<Record<"nome" | "dias" | "data", string>> = {};
  if (!l.nome.trim()) e.nome = "Escreva o nome da linha.";
  if (l.frequencia === "semanal" && l.dias.length === 0)
    e.dias = "Escolha pelo menos um dia da semana.";
  if (l.frequencia === "unica" && !l.data) e.data = "Escolha a data da viagem.";
  return e;
}

type CamposPassageiro = "nome" | "telefone" | "valor" | "vencimento" | "emergenciaTelefone";
export function validarPassageiro(p: {
  nome: string;
  telefone: string;
  valor: string;
  formaPagamento?: string;
  vencimento?: string;
  emergenciaTelefone?: string;
}) {
  const m = validarMotorista(p);
  const e: Partial<Record<CamposPassageiro, string>> = {};
  if (m.nome) e.nome = "Escreva o nome do passageiro.";
  if (m.telefone) e.telefone = m.telefone.replace("do motorista", "do passageiro");
  if (!p.valor.trim()) e.valor = "Escreva o valor combinado, ex.: 150.";
  else if (!(Number(p.valor.replace(",", ".")) > 0)) e.valor = "Escreva um valor válido, ex.: 150.";
  if (p.formaPagamento === "semanal" && !p.vencimento)
    e.vencimento = "Escolha o dia da semana em que vence.";
  if (p.formaPagamento === "mensal" && !p.vencimento)
    e.vencimento = "Escolha o dia do mês em que vence.";
  if (p.emergenciaTelefone?.trim() && !telefoneValido(p.emergenciaTelefone))
    e.emergenciaTelefone = "Telefone incompleto. Coloque o DDD.";
  return e;
}

export function mensagemConvite(nome: string, vanzeiro: string, link: string) {
  return `Olá, ${nome}! Aqui é o ${vanzeiro}, da van. Agora você pode confirmar suas viagens e ver seus pagamentos pelo app O Vanzeiro. É só tocar no link e entrar com sua conta Google: ${link}`;
}

export function enderecoCompleto(p: {
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
}) {
  return `${p.endereco}${p.numero ? `, ${p.numero}` : ""}${p.bairro ? ` - ${p.bairro}` : ""}, ${p.cidade} - PR`;
}
