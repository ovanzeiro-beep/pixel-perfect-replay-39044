import { Link } from "@tanstack/react-router";
import { ArrowLeft, HardHat } from "lucide-react";

export function EmConstrucao({ titulo, voltar }: { titulo: string; voltar?: boolean }) {
  return (
    <div className="px-5 pt-6">
      {voltar && (
        <Link
          to="/vanzeiro/mais"
          className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-primary"
        >
          <ArrowLeft className="h-5 w-5" /> Voltar
        </Link>
      )}
      <h1 className="text-3xl font-extrabold text-primary">{titulo}</h1>
      <div className="mt-8 rounded-3xl border-2 border-dashed border-accent bg-accent/10 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <HardHat className="h-8 w-8" />
        </div>
        <p className="text-xl font-bold text-foreground">Em construção</p>
        <p className="mt-2 text-base text-muted-foreground">
          Esta tela está sendo preparada e chega nas próximas etapas.
        </p>
      </div>
    </div>
  );
}
