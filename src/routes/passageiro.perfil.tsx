import { createFileRoute } from "@tanstack/react-router";
import { PerfilTela } from "@/components/app/PerfilTela";
import { passageiros, passageiroAtualId } from "@/data/exemplo";

export const Route = createFileRoute("/passageiro/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil · O Vanzeiro" }, { name: "description", content: "Seu perfil de passageiro no O Vanzeiro." }, { property: "og:title", content: "Meu perfil · O Vanzeiro" }, { property: "og:description", content: "Seu perfil de passageiro no O Vanzeiro." }] }),
  component: () => {
    const p = passageiros.find((x) => x.id === passageiroAtualId)!;
    return <PerfilTela nome={p.nome} papel={`Passageiro · ${p.cidade} - PR`} trocarPara="vanzeiro" />;
  },
});
