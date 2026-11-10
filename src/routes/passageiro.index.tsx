import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Clock, MessageCircle, Phone, SmilePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { usePassageiroId } from "@/data/sessao";
import {
  usePassageiroVisao,
  responderViagemApp,
  confirmarParadaApp,
  responderVoltaApp,
  useVanzeiro,
} from "@/data/repositorio";
import { brl, resumoPassageiro } from "@/data/cobrancas";
import { isoDe } from "@/data/cobrancas";
import { diaSemana, dataCurta, horarioNaParada } from "@/data/viagens";
import type { MinhaViagem } from "@/data/repositorio";
import { pixComValor } from "@/lib/pix";
import { linkWhatsApp } from "@/lib/validacao";
import { prazoViagem } from "@/data/alertas";
import { PrazoEncerrado } from "@/components/app/PrazoEncerrado";
import { AvisosPassageiro } from "@/components/app/AvisosPassageiro";

const MOTIVOS_VOLTA = [
  "Voltei com a família",
  "Volto outro dia",
  "Já estou em casa",
  "Outro",
] as const;

function CardDuranteViagem({ v, pid }: { v: MinhaViagem; pid: string }) {
  const [agora, setAgora] = useState(Date.now());
  const [modalVolta, setModalVolta] = useState(false);
  const [motivoVolta, setMotivoVolta] = useState<string>("");

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ida = v.ida!;
  const marca = ida.minhaMarca;
  const parada = ida.parada;
  const volta = ida.volta;

  if (ida.encerrada) {
    return (
      <div className="rounded-2xl bg-success/10 p-5 text-center">
        <p className="text-4xl">🎉</p>
        <p className="mt-2 text-xl font-extrabold text-success">Viagem concluída!</p>
      </div>
    );
  }

  if (!marca) {
    return (
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
        <p className="font-extrabold text-primary text-lg">🚐 A van está a caminho</p>
        <p className="mt-1 text-muted-foreground">
          {ida.faltamParadasIda === undefined
            ? "Fique pronto na parada."
            : ida.faltamParadasIda === 0
              ? "A próxima parada é a sua! Fique pronto."
              : `Faltam ${ida.faltamParadasIda} parada${ida.faltamParadasIda > 1 ? "s" : ""} para a sua.`}
        </p>
      </div>
    );
  }

  if (marca === "faltou" || marca === "ficou") {
    const entrega = volta?.minhaEntrega;
    const voltaStatus = volta?.meuStatus;
    if (entrega === "entregue") {
      return (
        <div className="rounded-2xl bg-success/10 p-5 text-center">
          <p className="text-4xl">🏠</p>
          <p className="mt-2 text-xl font-extrabold text-success">Você chegou!</p>
          <p className="text-muted-foreground">Boa viagem!</p>
        </div>
      );
    }
    if (voltaStatus?.r === "nao") {
      return (
        <div className="rounded-2xl bg-muted p-5">
          <p className="font-bold text-muted-foreground">Você não está voltando com a van.</p>
          <p className="text-sm text-muted-foreground">{voltaStatus.motivo}</p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl bg-muted p-5">
        <p className="font-bold text-muted-foreground">Você não embarcou nesta viagem.</p>
      </div>
    );
  }

  if (volta) {
    const voltaStatus = volta.meuStatus;
    const entrega = volta.minhaEntrega;

    if (entrega === "entregue" || entrega === "ficou") {
      return (
        <div className="rounded-2xl bg-success/10 p-5 text-center">
          <p className="text-4xl">🏠</p>
          <p className="mt-2 text-xl font-extrabold text-success">Você chegou!</p>
          <p className="text-muted-foreground">Boa viagem!</p>
        </div>
      );
    }

    if (voltaStatus?.r === "nao") {
      return (
        <div className="rounded-2xl bg-muted p-5">
          <p className="font-bold text-muted-foreground">Não está voltando com a van.</p>
          <p className="text-sm text-muted-foreground">{voltaStatus.motivo}</p>
        </div>
      );
    }

    if (voltaStatus?.r === "na_van") {
      const faltam = volta.faltamParadas;
      return (
        <div className="rounded-2xl bg-primary/10 p-5">
          <p className="font-extrabold text-primary text-lg">🔄 Van voltando</p>
          {faltam > 0 ? (
            <p className="mt-1 text-muted-foreground">
              Faltam {faltam} parada{faltam > 1 ? "s" : ""} para a sua.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">Próxima parada é a sua!</p>
          )}
        </div>
      );
    }

    if (volta.fase === "chamada") {
      return (
        <>
          <div className="rounded-2xl border-2 border-accent bg-accent/10 p-5">
            <p className="font-extrabold text-accent-foreground text-lg">⏰ Hora de voltar!</p>
            <p className="mt-1 text-muted-foreground">Confirme se vai voltar com a van.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  responderVoltaApp(pid, v.id, true);
                  toast.success("Confirmado! A van está vindo.");
                }}
                className="flex flex-1 min-h-12 items-center justify-center gap-2 rounded-xl bg-success text-success-foreground font-bold"
              >
                <Check className="h-5 w-5" /> Estou na van
              </button>
              <button
                onClick={() => setModalVolta(true)}
                className="flex min-h-12 items-center justify-center rounded-xl border-2 border-destructive px-4 font-bold text-destructive"
              >
                Não vou voltar
              </button>
            </div>
          </div>
          {modalVolta && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4">
              <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
                <p className="text-xl font-extrabold">Por que não vai voltar?</p>
                <div className="space-y-2">
                  {MOTIVOS_VOLTA.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMotivoVolta(m)}
                      className={`flex w-full min-h-12 items-center rounded-xl px-4 font-bold ${motivoVolta === m ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setModalVolta(false);
                      setMotivoVolta("");
                    }}
                    className="flex-1 min-h-12 rounded-xl border-2 border-muted font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!motivoVolta}
                    onClick={() => {
                      responderVoltaApp(pid, v.id, false, motivoVolta);
                      setModalVolta(false);
                      toast.success("Aviso enviado.");
                    }}
                    className="flex-1 min-h-12 rounded-xl bg-destructive text-destructive-foreground font-bold disabled:opacity-40"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
  }

  if (parada && marca === "embarcou") {
    const confirmado = parada.confirmei;
    const saida = parada.inicio + parada.minutos * 60000;
    const faltamMs = Math.max(0, saida - agora);
    const mins = Math.floor(faltamMs / 60000);
    const segs = Math.floor((faltamMs % 60000) / 1000);

    return (
      <div className="rounded-2xl border-2 border-accent bg-accent/10 p-5">
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-accent-foreground text-lg">
            🛑 Parada — {parada.local}
          </p>
          <span className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
            <Clock className="h-4 w-4" /> {mins}:{String(segs).padStart(2, "0")}
          </span>
        </div>
        {confirmado ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-success/20 px-4 py-3">
            <Check className="h-5 w-5 text-success" />
            <p className="font-bold text-success">Confirmado — a van sabe que você está!</p>
          </div>
        ) : (
          <button
            onClick={() => {
              confirmarParadaApp(pid, v.id);
              toast.success("Aviso enviado ao motorista!");
            }}
            className="mt-4 flex w-full min-h-14 items-center justify-center rounded-xl bg-success text-success-foreground text-xl font-extrabold"
          >
            <SmilePlus className="mr-2 h-6 w-6" /> Estou na van ✓
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-success/10 p-5">
      <p className="font-extrabold text-success text-lg">✅ Você está na van</p>
      <p className="mt-1 text-muted-foreground">
        {ida.fase === "a_caminho" ? "Viagem em andamento." : "Chegamos ao destino!"}
      </p>
    </div>
  );
}

function InicioPassageiro() {
  const vanzeiro = useVanzeiro();
  const passageiroId = usePassageiroId();
  const { eu: p, cobrancas, linhas, viagens, chavePix } = usePassageiroVisao(passageiroId);
  const hoje = isoDe(new Date());

  if (!p) return null;

  const minhasViagens = viagens.filter((v) => !v.cancelada);
  const proxima =
    minhasViagens.find((v) => !v.passada) ?? minhasViagens[minhasViagens.length - 1] ?? null;
  const linha = proxima ? linhas.find((l) => l.id === proxima.linhaId) : null;

  const resposta = proxima?.resposta ?? "sem";
  const posicaoEspera = proxima ? proxima.posicaoEspera - 1 : -1;
  const emAndamento = proxima?.situacao === "andamento";

  const resumo = resumoPassageiro(cobrancas, p.id, hoje);
  const horario = proxima && linha ? horarioNaParada(proxima.saida, p.cidade, linha.paradas) : "";

  const whatsVanzeiro = `${linkWhatsApp(vanzeiro.telefone)}?text=${encodeURIComponent(`Olá, ${vanzeiro.nome}! Sou ${p.nome}.`)}`;

  const responder = async (vai: boolean) => {
    if (!proxima) return;
    if (!(await responderViagemApp(p.id, proxima.id, vai))) {
      toast.error("O prazo para responder acabou. Fale com o vanzeiro.");
      return;
    }
    toast.success(vai ? "Confirmado! Você vai." : "Registrado. Você não vai.");
  };

  const codigoPix =
    chavePix && resumo.total > 0 ? pixComValor(chavePix, resumo.total, vanzeiro) : null;

  return (
    <div className="px-5 pb-6 pt-6 space-y-5">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-extrabold text-primary">Olá, {p.nome.split(" ")[0]}! 👋</h1>

      <AvisosPassageiro />

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Próxima viagem
        </h2>
        {proxima && linha ? (
          <div className="rounded-3xl bg-card p-5 shadow-sm space-y-4">
            <div>
              <p className="text-xl font-extrabold text-primary">{linha.nome}</p>
              <p className="text-muted-foreground">
                {diaSemana(proxima.data)}, {dataCurta(proxima.data)} · {proxima.saida}
                {horario !== proxima.saida && (
                  <span className="ml-1 text-sm">(~{horario} na sua parada)</span>
                )}
              </p>
            </div>

            {emAndamento && proxima.ida ? (
              <CardDuranteViagem v={proxima} pid={p.id} />
            ) : (
              <>
                {resposta === "vai" && (
                  <div className="flex items-center gap-2 rounded-xl bg-success/15 px-4 py-3">
                    <Check className="h-5 w-5 text-success" />
                    <p className="font-bold text-success">Confirmado — você vai!</p>
                  </div>
                )}
                {resposta === "nao" && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3">
                    <X className="h-5 w-5 text-destructive" />
                    <p className="font-bold text-destructive">Você não vai nesta viagem.</p>
                  </div>
                )}
                {resposta === "espera" && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                    <p className="font-bold text-amber-700 dark:text-amber-400">
                      Lista de espera — posição {posicaoEspera + 1}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você será avisado se abrir uma vaga.
                    </p>
                  </div>
                )}

                {!proxima.passada &&
                  (resposta === "sem" || resposta === "vai" || resposta === "nao") && (
                    <p className="text-sm font-semibold text-muted-foreground">
                      {prazoViagem(proxima.data, new Date()).rotulo}
                    </p>
                  )}

                {!proxima.passada &&
                  (resposta === "sem" || resposta === "vai" || resposta === "nao") &&
                  prazoViagem(proxima.data, new Date()).encerrado && (
                    <PrazoEncerrado
                      vanzeiro={vanzeiro}
                      passageiro={p.nome}
                      viagem={`${diaSemana(proxima.data)}, ${dataCurta(proxima.data)}`}
                    />
                  )}

                {!proxima.passada &&
                  (resposta === "sem" || resposta === "vai" || resposta === "nao") &&
                  !prazoViagem(proxima.data, new Date()).encerrado && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => responder(true)}
                        className={`flex flex-1 min-h-12 items-center justify-center rounded-xl font-bold transition-colors ${resposta === "vai" ? "bg-success text-success-foreground" : "bg-success/15 text-success"}`}
                      >
                        <Check className="mr-1 h-4 w-4" /> Vou
                      </button>
                      <button
                        onClick={() => responder(false)}
                        className={`flex flex-1 min-h-12 items-center justify-center rounded-xl font-bold transition-colors ${resposta === "nao" ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive"}`}
                      >
                        <X className="mr-1 h-4 w-4" /> Não vou
                      </button>
                    </div>
                  )}
              </>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-card p-5 shadow-sm text-center text-muted-foreground">
            Nenhuma viagem próxima agendada.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Meu pagamento
        </h2>
        <div className="rounded-3xl bg-card p-5 shadow-sm space-y-3">
          {resumo.total > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">Em aberto</span>
              <span className="text-xl font-extrabold text-destructive">{brl(resumo.total)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              <span className="font-bold text-success">Em dia</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Forma de pagamento</span>
            <span className="font-bold">
              {p.formaPagamento === "por_viagem"
                ? `${brl(p.valor)} por viagem`
                : p.formaPagamento === "semanal"
                  ? `${brl(p.valor)}/semana`
                  : `${brl(p.valor)}/mês`}
            </span>
          </div>
          {chavePix && resumo.total > 0 && codigoPix && (
            <button
              onClick={() => {
                navigator.clipboard
                  ?.writeText(codigoPix)
                  .then(() => toast.success("Pix copiado! O valor já vem preenchido."));
              }}
              className="flex w-full min-h-12 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground"
            >
              Copiar Pix com o valor ({brl(resumo.total)})
            </button>
          )}
          {chavePix ? (
            <button
              onClick={() => {
                navigator.clipboard?.writeText(chavePix).then(() => toast.success("Pix copiado!"));
              }}
              className="flex w-full min-h-12 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary"
            >
              Copiar chave Pix
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              O vanzeiro ainda não informou a chave Pix. Combine o pagamento com ele.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Falar com o vanzeiro
        </h2>
        <div className="rounded-3xl bg-card p-5 shadow-sm">
          <p className="font-bold">{vanzeiro.nome}</p>
          <div className="mt-3 flex gap-3">
            <a
              href={`tel:${vanzeiro.telefone.replace(/\D/g, "")}`}
              className="flex flex-1 min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-primary font-bold text-primary"
            >
              <Phone className="h-5 w-5" /> Ligar
            </a>
            <a
              href={whatsVanzeiro}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-success font-bold text-success"
            >
              <MessageCircle className="h-5 w-5" /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/passageiro/")({
  head: () => ({
    meta: [
      { title: "Início · O Vanzeiro" },
      { name: "description", content: "Início do passageiro no O Vanzeiro." },
      { property: "og:title", content: "Início · O Vanzeiro" },
      { property: "og:description", content: "Início do passageiro no O Vanzeiro." },
    ],
  }),
  component: InicioPassageiro,
});
