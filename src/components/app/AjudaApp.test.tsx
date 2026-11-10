import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AjudaApp } from "./AjudaApp";

afterEach(cleanup);
const T = [
  { id: "a", titulo: "Primeiro", passos: ["Faça A", "Faça B"] },
  { id: "b", titulo: "Segundo", passos: ["Faça C", "Faça D"] },
];

describe("<AjudaApp />", () => {
  it("mostra todos os títulos, só o primeiro tópico aberto e os passos numerados", () => {
    const { container } = render(<AjudaApp topicos={T} />);
    expect(screen.getByText("Primeiro")).toBeInTheDocument();
    expect(screen.getByText("Segundo")).toBeInTheDocument();
    const abertos = container.querySelectorAll("details[open]");
    expect(abertos).toHaveLength(1);
    expect(abertos[0]).toHaveTextContent("Faça A");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("tópicos fechados continuam no HTML (o navegador abre ao tocar no título)", () => {
    render(<AjudaApp topicos={T} />);
    const segundo = screen.getByText("Segundo").closest("details")!;
    expect(segundo.open).toBe(false);
    expect(segundo.querySelector("summary")).toHaveTextContent("Segundo");
    expect(segundo).toHaveTextContent("Faça C");
  });
});
