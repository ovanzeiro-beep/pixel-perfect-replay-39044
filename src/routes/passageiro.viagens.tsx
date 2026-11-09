import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/passageiro/viagens")({
  head: () => ({
    meta: [
      { title: "Minhas viagens · O Vanzeiro" },
      { name: "description", content: "Minhas viagens no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Minhas viagens · O Vanzeiro" },
      { property: "og:description", content: "Minhas viagens no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Minhas viagens" />,
});
