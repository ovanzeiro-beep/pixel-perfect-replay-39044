// Todos os dados de exemplo do app ficam aqui. Depois trocamos por banco de dados sem mexer nas telas.

export type FormaPagamento = "por_viagem" | "semanal" | "mensal";
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
  { id: "van1", apelido: "Van Branca", modelo: "Mercedes-Benz Sprinter 415", placa: "BRA2E19", lugares: 15, ano: 2019, cor: "Branca", motoristaId: "m1", situacao: "rodando", observacoes: "Ar-condicionado e bancos reclináveis." },
  { id: "van2", apelido: "Van Prata", modelo: "Renault Master L2H2", placa: "QJH7C42", lugares: 12, ano: 2021, cor: "Prata", motoristaId: "m2", situacao: "rodando", observacoes: "" },
];

export const motoristas = [
  { id: "m1", nome: "João Batista", telefone: "(43) 99812-4471", cnh: "D", cnhValidade: "2028-03-15", proprio: true },
  { id: "m2", nome: "Carlos Henrique Souza", telefone: "(43) 99634-2208", cnh: "D", cnhValidade: "2027-07-22", proprio: false },
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
  },
  {
    id: "l3",
    nome: "Escolar - Manhã",
    dias: ["segunda", "terça", "quarta", "quinta", "sexta"],
    paradas: ["Jacarezinho (Centro)", "Vila São Pedro", "Jardim Panorama", "Colégio Estadual"],
    vanId: "van2",
    motoristaId: "m1",
    valorMensal: 250,
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
  { id: "p1", nome: "Maria Aparecida Lima", telefone: "(43) 99701-1123", endereco: "Rua Paraná, 412", cidade: "Jacarezinho", linhaId: "l1", formaPagamento: "por_viagem", valor: 150, situacao: "pago_na_hora" },
  { id: "p2", nome: "Antônio Carlos Ribeiro", telefone: "(43) 99845-3390", endereco: "Av. Getúlio Vargas, 1020", cidade: "Cambará", linhaId: "l1", formaPagamento: "por_viagem", valor: 150, situacao: "pago_na_hora" },
  { id: "p3", nome: "Rosângela Ferreira", telefone: "(43) 99612-7781", endereco: "Rua São Paulo, 88", cidade: "Andirá", linhaId: "l1", formaPagamento: "por_viagem", valor: 150, situacao: "atrasado_1_semana" },
  { id: "p4", nome: "Sebastião Moreira", telefone: "(43) 99533-0045", endereco: "Rua Rui Barbosa, 230", cidade: "Bandeirantes", linhaId: "l1", formaPagamento: "por_viagem", valor: 150, situacao: "em_dia" },
  { id: "p5", nome: "Cleide Santos Oliveira", telefone: "(43) 99288-6612", endereco: "Rua Benjamin Constant, 51", cidade: "Jacarezinho", linhaId: "l1", formaPagamento: "por_viagem", valor: 150, situacao: "pago_na_hora" },
  { id: "p6", nome: "Lucas Gabriel Prado", telefone: "(43) 99177-4520", endereco: "Rua Marechal Deodoro, 703", cidade: "Jacarezinho", linhaId: "l2", formaPagamento: "semanal", valor: 90, situacao: "em_dia" },
  { id: "p7", nome: "Ana Beatriz Costa", telefone: "(43) 99456-8834", endereco: "Rua XV de Novembro, 15", cidade: "Cambará", linhaId: "l2", formaPagamento: "mensal", valor: 320, situacao: "em_dia" },
  { id: "p8", nome: "Felipe Augusto Nogueira", telefone: "(43) 99390-2217", endereco: "Rua Dom Pedro II, 340", cidade: "Jacarezinho", linhaId: "l2", formaPagamento: "semanal", valor: 90, situacao: "atrasado_1_semana" },
  { id: "p9", nome: "Juliana Martins", telefone: "(43) 99821-6650", endereco: "Rua Sete de Setembro, 98", cidade: "Jacarezinho", linhaId: "l2", formaPagamento: "mensal", valor: 320, situacao: "em_dia" },
  { id: "p10", nome: "Gustavo Henrique Alves", telefone: "(43) 99102-9943", endereco: "Rua Tiradentes, 1201", cidade: "Cambará", linhaId: "l2", formaPagamento: "semanal", valor: 90, situacao: "atrasado_1_semana" },
  { id: "p11", nome: "Sofia Rodrigues (resp. Patrícia)", telefone: "(43) 99744-1308", endereco: "Rua Bahia, 67", cidade: "Jacarezinho", linhaId: "l3", formaPagamento: "mensal", valor: 250, situacao: "em_dia" },
  { id: "p12", nome: "Pedro Henrique Silva (resp. Márcia)", telefone: "(43) 99655-2271", endereco: "Rua Goiás, 455", cidade: "Jacarezinho", linhaId: "l3", formaPagamento: "mensal", valor: 250, situacao: "em_dia" },
  { id: "p13", nome: "Isabela Mendes (resp. Rogério)", telefone: "(43) 99511-7764", endereco: "Rua Minas Gerais, 190", cidade: "Jacarezinho", linhaId: "l3", formaPagamento: "mensal", valor: 250, situacao: "atrasado_1_semana" },
  { id: "p14", nome: "Davi Lucca Pereira (resp. Simone)", telefone: "(43) 99280-3345", endereco: "Rua Santa Catarina, 22", cidade: "Jacarezinho", linhaId: "l3", formaPagamento: "semanal", valor: 65, situacao: "em_dia" },
  { id: "p15", nome: "Helena Barbosa (resp. Fábio)", telefone: "(43) 99963-0198", endereco: "Rua Pernambuco, 310", cidade: "Jacarezinho", linhaId: "l3", formaPagamento: "mensal", valor: 250, situacao: "em_dia" },
];

// Passageiro usado nos testes da área do passageiro
export const passageiroAtualId = "p1";

// ===== Etapa 2: dados para a tela Início do Vanzeiro =====

export type ViagemSemana = {
  id: string;
  linhaId: string;
  dia: string; // ex.: "Sexta"
  data: string; // AAAA-MM-DD
  saida: string; // HH:MM
  vanId: string;
  motoristaId: string;
  confirmados: number;
  naoConfirmados: number;
  listaEspera: number;
};

export const viagensSemana: ViagemSemana[] = [
  { id: "v1", linhaId: "l3", dia: "Segunda", data: "2026-11-09", saida: "06:40", vanId: "van2", motoristaId: "m1", confirmados: 5, naoConfirmados: 0, listaEspera: 0 },
  { id: "v2", linhaId: "l2", dia: "Segunda", data: "2026-11-09", saida: "18:15", vanId: "van2", motoristaId: "m2", confirmados: 5, naoConfirmados: 0, listaEspera: 0 },
  { id: "v3", linhaId: "l1", dia: "Sexta", data: "2026-11-13", saida: "17:30", vanId: "van1", motoristaId: "m1", confirmados: 11, naoConfirmados: 3, listaEspera: 0 },
  { id: "v4", linhaId: "l1", dia: "Sábado", data: "2026-11-14", saida: "05:30", vanId: "van1", motoristaId: "m1", confirmados: 15, naoConfirmados: 0, listaEspera: 2 },
  { id: "v5", linhaId: "l1", dia: "Domingo", data: "2026-11-15", saida: "16:00", vanId: "van1", motoristaId: "m2", confirmados: 9, naoConfirmados: 0, listaEspera: 0 },
];

// Viagem em destaque no Início
export const proximaViagemId = "v3";

// Quem está devendo (passageiros com situação "atrasado_1_semana")
export const cobrancasEmAberto = [
  { passageiroId: "p13", valor: 250, diasAtraso: 9 },
  { passageiroId: "p3", valor: 150, diasAtraso: 8 },
  { passageiroId: "p8", valor: 90, diasAtraso: 7 },
  { passageiroId: "p10", valor: 90, diasAtraso: 7 },
];

// Recebido no mês (novembro/2026)
export const recebimentosMes = [
  { passageiroId: "p1", valor: 300, data: "2026-11-07" },
  { passageiroId: "p2", valor: 300, data: "2026-11-07" },
  { passageiroId: "p5", valor: 150, data: "2026-11-07" },
  { passageiroId: "p4", valor: 150, data: "2026-11-06" },
  { passageiroId: "p6", valor: 90, data: "2026-11-02" },
  { passageiroId: "p7", valor: 320, data: "2026-11-02" },
  { passageiroId: "p9", valor: 320, data: "2026-11-03" },
  { passageiroId: "p11", valor: 250, data: "2026-11-05" },
  { passageiroId: "p12", valor: 250, data: "2026-11-05" },
  { passageiroId: "p14", valor: 65, data: "2026-11-02" },
  { passageiroId: "p15", valor: 250, data: "2026-11-05" },
];

// Gastos do mês
export const gastosMes = [
  { id: "g1", descricao: "Diesel", valor: 680, data: "2026-11-03", vanId: "van1" },
  { id: "g2", descricao: "Diesel", valor: 410, data: "2026-11-04", vanId: "van2" },
  { id: "g3", descricao: "Manutenção (troca de óleo)", valor: 320, data: "2026-11-05", vanId: "van2" },
  { id: "g4", descricao: "Pedágio", valor: 96, data: "2026-11-07", vanId: "van1" },
];

// Ainda falta receber neste mês (inclui os atrasados + o que vence até o fim do mês)
export const aReceberRestoMes = [
  { descricao: "Atrasados", valor: 580 },
  { descricao: "Semanais que vencem no mês", valor: 735 },
  { descricao: "Viagens de fim de semana previstas", valor: 1200 },
];
