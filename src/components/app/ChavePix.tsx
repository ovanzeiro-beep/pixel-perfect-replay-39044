import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BotaoGrande, Campo, campoClasse } from "@/components/app/Formulario";
import { salvarChavePix } from "@/data/repositorio";
import { interpretarChavePix, nomeDoTipo } from "@/lib/pix";

/** Chave Pix do vanzeiro: reconhece o tipo (CPF, celular, e-mail...) e guarda do jeito que o Pix exige. */
export function ChavePix({ atual }: { atual: string }) {
  const [texto, setTexto] = useState(atual);
  useEffect(() => setTexto(atual), [atual]);
  const lida = interpretarChavePix(texto);
  const vazio = !texto.trim();

  const guardar = async (chave: string) => {
    await salvarChavePix(chave);
    setTexto(chave);
    toast.success(chave ? "Chave Pix salva" : "Chave Pix removida");
  };

  const dica = vazio
    ? null
    : lida.tipo === "invalida"
      ? "Não reconheci esse formato. Você pode salvar assim mesmo: o passageiro copia a chave, mas o Pix com o valor já preenchido não será gerado."
      : lida.tipo === "ambigua"
        ? "Esse número pode ser CPF ou celular. Qual é?"
        : `Reconhecida como ${nomeDoTipo[lida.tipo]}. Vai ser guardada como ${lida.chave}.`;

  return (
    <div className="mt-6 space-y-3 rounded-3xl bg-card p-5 shadow-sm">
      <Campo label="Chave Pix">
        <input
          className={campoClasse}
          placeholder="CPF, celular, e-mail ou chave aleatória"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </Campo>
      <p className="text-sm text-muted-foreground">
        Vai junto nas mensagens de cobrança, com o valor já preenchido (Pix copia e cola).
      </p>
      {dica && (
        <p
          role="status"
          className={`text-sm font-semibold ${lida.tipo === "invalida" ? "text-destructive" : "text-foreground"}`}
        >
          {dica}
        </p>
      )}
      {lida.tipo === "ambigua" ? (
        <div className="grid grid-cols-2 gap-3">
          <BotaoGrande onClick={() => guardar(lida.cpf)}>É CPF</BotaoGrande>
          <BotaoGrande onClick={() => guardar(lida.celular)}>É celular</BotaoGrande>
        </div>
      ) : (
        <BotaoGrande
          onClick={() => guardar(vazio ? "" : lida.tipo === "invalida" ? texto.trim() : lida.chave)}
        >
          Salvar chave Pix
        </BotaoGrande>
      )}
    </div>
  );
}
