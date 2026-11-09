import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => { localStorage.clear(); vi.resetModules(); });

it("começa desligado, liga, lembra depois de recarregar e desliga", async () => {
  const a = await import("./modoDemo");
  expect(localStorage.getItem("vanzeiro:demo")).toBeNull();
  a.definirModoDemo(true);
  expect(localStorage.getItem("vanzeiro:demo")).toBe("1");
  vi.resetModules();
  const { renderHook } = await import("@testing-library/react");
  const b = await import("./modoDemo");
  expect(renderHook(() => b.useModoDemo()).result.current).toBe(true);
  b.definirModoDemo(false);
  expect(localStorage.getItem("vanzeiro:demo")).toBeNull();
});
