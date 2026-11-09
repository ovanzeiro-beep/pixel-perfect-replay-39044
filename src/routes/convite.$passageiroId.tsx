import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LinkIcon } from "lucide-react";
import { LogoIcon } from "@/components/app/Logo";
import { entrarComoPassageiro } from "@/data/sessao";
import { useDadosProntos, useFrota } from "@/data/store";
import { conviteValido } from "@/lib/convite";

export const Route = createFileRoute("/convite/$passageiroId")({
  head: () => ({ meta: [{ title: "Convite · O Vanzeiro" }, { name: "description", content: "Aceite o convite para entrar na van." }] }),
  component: EntrarPeloConvite,
});

function EntrarPeloConvite() {
  const { passageiroId } = Route.useParams();
  const { passageiros } = useFrota();
  const prontos = useDadosProntos();
  const navigate = useNavigate();
  const p = passageiros.find((x) => x.id === passageiroId);
  const valido = conviteValido(p);

  useEffect(() => {
    if (!prontos || !valido || !p) return;
    entrarComoPassageiro(p.id);
    void navigate({ to: p.convite === "no_app" ? "/passageiro" : "/passageiro/convite", replace: true });
  }, [prontos, valido, p, navigate]);

  if (!prontos || valido) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><LogoIcon className="h-20 w-20 animate-pulse" /></div>;
  }
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><LinkIcon className="h-8 w-8" /></span>
      <h1 className="mt-6 text-2xl font-extrabold text-primary">Convite não encontrado</h1>
      <p className="mt-3 text-muted-foreground">Este convite pode ter expirado ou ainda não foi enviado. Peça um novo convite ao seu vanzeiro.</p>
      <p className="mt-2 text-sm text-muted-foreground">Versão de teste: os dados ficam salvos só no aparelho do vanzeiro.</p>
      <Link to="/" className="mt-8 flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">Ir para o início</Link>
    </div>
  );
}
