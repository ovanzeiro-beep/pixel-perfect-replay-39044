import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useNaoSalvou } from "@/data/gravacao";
import { useSessao } from "@/data/sessao";

/** Aparece quando este aparelho não consegue guardar os dados (armazenamento cheio ou bloqueado). */
export function AvisoNaoSalvou() {
  const naoSalvou = useNaoSalvou();
  const sessao = useSessao();
  if (!naoSalvou) return null;
  return (
    <div
      role="alert"
      className="rounded-2xl border-2 border-destructive bg-card p-4 text-foreground shadow-lg"
    >
      <p className="flex items-center gap-2 font-extrabold text-destructive">
        <TriangleAlert className="h-5 w-5 shrink-0" /> Seus dados não estão sendo salvos
      </p>
      <p className="mt-1 text-sm">
        Este aparelho não está conseguindo guardar as informações do app (pouco espaço ou navegação
        privada). O que você fizer pode se perder ao fechar.
      </p>
      {sessao?.papel === "vanzeiro" && (
        <Link
          to="/vanzeiro/perfil"
          className="mt-2 inline-flex min-h-11 items-center font-extrabold text-primary underline"
        >
          Fazer um backup agora
        </Link>
      )}
    </div>
  );
}
