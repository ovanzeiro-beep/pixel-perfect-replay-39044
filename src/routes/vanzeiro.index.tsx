import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/vanzeiro/")({
  head: () => ({
    meta: [
      { title: "Início · O Vanzeiro" },
      { name: "description", content: "Início no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Início · O Vanzeiro" },
      { property: "og:description", content: "Início no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Início" />,
});
