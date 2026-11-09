import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/vanzeiro/linhas")({
  head: () => ({
    meta: [
      { title: "Linhas · O Vanzeiro" },
      { name: "description", content: "Linhas no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Linhas · O Vanzeiro" },
      { property: "og:description", content: "Linhas no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Linhas" voltar />,
});
