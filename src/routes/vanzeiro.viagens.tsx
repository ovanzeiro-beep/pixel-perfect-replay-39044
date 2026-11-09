import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/vanzeiro/viagens")({
  head: () => ({
    meta: [
      { title: "Viagens · O Vanzeiro" },
      { name: "description", content: "Viagens no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Viagens · O Vanzeiro" },
      { property: "og:description", content: "Viagens no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Viagens" />,
});
