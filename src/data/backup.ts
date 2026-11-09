// Backup e restauração dos dados do vanzeiro (arquivo .json), mais a cópia de segurança e o controle de "quando foi o último backup".
// Tudo fica no aparelho; o arquivo é que pode ser guardado fora (WhatsApp, Drive, Arquivos).
import { useSyncExternalStore } from "react";
import { armazenamentoLocal } from "./persistencia";
import type { Estado } from "./store";

export const FORMATO_BACKUP = 1;
export const APP_BACKUP = "o-vanzeiro";

export type ResumoDados = {
  passageiros: number;
  linhas: number;
  vans: number;
  motoristas: number;
  cobrancas: number;
  recibos: number;
  gastos: number;
  viagensRealizadas: number;
};
export type Backup = {
  app: typeof APP_BACKUP;
  tipo: "backup";
  formato: number;
  criadoEm: string;
  resumo: ResumoDados;
  integridade: string;
  dados: Estado;
};

// ===== Integridade =====
/** Texto canônico (chaves em ordem, sem campos indefinidos): o mesmo dado sempre gera o mesmo texto. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/** Assinatura simples (cyrb53) para perceber arquivo corrompido ou editado à mão. Não é segurança contra fraude. */
export function assinatura(dados: unknown): string {
  const s = canonico(dados);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

export function resumoDoEstado(e: Estado): ResumoDados {
  return {
    passageiros: e.passageiros.length,
    linhas: e.linhas.length,
    vans: e.vans.length,
    motoristas: e.motoristas.length,
    cobrancas: e.cobrancas.length,
    recibos: e.recibos.length,
    gastos: e.gastos.length,
    viagensRealizadas: Object.values(e.ajustes).filter((a) => a?.ida?.encerrada).length,
  };
}

export function criarBackup(estado: Estado, agora: Date = new Date()): Backup {
  return {
    app: APP_BACKUP,
    tipo: "backup",
    formato: FORMATO_BACKUP,
    criadoEm: agora.toISOString(),
    resumo: resumoDoEstado(estado),
    integridade: assinatura(estado),
    dados: estado,
  };
}

export const serializarBackup = (b: Backup) => JSON.stringify(b);

const p2 = (n: number) => String(n).padStart(2, "0");
export const nomeDoArquivoDeBackup = (agora: Date = new Date()) =>
  `vanzeiro-backup-${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-${p2(agora.getDate())}.json`;

// ===== Validação =====
const ehObjeto = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const ehTexto = (x: unknown): x is string => typeof x === "string";
const ehNumero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Confere a forma dos dados (para um arquivo estragado não derrubar o app). Devolve a mensagem de erro, ou null se está tudo certo. */
export function erroNosDados(d: unknown): string | null {
  if (!ehObjeto(d)) return "Os dados do backup estão em branco ou no formato errado.";
  const listas: [string, (x: Record<string, unknown>) => boolean][] = [
    ["vans", (x) => ehTexto(x["apelido"])],
    ["motoristas", (x) => ehTexto(x["nome"])],
    [
      "linhas",
      (x) => ehTexto(x["nome"]) && Array.isArray(x["dias"]) && Array.isArray(x["paradas"]),
    ],
    [
      "passageiros",
      (x) => ehTexto(x["nome"]) && Array.isArray(x["linhaIds"]) && ehNumero(x["valor"]),
    ],
    [
      "cobrancas",
      (x) =>
        ehTexto(x["pid"]) &&
        ehNumero(x["valor"]) &&
        Array.isArray(x["pagamentos"]) &&
        (x["pagamentos"] as unknown[]).every(
          (p) => ehObjeto(p) && ehNumero(p["valor"]) && ehTexto(p["data"]),
        ),
    ],
    ["recibos", (x) => ehNumero(x["numero"]) && ehTexto(x["pid"]) && ehNumero(x["valor"])],
    ["gastos", (x) => ehNumero(x["valor"]) && ehTexto(x["data"])],
  ];
  for (const [nome, valido] of listas) {
    const lista = d[nome];
    if (!Array.isArray(lista)) return `Faltam dados no backup (lista "${nome}").`;
    const ids = new Set<string>();
    for (let i = 0; i < lista.length; i++) {
      const item = lista[i];
      if (!ehObjeto(item) || !valido(item))
        return `O backup tem um registro inválido em "${nome}" (número ${i + 1}).`;
      if (nome !== "recibos") {
        const id = item["id"];
        if (!ehTexto(id) || id === "")
          return `O backup tem um registro sem identificação em "${nome}" (número ${i + 1}).`;
        if (ids.has(id)) return `O backup tem registros repetidos em "${nome}".`;
        ids.add(id);
      }
    }
  }
  if (d["perfil"] !== undefined) {
    const pf = d["perfil"];
    if (
      !ehObjeto(pf) ||
      !ehTexto(pf["nome"]) ||
      !ehTexto(pf["cidade"]) ||
      !ehTexto(pf["telefone"]) ||
      typeof pf["configurado"] !== "boolean"
    )
      return "Os dados do vanzeiro no backup estão inválidos.";
  }
  if (!ehObjeto(d["ajustes"])) return "Faltam dados no backup (viagens ajustadas).";
  if (!ehTexto(d["chavePix"])) return "Faltam dados no backup (chave Pix).";
  if (d["alertasDispensados"] !== undefined && !ehObjeto(d["alertasDispensados"]))
    return "Os alertas dispensados do backup estão inválidos.";
  return null;
}

export type ResultadoBackup = { ok: true; backup: Backup } | { ok: false; erro: string };

/** Lê o texto de um arquivo e diz se é um backup do app utilizável, com mensagem clara em português quando não é. */
export function validarBackup(texto: string): ResultadoBackup {
  if (!texto.trim()) return { ok: false, erro: "O arquivo está vazio." };
  let o: unknown;
  try {
    o = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Este arquivo não é um backup do O Vanzeiro (não deu para ler)." };
  }
  if (!ehObjeto(o) || o["app"] !== APP_BACKUP || o["tipo"] !== "backup")
    return { ok: false, erro: "Este arquivo não é um backup do O Vanzeiro." };
  if (!ehNumero(o["formato"])) return { ok: false, erro: "O backup está sem a versão do formato." };
  if (o["formato"] > FORMATO_BACKUP)
    return {
      ok: false,
      erro: "Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.",
    };
  const erro = erroNosDados(o["dados"]);
  if (erro) return { ok: false, erro };
  if (o["integridade"] !== assinatura(o["dados"]))
    return { ok: false, erro: "O arquivo foi alterado ou está corrompido (a conferência falhou)." };
  const dados = o["dados"] as Estado;
  const criadoEm =
    ehTexto(o["criadoEm"]) && !Number.isNaN(Date.parse(o["criadoEm"]))
      ? o["criadoEm"]
      : new Date(0).toISOString();
  return {
    ok: true,
    backup: {
      app: APP_BACKUP,
      tipo: "backup",
      formato: o["formato"],
      criadoEm,
      resumo: resumoDoEstado(dados),
      integridade: o["integridade"] as string,
      dados,
    },
  };
}

// ===== Quando foi o último backup (e quanto mudou desde então) =====
const CHAVE_META = "vanzeiro:backup";
type Meta = { ultimoBackup: string | null; alteracoes: number };
const META_VAZIA: Meta = { ultimoBackup: null, alteracoes: 0 };
let meta: Meta | undefined;
let metaSuja = false;
const ouvintes = new Set<() => void>();
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};
const avisar = () => ouvintes.forEach((f) => f());

function lerMeta(): Meta {
  if (meta) return meta;
  meta = META_VAZIA;
  const a = armazenamentoLocal();
  if (a) {
    try {
      const b = JSON.parse(a.getItem(CHAVE_META) ?? "null") as Partial<Meta> | null;
      if (b && (b.ultimoBackup === null || ehTexto(b.ultimoBackup)) && ehNumero(b.alteracoes))
        meta = { ultimoBackup: b.ultimoBackup ?? null, alteracoes: b.alteracoes };
    } catch {
      /* dados ilegíveis: começa do zero */
    }
  }
  return meta;
}
const definirMeta = (m: Meta) => {
  meta = m;
  metaSuja = true;
  avisar();
};

/** Chamado a cada mudança nos dados. */
export function registrarAlteracao() {
  const m = lerMeta();
  definirMeta({ ...m, alteracoes: m.alteracoes + 1 });
}
export function marcarBackupFeito(quando: string = new Date().toISOString()) {
  definirMeta({ ultimoBackup: quando, alteracoes: 0 });
  salvarMeta();
}
export function zerarAlteracoes() {
  definirMeta({ ...lerMeta(), alteracoes: 0 });
  salvarMeta();
}
export function salvarMeta() {
  const a = armazenamentoLocal();
  if (!a || !metaSuja) return;
  try {
    a.setItem(CHAVE_META, JSON.stringify(lerMeta()));
    metaSuja = false;
  } catch {
    /* sem espaço: tenta de novo na próxima mudança */
  }
}
export const useBackupMeta = () => useSyncExternalStore(assinar, lerMeta, () => META_VAZIA);

// ===== Cópia de segurança (para desfazer uma substituição dos dados) =====
const CHAVE_COPIA = "vanzeiro:copia-seguranca";
export type CopiaDeSeguranca = { motivo: string; salvoEm: string; dados: Estado };
let copia: CopiaDeSeguranca | null | undefined;

export function lerCopiaDeSeguranca(): CopiaDeSeguranca | null {
  if (copia !== undefined) return copia;
  copia = null;
  const a = armazenamentoLocal();
  if (a) {
    try {
      const c = JSON.parse(a.getItem(CHAVE_COPIA) ?? "null") as CopiaDeSeguranca | null;
      if (c && ehTexto(c.motivo) && ehTexto(c.salvoEm) && erroNosDados(c.dados) === null) copia = c;
    } catch {
      /* ilegível: sem cópia */
    }
  }
  return copia;
}
export function guardarCopiaDeSeguranca(dados: Estado, motivo: string, agora: Date = new Date()) {
  copia = { motivo, salvoEm: agora.toISOString(), dados };
  const a = armazenamentoLocal();
  if (a) {
    try {
      a.setItem(CHAVE_COPIA, JSON.stringify(copia));
    } catch {
      /* sem espaço: a cópia fica só na memória desta aba */
    }
  }
  avisar();
}
export function apagarCopiaDeSeguranca() {
  copia = null;
  const a = armazenamentoLocal();
  if (a) {
    try {
      a.removeItem(CHAVE_COPIA);
    } catch {
      /* nada a apagar */
    }
  }
  avisar();
}
export const useCopiaDeSeguranca = () =>
  useSyncExternalStore(assinar, lerCopiaDeSeguranca, () => null);
