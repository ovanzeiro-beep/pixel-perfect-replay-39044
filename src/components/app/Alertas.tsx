import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BellRing,
  ChevronDown,
  CreditCard,
  IdCard,
  Info,
  Save,
  X,
} from "lucide-react";
import type { Alerta, Nivel, TipoAlerta } from "@/data/alertas";
import { dispensarAlerta, restaurarAlertas } from "@/data/repositorio";
import { useAlertas } from "@/data/useAlertas";

const ICONE: Record<TipoAlerta, typeof AlertTriangle> = {
  cnh: IdCard,
  cobranca: CreditCard,
  confirmacao: BellRing,
  lotacao: Info,
  backup: Save,
};
const COR: Record<Nivel, { caixa: string; icone: string; botao: string }> = {
  urgente: {
    caixa: "border-destructive/40 bg-destructive/10",
    icone: "bg-destructive text-destructive-foreground",
    botao: "text-destructive",
  },
  atencao: {
    caixa: "border-accent/60 bg-accent/15",
    icone: "bg-accent text-accent-foreground",
    botao: "text-accent-strong",
  },
  info: {
    caixa: "border-primary/20 bg-primary/5",
    icone: "bg-primary/15 text-primary",
    botao: "text-primary",
  },
};

function Cartao({ a }: { a: Alerta }) {
  const I = ICONE[a.tipo];
  const c = COR[a.nivel];
  return (
    <li className={`rounded-2xl border-2 p-4 ${c.caixa}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.icone}`}
        >
          <I className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold leading-snug">{a.titulo}</p>
          <p className="mt-0.5 text-base text-muted-foreground">{a.detalhe}</p>
          <Link
            to={a.destino.to}
            {...(a.destino.search ? { search: a.destino.search } : {})}
            className={`mt-2 inline-flex min-h-11 items-center text-base font-extrabold underline ${c.botao}`}
          >
            {a.acao}
          </Link>
        </div>
        <button
          onClick={() => dispensarAlerta(a.id, a.assinatura)}
          aria-label={`Dispensar alerta: ${a.titulo}`}
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </li>
  );
}

const LIMITE_VISIVEL = 3;

/** Lista de alertas do vanzeiro. Não mostra nada quando está tudo em dia. */
export function Alertas() {
  const { alertas, dispensados } = useAlertas();
  const [todos, setTodos] = useState(false);
  // Os urgentes (vêm primeiro na lista) nunca ficam escondidos.
  const limite = Math.max(LIMITE_VISIVEL, alertas.filter((x) => x.nivel === "urgente").length);
  const visiveis = todos ? alertas : alertas.slice(0, limite);
  const escondidos = alertas.length - visiveis.length;
  if (alertas.length === 0 && dispensados === 0) return null;
  return (
    <section aria-label="Alertas" className="space-y-2">
      {alertas.length > 0 && (
        <ul className="space-y-2">
          {visiveis.map((a) => (
            <Cartao key={a.id} a={a} />
          ))}
        </ul>
      )}
      {escondidos > 0 && (
        <button
          onClick={() => setTodos(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary font-bold text-primary"
        >
          <ChevronDown className="h-5 w-5" />
          {escondidos === 1 ? "Ver mais 1 alerta" : `Ver mais ${escondidos} alertas`}
        </button>
      )}
      {dispensados > 0 && (
        <button
          onClick={restaurarAlertas}
          className="min-h-11 w-full text-center text-sm font-semibold text-muted-foreground underline"
        >
          {dispensados === 1 ? "1 alerta dispensado" : `${dispensados} alertas dispensados`} ·
          mostrar de novo
        </button>
      )}
    </section>
  );
}
