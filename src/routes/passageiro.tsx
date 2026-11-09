import { createFileRoute } from "@tanstack/react-router";
import { Home, Route as RouteIcon, Wallet, User } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/passageiro")({
  component: () => (
    <AppShell
      items={[
        { to: "/passageiro", label: "Início", icon: Home, exact: true },
        { to: "/passageiro/viagens", label: "Minhas viagens", icon: RouteIcon },
        { to: "/passageiro/pagamentos", label: "Pagamentos", icon: Wallet },
        { to: "/passageiro/perfil", label: "Meu perfil", icon: User },
      ]}
    />
  ),
});
