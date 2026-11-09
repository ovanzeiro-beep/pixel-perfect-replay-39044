import { Link, useNavigate } from "@tanstack/react-router";
import { encerrarSessao } from "@/data/sessao";
import { InstalarApp } from "@/components/app/InstalarApp";
import type { ReactNode } from "react";
import { ArrowLeft, Repeat } from "lucide-react";

export function PerfilTela({ nome, papel, voltar, children }: { nome: string; papel: string; voltar?: boolean; children?: ReactNode }) {
  const navigate = useNavigate();
  const sair = () => { encerrarSessao(); void navigate({ to: "/", replace: true }); };
  return (
    <div className="px-5 pt-6">
      {voltar && (
        <Link to="/vanzeiro/mais" className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-primary">
          <ArrowLeft className="h-5 w-5" /> Voltar
        </Link>
      )}
      <h1 className="text-3xl font-extrabold text-primary">Meu perfil</h1>
      <div className="mt-6 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground">
          {nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div>
          <p className="text-xl font-bold">{nome}</p>
          <p className="text-muted-foreground">{papel}</p>
        </div>
      </div>
      {children}
      <div className="mt-6"><InstalarApp claro lembrar={false} /></div>
      <div className="mt-6 rounded-3xl border-2 border-dashed border-accent bg-accent/10 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-accent-strong">Modo de teste</p>
        <Link
          to="/perfil"
          className="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-lg font-bold text-accent-foreground"
        >
          <Repeat className="h-5 w-5" /> Trocar de perfil
        </Link>
      </div>
      <button onClick={sair} className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-primary text-lg font-bold text-primary">
        Sair
      </button>
    </div>
  );
}
