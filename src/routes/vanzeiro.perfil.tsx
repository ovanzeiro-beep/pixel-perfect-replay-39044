import { createFileRoute } from "@tanstack/react-router";
import { PerfilTela } from "@/components/app/PerfilTela";
import { vanzeiro } from "@/data/exemplo";

export const Route = createFileRoute("/vanzeiro/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil · O Vanzeiro" }, { name: "description", content: "Seu perfil de vanzeiro no O Vanzeiro." }, { property: "og:title", content: "Meu perfil · O Vanzeiro" }, { property: "og:description", content: "Seu perfil de vanzeiro no O Vanzeiro." }] }),
  component: () => <PerfilTela nome={vanzeiro.nome} papel={`Vanzeiro · ${vanzeiro.cidade} - ${vanzeiro.estado}`} trocarPara="passageiro" voltar />,
});
