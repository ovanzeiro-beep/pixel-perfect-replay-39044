import { describe, it, expect } from "vitest";
import {
  venceEm7Dias,
  aberto,
  pagar,
  desfazerPagamento,
  cancelarCobranca,
  resumoPassageiro,
  gerarPeriodicas,
  refSemana,
  refViagem,
  refMes,
  mensagemCobrar,
  totalEmAberto,
  brl,
  type Cobranca,
} from "./cobrancas";

const c = (id: string, venc: string, valor: number): Cobranca => ({
  id,
  pid: "p",
  tipo: "semana",
  ref: refSemana(venc),
  vencimento: venc,
  valor,
  pagamentos: [],
});

describe("mensagem de cobrança com Pix copia e cola", () => {
  it("sem código, a mensagem é a de sempre; com código, ele vai no fim, sozinho numa linha para copiar", () => {
    const sem = mensagemCobrar("Ana", 90, ["Semana 02 a 08/11"], "chave@pix");
    expect(sem).not.toContain("copia e cola");
    const com = mensagemCobrar("Ana", 90, ["Semana 02 a 08/11"], "chave@pix", "000201...6304ABCD");
    expect(com.startsWith(sem)).toBe(true);
    expect(com).toContain("Pix copia e cola (já com o valor):\n000201...6304ABCD");
    expect(mensagemCobrar("Ana", 90, ["x"], "k", null)).not.toContain("copia e cola");
  });
});

describe("cobranças", () => {
  it("referências no formato pedido", () => {
    expect(refViagem("2026-11-13")).toBe("Viagem 13/11");
    expect(refSemana("2026-11-09")).toBe("Semana 09 a 15/11");
    expect(refMes("2026-11-05")).toBe("Novembro");
  });
  it("pagamento em parte quita primeiro a mais antiga", () => {
    const cobs = [c("b", "2026-11-09", 90), c("a", "2026-11-02", 90)];
    const r = pagar(cobs, "p", 120, "pix", "2026-11-09", 7);
    expect(aberto(r.cobs.find((x) => x.id === "a")!)).toBe(0);
    expect(aberto(r.cobs.find((x) => x.id === "b")!)).toBe(60);
    expect(r.recibo?.valor).toBe(120);
    expect(r.recibo?.numero).toBe(7);
  });
  it("desfazer pagamento volta a dívida", () => {
    const r = pagar([c("a", "2026-11-02", 90)], "p", 90, "dinheiro", "2026-11-09", 1);
    expect(totalEmAberto(desfazerPagamento(r.cobs, 1))).toBe(90);
  });
  it("cobrança cancelada não conta como dívida", () => {
    expect(
      totalEmAberto(cancelarCobranca([c("a", "2026-11-02", 90)], "a", "Viagem cancelada")),
    ).toBe(0);
  });
  it("cores: vermelho atrasado, amarelo vence em breve, verde em dia", () => {
    expect(resumoPassageiro([c("a", "2026-11-02", 90)], "p", "2026-11-09").cor).toBe("vermelho");
    expect(resumoPassageiro([c("a", "2026-11-02", 90)], "p", "2026-11-09").diasAtraso).toBe(7);
    expect(resumoPassageiro([c("a", "2026-11-12", 90)], "p", "2026-11-09").cor).toBe("amarelo");
    expect(resumoPassageiro([], "p", "2026-11-09").cor).toBe("verde");
  });
  it("gera semanal no dia do vencimento e mensal no dia do mês, sem repetir", () => {
    const ps = [
      { id: "s", formaPagamento: "semanal", valor: 90, vencimento: "segunda", ativo: true },
      { id: "m", formaPagamento: "mensal", valor: 320, vencimento: "5", ativo: true },
    ];
    const g = gerarPeriodicas([], ps, "2026-11-09");
    expect(g.filter((x) => x.pid === "s").map((x) => x.vencimento)).toEqual(["2026-11-09"]);
    expect(
      gerarPeriodicas([], ps, "2026-11-10")
        .filter((x) => x.pid === "s")
        .map((x) => x.vencimento),
    ).toEqual(["2026-11-09"]);
    expect(g.filter((x) => x.pid === "m").map((x) => x.ref)).toEqual(["Novembro"]);
    expect(gerarPeriodicas(g, ps, "2026-11-09")).toBe(g);
  });
  it("vence nos próximos 7 dias inclui as semanais que ainda vão ser cobradas", () => {
    const ps = [
      { id: "s", formaPagamento: "semanal", valor: 90, vencimento: "segunda", ativo: true },
    ];
    expect(venceEm7Dias([], "2026-11-10", ps)).toBe(90);
  });
  it("mensagem de cobrança", () => {
    expect(mensagemCobrar("Ana", 90, ["Semana 02 a 08/11"], "chave@pix")).toBe(
      `Olá, Ana! Tudo bem? Passando pra lembrar do valor em aberto da van: ${brl(90)}, referente a Semana 02 a 08/11. Pix: chave@pix. Obrigado!`,
    );
    expect(brl(1234.56).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });
});

describe("texto de atraso no singular e no plural", () => {
  it("1 dia, 2 dias", async () => {
    const { nomeEstado } = await import("./cobrancas");
    const c = {
      id: "c",
      pid: "p",
      tipo: "viagem" as const,
      ref: "",
      vencimento: "2026-11-09",
      valor: 10,
      pagamentos: [],
    };
    expect(nomeEstado(c, "2026-11-10")).toBe("Atrasada 1 dia");
    expect(nomeEstado(c, "2026-11-11")).toBe("Atrasada 2 dias");
  });
});
