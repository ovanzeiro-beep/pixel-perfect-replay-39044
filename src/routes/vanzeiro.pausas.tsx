import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { EstadoVazio } from "@/components/app/EstadoVazio";
import { BotaoGrande, Campo, Confirmar, Painel, campoClasse } from "@/components/app/Formulario";
import { dataBR } from "@/data/cobrancas";
import { excluirPausa, salvarPausa, useFrota, type Linha, type Pausa } from "@/data/repositorio";
import { datasDaLinha, iso } from "@/data/viagens";

export const Route = createFileRoute("/vanzeiro/pausas")({
  head: () => ({
    meta: [
      { title: "Férias e feriados · O Vanzeiro" },
      { name: "description", content: "Períodos em que a van não faz viagem." },
      { property: "og:title", content: "Férias e feriados · O Vanzeiro" },
      { property: "og:description", content: "Períodos em que a van não faz viagem." },
    ],
  }),
  component: FeriasEFeriados,
});

const MOTIVOS = ["Férias escolares", "Feriado", "Van na oficina"] as const;

function FeriasEFeriados() {
  const { pausas = [], linhas } = useFrota();
  const hoje = iso(new Date());
  const [editando, setEditando] = useState<Pausa | "nova" | null>(null);
  const [excluindo, setExcluindo] = useState<Pausa | null>(null);
  const nomeLinha = (id?: string) =>
    id ? (linhas.find((l) => l.id === id)?.nome ?? "Linha removida") : "Todas as linhas";

  const ordenadas = [...pausas].sort((a, b) => a.de.localeCompare(b.de));
  const emAndamento = ordenadas.filter((p) => p.de <= hoje && p.ate >= hoje);
  const proximas = ordenadas.filter((p) => p.de > hoje);
  const passadas = ordenadas.filter((p) => p.ate < hoje).reverse();

  const cartao = (p: Pausa) => (
    <li key={p.id} className="rounded-3xl bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-extrabold">
            {dataBR(p.de)} {p.de !== p.ate && `a ${dataBR(p.ate)}`}
          </p>
          <p className="break-words text-base">{p.motivo || "Sem viagem"}</p>
          <p className="text-sm text-muted-foreground">{nomeLinha(p.linhaId)}</p>
          {p.suspenderPlanos && (
            <p className="mt-1 text-sm font-semibold text-primary">
              Plano semanal e mensal não é cobrado
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label={`Editar pausa de ${dataBR(p.de)}`}
            onClick={() => setEditando(p)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-primary"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={`Excluir pausa de ${dataBR(p.de)}`}
            onClick={() => setExcluindo(p)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-destructive"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </li>
  );
  const grupo = (titulo: string, lista: Pausa[]) =>
    lista.length > 0 && (
      <section aria-label={titulo} className="mt-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </h2>
        <ul className="space-y-3">{lista.map(cartao)}</ul>
      </section>
    );

  return (
    <div className="px-5 pb-8 pt-6">
      <Toaster position="top-center" />
      <Link
        to="/vanzeiro/mais"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-base font-semibold text-primary"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </Link>
      <h1 className="text-3xl font-extrabold text-primary">Férias e feriados</h1>
      <p className="mt-1 text-base text-muted-foreground">
        Nos dias marcados aqui a van não faz viagem: elas somem da lista, ninguém precisa confirmar
        presença e o passageiro é avisado.
      </p>
      <div className="mt-4">
        <BotaoGrande variante="destaque" onClick={() => setEditando("nova")}>
          <Plus className="h-5 w-5" /> Nova pausa
        </BotaoGrande>
      </div>

      {pausas.length === 0 && (
        <div className="mt-5">
          <EstadoVazio
            titulo="Nenhuma pausa marcada"
            texto='Quando a van for parar (férias escolares, feriado, oficina), toque em "Nova pausa" e escolha os dias. Dá para pausar uma linha só ou todas.'
          />
        </div>
      )}
      {grupo("Em andamento", emAndamento)}
      {grupo("Próximas", proximas)}
      {grupo("Passadas", passadas)}

      {editando && (
        <FormPausa
          pausa={editando === "nova" ? null : editando}
          linhas={linhas}
          onFechar={() => setEditando(null)}
        />
      )}
      {excluindo && (
        <Confirmar
          titulo="Excluir esta pausa?"
          texto="As viagens desses dias voltam a aparecer."
          onNao={() => setExcluindo(null)}
          onSim={() => {
            void excluirPausa(excluindo.id);
            setExcluindo(null);
            toast.success("Pausa excluída");
          }}
        />
      )}
    </div>
  );
}

function FormPausa({
  pausa,
  linhas,
  onFechar,
}: {
  pausa: Pausa | null;
  linhas: Linha[];
  onFechar: () => void;
}) {
  const { ajustes, pausas = [] } = useFrota();
  const [de, setDe] = useState(pausa?.de ?? "");
  const [ate, setAte] = useState(pausa?.ate ?? "");
  const [linhaId, setLinhaId] = useState(pausa?.linhaId ?? "");
  const [motivo, setMotivo] = useState(pausa?.motivo ?? "");
  const [suspender, setSuspender] = useState(!!pausa?.suspenderPlanos);
  const [erros, setErros] = useState<{ de?: string; ate?: string }>({});
  const [enviando, setEnviando] = useState(false);

  // Quantas viagens (das próximas semanas) deixam de aparecer com esta pausa.
  const valida = !!de && !!ate && ate >= de;
  const hoje = new Date();
  const some = valida
    ? linhas
        .filter((l) => !linhaId || l.id === linhaId)
        .flatMap((l) =>
          datasDaLinha(
            l,
            hoje,
            pausas.filter((z) => z.id !== pausa?.id),
            ajustes,
          ),
        )
        .filter((d) => d >= de && d <= ate).length
    : 0;

  const chip = (ativo: boolean) =>
    `min-h-12 rounded-2xl border-2 px-4 text-base font-bold ${ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`;

  const salvar = async () => {
    const e: typeof erros = {};
    if (!de) e.de = "Escolha o primeiro dia";
    if (!ate) e.ate = "Escolha o último dia";
    else if (de && ate < de) e.ate = "O último dia não pode ser antes do primeiro";
    setErros(e);
    if (Object.keys(e).length || enviando) return;
    setEnviando(true);
    try {
      const ok = await salvarPausa({
        id: pausa?.id,
        de,
        ate,
        motivo,
        ...(linhaId ? { linhaId } : {}),
        ...(suspender ? { suspenderPlanos: true } : {}),
      });
      if (!ok) {
        setErros({ ate: "Não consegui salvar. Confira as datas (no máximo 1 ano)." });
        return;
      }
      toast.success("Pausa salva");
      onFechar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Painel titulo={pausa ? "Editar pausa" : "Nova pausa"} onFechar={onFechar}>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Primeiro dia" obrigatorio erro={erros.de}>
          <input
            type="date"
            className={campoClasse}
            value={de}
            onChange={(e) => setDe(e.target.value)}
          />
        </Campo>
        <Campo label="Último dia" obrigatorio erro={erros.ate}>
          <input
            type="date"
            className={campoClasse}
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </Campo>
      </div>

      <div>
        <p className="mb-1 text-base font-bold">Quais linhas param</p>
        <div role="radiogroup" aria-label="Quais linhas param" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={!linhaId}
            onClick={() => setLinhaId("")}
            className={chip(!linhaId)}
          >
            Todas as linhas
          </button>
          {linhas.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={linhaId === l.id}
              onClick={() => setLinhaId(l.id)}
              className={chip(linhaId === l.id)}
            >
              {l.nome}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-base font-bold">Motivo (opcional)</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {MOTIVOS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              className={chip(motivo === m)}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          aria-label="Motivo"
          className={campoClasse}
          maxLength={60}
          placeholder="Ou escreva o motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={suspender}
        onClick={() => setSuspender((v) => !v)}
        className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left ${suspender ? "border-success bg-success/10" : "bg-card"}`}
      >
        <span className="min-w-0 flex-1">
          <b className="block text-lg">Não cobrar o plano semanal e mensal</b>
          <span className="text-sm text-muted-foreground">
            Quem paga por semana ou por mês e tem vencimento dentro desses dias não recebe cobrança.
          </span>
        </span>
        <span
          aria-hidden
          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${suspender ? "justify-end bg-success" : "justify-start bg-muted-foreground/40"}`}
        >
          <span className="h-5 w-5 rounded-full bg-white shadow" />
        </span>
      </button>

      {valida && (
        <p
          role="note"
          className="flex items-start gap-2 rounded-2xl bg-muted p-3 text-sm font-semibold"
        >
          <CalendarOff className="mt-0.5 h-5 w-5 shrink-0" />
          {some === 0
            ? "Nenhuma viagem das próximas semanas cai nesse período."
            : `${some} ${some === 1 ? "viagem das próximas semanas deixa" : "viagens das próximas semanas deixam"} de aparecer.`}
        </p>
      )}

      <BotaoGrande onClick={salvar} disabled={enviando}>
        Salvar pausa
      </BotaoGrande>
    </Painel>
  );
}
