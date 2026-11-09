import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtegeArea } from "@/components/app/ProtegeArea";
import { destinoSeNegado, sessaoAtual } from "@/data/sessao";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  Flag,
  GripVertical,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Route as RouteIcon,
  Undo2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  useFrota,
  useViagens,
  ajustarViagem,
  lancarCobranca,
  type Passageiro,
} from "@/data/repositorio";
import {
  encerrarParada,
  novaVolta,
  ordenarParadas,
  partesRota,
  type Ida,
  type Viagem,
} from "@/data/viagens";
import { enderecoCompleto, linkWhatsApp } from "@/lib/validacao";
import { BotaoGrande } from "@/components/app/Formulario";
import { IniciarParada, ParadaAtual } from "@/components/app/ParadaCaminho";
import { TelaVolta } from "@/components/app/VoltaViagem";

export const Route = createFileRoute("/ida/$viagemId")({
  head: () => ({
    meta: [
      { title: "Viagem de ida · O Vanzeiro" },
      { name: "description", content: "Rota e embarque dos passageiros na viagem de ida." },
      { property: "og:title", content: "Viagem de ida · O Vanzeiro" },
      { property: "og:description", content: "Rota e embarque dos passageiros na viagem de ida." },
    ],
  }),
  beforeLoad: () => {
    const destino = destinoSeNegado("vanzeiro", sessaoAtual());
    if (destino) throw redirect({ to: destino });
  },
  component: () => (
    <ProtegeArea papel="vanzeiro">
      <TelaIda />
    </ProtegeArea>
  ),
});

const primeiro = (n: string) => n.split(" (")[0]!.split(" ")[0]!;
const mapsPara = (end: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(end)}&travelmode=driving`;

function TelaIda() {
  const { viagemId } = Route.useParams();
  const viagens = useViagens();
  const { linhas, passageiros } = useFrota();
  const v = viagens.find((x) => x.id === viagemId);
  const linha = linhas.find((l) => l.id === v?.linhaId);

  // Inicia a ida na primeira vez que a tela abre
  useEffect(() => {
    if (!v || v.ajuste.ida || v.ajuste.cancelada || !linha) return;
    const cidade = (id: string) => passageiros.find((p) => p.id === id)?.cidade ?? "";
    ajustarViagem(v.id, {
      ...v.ajuste,
      ida: {
        ordem: ordenarParadas(v.vao, cidade, linha.paradas),
        marcas: [],
        fase: "paradas",
        inicio: Date.now(),
      },
    });
    toast.success("Viagem iniciada");
  }, [v, linha, passageiros]);

  if (!v || !linha) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-xl font-bold">Viagem não encontrada.</p>
        <Link to="/vanzeiro/viagens" className="mt-4 inline-block font-bold text-primary underline">
          Voltar para Viagens
        </Link>
      </div>
    );
  }
  if (!v.ajuste.ida) return null;
  return (
    <Conteudo
      v={v}
      ida={v.ajuste.ida}
      destino={linha.destino || linha.nome}
      nomeLinha={linha.nome}
      passageiros={passageiros}
    />
  );
}

function Conteudo({
  v,
  ida,
  destino,
  nomeLinha,
  passageiros,
}: {
  v: Viagem;
  ida: Ida;
  destino: string;
  nomeLinha: string;
  passageiros: Passageiro[];
}) {
  const { vans } = useFrota();
  const [faltou, setFaltou] = useState<Passageiro | null>(null);
  const [construcao, setConstrucao] = useState<string | null>(null);
  const [novaParada, setNovaParada] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  const pas = (id: string) => passageiros.find((p) => p.id === id);
  const marcados = new Set(ida.marcas.map((m) => m.pid));
  const faltam = ida.ordem.filter((id) => !marcados.has(id) && pas(id));
  const feitas = ida.marcas.filter((m) => pas(m.pid));
  const naVan = ida.marcas.filter((m) => m.r === "embarcou").length;
  const prox = faltam[0] ? pas(faltam[0]) : undefined;
  const van = vans.find((x) => x.id === v.vanId);
  const salvar = (nova: Ida) => ajustarViagem(v.id, { ...v.ajuste, ida: nova });

  const marcar = (p: Passageiro, r: "embarcou" | "faltou") => {
    const cobrou = r === "embarcou" && p.formaPagamento === "por_viagem" ? p.valor : 0;
    if (cobrou) lancarCobranca(p.id, cobrou, v.linhaId);
    salvar({ ...ida, marcas: [...ida.marcas, { pid: p.id, r, cobrou }] });
    toast.success(
      r === "embarcou"
        ? `${primeiro(p.nome)} embarcou${cobrou ? " · cobrança da viagem lançada" : ""}`
        : `${primeiro(p.nome)} não apareceu`,
    );
  };
  const desfazer = () => {
    const ult = ida.marcas[ida.marcas.length - 1];
    if (!ult) return;
    if (ult.cobrou && !lancarCobranca(ult.pid, -ult.cobrou))
      toast.warning("Não achei a cobrança dessa viagem. Confira em Dinheiro.");
    salvar({ ...ida, marcas: ida.marcas.slice(0, -1), fase: "paradas" });
    toast.success("Última marcação desfeita");
  };
  const aoArrastar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const de = faltam.indexOf(String(e.active.id)),
      para = faltam.indexOf(String(e.over.id));
    const novaFaltam = arrayMove(faltam, de, para);
    salvar({ ...ida, ordem: [...ida.marcas.map((m) => m.pid), ...novaFaltam] });
  };
  if (ida.volta || ida.encerrada)
    return (
      <TelaVolta
        v={v}
        ida={ida}
        salvar={salvar}
        nomeLinha={nomeLinha}
        vanNome={van?.apelido ?? "Sem van"}
        passageiros={passageiros}
      />
    );
  const rotas = partesRota(faltam.map((id) => enderecoCompleto(pas(id)!)));

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <Toaster position="top-center" />
      <header className="sticky top-0 z-20 bg-primary px-4 pb-4 pt-3 text-primary-foreground shadow-lg">
        <div className="flex items-center gap-2">
          <Link
            to="/vanzeiro/viagens"
            search={{ v: v.id }}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-xl"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold">{nomeLinha}</p>
            <p className="truncate text-sm opacity-80">{van?.apelido ?? "Sem van"}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-4xl font-extrabold">
          Na van: <span className="text-accent">{naVan}</span> de {ida.ordem.length}
        </p>
        {ida.fase !== "paradas" && (
          <p className="mt-1 text-center font-bold text-accent">
            {ida.fase === "a_caminho"
              ? `Em andamento — a caminho de ${destino}`
              : `Chegou em ${destino}`}
          </p>
        )}
      </header>

      {ida.parada ? (
        <div className="px-4 pt-4">
          <ParadaAtual
            parada={ida.parada}
            bordo={ida.marcas
              .filter((m) => m.r === "embarcou" && pas(m.pid))
              .map((m) => pas(m.pid)!)}
            onMudar={(parada) => salvar({ ...ida, parada })}
            onSeguir={(mot) => salvar(encerrarParada(ida, mot, Date.now()))}
          />
        </div>
      ) : (
        <div className="space-y-4 px-4 pt-4">
          {ida.fase === "paradas" && prox && (
            <section className="rounded-3xl border-4 border-accent bg-card p-5 shadow-lg">
              <p className="text-sm font-bold uppercase tracking-wide text-accent-strong">
                Próxima parada
              </p>
              <h2 className="mt-1 text-2xl font-extrabold">{prox.nome}</h2>
              <p className="mt-1 flex items-start gap-2 text-lg">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
                {enderecoCompleto(prox)}
              </p>
              {prox.referencia && (
                <p className="mt-1 text-base text-muted-foreground">
                  Referência: {prox.referencia}
                </p>
              )}
              <a
                href={mapsPara(enderecoCompleto(prox))}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground"
              >
                <Navigation className="h-6 w-6" /> Navegar
              </a>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <a
                  href={`tel:${prox.telefone.replace(/\D/g, "")}`}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary text-lg font-bold text-primary"
                >
                  <Phone className="h-5 w-5" /> Ligar
                </a>
                <a
                  href={`${linkWhatsApp(prox.telefone)}?text=${encodeURIComponent(`Olá, ${primeiro(prox.nome)}! A van está chegando aí, uns 5 minutos.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-success text-lg font-bold text-success"
                >
                  <MessageCircle className="h-5 w-5" /> WhatsApp
                </a>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => marcar(prox, "embarcou")}
                  className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-success text-xl font-extrabold text-success-foreground"
                >
                  <Check className="h-7 w-7" /> Embarcou
                </button>
                <button
                  onClick={() => setFaltou(prox)}
                  className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-muted text-xl font-extrabold text-muted-foreground"
                >
                  <UserX className="h-7 w-7" /> Não apareceu
                </button>
              </div>
            </section>
          )}

          {ida.fase === "paradas" && faltam.length > 0 && (
            <div className="space-y-2">
              {rotas.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card text-lg font-bold text-primary"
                >
                  <RouteIcon className="h-5 w-5" /> Rota completa no Google Maps
                  {rotas.length > 1 ? ` · Parte ${i + 1}` : ""}
                </a>
              ))}
            </div>
          )}

          {ida.fase === "paradas" && faltam.length === 0 && (
            <BotaoGrande
              variante="destaque"
              onClick={() => {
                salvar({ ...ida, fase: "a_caminho" });
                toast.success(`A caminho de ${destino}`);
              }}
            >
              <Flag className="h-6 w-6" /> Seguir para o destino
            </BotaoGrande>
          )}

          {ida.fase === "a_caminho" && (
            <a
              href={mapsPara(destino)}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground"
            >
              <Navigation className="h-6 w-6" /> Navegar até o destino
            </a>
          )}
          {ida.fase === "a_caminho" && (
            <BotaoGrande
              variante="destaque"
              onClick={() => {
                salvar({ ...ida, fase: "chegou" });
                toast.success("Chegada marcada");
              }}
            >
              <Flag className="h-6 w-6" /> Cheguei ao destino
            </BotaoGrande>
          )}

          {ida.fase === "chegou" && (
            <section className="rounded-3xl bg-card p-5 shadow-sm">
              <h2 className="text-xl font-extrabold text-primary">Quem está na van ({naVan})</h2>
              <ul className="mt-2 divide-y">
                {ida.marcas
                  .filter((m) => m.r === "embarcou")
                  .map((m) => (
                    <li key={m.pid} className="py-3 text-lg font-semibold">
                      {pas(m.pid)?.nome}
                    </li>
                  ))}
              </ul>
              <div className="mt-3">
                <BotaoGrande
                  variante="destaque"
                  onClick={() => salvar({ ...ida, volta: novaVolta(Date.now()) })}
                >
                  Iniciar volta
                </BotaoGrande>
              </div>
            </section>
          )}

          {ida.fase !== "chegou" && (
            <BotaoGrande variante="contorno" onClick={() => setNovaParada(true)}>
              Fazer parada no caminho
            </BotaoGrande>
          )}

          {ida.marcas.length > 0 && ida.fase !== "chegou" && (
            <button
              onClick={desfazer}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary underline"
            >
              <Undo2 className="h-5 w-5" /> Desfazer última marcação
            </button>
          )}

          {faltam.length > 1 && ida.fase === "paradas" && (
            <section>
              <h3 className="mb-2 text-lg font-extrabold text-muted-foreground">
                Próximas paradas · arraste para mudar a ordem
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={aoArrastar}
              >
                <SortableContext items={faltam} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {faltam.map((id, i) => (
                      <ItemParada key={id} id={id} n={i + 1} p={pas(id)!} destaque={i === 0} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </section>
          )}

          {feitas.length > 0 && (
            <section>
              <h3 className="mb-2 text-lg font-extrabold text-muted-foreground">Paradas feitas</h3>
              <ul className="space-y-2">
                {feitas.map((m) => (
                  <li
                    key={m.pid}
                    className={`flex items-center gap-3 rounded-2xl p-4 ${m.r === "embarcou" ? "bg-success/15" : "bg-muted"}`}
                  >
                    {m.r === "embarcou" ? (
                      <Check className="h-6 w-6 text-success" />
                    ) : (
                      <UserX className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="flex-1 font-bold">{pas(m.pid)?.nome}</span>
                    <span
                      className={`text-sm font-bold ${m.r === "embarcou" ? "text-success" : "text-muted-foreground"}`}
                    >
                      {m.r === "embarcou"
                        ? "Embarcou"
                        : m.r === "ficou"
                          ? "Ficou na parada"
                          : "Não apareceu"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {novaParada && (
        <IniciarParada
          onFechar={() => setNovaParada(false)}
          onIniciar={(minutos, local) => {
            salvar({
              ...ida,
              parada: { inicio: Date.now(), minutos, local, chamada: false, naVan: {} },
            });
            setNovaParada(false);
            toast.success(`Parada de ${minutos} minutos`);
          }}
        />
      )}

      {faltou && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-extrabold">{primeiro(faltou.nome)} não apareceu</h3>
            <p className="text-lg text-muted-foreground">O que você quer fazer?</p>
            <BotaoGrande variante="contorno" onClick={() => setFaltou(null)}>
              Aguardar mais um pouco
            </BotaoGrande>
            <BotaoGrande
              onClick={() => {
                marcar(faltou, "faltou");
                setFaltou(null);
              }}
            >
              Seguir viagem
            </BotaoGrande>
          </div>
        </div>
      )}

      {construcao && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6 text-center">
            <p className="text-xl font-extrabold">Em construção</p>
            <p className="text-lg text-muted-foreground">{construcao}</p>
            <BotaoGrande onClick={() => setConstrucao(null)}>Entendi</BotaoGrande>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemParada({
  id,
  n,
  p,
  destaque,
}: {
  id: string;
  n: number;
  p: Passageiro;
  destaque: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ${destaque ? "ring-2 ring-accent" : ""} ${isDragging ? "z-10 opacity-80 shadow-lg" : ""}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-base font-extrabold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{p.nome}</p>
        <p className="truncate text-sm text-muted-foreground">
          {p.cidade}
          {p.bairro ? ` · ${p.bairro}` : ""}
        </p>
      </div>
      <button
        {...attributes}
        {...listeners}
        aria-label={`Arrastar ${p.nome}`}
        className="flex h-12 w-12 touch-none items-center justify-center rounded-xl text-muted-foreground"
      >
        <GripVertical className="h-6 w-6" />
      </button>
    </li>
  );
}
