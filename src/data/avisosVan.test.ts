import { describe, expect, it } from "vitest";
import { textoChegando, textoSaida } from "./avisosVan";

describe("avisos da van pelo WhatsApp", () => {
  it("chegando: chama pelo primeiro nome (sem '(resp. ...)') e diz que o horário é o combinado", () => {
    const t = textoChegando("Isabela Mendes (resp. Rogério)", "06:50");
    expect(t).toContain("Olá, Isabela!");
    expect(t).toContain("A van está chegando aí");
    expect(t).toContain("horário combinado: 06:50");
    expect(t).not.toContain("resp.");
  });

  it("chegando sem horário não inventa previsão (nada de 'uns 5 minutos')", () => {
    const t = textoChegando("Pedro Silva");
    expect(t).not.toMatch(/\d/);
    expect(t).not.toContain("horário combinado");
  });

  it("saída do grupo: lista cada um com o horário previsto, na ordem", () => {
    const t = textoSaida({
      linha: "Escolar - Manhã",
      quem: [
        { nome: "Pedro Henrique Silva (resp. Márcia)", horario: "06:40" },
        { nome: "Isabela Mendes", horario: "07:00" },
      ],
    });
    expect(t).toContain("A van saiu! (Escolar - Manhã)");
    expect(t).toContain("• Pedro — 06:40\n• Isabela — 07:00");
    expect(t.indexOf("Pedro")).toBeLessThan(t.indexOf("Isabela"));
    expect(t).toContain("Fiquem prontos");
  });

  it("saída sem ninguém na lista ainda é uma mensagem válida", () => {
    const t = textoSaida({ linha: "L", quem: [] });
    expect(t).toContain("A van saiu!");
    expect(t).not.toContain("Previsão da escala");
  });
});
