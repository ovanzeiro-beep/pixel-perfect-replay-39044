import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AjudaApp } from "@/components/app/AjudaApp";
import { AJUDA_PASSAGEIRO } from "@/data/ajuda";

export const Route = createFileRoute("/passageiro/ajuda")({
  head: () => ({
    meta: [
      { title: "Como usar · O Vanzeiro" },
      {
        name: "description",
        content: "Passo a passo para responder viagens, pagar e instalar o app.",
      },
      { property: "og:title", content: "Como usar · O Vanzeiro" },
      {
        property: "og:description",
        content: "Passo a passo para responder viagens, pagar e instalar o app.",
      },
    ],
  }),
  component: () => (
    <div className="px-5 pt-6">
      <Link
        to="/passageiro/perfil"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-base font-semibold text-primary"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </Link>
      <h1 className="text-3xl font-extrabold text-primary">Como usar</h1>
      <p className="mt-1 text-base text-muted-foreground">
        Toque num assunto para ver o passo a passo.
      </p>
      <AjudaApp topicos={AJUDA_PASSAGEIRO} />
    </div>
  ),
});
