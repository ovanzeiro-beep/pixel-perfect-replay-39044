import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PerfilTela } from "@/components/app/PerfilTela";
import { Campo, BotaoGrande, campoClasse } from "@/components/app/Formulario";
import { vanzeiro } from "@/data/exemplo";
import { useFrota, salvarChavePix, restaurarExemplo } from "@/data/store";
import { definirModoDemo, useModoDemo } from "@/lib/modoDemo";

export const Route = createFileRoute("/vanzeiro/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil · O Vanzeiro" }, { name: "description", content: "Seu perfil de vanzeiro no O Vanzeiro." }, { property: "og:title", content: "Meu perfil · O Vanzeiro" }, { property: "og:description", content: "Seu perfil de vanzeiro no O Vanzeiro." }] }),
  component: PerfilVanzeiro,
});

function PerfilVanzeiro() {
  const { chavePix } = useFrota();
  const [pix, setPix] = useState(chavePix);
  const [confirmando, setConfirmando] = useState(false);
  const modoDemo = useModoDemo();
  useEffect(() => setPix(chavePix), [chavePix]);
  return (
    <PerfilTela nome={vanzeiro.nome} papel={`Vanzeiro · ${vanzeiro.cidade} - ${vanzeiro.estado}`} voltar>
      <Toaster position="top-center" />
      <div className="mt-6 space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <Campo label="Chave Pix"><input className={campoClasse} placeholder="CPF, telefone, e-mail ou chave aleatória" value={pix} onChange={(e) => setPix(e.target.value)} /></Campo>
        <p className="text-sm text-muted-foreground">Vai junto nas mensagens de cobrança.</p>
        <BotaoGrande onClick={() => { salvarChavePix(pix); toast.success(pix.trim() ? "Chave Pix salva" : "Chave Pix removida"); }}>Salvar chave Pix</BotaoGrande>
      </div>
      <div className="mt-4 space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-primary">Dados de teste</h2>
        <p className="text-sm text-muted-foreground">Tudo o que você cadastra fica salvo neste aparelho. Se quiser recomeçar, volte aos dados de exemplo.</p>
        <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-4">
          <span><span className="block font-bold">Modo demonstração</span><span className="text-sm text-muted-foreground">Mostra atalhos que simulam respostas dos passageiros</span></span>
          <input type="checkbox" role="switch" checked={modoDemo} onChange={(e) => definirModoDemo(e.target.checked)} className="h-6 w-6 shrink-0 accent-[var(--color-primary)]" />
        </label>
        {confirmando ? (
          <>
            <p className="text-base font-bold text-destructive">Isso apaga o que você cadastrou neste aparelho. Continuar?</p>
            <BotaoGrande variante="perigo" onClick={() => { restaurarExemplo(); setPix(""); setConfirmando(false); toast.success("Dados de exemplo restaurados"); }}>Sim, restaurar exemplo</BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => setConfirmando(false)}>Cancelar</BotaoGrande>
          </>
        ) : (
          <BotaoGrande variante="contorno" onClick={() => setConfirmando(true)}>Restaurar dados de exemplo</BotaoGrande>
        )}
      </div>
    </PerfilTela>
  );
}
