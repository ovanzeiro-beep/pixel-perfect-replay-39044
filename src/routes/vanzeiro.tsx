import { createFileRoute, redirect } from "@tanstack/react-router";
import { Home, Route as RouteIcon, Users, Wallet, Menu } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ProtegeArea } from "@/components/app/ProtegeArea";
import { destinoSeNegado, sessaoAtual } from "@/data/sessao";

export const Route = createFileRoute("/vanzeiro")({
  beforeLoad: () => {
    const destino = destinoSeNegado("vanzeiro", sessaoAtual());
    if (destino) throw redirect({ to: destino });
  },
  component: () => (
    <ProtegeArea papel="vanzeiro">
    <AppShell
      items={[
        { to: "/vanzeiro", label: "Início", icon: Home, exact: true },
        { to: "/vanzeiro/viagens", label: "Viagens", icon: RouteIcon },
        { to: "/vanzeiro/passageiros", label: "Passageiros", icon: Users },
        { to: "/vanzeiro/dinheiro", label: "Dinheiro", icon: Wallet },
        { to: "/vanzeiro/mais", label: "Mais", icon: Menu },
      ]}
    />
    </ProtegeArea>
  ),
});
