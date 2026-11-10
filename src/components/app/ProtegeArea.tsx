import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LogoIcon } from "./Logo";
import { useDadosProntos, usePassageiroVisao, useVanzeiro } from "@/data/repositorio";
import { destinoSeNegado, encerrarSessao, useSessao, type Papel } from "@/data/sessao";

function Carregando() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <LogoIcon className="h-20 w-20 animate-pulse" />
    </div>
  );
}

/**
 * Só mostra a área para quem entrou com o papel certo. Quem não pode vai para o lugar certo.
 * `perfil` (só para o vanzeiro): "exigido" manda para as boas-vindas quem ainda não preencheu os próprios dados;
 * "pendente" faz o contrário (a tela de boas-vindas não abre para quem já preencheu).
 */
export function ProtegeArea({
  papel,
  perfil: modoPerfil,
  children,
}: {
  papel: Papel;
  perfil?: "exigido" | "pendente";
  children: ReactNode;
}) {
  const sessao = useSessao();
  const prontos = useDadosProntos();
  const perfil = useVanzeiro();
  const { eu } = usePassageiroVisao(sessao?.papel === "passageiro" ? sessao.passageiroId : "");
  const navigate = useNavigate();
  const negado = destinoSeNegado(papel, sessao);
  const passageiroSumiu = prontos && sessao?.papel === "passageiro" && !(eu && eu.ativo);

  const precisaConfigurar =
    prontos && !negado && papel === "vanzeiro" && modoPerfil === "exigido" && !perfil.configurado;
  const jaConfigurado =
    prontos && !negado && papel === "vanzeiro" && modoPerfil === "pendente" && perfil.configurado;

  useEffect(() => {
    if (negado) void navigate({ to: negado, replace: true });
  }, [negado, navigate]);

  useEffect(() => {
    if (precisaConfigurar) void navigate({ to: "/boas-vindas", replace: true });
    else if (jaConfigurado) void navigate({ to: "/vanzeiro", replace: true });
  }, [precisaConfigurar, jaConfigurado, navigate]);

  useEffect(() => {
    if (passageiroSumiu) encerrarSessao();
  }, [passageiroSumiu]);

  if (
    sessao === undefined ||
    !prontos ||
    negado ||
    passageiroSumiu ||
    precisaConfigurar ||
    jaConfigurado
  )
    return <Carregando />;
  return <>{children}</>;
}
