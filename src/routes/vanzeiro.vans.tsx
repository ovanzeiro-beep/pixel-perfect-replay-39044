import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/vanzeiro/vans")({
  head: () => ({
    meta: [
      { title: "Vans · O Vanzeiro" },
      { name: "description", content: "Vans no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Vans · O Vanzeiro" },
      { property: "og:description", content: "Vans no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Vans" voltar />,
});
