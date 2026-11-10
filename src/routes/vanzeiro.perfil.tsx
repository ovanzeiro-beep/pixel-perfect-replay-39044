import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PerfilTela } from "@/components/app/PerfilTela";
import { Campo, BotaoGrande, campoClasse } from "@/components/app/Formulario";
import {
  useFrota,
  salvarChavePix,
  restaurarExemplo,
  comecarDoZero,
  obterEstado,
  useVanzeiro,
} from "@/data/repositorio";
import { BackupDados } from "@/components/app/BackupDados";
import { DadosDoVanzeiro } from "@/components/app/DadosDoVanzeiro";
import { TamanhoDaLetra } from "@/components/app/TamanhoDaLetra";
import { guardarCopiaDeSeguranca, zerarAlteracoes } from "@/data/backup";
import { definirModoDemo, useModoDemo } from "@/lib/modoDemo";

export const Route = createFileRoute("/vanzeiro/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil · O Vanzeiro" },
      { name: "description", content: "Seu perfil de vanzeiro no O Vanzeiro." },
      { property: "og:title", content: "Meu perfil · O Vanzeiro" },
      { property: "og:description", content: "Seu perfil de vanzeiro no O Vanzeiro." },
    ],
  }),
  component: PerfilVanzeiro,
});

function PerfilVanzeiro() {
  const vanzeiro = useVanzeiro();
  const { chavePix } = useFrota();
  const [pix, setPix] = useState(chavePix);
  const [acao, setAcao] = useState<null | "exemplo" | "zero">(null);
  const modoDemo = useModoDemo();
  useEffect(() => setPix(chavePix), [chavePix]);
  return (
    <PerfilTela
      nome={vanzeiro.nome}
      papel={`Vanzeiro · ${vanzeiro.cidade} - ${vanzeiro.estado}`}
      voltar
    >
      <Toaster position="top-center" />
      <DadosDoVanzeiro />
      <div className="mt-6 space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <Campo label="Chave Pix">
          <input
            className={campoClasse}
            placeholder="CPF, telefone, e-mail ou chave aleatória"
            value={pix}
            onChange={(e) => setPix(e.target.value)}
          />
        </Campo>
        <p className="text-sm text-muted-foreground">Vai junto nas mensagens de cobrança.</p>
        <BotaoGrande
          onClick={() => {
            salvarChavePix(pix);
            toast.success(pix.trim() ? "Chave Pix salva" : "Chave Pix removida");
          }}
        >
          Salvar chave Pix
        </BotaoGrande>
      </div>
      <TamanhoDaLetra />
      <BackupDados />
      <div className="mt-4 space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-primary">Dados de teste e recomeço</h2>
        <p className="text-sm text-muted-foreground">
          Tudo o que você cadastra fica salvo neste aparelho. Para recomeçar, volte aos dados de
          exemplo ou comece do zero. Nos dois casos, os dados de agora ficam guardados e dá para
          desfazer em "Backup dos dados".
        </p>
        <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-4">
          <span>
            <span className="block font-bold">Modo demonstração</span>
            <span className="text-sm text-muted-foreground">
              Mostra atalhos que simulam respostas dos passageiros
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={modoDemo}
            onChange={(e) => definirModoDemo(e.target.checked)}
            className="h-6 w-6 shrink-0 accent-[var(--color-primary)]"
          />
        </label>
        {acao === "exemplo" && (
          <>
            <p className="text-base font-bold text-destructive">
              Isso troca o que você cadastrou pelos dados de exemplo. Continuar?
            </p>
            <BotaoGrande
              variante="perigo"
              onClick={() => {
                guardarCopiaDeSeguranca(obterEstado(), "restauração dos dados de exemplo");
                restaurarExemplo();
                zerarAlteracoes();
                setPix("");
                setAcao(null);
                toast.success("Dados de exemplo restaurados");
              }}
            >
              Sim, restaurar exemplo
            </BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => setAcao(null)}>
              Cancelar
            </BotaoGrande>
          </>
        )}
        {acao === "zero" && (
          <>
            <p className="text-base font-bold text-destructive">
              Isso apaga todos os passageiros, linhas, vans, cobranças e viagens deste aparelho e
              volta ao primeiro acesso. Continuar?
            </p>
            <BotaoGrande
              variante="perigo"
              onClick={() => {
                guardarCopiaDeSeguranca(obterEstado(), "decisão de começar do zero");
                comecarDoZero();
                zerarAlteracoes();
                setAcao(null);
              }}
            >
              Sim, apagar tudo e começar do zero
            </BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => setAcao(null)}>
              Cancelar
            </BotaoGrande>
          </>
        )}
        {acao === null && (
          <>
            <BotaoGrande variante="contorno" onClick={() => setAcao("exemplo")}>
              Restaurar dados de exemplo
            </BotaoGrande>
            <BotaoGrande variante="perigo" onClick={() => setAcao("zero")}>
              Começar do zero
            </BotaoGrande>
          </>
        )}
      </div>
    </PerfilTela>
  );
}
