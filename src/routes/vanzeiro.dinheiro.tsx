import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/vanzeiro/dinheiro")({
  head: () => ({
    meta: [
      { title: "Dinheiro · O Vanzeiro" },
      { name: "description", content: "Dinheiro no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Dinheiro · O Vanzeiro" },
      { property: "og:description", content: "Dinheiro no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Dinheiro" />,
});
