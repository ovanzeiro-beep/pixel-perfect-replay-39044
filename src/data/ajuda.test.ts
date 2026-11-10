import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AJUDA_PASSAGEIRO, AJUDA_VANZEIRO } from "./ajuda";

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory()
      ? arquivos(p)
      : /\.tsx$/.test(n) && !/\.test\./.test(n)
        ? [p]
        : [];
  });
}
const FONTE = [...arquivos("src/routes"), ...arquivos("src/components/app")]
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");

describe.each([
  ["vanzeiro", AJUDA_VANZEIRO],
  ["passageiro", AJUDA_PASSAGEIRO],
])("ajuda do %s", (_nome, topicos) => {
  it("tem tópicos com id único, título e pelo menos 2 passos", () => {
    expect(new Set(topicos.map((t) => t.id)).size).toBe(topicos.length);
    for (const t of topicos) {
      expect(t.titulo.length).toBeGreaterThan(3);
      expect(t.passos.length).toBeGreaterThanOrEqual(2);
      expect(new Set(t.passos).size).toBe(t.passos.length);
    }
  });

  it("não usa palavras técnicas", () => {
    const texto = topicos.flatMap((t) => [t.titulo, ...t.passos]).join(" ");
    expect(texto).not.toMatch(
      /\b(localStorage|JSON|mock|cache|token|service worker|banco de dados)\b/i,
    );
  });

  it("explica como instalar o app", () => {
    expect(topicos.some((t) => t.id === "instalar")).toBe(true);
  });
});

describe("a ajuda cita só botões que existem nas telas", () => {
  // Se um botão mudar de nome, este teste avisa que a ajuda ficou desatualizada.
  const botoes = [
    "Novo passageiro",
    "Enviar convite",
    "Iniciar viagem",
    "Embarcou",
    "Não apareceu",
    "Seguir para o destino",
    "Chegamos ao destino!",
    "Encerrar viagem",
    "Cancelar viagem",
    "Compartilhar lista da viagem",
    "Marcar pagamento",
    "Lançar gasto",
    "Salvar backup",
    "Restaurar de um backup",
    "Copiar chave Pix",
    "Avisar que paguei",
    "Google Maps",
    "Waze",
    "Instalar agora",
  ];
  const todos = [...AJUDA_VANZEIRO, ...AJUDA_PASSAGEIRO].flatMap((t) => t.passos).join(" ");
  it.each(botoes)("“%s” existe na tela", (b) => {
    expect(FONTE).toContain(b);
  });
  it("e cada botão listado é de fato citado na ajuda", () => {
    for (const b of botoes) expect(todos).toContain(b);
  });
});
