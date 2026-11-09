import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/passageiro/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos · O Vanzeiro" },
      { name: "description", content: "Pagamentos no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Pagamentos · O Vanzeiro" },
      { property: "og:description", content: "Pagamentos no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Pagamentos" />,
});
