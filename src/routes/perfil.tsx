import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bus, ChevronRight, User } from "lucide-react";
import { Logo } from "@/components/app/Logo";
import { useFrota, type Passageiro } from "@/data/store";
import { entrarComoPassageiro, entrarComoVanzeiro } from "@/data/sessao";

function PickerPassageiro({
  candidatos,
  onEscolher,
  onVoltar,
}: {
  candidatos: Passageiro[];
  onEscolher: (p: Passageiro) => void;
  onVoltar: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <button onClick={onVoltar} className="mb-6 flex items-center gap-2 font-bold text-primary">
        <ArrowLeft className="h-5 w-5" /> Voltar
      </button>
      <h1 className="text-3xl font-extrabold text-primary">Qual é o seu nome?</h1>
      <p className="mt-2 text-muted-foreground">Encontre seu nome na lista de passageiros.</p>
      <ul className="mt-6 space-y-3">
        {candidatos.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => onEscolher(p)}
              className="flex w-full min-h-16 items-center gap-4 rounded-2xl bg-card px-4 shadow-sm text-left"
            >
              <span className="flex-1">
                <span className="block text-lg font-bold">{p.nome}</span>
                <span className="text-sm text-muted-foreground">{p.cidade}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
      {candidatos.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          Nenhum passageiro com convite encontrado.
        </p>
      )}
    </div>
  );
}

function PerfilPage() {
  const [verPassageiros, setVerPassageiros] = useState(false);
  const { passageiros } = useFrota();
  const navigate = useNavigate();

  const candidatos = passageiros.filter((p) => p.ativo && p.convite !== "nao_enviado");

  const escolher = (p: Passageiro) => {
    entrarComoPassageiro(p.id);
    void navigate({ to: p.convite === "enviado" ? "/passageiro/convite" : "/passageiro" });
  };

  if (verPassageiros) {
    return (
      <PickerPassageiro
        candidatos={candidatos}
        onEscolher={escolher}
        onVoltar={() => setVerPassageiros(false)}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <h1 className="mt-10 text-3xl font-extrabold text-primary">Como você vai usar?</h1>
      <p className="mt-2 text-lg text-muted-foreground">Escolha uma opção para continuar.</p>
      <div className="mt-8 space-y-4">
        <button
          onClick={() => {
            entrarComoVanzeiro();
            void navigate({ to: "/vanzeiro" });
          }}
          className="flex w-full items-center gap-4 rounded-3xl bg-primary p-6 text-left text-primary-foreground shadow-lg"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Bus className="h-8 w-8" />
          </span>
          <span>
            <span className="block text-2xl font-extrabold">Sou vanzeiro</span>
            <span className="opacity-80">Tenho van e levo passageiros</span>
          </span>
        </button>
        <button
          onClick={() => setVerPassageiros(true)}
          className="flex w-full items-center gap-4 rounded-3xl border-2 border-primary bg-card p-6 text-primary"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <User className="h-8 w-8" />
          </span>
          <span className="text-left">
            <span className="block text-2xl font-extrabold">Sou passageiro</span>
            <span className="text-muted-foreground">Viajo com um vanzeiro</span>
          </span>
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Escolha seu perfil · O Vanzeiro" },
      { name: "description", content: "Entre como vanzeiro ou passageiro." },
      { property: "og:title", content: "Escolha seu perfil · O Vanzeiro" },
      { property: "og:description", content: "Entre como vanzeiro ou passageiro." },
    ],
  }),
  component: PerfilPage,
});
