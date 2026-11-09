import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useFrota, aceitarConvite, useVanzeiro } from "@/data/repositorio";
import { usePassageiroId } from "@/data/sessao";

function TelaConvite() {
  const vanzeiro = useVanzeiro();
  const { passageiros } = useFrota();
  const passageiroId = usePassageiroId();
  const navigate = useNavigate();
  const p = passageiros.find((x) => x.id === passageiroId);
  const [step, setStep] = useState<"convite" | "verificar" | "confirmado">("convite");

  const convite = p?.convite;
  useEffect(() => {
    if (convite === "no_app") void navigate({ to: "/passageiro" });
  }, [convite, navigate]);

  if (!p) return null;

  const confirmar = () => {
    aceitarConvite(p.id);
    setStep("confirmado");
    setTimeout(() => void navigate({ to: "/passageiro" }), 1800);
  };

  if (step === "confirmado") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-8">
        <CheckCircle2 className="h-20 w-20 text-success" />
        <h1 className="mt-6 text-center text-2xl font-extrabold text-primary">Bem-vindo(a)!</h1>
        <p className="mt-2 text-center text-muted-foreground">Entrando no app…</p>
      </div>
    );
  }

  if (step === "verificar") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex-1 overflow-y-auto px-6 py-10">
          <h1 className="text-3xl font-extrabold text-primary">Confirme seus dados</h1>
          <p className="mt-2 text-muted-foreground">Verifique se estas informações são suas.</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Nome
              </p>
              <p className="mt-1 text-xl font-bold">{p.nome}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Telefone
              </p>
              <p className="mt-1 text-xl font-bold">{p.telefone}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Cidade
              </p>
              <p className="mt-1 text-xl font-bold">{p.cidade}</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Se esses dados não são seus, fale com {vanzeiro.nome} para verificar o convite.
          </p>
        </div>
        <div className="border-t bg-card px-6 py-4 space-y-3">
          <button
            onClick={confirmar}
            className="flex w-full min-h-14 items-center justify-center rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground"
          >
            Sim, sou eu — Entrar
          </button>
          <button
            onClick={() => setStep("convite")}
            className="flex w-full min-h-12 items-center justify-center rounded-2xl border-2 border-muted text-muted-foreground font-bold"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-4xl font-extrabold text-primary-foreground">
        {vanzeiro.nome.charAt(0)}
      </div>
      <h1 className="mt-6 text-center text-2xl font-extrabold text-primary">
        {vanzeiro.nome} convidou você para a van dele
      </h1>
      <p className="mt-3 text-center text-muted-foreground">
        Acesse o app para ver suas viagens, confirmar presença e acompanhar pagamentos.
      </p>
      <div className="mt-10 w-full space-y-4">
        <button
          onClick={() => setStep("verificar")}
          className="flex w-full min-h-14 items-center justify-center gap-3 rounded-2xl border-2 border-[#4285F4] bg-white px-6 text-lg font-bold text-[#3c4043] shadow-sm"
        >
          <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Entrar com Google
        </button>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Versão de teste — o login ainda é simulado.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/passageiro/convite")({
  head: () => ({
    meta: [
      { title: "Convite · O Vanzeiro" },
      { name: "description", content: "Aceite o convite para entrar na van." },
    ],
  }),
  component: TelaConvite,
});
