import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TamanhoDaLetra } from "./TamanhoDaLetra";
import { CHAVE_LETRA, definirTamanhoLetra } from "@/lib/tamanhoLetra";

beforeEach(() => {
  localStorage.clear();
  definirTamanhoLetra("normal");
});
afterEach(() => {
  cleanup();
  definirTamanhoLetra("normal");
});

describe("<TamanhoDaLetra />", () => {
  it("mostra as três opções, com Normal marcada", () => {
    render(<TamanhoDaLetra />);
    const opcoes = screen.getAllByRole("radio");
    expect(opcoes.map((o) => o.textContent)).toEqual(["AaNormal", "AaGrande", "AaMuito grande"]);
    expect(screen.getByRole("radio", { name: /Normal/ })).toHaveAttribute("aria-checked", "true");
  });

  it("escolher aumenta a letra da página, marca a opção e guarda no aparelho", () => {
    render(<TamanhoDaLetra />);
    fireEvent.click(screen.getByRole("radio", { name: /Muito grande/ }));
    expect(document.documentElement.style.fontSize).toBe("130%");
    expect(screen.getByRole("radio", { name: /Muito grande/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /Normal/ })).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem(CHAVE_LETRA)).toBe("muito-grande");
  });

  it("voltar para Normal desfaz", () => {
    render(<TamanhoDaLetra />);
    fireEvent.click(screen.getByRole("radio", { name: /Grande$/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Normal/ }));
    expect(document.documentElement.style.fontSize).toBe("");
    expect(localStorage.getItem(CHAVE_LETRA)).toBeNull();
  });
});
