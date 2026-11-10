import { describe, expect, it } from "vitest";
import { linkGoogleMaps, linkWaze } from "./navegacao";

describe("links de navegação", () => {
  it("Google Maps: rota de carro até o endereço, com acentos e vírgulas protegidos", () => {
    const u = new URL(linkGoogleMaps("Rua São João, 12 - Centro, Jacarezinho"));
    expect(u.origin + u.pathname).toBe("https://www.google.com/maps/dir/");
    expect(u.searchParams.get("destination")).toBe("Rua São João, 12 - Centro, Jacarezinho");
    expect(u.searchParams.get("travelmode")).toBe("driving");
  });

  it("Waze: abre já navegando até o endereço", () => {
    const u = new URL(linkWaze("Rua São João, 12 - Centro, Jacarezinho"));
    expect(u.origin + u.pathname).toBe("https://waze.com/ul");
    expect(u.searchParams.get("q")).toBe("Rua São João, 12 - Centro, Jacarezinho");
    expect(u.searchParams.get("navigate")).toBe("yes");
  });

  it("endereço com & e # não quebra o link", () => {
    expect(new URL(linkWaze("A & B #5")).searchParams.get("q")).toBe("A & B #5");
    expect(new URL(linkGoogleMaps("A & B #5")).searchParams.get("destination")).toBe("A & B #5");
  });
});
