import { useState } from "react";
import { Copy, Receipt, Share2 } from "lucide-react";
import { toast } from "sonner";
import { brl, dataBR, textoRecibo, type Recibo } from "@/data/cobrancas";
import { compartilharTexto } from "@/lib/compartilhar";

const numero = (n: number) => String(n).padStart(4, "0");

/** Recibos do passageiro: lista, ver o texto, compartilhar e copiar. */
export function ListaRecibos({
  recibos,
  vanzeiro,
  passageiro,
}: {
  recibos: Recibo[];
  vanzeiro: string;
  passageiro: string;
}) {
  const [aberto, setAberto] = useState<Recibo | null>(null);
  const lista = [...recibos].sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
  const texto = aberto ? textoRecibo(aberto, vanzeiro, passageiro) : "";

  return (
    <section aria-label="Meus recibos">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Meus recibos
      </h2>
      {lista.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-center text-muted-foreground shadow-sm">
          Quando o vanzeiro confirmar um pagamento, o recibo aparece aqui.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((r) => (
            <li key={r.numero}>
              <button
                onClick={() => setAberto(r)}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Recibo nº {numero(r.numero)}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {dataBR(r.data)} · {r.forma === "pix" ? "Pix" : "Dinheiro"} ·{" "}
                    {r.refs.join(", ")}
                  </span>
                </span>
                <span className="font-extrabold text-success">{brl(r.valor)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <div
          role="dialog"
          aria-label={`Recibo nº ${numero(aberto.numero)}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 sm:items-center"
        >
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="flex items-center gap-2 text-xl font-extrabold">
              <Receipt className="h-6 w-6 text-primary" /> Recibo
            </h3>
            <pre className="whitespace-pre-wrap rounded-2xl bg-muted p-4 font-sans text-base">
              {texto}
            </pre>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  const r = await compartilharTexto(texto, `Recibo nº ${numero(aberto.numero)}`);
                  if (r === "whatsapp") toast.success("Abrindo o WhatsApp com o recibo");
                }}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary text-lg font-bold text-primary"
              >
                <Share2 className="h-5 w-5" /> Compartilhar
              </button>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(texto).then(
                    () => toast.success("Recibo copiado"),
                    () => toast.error("Não deu para copiar"),
                  );
                }}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary text-lg font-bold text-primary"
              >
                <Copy className="h-5 w-5" /> Copiar
              </button>
            </div>
            <button
              onClick={() => setAberto(null)}
              className="flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-primary bg-card text-lg font-bold text-primary"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
