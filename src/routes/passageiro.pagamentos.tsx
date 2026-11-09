import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useFrota, useVanzeiro } from "@/data/repositorio";
import { usePassageiroId } from "@/data/sessao";
import { ListaRecibos } from "@/components/app/ListaRecibos";
import { AvisosPassageiro } from "@/components/app/AvisosPassageiro";
import { brl, dataBR, estadoCob, nomeEstado, aberto, isoDe } from "@/data/cobrancas";
import { linkWhatsApp } from "@/lib/validacao";

const COR_STATUS: Record<string, string> = {
  paga: "bg-success/15 text-success",
  cancelada: "bg-muted text-muted-foreground",
  atrasada: "bg-destructive/15 text-destructive",
  vence_logo: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  a_vencer: "bg-primary/10 text-primary",
};

function Pagamentos() {
  const vanzeiro = useVanzeiro();
  const { passageiros, cobrancas, recibos, chavePix } = useFrota();
  const passageiroId = usePassageiroId();
  const p = passageiros.find((x) => x.id === passageiroId);
  const hoje = isoDe(new Date());
  if (!p) return null;

  const minhasCobs = cobrancas
    .filter((c) => c.pid === p.id && !c.cancelada)
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));

  const totalAberto = minhasCobs.reduce((s, c) => s + aberto(c), 0);
  const proxima = [...minhasCobs]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .find((c) => aberto(c) > 0);

  const pix = chavePix || "(Pix não configurado pelo vanzeiro)";

  const copiarPix = () => {
    if (!chavePix) {
      toast.error("Pix ainda não configurado.");
      return;
    }
    navigator.clipboard?.writeText(chavePix).then(() => toast.success("Pix copiado!"));
  };

  const avisarPagou = () => {
    const valor = totalAberto > 0 ? brl(totalAberto) : "o valor combinado";
    const refs =
      minhasCobs
        .filter((c) => aberto(c) > 0)
        .map((c) => c.ref)
        .join(", ") || "viagem";
    const msg = `Olá, ${vanzeiro.nome}! Sou ${p.nome}. Acabei de fazer o pagamento de ${valor} referente a ${refs}. Por favor, confirme quando puder! 🙏`;
    const url = `${linkWhatsApp(vanzeiro.telefone)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="px-5 pb-6 pt-6 space-y-5">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-extrabold text-primary">Pagamentos</h1>
      <AvisosPassageiro />

      <div className="rounded-3xl bg-card p-5 shadow-sm space-y-4">
        {totalAberto > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">Total em aberto</span>
              <span className="text-2xl font-extrabold text-destructive">{brl(totalAberto)}</span>
            </div>
            {proxima && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Próximo vencimento</span>
                <span className="font-bold">
                  {dataBR(proxima.vencimento)} · {proxima.ref}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-success" />
            <div>
              <p className="font-extrabold text-success">Em dia!</p>
              <p className="text-sm text-muted-foreground">Nenhuma cobrança em aberto.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pagamento</span>
          <span className="font-bold">
            {p.formaPagamento === "por_viagem"
              ? `${brl(p.valor)} por viagem`
              : p.formaPagamento === "semanal"
                ? `${brl(p.valor)} por semana`
                : `${brl(p.valor)} por mês`}
          </span>
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={copiarPix}
            className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-primary/10 font-bold text-primary"
          >
            <Copy className="h-4 w-4" /> Copiar chave Pix
          </button>
          {totalAberto > 0 && (
            <button
              onClick={avisarPagou}
              className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-success font-bold text-success"
            >
              <MessageCircle className="h-4 w-4" /> Avisar que paguei
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Chave Pix: <span className="font-mono">{pix}</span>
        </p>
      </div>

      <ListaRecibos
        recibos={recibos.filter((r) => r.pid === p.id)}
        vanzeiro={vanzeiro.nome}
        passageiro={p.nome}
      />

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Histórico
        </h2>
        {minhasCobs.length === 0 ? (
          <p className="text-center text-muted-foreground">Nenhuma cobrança ainda.</p>
        ) : (
          <div className="space-y-2">
            {minhasCobs.map((c) => {
              const estado = estadoCob(c, hoje);
              const ab = aberto(c);
              return (
                <div key={c.id} className="rounded-2xl bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{c.ref}</p>
                      <p className="text-sm text-muted-foreground">
                        Venc. {dataBR(c.vencimento)} · {brl(c.valor)}
                      </p>
                      {c.pagamentos.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Pago: {brl(c.pagamentos.reduce((s, pg) => s + pg.valor, 0))} em{" "}
                          {dataBR(c.pagamentos[c.pagamentos.length - 1]!.data)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${COR_STATUS[estado] ?? ""}`}
                    >
                      {nomeEstado(c, hoje)}
                    </span>
                  </div>
                  {ab > 0 && ab < c.valor && (
                    <p className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                      Falta: {brl(ab)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export const Route = createFileRoute("/passageiro/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos · O Vanzeiro" },
      { name: "description", content: "Pagamentos no O Vanzeiro." },
      { property: "og:title", content: "Pagamentos · O Vanzeiro" },
      { property: "og:description", content: "Pagamentos no O Vanzeiro." },
    ],
  }),
  component: Pagamentos,
});
