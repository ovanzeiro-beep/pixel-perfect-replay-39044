import { MessageCircle } from "lucide-react";
import { linkWhatsApp } from "@/lib/validacao";

/** No lugar dos botões Vou / Não vou, depois do prazo: explica e leva o passageiro a falar com o vanzeiro. */
export function PrazoEncerrado({
  vanzeiro,
  passageiro,
  viagem,
}: {
  vanzeiro: { nome: string; telefone: string };
  passageiro: string;
  viagem: string;
}) {
  const msg = `Olá, ${vanzeiro.nome}! Sou ${passageiro}. Preciso mudar a minha resposta da viagem de ${viagem}.`;
  return (
    <div className="space-y-2 rounded-xl bg-muted px-4 py-3">
      <p className="font-bold">O prazo para responder acabou.</p>
      <p className="text-sm text-muted-foreground">
        Para mudar a sua resposta, fale com o vanzeiro. Ele consegue ajustar.
      </p>
      <a
        href={`${linkWhatsApp(vanzeiro.telefone)}?text=${encodeURIComponent(msg)}`}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-success font-bold text-success"
      >
        <MessageCircle className="h-5 w-5" /> Falar com o vanzeiro
      </a>
    </div>
  );
}
