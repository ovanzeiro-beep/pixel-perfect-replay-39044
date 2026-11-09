import { createFileRoute, redirect } from "@tanstack/react-router";
import { Home, Route as RouteIcon, Wallet, User } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ProtegeArea } from "@/components/app/ProtegeArea";
import { destinoSeNegado, sessaoAtual } from "@/data/sessao";

export const Route = createFileRoute("/passageiro")({
  beforeLoad: () => {
    const destino = destinoSeNegado("passageiro", sessaoAtual());
    if (destino) throw redirect({ to: destino });
  },
  component: () => (
    <ProtegeArea papel="passageiro">
      <AppShell
        items={[
          { to: "/passageiro", label: "Início", icon: Home, exact: true },
          { to: "/passageiro/viagens", label: "Minhas viagens", icon: RouteIcon },
          { to: "/passageiro/pagamentos", label: "Pagamentos", icon: Wallet },
          { to: "/passageiro/perfil", label: "Meu perfil", icon: User },
        ]}
      />
    </ProtegeArea>
  ),
});
