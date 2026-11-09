import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Rocket } from "lucide-react";
import { useBackupMeta } from "@/data/backup";
import { guiaVisivel, ID_GUIA, passosIniciais } from "@/data/primeirosPassos";
import { dispensarAlerta, useFrota } from "@/data/repositorio";

/** Guia para quem acabou de começar: o que cadastrar primeiro. Some sozinho quando o essencial está pronto. */
export function PrimeirosPassos() {
  const e = useFrota();
  const backup = useBackupMeta();
  const passos = passosIniciais(e, backup);
  const escondido = e.alertasDispensados[ID_GUIA] !== undefined;
  if (!guiaVisivel(passos, escondido)) return null;
  const feitos = passos.filter((p) => p.feito).length;
  const proximo = passos.find((p) => !p.feito);

  return (
    <section
      aria-label="Primeiros passos"
      className="rounded-3xl border-4 border-accent bg-card p-5 shadow-lg"
    >
      <h2 className="flex items-center gap-2 text-xl font-extrabold text-primary">
        <Rocket className="h-6 w-6 text-accent-strong" /> Primeiros passos
      </h2>
      <p className="mt-1 text-base text-muted-foreground">
        {feitos} de {passos.length} feitos. Siga a ordem e em poucos minutos seu app está pronto.
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={passos.length}
        aria-valuenow={feitos}
        className="mt-3 h-3 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${(feitos / passos.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 space-y-2">
        {passos.map((p, i) => (
          <li key={p.id}>
            <Link
              to={p.destino}
              className={`flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2 ${p.feito ? "bg-success/10" : p === proximo ? "bg-accent/20 ring-2 ring-accent" : "bg-muted/60"}`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${p.feito ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}
              >
                {p.feito ? <Check className="h-5 w-5" aria-label="Feito" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block font-bold ${p.feito ? "text-muted-foreground line-through" : ""}`}
                >
                  {p.titulo}
                </span>
                {!p.feito && (
                  <span className="block text-sm text-muted-foreground">{p.descricao}</span>
                )}
              </span>
              {!p.feito && <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />}
            </Link>
          </li>
        ))}
      </ol>
      <button
        onClick={() => dispensarAlerta(ID_GUIA, "escondido")}
        className="mt-3 min-h-11 w-full text-center text-sm font-semibold text-muted-foreground underline"
      >
        Esconder este guia
      </button>
    </section>
  );
}
