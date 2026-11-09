import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/vanzeiro/gastos")({
  head: () => ({
    meta: [
      { title: "Gastos · O Vanzeiro" },
      { name: "description", content: "Gastos no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Gastos · O Vanzeiro" },
      { property: "og:description", content: "Gastos no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Gastos" voltar />,
});
