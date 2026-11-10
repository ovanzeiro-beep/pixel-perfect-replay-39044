// Importar passageiros de uma planilha (CSV) ou de um texto colado do Excel / Planilhas Google.
// Tudo é conferido ANTES de gravar: o vanzeiro vê o que vai entrar, o que já existe e o que precisa de conserto.
import { csv, type Celula } from "./exportacao";
import { telefoneValido } from "../lib/validacao";
import type { FormaPagamento, Linha, Passageiro } from "./tipos";

export type Tabela = string[][];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
/** Para comparar textos: minúsculas, sem acento, sem pontuação e sem espaço sobrando. */
export const normalizar = (s: string) =>
  semAcento(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Lê um CSV (; , ou tab; aspas; BOM) ou texto colado de uma planilha. Linhas vazias são ignoradas. */
export function lerTabela(texto: string): Tabela {
  const t = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto; // tira a marca de UTF-8 (BOM)
  const primeiras = t.split(/\r?\n/).slice(0, 5).join("\n");
  const conta = (c: string) =>
    (primeiras.match(new RegExp(c === "\t" ? "\\t" : `\\${c}`, "g")) ?? []).length;
  const sep = [";", "\t", ","].map((c) => [c, conta(c)] as const).sort((a, b) => b[1] - a[1])[0]!;
  const sepUsado = sep[1] > 0 ? sep[0] : ";";

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let entreAspas = false;
  const fecharCampo = () => {
    linha.push(campo.trim());
    campo = "";
  };
  const fecharLinha = () => {
    fecharCampo();
    if (linha.some((c) => c !== "")) linhas.push(linha);
    linha = [];
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (entreAspas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') entreAspas = false;
      else campo += c;
    } else if (c === '"') entreAspas = true;
    else if (c === sepUsado) fecharCampo();
    else if (c === "\n") fecharLinha();
    else if (c !== "\r") campo += c;
  }
  fecharLinha();
  return linhas;
}

export type Campo =
  | "nome"
  | "telefone"
  | "endereco"
  | "numero"
  | "bairro"
  | "cidade"
  | "referencia"
  | "linha"
  | "forma"
  | "valor"
  | "vencimento"
  | "emergenciaNome"
  | "emergenciaTelefone"
  | "observacoes";

export const NOME_DO_CAMPO: Record<Campo, string> = {
  nome: "Nome",
  telefone: "Telefone",
  endereco: "Endereço",
  numero: "Número",
  bairro: "Bairro",
  cidade: "Cidade",
  referencia: "Referência",
  linha: "Linha",
  forma: "Forma de pagamento",
  valor: "Valor",
  vencimento: "Vencimento",
  emergenciaNome: "Contato de emergência",
  emergenciaTelefone: "Telefone de emergência",
  observacoes: "Observações",
};

const SINONIMOS: Record<Campo, string[]> = {
  nome: ["nome", "passageiro", "nome completo", "aluno", "cliente"],
  telefone: ["telefone", "celular", "whatsapp", "whats", "fone", "contato", "tel"],
  endereco: ["endereco", "rua", "logradouro"],
  numero: ["numero", "n", "num", "no"],
  bairro: ["bairro"],
  cidade: ["cidade", "municipio"],
  referencia: ["referencia", "ponto de referencia"],
  linha: ["linha", "rota", "trajeto", "linhas"],
  forma: ["forma de pagamento", "forma", "pagamento", "tipo de pagamento", "plano"],
  valor: ["valor", "preco", "mensalidade", "valor combinado", "quanto", "valor r"],
  vencimento: ["vencimento", "vence", "dia", "dia do vencimento", "dia de pagamento"],
  emergenciaNome: [
    "contato de emergencia",
    "emergencia",
    "nome emergencia",
    "nome da emergencia",
    "responsavel",
  ],
  emergenciaTelefone: [
    "telefone de emergencia",
    "telefone emergencia",
    "tel emergencia",
    "fone emergencia",
    "celular emergencia",
  ],
  observacoes: ["observacoes", "observacao", "obs", "anotacoes"],
};
const CAMPO_DO_SINONIMO = new Map<string, Campo>(
  (Object.entries(SINONIMOS) as [Campo, string[]][]).flatMap(([c, ss]) =>
    ss.map((s) => [s, c] as const),
  ),
);

export type Colunas = {
  /** Para cada coluna da planilha, o campo que ela vira (ou `null`: ignorada). */
  campos: (Campo | null)[];
  /** A primeira linha era um cabeçalho (nomes das colunas). */
  temCabecalho: boolean;
  /** Títulos das colunas que não foram reconhecidas. */
  ignoradas: string[];
};

/** Descobre o que cada coluna é, pelo título. Sem título reconhecível, assume: nome, telefone, valor. */
export function mapearColunas(primeiraLinha: string[]): Colunas {
  const campos = primeiraLinha.map((c) => CAMPO_DO_SINONIMO.get(normalizar(c)) ?? null);
  const usados = new Set<Campo>();
  const unicos = campos.map((c) => (c && !usados.has(c) ? (usados.add(c), c) : null));
  if (usados.has("nome")) {
    return {
      campos: unicos,
      temCabecalho: true,
      ignoradas: primeiraLinha.filter((_, i) => !unicos[i] && primeiraLinha[i]!.trim() !== ""),
    };
  }
  const padrao: Campo[] = ["nome", "telefone", "valor"];
  return {
    campos: primeiraLinha.map((_, i) => padrao[i] ?? null),
    temCabecalho: false,
    ignoradas: [],
  };
}

const DIAS_DA_SEMANA: [string, string][] = [
  ["seg", "segunda"],
  ["ter", "terça"],
  ["qua", "quarta"],
  ["qui", "quinta"],
  ["sex", "sexta"],
  ["sab", "sábado"],
  ["dom", "domingo"],
];

export function formatarTelefone(t: string): string | null {
  let d = t.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (!telefoneValido(d)) return null;
  return d.length === 11
    ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

/** "150", "R$ 150,50", "1.234,56", "150.5" → número; texto que não é valor → `null`. */
export function lerValor(t: string): number | null {
  const s = t.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!/^[\d.,]+$/.test(s)) return null;
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function lerForma(t: string): FormaPagamento | null {
  const s = normalizar(t);
  if (!s) return "por_viagem";
  if (s.includes("semana")) return "semanal";
  if (s.includes("mes") || s.includes("mensal")) return "mensal";
  if (s.includes("viagem") || s === "avulso" || s === "dia") return "por_viagem";
  return null;
}

export type SituacaoDaLinha = "novo" | "duplicado" | "erro";
export type ItemImportacao = {
  /** Número da linha na planilha (a primeira linha de dados, sem o cabeçalho, é a 2). */
  linhaNaPlanilha: number;
  situacao: SituacaoDaLinha;
  nome: string;
  telefone: string;
  resumo: string;
  problemas: string[];
  avisos: string[];
  /** Pronto para gravar (só quando `situacao` é "novo"). */
  dados: Omit<Passageiro, "id"> | null;
};

export type Contexto = {
  linhas: Pick<Linha, "id" | "nome" | "valorViagem" | "valorMensal">[];
  existentes: { nome: string; telefone: string }[];
  cidadePadrao: string;
  pagaNaHoraPadrao: boolean;
};

const digitos = (t: string) => {
  const d = t.replace(/\D/g, "");
  return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
};

export function analisarImportacao(tabela: Tabela, ctx: Contexto) {
  if (tabela.length === 0) {
    return {
      colunas: { campos: [], temCabecalho: false, ignoradas: [] } as Colunas,
      itens: [] as ItemImportacao[],
    };
  }
  const colunas = mapearColunas(tabela[0]!);
  const linhasDeDados = colunas.temCabecalho ? tabela.slice(1) : tabela;
  const inicio = colunas.temCabecalho ? 2 : 1;
  const jaVistos = new Map<string, number>();
  const existentes = new Map(ctx.existentes.map((e) => [digitos(e.telefone), e.nome]));

  const itens = linhasDeDados.map((cels, i): ItemImportacao => {
    const v = (c: Campo) => {
      const idx = colunas.campos.indexOf(c);
      return idx >= 0 ? (cels[idx] ?? "").trim() : "";
    };
    const problemas: string[] = [];
    const avisos: string[] = [];
    const nome = v("nome");
    if (!nome) problemas.push("Falta o nome.");

    const tel = formatarTelefone(v("telefone"));
    if (!v("telefone")) problemas.push("Falta o telefone.");
    else if (!tel) problemas.push("Telefone incompleto: coloque o DDD, ex.: (43) 99999-9999.");

    // Linhas do trajeto
    const linhaIds: string[] = [];
    for (const parte of v("linha")
      .split(/[/|+]/)
      .map((p) => p.trim())
      .filter(Boolean)) {
      const n = normalizar(parte);
      const achadas = ctx.linhas.filter((l) => normalizar(l.nome) === n);
      const quase = achadas.length
        ? achadas
        : ctx.linhas.filter(
            (l) => normalizar(l.nome).includes(n) || n.includes(normalizar(l.nome)),
          );
      if (quase.length === 1) linhaIds.push(quase[0]!.id);
      else avisos.push(`Linha "${parte}" não encontrada: o passageiro entra sem essa linha.`);
    }
    const linha = ctx.linhas.find((l) => l.id === linhaIds[0]);

    const forma = lerForma(v("forma"));
    if (!forma)
      problemas.push("Forma de pagamento não reconhecida (use por viagem, semanal ou mensal).");
    let valor = v("valor") ? lerValor(v("valor")) : null;
    if (v("valor") && valor === null) problemas.push("Valor inválido, ex.: 150 ou R$ 150,00.");
    if (!v("valor") && forma) {
      const sugestao =
        forma === "mensal"
          ? linha?.valorMensal
          : forma === "por_viagem"
            ? linha?.valorViagem
            : null;
      if (sugestao) {
        valor = sugestao;
        avisos.push("Sem valor na planilha: usei o valor da linha.");
      } else problemas.push("Falta o valor combinado.");
    }

    let vencimento = "";
    if (forma === "semanal") {
      const n = normalizar(v("vencimento"));
      const achou = DIAS_DA_SEMANA.find(([curto]) => n.startsWith(curto));
      if (achou) vencimento = achou[1];
      else
        problemas.push(
          n
            ? "Dia da semana do vencimento não reconhecido (ex.: sexta)."
            : "Falta o dia da semana do vencimento.",
        );
    } else if (forma === "mensal") {
      const n = Number(v("vencimento").replace(/\D/g, ""));
      if (n >= 1 && n <= 31) {
        vencimento = String(Math.min(28, n));
        if (n > 28) avisos.push("Vencimento depois do dia 28: usei o dia 28.");
      } else
        problemas.push(
          v("vencimento")
            ? "Dia do mês do vencimento inválido (1 a 28)."
            : "Falta o dia do mês do vencimento.",
        );
    }

    const emerg = v("emergenciaTelefone");
    const emergFormatado = emerg ? formatarTelefone(emerg) : "";
    if (emerg && !emergFormatado)
      avisos.push("Telefone de emergência incompleto: não foi importado.");

    // Duplicados: já cadastrado ou repetido na própria planilha
    let situacao: SituacaoDaLinha = problemas.length ? "erro" : "novo";
    if (tel && !problemas.length) {
      const chave = digitos(tel);
      if (existentes.has(chave)) {
        situacao = "duplicado";
        avisos.unshift(`Já cadastrado como ${existentes.get(chave)} (mesmo telefone).`);
      } else if (jaVistos.has(chave)) {
        situacao = "duplicado";
        avisos.unshift(`Repetido na planilha (linha ${jaVistos.get(chave)}).`);
      } else jaVistos.set(chave, inicio + i);
    }

    const dados: Omit<Passageiro, "id"> | null =
      situacao === "novo" && tel && forma && valor
        ? {
            nome,
            telefone: tel,
            endereco: v("endereco"),
            numero: v("numero"),
            bairro: v("bairro"),
            cidade: v("cidade") || ctx.cidadePadrao,
            referencia: v("referencia"),
            linhaIds,
            formaPagamento: forma,
            valor,
            vencimento,
            emergenciaNome: v("emergenciaNome"),
            emergenciaTelefone: emergFormatado || "",
            observacoes: v("observacoes"),
            convite: "nao_enviado",
            ativo: true,
            emAberto: 0,
            ultimoPagamento: "",
            ...(forma === "por_viagem" && ctx.pagaNaHoraPadrao ? { pagaNaHora: true } : {}),
          }
        : null;
    const rotuloForma =
      forma === "semanal" ? "semanal" : forma === "mensal" ? "mensal" : "por viagem";
    return {
      linhaNaPlanilha: inicio + i,
      situacao,
      nome,
      telefone: tel ?? v("telefone"),
      resumo: [
        linha ? linha.nome : null,
        forma && valor ? `${rotuloForma} · ${valor.toFixed(2).replace(".", ",")}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      problemas,
      avisos,
      dados,
    };
  });
  return { colunas, itens };
}

/** Planilha de exemplo para o vanzeiro preencher (CSV brasileiro, abre no Excel e no Planilhas Google). */
export const modeloDeImportacao = () =>
  csv([
    [
      "Nome",
      "Telefone",
      "Endereço",
      "Número",
      "Bairro",
      "Cidade",
      "Linha",
      "Forma de pagamento",
      "Valor",
      "Vencimento",
      "Observações",
    ],
    [
      "Maria da Silva",
      "(43) 99999-0001",
      "Rua Paraná",
      "412",
      "Centro",
      "Jacarezinho",
      "Escolar - Manhã",
      "Mensal",
      "250",
      "10",
      "",
    ],
    [
      "José Pereira",
      "(43) 98888-0002",
      "Av. Brasil",
      "85",
      "Vila Nova",
      "Cambará",
      "Londrina - Fim de semana",
      "Por viagem",
      "150",
      "",
      "Leva uma mala grande",
    ],
  ]);

const FORMA_POR_EXTENSO: Record<FormaPagamento, string> = {
  por_viagem: "Por viagem",
  semanal: "Semanal",
  mensal: "Mensal",
};

/**
 * Passageiros em linhas de planilha, com as mesmas colunas da importação
 * (o arquivo exportado pode ser importado de volta). A coluna "Situação" é só informativa.
 */
export function linhasDePassageiros(
  passageiros: Passageiro[],
  linhas: Pick<Linha, "id" | "nome">[],
): Celula[][] {
  const nomeDaLinha = (id: string) => linhas.find((l) => l.id === id)?.nome ?? "";
  return [
    [...Object.values(NOME_DO_CAMPO), "Situação"],
    ...[...passageiros]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((p) => [
        p.nome,
        p.telefone,
        p.endereco,
        p.numero ?? "",
        p.bairro ?? "",
        p.cidade,
        p.referencia ?? "",
        p.linhaIds.map(nomeDaLinha).filter(Boolean).join(" / "),
        FORMA_POR_EXTENSO[p.formaPagamento],
        p.valor,
        p.vencimento ?? "",
        p.emergenciaNome ?? "",
        p.emergenciaTelefone ?? "",
        p.observacoes ?? "",
        p.ativo ? "Ativo" : "Inativo",
      ]),
  ];
}
