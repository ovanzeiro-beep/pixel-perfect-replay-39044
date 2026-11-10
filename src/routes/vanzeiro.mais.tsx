import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bus,
  History,
  IdCard,
  MapPinned,
  Receipt,
  User,
  ChevronRight,
  CircleHelp,
} from "lucide-react";

const itens = [
  { to: "/vanzeiro/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/vanzeiro/historico", label: "Histórico de viagens", icon: History },
  { to: "/vanzeiro/vans", label: "Vans", icon: Bus },
  { to: "/vanzeiro/motoristas", label: "Motoristas", icon: IdCard },
  { to: "/vanzeiro/linhas", label: "Linhas", icon: MapPinned },
  { to: "/vanzeiro/gastos", label: "Gastos", icon: Receipt },
  { to: "/vanzeiro/perfil", label: "Meu perfil", icon: User },
  { to: "/vanzeiro/ajuda", label: "Como usar o app", icon: CircleHelp },
] as const;

export const Route = createFileRoute("/vanzeiro/mais")({
  head: () => ({
    meta: [
      { title: "Mais · O Vanzeiro" },
      { name: "description", content: "Vans, motoristas, linhas, gastos e perfil." },
      { property: "og:title", content: "Mais · O Vanzeiro" },
      { property: "og:description", content: "Vans, motoristas, linhas, gastos e perfil." },
    ],
  }),
  component: () => (
    <div className="px-5 pt-6">
      <h1 className="text-3xl font-extrabold text-primary">Mais</h1>
      <ul className="mt-6 space-y-3">
        {itens.map((i) => (
          <li key={i.to}>
            <Link
              to={i.to}
              className="flex min-h-16 items-center gap-4 rounded-2xl bg-card px-4 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <i.icon className="h-6 w-6" />
              </span>
              <span className="flex-1 text-lg font-bold">{i.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  ),
});
