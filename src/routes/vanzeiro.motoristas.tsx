import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/vanzeiro/motoristas")({
  head: () => ({
    meta: [
      { title: "Motoristas · O Vanzeiro" },
      { name: "description", content: "Motoristas no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Motoristas · O Vanzeiro" },
      { property: "og:description", content: "Motoristas no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Motoristas" voltar />,
});
