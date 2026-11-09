import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/app/EmConstrucao";

export const Route = createFileRoute("/vanzeiro/passageiros")({
  head: () => ({
    meta: [
      { title: "Passageiros · O Vanzeiro" },
      { name: "description", content: "Passageiros no O Vanzeiro — sua van organizada, sem caderno." },
      { property: "og:title", content: "Passageiros · O Vanzeiro" },
      { property: "og:description", content: "Passageiros no O Vanzeiro — sua van organizada, sem caderno." },
    ],
  }),
  component: () => <EmConstrucao titulo="Passageiros" />,
});
