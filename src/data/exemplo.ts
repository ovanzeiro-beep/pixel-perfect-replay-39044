// Todos os dados de exemplo do app ficam aqui. Depois trocamos por banco de dados sem mexer nas telas.

import { deslocarMeses, deslocarSemanas, somarDias } from "./datasRelativas";
import type { DetalhePassageiro, FormaPagamento } from "./tipos";

// As datas escritas aqui usam "hoje" = 09/11/2026 como referência; no fim do arquivo elas são
// empurradas para perto do dia real (semanas ou meses inteiros), então os exemplos nunca ficam velhos.
const HOJE = new Date();

export type SituacaoPagamento = "em_dia" | "atrasado_1_semana" | "pago_na_hora";

export const vanzeiro = {
  id: "vz1",
  nome: "João Batista",
  cidade: "Jacarezinho",
  estado: "PR",
  telefone: "(43) 99812-4471",
  email: "joao.batista.van@gmail.com",
};

export const vans = [
  {
    id: "van1",
    apelido: "Van Branca",
    modelo: "Mercedes-Benz Sprinter 415",
    placa: "BRA2E19",
    lugares: 15,
    ano: 2019,
    cor: "Branca",
    motoristaId: "m1",
    situacao: "rodando",
    observacoes: "Ar-condicionado e bancos reclináveis.",
  },
  {
    id: "van2",
    apelido: "Van Prata",
    modelo: "Renault Master L2H2",
    placa: "QJH7C42",
    lugares: 12,
    ano: 2021,
    cor: "Prata",
    motoristaId: "m2",
    situacao: "rodando",
    observacoes: "",
  },
];

export const motoristas = [
  {
    id: "m1",
    nome: "João Batista",
    telefone: "(43) 99812-4471",
    cnh: "D",
    cnhValidade: "2028-03-15",
    proprio: true,
  },
  {
    id: "m2",
    nome: "Carlos Henrique Souza",
    telefone: "(43) 99634-2208",
    cnh: "D",
    cnhValidade: somarDias(HOJE, 34),
    proprio: false,
  },
];

export const linhas = [
  {
    id: "l1",
    nome: "Londrina - Fim de semana",
    dias: ["sexta", "sábado", "domingo"],
    paradas: ["Jacarezinho", "Cambará", "Andirá", "Bandeirantes", "Londrina"],
    vanId: "van1",
    motoristaId: "m1",
    valorPorViagem: 150,
    valorMensal: 0,
    tipo: "Visita",
    saida: "17:30",
    volta: "20:30",
    destino: "Londrina - Centro",
    observacoes: "Saída de sexta à tarde; volta no domingo à noite.",
  },
  {
    id: "l2",
    nome: "Faculdade - Noturno",
    dias: ["segunda", "terça", "quarta", "quinta", "sexta"],
    paradas: ["Jacarezinho", "Cambará", "Ourinhos"],
    vanId: "van2",
    motoristaId: "m2",
    valorSemanal: 90,
    valorMensal: 320,
    valorPorViagem: 25,
    tipo: "Faculdade",
    saida: "18:15",
    volta: "23:30",
    destino: "Ourinhos - Campus universitário",
    observacoes: "",
  },
  {
    id: "l3",
    nome: "Escolar - Manhã",
    dias: ["segunda", "terça", "quarta", "quinta", "sexta"],
    paradas: ["Jacarezinho (Centro)", "Vila São Pedro", "Jardim Panorama", "Colégio Estadual"],
    vanId: "van2",
    motoristaId: "m1",
    valorMensal: 250,
    valorPorViagem: 0,
    tipo: "Escolar",
    saida: "06:40",
    volta: "12:30",
    destino: "Colégio Estadual de Jacarezinho",
    observacoes: "Buscar as crianças na porta de casa.",
  },
];

export const passageiros: {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  cidade: string;
  linhaId: string;
  formaPagamento: FormaPagamento;
  valor: number;
  situacao: SituacaoPagamento;
}[] = [
  {
    id: "p1",
    nome: "Maria Aparecida Lima",
    telefone: "(43) 99701-1123",
    endereco: "Rua Paraná, 412",
    cidade: "Jacarezinho",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "pago_na_hora",
  },
  {
    id: "p2",
    nome: "Antônio Carlos Ribeiro",
    telefone: "(43) 99845-3390",
    endereco: "Av. Getúlio Vargas, 1020",
    cidade: "Cambará",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "pago_na_hora",
  },
  {
    id: "p3",
    nome: "Rosângela Ferreira",
    telefone: "(43) 99612-7781",
    endereco: "Rua São Paulo, 88",
    cidade: "Andirá",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "atrasado_1_semana",
  },
  {
    id: "p4",
    nome: "Sebastião Moreira",
    telefone: "(43) 99533-0045",
    endereco: "Rua Rui Barbosa, 230",
    cidade: "Bandeirantes",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "em_dia",
  },
  {
    id: "p5",
    nome: "Cleide Santos Oliveira",
    telefone: "(43) 99288-6612",
    endereco: "Rua Benjamin Constant, 51",
    cidade: "Jacarezinho",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "pago_na_hora",
  },
  {
    id: "p6",
    nome: "Lucas Gabriel Prado",
    telefone: "(43) 99177-4520",
    endereco: "Rua Marechal Deodoro, 703",
    cidade: "Jacarezinho",
    linhaId: "l2",
    formaPagamento: "semanal",
    valor: 90,
    situacao: "em_dia",
  },
  {
    id: "p7",
    nome: "Ana Beatriz Costa",
    telefone: "(43) 99456-8834",
    endereco: "Rua XV de Novembro, 15",
    cidade: "Cambará",
    linhaId: "l2",
    formaPagamento: "mensal",
    valor: 320,
    situacao: "em_dia",
  },
  {
    id: "p8",
    nome: "Felipe Augusto Nogueira",
    telefone: "(43) 99390-2217",
    endereco: "Rua Dom Pedro II, 340",
    cidade: "Jacarezinho",
    linhaId: "l2",
    formaPagamento: "semanal",
    valor: 90,
    situacao: "atrasado_1_semana",
  },
  {
    id: "p9",
    nome: "Juliana Martins",
    telefone: "(43) 99821-6650",
    endereco: "Rua Sete de Setembro, 98",
    cidade: "Jacarezinho",
    linhaId: "l2",
    formaPagamento: "mensal",
    valor: 320,
    situacao: "em_dia",
  },
  {
    id: "p10",
    nome: "Gustavo Henrique Alves",
    telefone: "(43) 99102-9943",
    endereco: "Rua Tiradentes, 1201",
    cidade: "Cambará",
    linhaId: "l2",
    formaPagamento: "semanal",
    valor: 90,
    situacao: "atrasado_1_semana",
  },
  {
    id: "p11",
    nome: "Sofia Rodrigues (resp. Patrícia)",
    telefone: "(43) 99744-1308",
    endereco: "Rua Bahia, 67",
    cidade: "Jacarezinho",
    linhaId: "l3",
    formaPagamento: "mensal",
    valor: 250,
    situacao: "em_dia",
  },
  {
    id: "p12",
    nome: "Pedro Henrique Silva (resp. Márcia)",
    telefone: "(43) 99655-2271",
    endereco: "Rua Goiás, 455",
    cidade: "Jacarezinho",
    linhaId: "l3",
    formaPagamento: "mensal",
    valor: 250,
    situacao: "em_dia",
  },
  {
    id: "p13",
    nome: "Isabela Mendes (resp. Rogério)",
    telefone: "(43) 99511-7764",
    endereco: "Rua Minas Gerais, 190",
    cidade: "Jacarezinho",
    linhaId: "l3",
    formaPagamento: "mensal",
    valor: 250,
    situacao: "atrasado_1_semana",
  },
  {
    id: "p14",
    nome: "Davi Lucca Pereira (resp. Simone)",
    telefone: "(43) 99280-3345",
    endereco: "Rua Santa Catarina, 22",
    cidade: "Jacarezinho",
    linhaId: "l3",
    formaPagamento: "semanal",
    valor: 65,
    situacao: "em_dia",
  },
  {
    id: "p15",
    nome: "Helena Barbosa (resp. Fábio)",
    telefone: "(43) 99963-0198",
    endereco: "Rua Pernambuco, 310",
    cidade: "Jacarezinho",
    linhaId: "l3",
    formaPagamento: "mensal",
    valor: 250,
    situacao: "em_dia",
  },
  // Etapa 6: mais passageiros na linha de fim de semana (que é a mais procurada)
  {
    id: "p16",
    nome: "Valdir Rocha",
    telefone: "(43) 99412-3301",
    endereco: "Rua Paraíba, 77",
    cidade: "Jacarezinho",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "pago_na_hora",
  },
  {
    id: "p17",
    nome: "Neide Aparecida Campos",
    telefone: "(43) 99523-8812",
    endereco: "Rua Amazonas, 140",
    cidade: "Cambará",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "pago_na_hora",
  },
  {
    id: "p18",
    nome: "Edson Luiz Batista",
    telefone: "(43) 99634-1290",
    endereco: "Rua Ceará, 320",
    cidade: "Andirá",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "em_dia",
  },
  {
    id: "p19",
    nome: "Terezinha Souza",
    telefone: "(43) 99745-6603",
    endereco: "Rua Alagoas, 58",
    cidade: "Bandeirantes",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "pago_na_hora",
  },
  {
    id: "p20",
    nome: "Marcos Vinícius Dias",
    telefone: "(43) 99856-2244",
    endereco: "Rua Sergipe, 905",
    cidade: "Jacarezinho",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "em_dia",
  },
  {
    id: "p21",
    nome: "Lourdes Teixeira",
    telefone: "(43) 99967-4415",
    endereco: "Rua Piauí, 12",
    cidade: "Cambará",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "pago_na_hora",
  },
  {
    id: "p22",
    nome: "Reginaldo Pires",
    telefone: "(43) 99178-5536",
    endereco: "Rua Maranhão, 266",
    cidade: "Andirá",
    linhaId: "l1",
    formaPagamento: "por_viagem",
    valor: 150,
    situacao: "em_dia",
  },
];

// ===== Dados para a tela Início do Vanzeiro =====

// Quem está devendo (passageiros com situação "atrasado_1_semana")
export const cobrancasEmAberto = [
  { passageiroId: "p13", valor: 250, diasAtraso: 9 },
  { passageiroId: "p3", valor: 150, diasAtraso: 8 },
  { passageiroId: "p8", valor: 90, diasAtraso: 7 },
  { passageiroId: "p10", valor: 90, diasAtraso: 7 },
];

// Gastos do mês
const gastosMesBase = [
  { id: "g1", descricao: "Diesel", valor: 680, data: "2026-11-03", vanId: "van1" },
  { id: "g2", descricao: "Diesel", valor: 410, data: "2026-11-04", vanId: "van2" },
  {
    id: "g3",
    descricao: "Manutenção (troca de óleo)",
    valor: 320,
    data: "2026-11-05",
    vanId: "van2",
  },
  { id: "g4", descricao: "Pedágio", valor: 96, data: "2026-11-07", vanId: "van1" },
];

export const gastosMes = gastosMesBase.map((g) => ({
  ...g,
  data: deslocarMeses(g.data, HOJE, true),
}));

// ===== Etapa 5: detalhes dos passageiros =====
const detalhesBase: Record<string, DetalhePassageiro> = {
  p1: {
    numero: "412",
    bairro: "Centro",
    referencia: "Casa amarela, portão azul",
    vencimento: "",
    emergenciaNome: "José Lima (marido)",
    emergenciaTelefone: "(43) 99701-5566",
    observacoes: "Leva mala grande.",
    convite: "no_app",
    ultimoPagamento: "2026-11-07",
  },
  p2: {
    numero: "1020",
    bairro: "Vila Nova",
    referencia: "Ao lado da farmácia",
    vencimento: "",
    emergenciaNome: "",
    emergenciaTelefone: "",
    observacoes: "",
    convite: "no_app",
    ultimoPagamento: "2026-11-07",
  },
  p3: {
    numero: "88",
    bairro: "Jardim América",
    referencia: "Esquina com a padaria",
    vencimento: "",
    emergenciaNome: "Paulo Ferreira (filho)",
    emergenciaTelefone: "(43) 99612-0099",
    observacoes: "",
    convite: "enviado",
    ultimoPagamento: "2026-10-24",
  },
  p4: {
    numero: "230",
    bairro: "Centro",
    referencia: "Prédio verde, 2º andar",
    vencimento: "",
    emergenciaNome: "",
    emergenciaTelefone: "",
    observacoes: "",
    convite: "nao_enviado",
    ultimoPagamento: "2026-11-06",
  },
  p5: {
    numero: "51",
    bairro: "Vila São Pedro",
    referencia: "Muro branco com grade preta",
    vencimento: "",
    emergenciaNome: "",
    emergenciaTelefone: "",
    observacoes: "",
    convite: "no_app",
    ultimoPagamento: "2026-11-07",
  },
  p6: {
    numero: "703",
    bairro: "Centro",
    referencia: "Em frente à praça",
    vencimento: "segunda",
    emergenciaNome: "Marta Prado (mãe)",
    emergenciaTelefone: "(43) 99177-0011",
    observacoes: "",
    convite: "no_app",
    ultimoPagamento: "2026-11-02",
  },
  p7: {
    numero: "15",
    bairro: "Centro",
    referencia: "",
    vencimento: "5",
    emergenciaNome: "",
    emergenciaTelefone: "",
    observacoes: "",
    convite: "enviado",
    ultimoPagamento: "2026-11-02",
  },
  p8: {
    numero: "340",
    bairro: "Jardim Panorama",
    referencia: "Portão de madeira",
    vencimento: "segunda",
    emergenciaNome: "",
    emergenciaTelefone: "",
    observacoes: "",
    convite: "nao_enviado",
    ultimoPagamento: "2026-10-26",
  },
  p9: {
    numero: "98",
    bairro: "Centro",
    referencia: "",
    vencimento: "5",
    emergenciaNome: "",
    emergenciaTelefone: "",
    observacoes: "",
    convite: "no_app",
    ultimoPagamento: "2026-11-03",
  },
  p10: {
    numero: "1201",
    bairro: "Vila Rica",
    referencia: "Casa azul de esquina",
    vencimento: "segunda",
    emergenciaNome: "",
    emergenciaTelefone: "",
    observacoes: "",
    convite: "enviado",
    ultimoPagamento: "2026-10-26",
  },
  p11: {
    numero: "67",
    bairro: "Vila São Pedro",
    referencia: "Casa com jardim na frente",
    vencimento: "5",
    emergenciaNome: "Patrícia Rodrigues (mãe)",
    emergenciaTelefone: "(43) 99744-1308",
    observacoes: "Criança de 7 anos.",
    convite: "no_app",
    ultimoPagamento: "2026-11-05",
  },
  p12: {
    numero: "455",
    bairro: "Jardim Panorama",
    referencia: "",
    vencimento: "5",
    emergenciaNome: "Márcia Silva (mãe)",
    emergenciaTelefone: "(43) 99655-2271",
    observacoes: "",
    convite: "no_app",
    ultimoPagamento: "2026-11-05",
  },
  p13: {
    numero: "190",
    bairro: "Centro",
    referencia: "Ao lado do mercado",
    vencimento: "1",
    emergenciaNome: "Rogério Mendes (pai)",
    emergenciaTelefone: "(43) 99511-7764",
    observacoes: "",
    convite: "enviado",
    ultimoPagamento: "2026-10-01",
  },
  p14: {
    numero: "22",
    bairro: "Vila São Pedro",
    referencia: "",
    vencimento: "segunda",
    emergenciaNome: "Simone Pereira (mãe)",
    emergenciaTelefone: "(43) 99280-3345",
    observacoes: "",
    convite: "nao_enviado",
    ultimoPagamento: "2026-11-02",
  },
  p15: {
    numero: "310",
    bairro: "Jardim América",
    referencia: "Portão cinza",
    vencimento: "5",
    emergenciaNome: "Fábio Barbosa (pai)",
    emergenciaTelefone: "(43) 99963-0198",
    observacoes: "",
    convite: "no_app",
    ultimoPagamento: "2026-11-05",
  },
};

export const detalhesPassageiros: Record<string, DetalhePassageiro> = Object.fromEntries(
  Object.entries(detalhesBase).map(([id, d]) => [
    id,
    { ...d, ultimoPagamento: d.ultimoPagamento ? deslocarSemanas(d.ultimoPagamento, HOJE) : "" },
  ]),
);

export const detalheVazio: DetalhePassageiro = {
  numero: "",
  bairro: "",
  referencia: "",
  vencimento: "",
  emergenciaNome: "",
  emergenciaTelefone: "",
  observacoes: "",
  convite: "nao_enviado",
  ultimoPagamento: "",
};

// ===== Etapa 6: viagens =====
// As viagens são geradas sozinhas a partir das linhas ativas (2 semanas para frente, 1 para trás).
// Para os exemplos, as respostas são sorteadas de um jeito fixo; abaixo, os casos especiais:
export const exemploViagens = {
  // A primeira viagem de sábado da linha de fim de semana fica lotada, com estes passageiros a mais:
  lotada: { linhaId: "l1", diaSemana: "sab", extras: ["p6", "p7", "p8", "p9", "p10"] },
  // A viagem mais recente desta linha nas "Anteriores" aparece cancelada:
  canceladaLinhaId: "l1",
};

// ===== Etapa 10: cobranças de exemplo (últimas semanas e meses) =====
// pago: [valor, data, forma]. Sem "pago" = em aberto. Semana = data de vencimento (início da semana).
export type CobrancaExemplo = {
  pid: string;
  tipo: "viagem" | "semana" | "mes";
  venc: string;
  valor: number;
  pago?: [number, string, "dinheiro" | "pix"];
};
const cobrancasBase: CobrancaExemplo[] = [
  { pid: "p1", tipo: "viagem", venc: "2026-11-06", valor: 150, pago: [150, "2026-11-07", "pix"] },
  { pid: "p1", tipo: "viagem", venc: "2026-11-07", valor: 150, pago: [150, "2026-11-07", "pix"] },
  {
    pid: "p2",
    tipo: "viagem",
    venc: "2026-11-06",
    valor: 150,
    pago: [150, "2026-11-07", "dinheiro"],
  },
  {
    pid: "p2",
    tipo: "viagem",
    venc: "2026-11-07",
    valor: 150,
    pago: [150, "2026-11-07", "dinheiro"],
  },
  { pid: "p3", tipo: "viagem", venc: "2026-10-24", valor: 150, pago: [150, "2026-10-24", "pix"] },
  { pid: "p3", tipo: "viagem", venc: "2026-11-01", valor: 150 },
  { pid: "p4", tipo: "viagem", venc: "2026-11-06", valor: 150, pago: [150, "2026-11-06", "pix"] },
  {
    pid: "p5",
    tipo: "viagem",
    venc: "2026-11-07",
    valor: 150,
    pago: [150, "2026-11-07", "dinheiro"],
  },
  { pid: "p6", tipo: "semana", venc: "2026-10-26", valor: 90, pago: [90, "2026-10-26", "pix"] },
  { pid: "p6", tipo: "semana", venc: "2026-11-02", valor: 90, pago: [90, "2026-11-02", "pix"] },
  {
    pid: "p8",
    tipo: "semana",
    venc: "2026-10-26",
    valor: 90,
    pago: [90, "2026-10-27", "dinheiro"],
  },
  { pid: "p8", tipo: "semana", venc: "2026-11-02", valor: 90 },
  { pid: "p10", tipo: "semana", venc: "2026-10-26", valor: 90, pago: [90, "2026-10-26", "pix"] },
  {
    pid: "p10",
    tipo: "semana",
    venc: "2026-11-02",
    valor: 90,
    pago: [40, "2026-11-04", "dinheiro"],
  },
  { pid: "p14", tipo: "semana", venc: "2026-11-02", valor: 65, pago: [65, "2026-11-02", "pix"] },
  { pid: "p7", tipo: "mes", venc: "2026-10-05", valor: 320, pago: [320, "2026-10-05", "pix"] },
  { pid: "p7", tipo: "mes", venc: "2026-11-05", valor: 320, pago: [320, "2026-11-02", "pix"] },
  { pid: "p9", tipo: "mes", venc: "2026-10-05", valor: 320, pago: [320, "2026-10-06", "dinheiro"] },
  { pid: "p9", tipo: "mes", venc: "2026-11-05", valor: 320, pago: [320, "2026-11-03", "pix"] },
  { pid: "p11", tipo: "mes", venc: "2026-11-05", valor: 250, pago: [250, "2026-11-05", "pix"] },
  {
    pid: "p12",
    tipo: "mes",
    venc: "2026-11-05",
    valor: 250,
    pago: [250, "2026-11-05", "dinheiro"],
  },
  { pid: "p13", tipo: "mes", venc: "2026-10-01", valor: 250, pago: [250, "2026-10-02", "pix"] },
  { pid: "p13", tipo: "mes", venc: "2026-11-01", valor: 250 },
  { pid: "p15", tipo: "mes", venc: "2026-11-05", valor: 250, pago: [250, "2026-11-05", "pix"] },
];

// ===== Etapa 11: gastos de exemplo dos últimos 6 meses (os de novembro estão em gastosMes) =====
// [valor, data, categoria, vanId, linhaId, descrição, litros?, km?, repete todo mês?]
const gastosExemploBase: [
  number,
  string,
  string,
  string,
  string,
  string,
  (number | undefined)?,
  (number | undefined)?,
  boolean?,
][] = [
  [1200, "2026-06-10", "Outros", "van2", "", "Parcela da van", undefined, undefined, true],
  [
    380,
    "2026-06-15",
    "Documentos e seguro",
    "van1",
    "",
    "Seguro da van",
    undefined,
    undefined,
    true,
  ],
  [600, "2026-06-30", "Pagamento de motorista", "", "", "Diárias do motorista"],
  [720, "2026-06-04", "Diesel", "van1", "l1", "Posto Jacarezinho", 120, 184500],
  [390, "2026-06-12", "Diesel", "van2", "l3", "", 65, 92010],
  [96, "2026-06-20", "Pedágio", "van1", "l1", "Viagem para Londrina"],
  [60, "2026-06-22", "Lavagem", "van1", "", "Lavagem completa"],
  [690, "2026-07-03", "Diesel", "van1", "l1", "", 115, 186200],
  [410, "2026-07-14", "Diesel", "van2", "l2", "", 68, 93400],
  [1480, "2026-07-18", "Pneus", "van2", "", "2 pneus dianteiros"],
  [96, "2026-07-24", "Pedágio", "van1", "l1", ""],
  [75, "2026-07-24", "Alimentação", "van1", "l1", "Lanche na estrada"],
  [735, "2026-08-05", "Diesel", "van1", "l1", "", 122, 188050],
  [
    4650,
    "2026-08-16",
    "Manutenção",
    "van1",
    "l1",
    "Van quebrou na estrada: guincho e conserto do câmbio",
  ],
  [395, "2026-08-21", "Diesel", "van2", "l3", "", 66, 94800],
  [96, "2026-08-29", "Pedágio", "van1", "l1", ""],
  [700, "2026-09-04", "Diesel", "van1", "l1", "", 117, 190100],
  [420, "2026-09-11", "Diesel", "van2", "l2", "", 70, 96100],
  [310, "2026-09-19", "Documentos e seguro", "van2", "", "Licenciamento"],
  [96, "2026-09-26", "Pedágio", "van1", "l1", ""],
  [60, "2026-09-27", "Lavagem", "van2", "", ""],
  [710, "2026-10-02", "Diesel", "van1", "l1", "", 118, 192000],
  [405, "2026-10-09", "Diesel", "van2", "l3", "", 67, 97500],
  [540, "2026-10-17", "Manutenção", "van2", "", "Revisão e freios"],
  [96, "2026-10-24", "Pedágio", "van1", "l1", ""],
  [80, "2026-10-24", "Alimentação", "van1", "l1", ""],
];

// Histórico de recebimentos de junho a outubro (para o Financeiro ter meses anteriores)
{
  const tem = new Set(cobrancasBase.map((c) => `${c.pid}_${c.tipo}_${c.venc}`));
  const add = (c: CobrancaExemplo) => {
    const k = `${c.pid}_${c.tipo}_${c.venc}`;
    if (!tem.has(k)) {
      tem.add(k);
      cobrancasBase.push(c);
    }
  };
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const mensais: [string, number, string][] = [
    ["p7", 320, "05"],
    ["p9", 320, "05"],
    ["p11", 250, "05"],
    ["p12", 250, "05"],
    ["p13", 250, "01"],
    ["p15", 250, "05"],
  ];
  const semanais: [string, number][] = [
    ["p6", 90],
    ["p8", 90],
    ["p10", 90],
    ["p14", 65],
  ];
  const porViagem = ["p1", "p2", "p3", "p4", "p5", "p16", "p17", "p18", "p19", "p20", "p21", "p22"];
  for (let m = 6; m <= 10; m++) {
    const mes = `2026-${String(m).padStart(2, "0")}`;
    mensais.forEach(([pid, valor, dia], i) =>
      add({
        pid,
        tipo: "mes",
        venc: `${mes}-${dia}`,
        valor,
        pago: [valor, `${mes}-${dia}`, i % 2 ? "dinheiro" : "pix"],
      }),
    );
    const sextas: string[] = [];
    for (let d = new Date(2026, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
      const s = iso(d);
      if (d.getDay() === 1 && s < "2026-10-26")
        semanais.forEach(([pid, valor]) =>
          add({ pid, tipo: "semana", venc: s, valor, pago: [valor, s, "pix"] }),
        );
      if (d.getDay() === 5) sextas.push(s);
    }
    [sextas[0], sextas[2]].filter(Boolean).forEach((s, j) =>
      porViagem.forEach((pid, i) =>
        add({
          pid,
          tipo: "viagem",
          venc: s!,
          valor: 150,
          pago: [150, s!, (i + j) % 2 ? "dinheiro" : "pix"],
        }),
      ),
    );
  }
}

// ===== Datas empurradas para perto de hoje =====
// Cobranças de mês seguem o dia do mês (vencimento 1 ou 5); as de semana e de viagem seguem o dia da semana.
export const cobrancasExemplo: CobrancaExemplo[] = cobrancasBase.map((c) => {
  const mudar = (d: string, limitar: boolean) =>
    c.tipo === "mes" ? deslocarMeses(d, HOJE, limitar) : deslocarSemanas(d, HOJE);
  return {
    ...c,
    venc: mudar(c.venc, false),
    ...(c.pago
      ? {
          pago: [c.pago[0], mudar(c.pago[1], true), c.pago[2]] as [
            number,
            string,
            "dinheiro" | "pix",
          ],
        }
      : {}),
  };
});

export const gastosExemplo = gastosExemploBase.map(
  (g) => [g[0], deslocarMeses(g[1], HOJE, true), ...g.slice(2)] as typeof g,
);
