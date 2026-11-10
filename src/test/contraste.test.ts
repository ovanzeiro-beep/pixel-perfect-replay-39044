import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Texto precisa de contraste de 4,5:1 (WCAG AA) para ser lido com sol forte e por quem enxerga pouco.
// Este teste lê as cores do tema e falha se alguém deixar o verde, o vermelho ou o laranja fracos de novo.

type Rgb = [number, number, number];
const oklchParaRgb = (L: number, C: number, h: number): Rgb => {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((v) => Math.min(1, Math.max(0, v))) as Rgb;
};
const luminancia = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const contraste = (a: Rgb, b: Rgb) => {
  const x = luminancia(a);
  const y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const misturar = (frente: Rgb, fundo: Rgb, t: number): Rgb =>
  frente.map((v, i) => v * t + fundo[i]! * (1 - t)) as Rgb;

const css = readFileSync("src/styles.css", "utf8");
const claro = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
const cor = (nome: string): Rgb => {
  const m = new RegExp(`--${nome}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`).exec(claro);
  expect(m, `--${nome} no tema claro`).not.toBeNull();
  return oklchParaRgb(Number(m![1]), Number(m![2]), Number(m![3]));
};

const branco = cor("card");
const fundos: [string, Rgb][] = [
  ["card", branco],
  ["fundo da tela", cor("background")],
  ["cinza claro (muted)", cor("muted")],
];

describe("contraste das cores do tema (texto: 4,5:1)", () => {
  it.each(["success", "destructive", "accent-strong", "muted-foreground", "primary"])(
    "texto em %s é legível sobre card, fundo da tela e cinza claro",
    (nome) => {
      for (const [fundo, rgb] of fundos) {
        expect(contraste(cor(nome), rgb), `${nome} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it.each(["success", "destructive", "accent-strong"])(
    "texto em %s também é legível nas etiquetas com fundo da própria cor (10 a 20%)",
    (nome) => {
      for (const t of [0.1, 0.15, 0.2]) {
        expect(
          contraste(cor(nome), misturar(cor(nome), branco, t)),
          `${nome} sobre ${nome}/${t * 100}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it.each([
    ["success", "success-foreground"],
    ["destructive", "destructive-foreground"],
  ])("texto de botão (%s-foreground) é legível sobre o botão", (fundo, texto) => {
    expect(contraste(cor(texto), cor(fundo))).toBeGreaterThanOrEqual(4.5);
  });
});
