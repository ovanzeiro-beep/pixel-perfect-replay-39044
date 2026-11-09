import { describe, expect, it } from "vitest";
import { ANCORA, deslocarMeses, deslocarSemanas } from "./datasRelativas";

const dow = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay();

describe("deslocarSemanas", () => {
  it("não muda nada quando hoje é o dia âncora", () => {
    expect(deslocarSemanas("2026-11-02", new Date(2026, 10, 9))).toBe("2026-11-02");
  });
  it("mantém o dia da semana e nunca passa de hoje", () => {
    for (const hoje of [new Date(2027, 2, 5), new Date(2028, 1, 29), new Date(2026, 10, 15), new Date(2026, 9, 1)]) {
      for (const d of ["2026-10-26", "2026-11-02", "2026-11-06", "2026-11-07", "2026-06-05"]) {
        const r = deslocarSemanas(d, hoje);
        expect(dow(r)).toBe(dow(d));
      }
      const ultimo = deslocarSemanas("2026-11-07", hoje);
      const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      expect(ultimo <= iso).toBe(true);
    }
  });
  it("atravessa virada de ano", () => {
    expect(deslocarSemanas("2026-11-06", new Date(2027, 0, 20))).toBe("2027-01-15");
  });
});

describe("deslocarMeses", () => {
  it("mantém o dia do mês e anda os meses certos", () => {
    expect(deslocarMeses("2026-11-05", new Date(2027, 2, 10))).toBe("2027-03-05");
    expect(deslocarMeses("2026-06-10", new Date(2027, 2, 10))).toBe("2026-10-10");
  });
  it("ajusta o dia para meses curtos", () => {
    expect(deslocarMeses("2026-10-31", new Date(2027, 2, 20))).toBe("2027-02-28");
  });
  it("com limitar, não passa de hoje", () => {
    expect(deslocarMeses("2026-11-07", new Date(2027, 2, 3), true)).toBe("2027-03-03");
    expect(deslocarMeses("2026-11-07", new Date(2027, 2, 3))).toBe("2027-03-07");
  });
  it("a âncora está em uma segunda-feira", () => {
    expect(dow(ANCORA)).toBe(1);
  });
});
