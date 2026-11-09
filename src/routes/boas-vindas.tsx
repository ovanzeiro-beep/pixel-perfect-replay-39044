import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BackupDados } from "@/components/app/BackupDados";
import { LogoIcon } from "@/components/app/Logo";
import { Toaster } from "@/components/ui/sonner";
import { ProtegeArea } from "@/components/app/ProtegeArea";
import { BotaoGrande, Campo, campoClasse } from "@/components/app/Formulario";
import { restaurarExemplo, salvarChavePix, salvarPerfil } from "@/data/repositorio";
import { destinoSeNegado, sessaoAtual } from "@/data/sessao";
import { ESTADOS_BR, validarPerfil } from "@/lib/validacao";

export const Route = createFileRoute("/boas-vindas")({
  head: () => ({
    meta: [
      { title: "Boas-vindas · O Vanzeiro" },
      { name: "description", content: "Conte quem você é para começar a usar o O Vanzeiro." },
      { property: "og:title", content: "Boas-vindas · O Vanzeiro" },
      {
        property: "og:description",
        content: "Conte quem você é para começar a usar o O Vanzeiro.",
      },
    ],
  }),
  beforeLoad: () => {
    const destino = destinoSeNegado("vanzeiro", sessaoAtual());
    if (destino) throw redirect({ to: destino });
  },
  component: () => (
    <ProtegeArea papel="vanzeiro" perfil="pendente">
      <BoasVindas />
    </ProtegeArea>
  ),
});

function BoasVindas() {
  const navigate = useNavigate();
  const [f, setF] = useState({ nome: "", telefone: "", cidade: "", estado: "", pix: "" });
  const [erros, setErros] = useState<ReturnType<typeof validarPerfil>>({});
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const comecar = (e: React.FormEvent) => {
    e.preventDefault();
    const er = validarPerfil(f);
    setErros(er);
    if (Object.keys(er).length) return;
    salvarPerfil({
      nome: f.nome,
      telefone: f.telefone,
      cidade: f.cidade,
      estado: f.estado,
      email: "",
    });
    if (f.pix.trim()) salvarChavePix(f.pix);
    void navigate({ to: "/vanzeiro", replace: true });
  };

  const verExemplo = () => {
    restaurarExemplo();
    void navigate({ to: "/vanzeiro", replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <Toaster position="top-center" />
      <div className="flex flex-col items-center text-center">
        <LogoIcon className="h-20 w-20 drop-shadow-lg" />
        <h1 className="mt-5 text-3xl font-extrabold text-primary">Bem-vindo ao O Vanzeiro</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Conte quem você é para começar. Leva menos de 1 minuto e você pode mudar tudo depois.
        </p>
      </div>

      <form
        onSubmit={comecar}
        noValidate
        className="mt-8 space-y-4 rounded-3xl bg-card p-5 shadow-sm"
      >
        <Campo label="Seu nome" obrigatorio erro={erros.nome}>
          <input
            className={campoClasse}
            autoComplete="name"
            value={f.nome}
            onChange={muda("nome")}
            placeholder="Seu nome completo"
          />
        </Campo>
        <Campo label="Seu celular (com DDD)" obrigatorio erro={erros.telefone}>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={campoClasse}
            value={f.telefone}
            onChange={muda("telefone")}
            placeholder="(43) 99999-9999"
          />
        </Campo>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Campo label="Cidade" obrigatorio erro={erros.cidade}>
              <input className={campoClasse} value={f.cidade} onChange={muda("cidade")} />
            </Campo>
          </div>
          <Campo label="Estado" obrigatorio erro={erros.estado}>
            <select className={campoClasse} value={f.estado} onChange={muda("estado")}>
              <option value="">—</option>
              {ESTADOS_BR.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo label="Chave Pix (opcional)">
          <input
            className={campoClasse}
            value={f.pix}
            onChange={muda("pix")}
            placeholder="CPF, telefone, e-mail ou chave aleatória"
          />
        </Campo>
        <p className="text-sm text-muted-foreground">
          A chave Pix vai junto nas mensagens de cobrança. Dá para preencher depois.
        </p>
        <BotaoGrande type="submit" variante="destaque">
          Começar
        </BotaoGrande>
      </form>

      <BackupDados soRestaurar />

      <button
        onClick={verExemplo}
        className="mt-6 min-h-12 w-full text-center text-base font-semibold text-muted-foreground underline"
      >
        Prefiro ver o app com dados de exemplo
      </button>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Os dados ficam salvos só neste aparelho. Faça backups de vez em quando.
      </p>
    </div>
  );
}
