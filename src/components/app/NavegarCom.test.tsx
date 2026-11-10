import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NavegarCom } from "./NavegarCom";

afterEach(cleanup);

describe("<NavegarCom />", () => {
  it("oferece Google Maps e Waze, cada um abrindo o seu endereço em outra aba", () => {
    render(<NavegarCom endereco="Rua A, 1, Cambará" />);
    const maps = screen.getByRole("link", { name: "Navegar com Google Maps" });
    const waze = screen.getByRole("link", { name: "Navegar com Waze" });
    expect(maps).toHaveAttribute("href", expect.stringContaining("google.com/maps/dir"));
    expect(waze).toHaveAttribute("href", expect.stringContaining("waze.com/ul"));
    for (const a of [maps, waze]) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a.getAttribute("rel")).toContain("noreferrer");
      expect(a.getAttribute("href")).toContain(encodeURIComponent("Rua A, 1, Cambará"));
    }
  });

  it("o rótulo vira parte do nome acessível (ex.: até o destino)", () => {
    render(<NavegarCom endereco="Londrina - Centro" rotulo="Navegar até o destino" />);
    expect(
      screen.getByRole("link", { name: "Navegar até o destino com Waze" }),
    ).toBeInTheDocument();
  });
});
