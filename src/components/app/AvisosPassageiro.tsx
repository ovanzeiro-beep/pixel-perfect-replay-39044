import { Link } from "@tanstack/react-router";
import { AlertTriangle, BellRing, Info } from "lucide-react";
import { gerarAvisosPassageiro, type Nivel } from "@/data/alertas";
import { usePassageiroId } from "@/data/sessao";
import { useFrota, useViagens } from "@/data/repositorio";

const COR: Record<Nivel, string> = {
  urgente: "border-destructive/40 bg-destructive/10",
  atencao: "border-accent/60 bg-accent/15",
  info: "border-primary/20 bg-primary/5",
};

/** Avisos do passageiro (pagamento atrasado, prazo para responder, viagem cancelada). Some quando está tudo em dia. */
export function AvisosPassageiro() {
  const { cobrancas } = useFrota();
  const viagens = useViagens();
  const pid = usePassageiroId();
  const avisos = gerarAvisosPassageiro({ pid, cobrancas, viagens, agora: new Date() });
  if (avisos.length === 0) return null;
  return (
    <section aria-label="Avisos" className="space-y-2">
      {avisos.map((a) => {
        const I =
          a.nivel === "info" ? Info : a.id.startsWith("responder") ? BellRing : AlertTriangle;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-2xl border-2 p-4 ${COR[a.nivel]}`}
          >
            <I className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold leading-snug">{a.titulo}</p>
              <p className="text-sm text-muted-foreground">{a.detalhe}</p>
              {a.destino && a.acao && (
                <Link
                  to={a.destino}
                  className="mt-1 inline-flex min-h-11 items-center font-extrabold underline"
                >
                  {a.acao}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
