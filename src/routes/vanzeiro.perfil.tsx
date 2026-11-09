import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PerfilTela } from "@/components/app/PerfilTela";
import { Campo, BotaoGrande, campoClasse } from "@/components/app/Formulario";
import { vanzeiro } from "@/data/exemplo";
import { useFrota, salvarChavePix } from "@/data/store";

export const Route = createFileRoute("/vanzeiro/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil · O Vanzeiro" }, { name: "description", content: "Seu perfil de vanzeiro no O Vanzeiro." }, { property: "og:title", content: "Meu perfil · O Vanzeiro" }, { property: "og:description", content: "Seu perfil de vanzeiro no O Vanzeiro." }] }),
  component: PerfilVanzeiro,
});

function PerfilVanzeiro() {
  const { chavePix } = useFrota();
  const [pix, setPix] = useState(chavePix);
  return (
    <PerfilTela nome={vanzeiro.nome} papel={`Vanzeiro · ${vanzeiro.cidade} - ${vanzeiro.estado}`} trocarPara="passageiro" voltar>
      <Toaster position="top-center" />
      <div className="mt-6 space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <Campo label="Chave Pix"><input className={campoClasse} placeholder="CPF, telefone, e-mail ou chave aleatória" value={pix} onChange={(e) => setPix(e.target.value)} /></Campo>
        <p className="text-sm text-muted-foreground">Vai junto nas mensagens de cobrança.</p>
        <BotaoGrande onClick={() => { salvarChavePix(pix); toast.success(pix.trim() ? "Chave Pix salva" : "Chave Pix removida"); }}>Salvar chave Pix</BotaoGrande>
      </div>
    </PerfilTela>
  );
}
