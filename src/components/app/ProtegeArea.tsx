import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LogoIcon } from "./Logo";
import { useDadosProntos, useFrota } from "@/data/repositorio";
import { destinoSeNegado, encerrarSessao, useSessao, type Papel } from "@/data/sessao";

function Carregando() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <LogoIcon className="h-20 w-20 animate-pulse" />
    </div>
  );
}

/** Só mostra a área para quem entrou com o papel certo. Quem não pode vai para o lugar certo. */
export function ProtegeArea({ papel, children }: { papel: Papel; children: ReactNode }) {
  const sessao = useSessao();
  const prontos = useDadosProntos();
  const { passageiros } = useFrota();
  const navigate = useNavigate();
  const negado = destinoSeNegado(papel, sessao);
  const passageiroSumiu =
    prontos &&
    sessao?.papel === "passageiro" &&
    !passageiros.some((p) => p.id === sessao.passageiroId && p.ativo);

  useEffect(() => {
    if (negado) void navigate({ to: negado, replace: true });
  }, [negado, navigate]);

  useEffect(() => {
    if (passageiroSumiu) encerrarSessao();
  }, [passageiroSumiu]);

  if (sessao === undefined || !prontos || negado || passageiroSumiu) return <Carregando />;
  return <>{children}</>;
}
