import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { BotaoGrande } from "@/components/app/Formulario";
import { configDaCobranca, salvarConfigCobranca, useFrota, useVanzeiro } from "@/data/repositorio";
import { mensagemCobrar, TEXTO_COBRANCA_PADRAO } from "@/data/cobrancas";
import { pixComValor } from "@/lib/pix";

export const Route = createFileRoute("/vanzeiro/cobranca")({
  head: () => ({
    meta: [
      { title: "Configurar cobrança · O Vanzeiro" },
      {
        name: "description",
        content: "Avisos de vencimento, texto da cobrança e pagamento na hora.",
      },
      { property: "og:title", content: "Configurar cobrança · O Vanzeiro" },
      {
        property: "og:description",
        content: "Avisos de vencimento, texto da cobrança e pagamento na hora.",
      },
    ],
  }),
  component: ConfigurarCobranca,
});

const DIAS = [1, 2, 3, 5, 7];
const MARCADORES = ["{nome}", "{valor}", "{referencia}", "{pix}"];

function ConfigurarCobranca() {
  const { configCobranca, chavePix } = useFrota();
  const vanzeiro = useVanzeiro();
  const cfg = configDaCobranca({ configCobranca });
  const [dias, setDias] = useState(cfg.diasDeAviso);
  const [texto, setTexto] = useState(cfg.textoCobranca || TEXTO_COBRANCA_PADRAO);
  const [pagaNaHora, setPagaNaHora] = useState(cfg.pagaNaHoraPadrao);

  const exemplo = mensagemCobrar(
    "Ana",
    150,
    ["Semana 02 a 08/11"],
    chavePix || "sua-chave-pix",
    chavePix ? pixComValor(chavePix, 150, vanzeiro) : null,
    texto,
  );
  const semValor = !texto.includes("{valor}");
  const chip = (ativo: boolean) =>
    `min-h-12 rounded-2xl border-2 px-4 text-base font-bold ${ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`;

  const salvar = async () => {
    const limpo = texto.trim();
    await salvarConfigCobranca({
      diasDeAviso: dias,
      textoCobranca: limpo === TEXTO_COBRANCA_PADRAO ? "" : limpo,
      pagaNaHoraPadrao: pagaNaHora,
    });
    toast.success("Configuração salva");
  };

  return (
    <div className="px-5 pb-8 pt-6">
      <Toaster position="top-center" />
      <Link
        to="/vanzeiro/mais"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-base font-semibold text-primary"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </Link>
      <h1 className="text-3xl font-extrabold text-primary">Configurar cobrança</h1>

      <section
        aria-label="Avisar antes de vencer"
        className="mt-5 space-y-3 rounded-3xl bg-card p-5 shadow-sm"
      >
        <h2 className="text-lg font-extrabold text-primary">Avisar antes de vencer</h2>
        <p className="text-sm text-muted-foreground">
          Quantos dias antes do vencimento o app avisa o passageiro (na tela dele) e você (nos
          alertas do início).
        </p>
        <div role="radiogroup" aria-label="Dias de aviso" className="flex flex-wrap gap-2">
          {DIAS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={dias === d}
              onClick={() => setDias(d)}
              className={chip(dias === d)}
            >
              {d} {d === 1 ? "dia" : "dias"}
            </button>
          ))}
        </div>
      </section>

      <section
        aria-label="Mensagem de cobrança"
        className="mt-4 space-y-3 rounded-3xl bg-card p-5 shadow-sm"
      >
        <h2 className="text-lg font-extrabold text-primary">Mensagem de cobrança</h2>
        <p className="text-sm text-muted-foreground">
          É o texto que vai no WhatsApp quando você toca em Cobrar. Toque num campo para colocar no
          texto: ele é trocado pelo dado de cada passageiro.
        </p>
        <div className="flex flex-wrap gap-2">
          {MARCADORES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTexto((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${m}`)}
              className="min-h-11 rounded-full border-2 border-primary px-3 font-mono text-sm font-bold text-primary"
            >
              {m}
            </button>
          ))}
        </div>
        <textarea
          aria-label="Texto da mensagem de cobrança"
          className="min-h-32 w-full rounded-2xl border-2 bg-card p-3 text-base outline-none focus:border-primary"
          maxLength={600}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {semValor && (
          <p role="status" className="text-sm font-semibold text-destructive">
            Sem {"{valor}"} no texto, a mensagem não diz quanto a pessoa deve.
          </p>
        )}
        <div>
          <p className="text-sm font-bold text-muted-foreground">Como vai aparecer (exemplo)</p>
          <p className="mt-1 whitespace-pre-line break-words rounded-2xl bg-muted p-3 text-sm">
            {exemplo}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTexto(TEXTO_COBRANCA_PADRAO)}
          className="min-h-11 text-base font-bold text-primary underline"
        >
          Voltar ao texto padrão
        </button>
      </section>

      <section aria-label="Pagar na hora" className="mt-4 rounded-3xl bg-card p-5 shadow-sm">
        <button
          type="button"
          role="switch"
          aria-checked={pagaNaHora}
          onClick={() => setPagaNaHora((v) => !v)}
          className="flex min-h-16 w-full items-center gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <b className="block text-lg text-primary">Passageiro novo já paga na hora</b>
            <span className="text-sm text-muted-foreground">
              Ao cadastrar quem paga por viagem, a opção "Paga na hora da viagem" já vem ligada.
              Você pode mudar em cada passageiro.
            </span>
          </span>
          <span
            aria-hidden
            className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${pagaNaHora ? "justify-end bg-success" : "justify-start bg-muted-foreground/40"}`}
          >
            <span className="h-5 w-5 rounded-full bg-white shadow" />
          </span>
        </button>
      </section>

      <div className="mt-5">
        <BotaoGrande onClick={salvar}>Salvar configuração</BotaoGrande>
      </div>
    </div>
  );
}
