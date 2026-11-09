import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, User } from "lucide-react";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Escolha seu perfil · O Vanzeiro" }, { name: "description", content: "Entre como vanzeiro ou passageiro." }, { property: "og:title", content: "Escolha seu perfil · O Vanzeiro" }, { property: "og:description", content: "Entre como vanzeiro ou passageiro." }] }),
  component: () => (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <h1 className="mt-10 text-3xl font-extrabold text-primary">Como você vai usar?</h1>
      <p className="mt-2 text-lg text-muted-foreground">Escolha uma opção para continuar.</p>
      <div className="mt-8 space-y-4">
        <Link to="/vanzeiro" className="flex items-center gap-4 rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Bus className="h-8 w-8" /></span>
          <span><span className="block text-2xl font-extrabold">Sou vanzeiro</span><span className="opacity-80">Tenho van e levo passageiros</span></span>
        </Link>
        <Link to="/passageiro" className="flex items-center gap-4 rounded-3xl border-2 border-primary bg-card p-6 text-primary">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><User className="h-8 w-8" /></span>
          <span><span className="block text-2xl font-extrabold">Sou passageiro</span><span className="text-muted-foreground">Viajo com um vanzeiro</span></span>
        </Link>
      </div>
    </div>
  ),
});
