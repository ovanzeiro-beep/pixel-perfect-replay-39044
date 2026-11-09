import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Check, CheckCircle2, Flag, GripVertical, MapPin, MessageCircle, Navigation, Phone, Route as RouteIcon, Smartphone, Undo2, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { lancarCobranca, type Passageiro } from "@/data/store";
import {
  aindaNaVan, chamadaVolta, cobrancaSoVolta, encerrarParadaVolta, horaDe, partesRota, pendentesVolta, rotaVolta, textoFaltam, totalCobrado,
  type Ida, type Viagem, type Volta,
} from "@/data/viagens";
import { enderecoCompleto, linkWhatsApp } from "@/lib/validacao";
import { BotaoGrande, campoClasse } from "@/components/app/Formulario";
import { IniciarParada, ParadaAtual } from "@/components/app/ParadaCaminho";

const primeiro = (n: string) => n.split(" (")[0]!.split(" ")[0]!;
const mapsPara = (end: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(end)}&travelmode=driving`;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const MOTIVOS = ["Voltou com a família", "Volta outro dia", "Outro"] as const;

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-3xl bg-card p-6">{children}</div>
    </div>
  );
}

function Contatos({ p, msg }: { p: Passageiro; msg: string }) {
  return (
    <>
      <a href={`tel:${p.telefone.replace(/\D/g, "")}`} className="flex min-h-12 items-center gap-1 rounded-xl border-2 border-primary px-3 font-bold text-primary"><Phone className="h-4 w-4" /> Ligar</a>
      <a href={`${linkWhatsApp(p.telefone)}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-1 rounded-xl border-2 border-success px-3 font-bold text-success"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
    </>
  );
}

export function TelaVolta({ v, ida, salvar, nomeLinha, vanNome, passageiros }: { v: Viagem; ida: Ida; salvar: (i: Ida) => void; nomeLinha: string; vanNome: string; passageiros: Passageiro[] }) {
  const pas = (id: string) => passageiros.find((p) => p.id === id);
  const volta = ida.volta;
  const ainda = volta ? aindaNaVan(volta).filter((id) => pas(id)) : [];
  const setVolta = (nv: Volta) => salvar({ ...ida, volta: nv });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <Toaster position="top-center" />
      <header className="sticky top-0 z-20 bg-primary px-4 pb-4 pt-3 text-primary-foreground shadow-lg">
        <div className="flex items-center gap-2">
          <Link to="/vanzeiro/viagens" search={{ v: v.id }} aria-label="Voltar" className="flex h-11 w-11 items-center justify-center rounded-xl"><ArrowLeft className="h-6 w-6" /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold">{nomeLinha} · Volta</p>
            <p className="truncate text-sm opacity-80">{vanNome}</p>
          </div>
        </div>
        {ida.encerrada ? <p className="mt-2 text-center text-3xl font-extrabold">Viagem concluída</p>
          : volta?.fase === "chamada" ? <p className="mt-2 text-center text-3xl font-extrabold">Chamada da volta</p>
          : (
            <>
              <p className="mt-2 text-center text-4xl font-extrabold">Ainda na van: <span className="text-accent">{ainda.length}</span></p>
              {ainda.length > 0 && <p className="mt-1 text-center text-sm opacity-90">{ainda.map((id) => primeiro(pas(id)!.nome)).join(", ")}</p>}
            </>
          )}
      </header>
      <div className="space-y-4 px-4 pt-4">
        {ida.encerrada ? <ResumoViagem ida={ida} passageiros={passageiros} />
          : volta?.fase === "chamada" ? <Chamada ida={ida} volta={volta} setVolta={setVolta} passageiros={passageiros} />
          : volta ? <EntregaVolta ida={ida} volta={volta} setVolta={setVolta} salvar={salvar} passageiros={passageiros} />
          : null}
      </div>
    </div>
  );
}

function Chamada({ ida, volta, setVolta, passageiros }: { ida: Ida; volta: Volta; setVolta: (v: Volta) => void; passageiros: Passageiro[] }) {
  const pas = (id: string) => passageiros.find((p) => p.id === id);
  const [naoVolta, setNaoVolta] = useState<Passageiro | null>(null);
  const [motivo, setMotivo] = useState<(typeof MOTIVOS)[number] | "">("");
  const [outro, setOutro] = useState("");
  const [conferir, setConferir] = useState(false);
  const [adicionar, setAdicionar] = useState(false);
  const [busca, setBusca] = useState("");

  const lista = chamadaVolta(ida, volta).map(pas).filter((p): p is Passageiro => !!p);
  const ficaram = ida.marcas.filter((m) => m.r === "ficou").map((m) => pas(m.pid)).filter((p): p is Passageiro => !!p);
  const pendentes = pendentesVolta(ida, volta).map(pas).filter((p): p is Passageiro => !!p);
  const st = volta.status;
  const marcar = (id: string, s: Volta["status"][string] | null) => {
    const n = { ...st };
    if (s) n[id] = s; else delete n[id];
    setVolta({ ...volta, status: n });
  };
  const tocar = (id: string) => marcar(id, st[id] ? null : { r: "na_van", via: "manual" });
  const simular = () => {
    const n = { ...st };
    pendentes.slice(0, Math.max(1, Math.ceil(pendentes.length / 2))).forEach((x) => { n[x.id] = { r: "na_van", via: "app" }; });
    setVolta({ ...volta, status: n }); toast.success("Confirmações simuladas");
  };
  const seguir = () => {
    if (pendentes.length) { toast.error(`${textoFaltam(pendentes.map((x) => primeiro(x.nome)))}`); return; }
    setVolta({ ...volta, fase: "entrega", ordem: rotaVolta(ida, volta) });
    toast.success("Rota de volta montada");
  };
  const fora = new Set([...chamadaVolta(ida, volta), ...ficaram.map((x) => x.id)]);
  const candidatos = passageiros.filter((p) => p.ativo && !fora.has(p.id) && p.nome.toLowerCase().includes(busca.toLowerCase()));
  const adicionarP = (p: Passageiro) => {
    const cobrou = cobrancaSoVolta(ida, p.id, p.formaPagamento, p.valor);
    if (cobrou) lancarCobranca(p.id, cobrou);
    setVolta({ ...volta, extras: [...volta.extras, { pid: p.id, cobrou }] });
    setAdicionar(false); setBusca("");
    toast.success(`${primeiro(p.nome)} entrou na volta${cobrou ? " · cobrança da viagem lançada" : ""}`);
  };

  const Pessoa = ({ p }: { p: Passageiro }) => {
    const s = st[p.id];
    return (
      <li className="flex items-stretch gap-2">
        <button onClick={() => tocar(p.id)} className={`flex min-h-16 flex-1 items-center gap-3 rounded-2xl px-4 text-left text-lg font-bold ${s?.r === "na_van" ? "bg-success text-success-foreground" : s?.r === "nao" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
          {s?.r === "na_van" ? <Check className="h-6 w-6" /> : s?.r === "nao" ? <UserX className="h-6 w-6" /> : <span className="h-6 w-6 rounded-full border-2 border-current" />}
          <span className="flex-1">{p.nome}{s?.r === "nao" && <span className="block text-sm font-semibold">{s.motivo}</span>}</span>
          {s?.r === "na_van" && s.via === "app" && <Smartphone className="h-5 w-5" aria-label="Confirmou pelo app" />}
          <span className="text-sm">{s?.r === "na_van" ? "Na van" : s?.r === "nao" ? "Não volta" : "Aguardando"}</span>
        </button>
        {!s && <button onClick={() => { setNaoVolta(p); setMotivo(""); setOutro(""); }} className="min-h-16 rounded-2xl border-2 border-destructive px-3 text-sm font-bold text-destructive">Não volta</button>}
      </li>
    );
  };

  return (
    <section className="space-y-4">
      {pendentes.length > 0 ? (
        <div className="rounded-3xl bg-destructive/15 p-4">
          <p className="text-xl font-extrabold text-destructive">{textoFaltam(pendentes.map((x) => primeiro(x.nome)))}</p>
          <ul className="mt-2 space-y-2">
            {pendentes.map((x) => (
              <li key={x.id} className="flex items-center gap-2"><span className="flex-1 font-bold">{x.nome}</span><Contatos p={x} msg={`${primeiro(x.nome)}, a van já vai voltar! Venha para a van, por favor.`} /></li>
            ))}
          </ul>
        </div>
      ) : <p className="rounded-3xl bg-success/15 p-4 text-center text-xl font-extrabold text-success">Todos marcados!</p>}

      <h2 className="text-xl font-extrabold">Toque no nome para marcar “Na van”</h2>
      <ul className="space-y-2">{lista.map((p) => <Pessoa key={p.id} p={p} />)}</ul>
      {lista.length === 0 && <p className="text-center text-muted-foreground">Ninguém embarcou na ida.</p>}

      {ficaram.length > 0 && (
        <div>
          <h3 className="mb-2 text-lg font-extrabold text-muted-foreground">Ficaram numa parada da ida</h3>
          <ul className="space-y-2">
            {ficaram.map((p) => (
              <li key={p.id}>
                <button onClick={() => tocar(p.id)} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left font-bold ${st[p.id] ? "bg-success text-success-foreground" : "bg-muted/60 text-muted-foreground"}`}>
                  {st[p.id] ? <Check className="h-5 w-5" /> : <span className="h-5 w-5 rounded-full border-2 border-current" />}
                  <span className="flex-1">{p.nome}</span>
                  <span className="text-sm">{st[p.id] ? "Na van" : "Tocar se encontrou a van"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BotaoGrande variante="contorno" onClick={() => setAdicionar(true)}><UserPlus className="h-5 w-5" /> Adicionar passageiro na volta</BotaoGrande>
      {pendentes.length > 0 && <BotaoGrande variante="contorno" onClick={() => setConferir(true)}>Contei todos</BotaoGrande>}
      <button onClick={seguir} className={`flex min-h-16 w-full items-center justify-center rounded-2xl text-xl font-extrabold ${pendentes.length ? "bg-muted text-muted-foreground" : "bg-success text-success-foreground"}`}>Seguir viagem</button>
      {pendentes.length > 0 && <button onClick={simular} className="w-full text-sm text-muted-foreground underline">Simular confirmações pelo app</button>}

      {conferir && (
        <Modal>
          <h3 className="text-xl font-extrabold">Você conferiu todos que estão na van?</h3>
          <BotaoGrande variante="destaque" onClick={() => { const n = { ...st }; pendentes.forEach((x) => { n[x.id] = { r: "na_van", via: "manual" }; }); setVolta({ ...volta, status: n }); setConferir(false); }}>Sim, todos estão</BotaoGrande>
          <BotaoGrande variante="contorno" onClick={() => setConferir(false)}>Não, voltar</BotaoGrande>
        </Modal>
      )}

      {naoVolta && (
        <Modal>
          <h3 className="text-xl font-extrabold">{primeiro(naoVolta.nome)} não volta</h3>
          <p className="font-bold text-muted-foreground">Por quê?</p>
          {MOTIVOS.map((m) => (
            <button key={m} onClick={() => setMotivo(m)} className={`min-h-14 w-full rounded-2xl px-4 text-left text-lg font-bold ${motivo === m ? "bg-primary text-primary-foreground" : "border-2 border-primary text-primary"}`}>{m}</button>
          ))}
          {motivo === "Outro" && <input className={campoClasse} placeholder="Escreva o motivo" value={outro} onChange={(e) => setOutro(e.target.value)} />}
          {motivo && (motivo !== "Outro" || outro.trim()) && (
            <BotaoGrande onClick={() => { marcar(naoVolta.id, { r: "nao", motivo: motivo === "Outro" ? outro.trim() : motivo }); setNaoVolta(null); }}>Confirmar</BotaoGrande>
          )}
          <BotaoGrande variante="contorno" onClick={() => setNaoVolta(null)}>Cancelar</BotaoGrande>
        </Modal>
      )}

      {adicionar && (
        <Modal>
          <h3 className="text-xl font-extrabold">Adicionar passageiro na volta</h3>
          <input className={campoClasse} placeholder="Buscar pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <ul className="divide-y">
            {candidatos.map((p) => (
              <li key={p.id}>
                <button onClick={() => adicionarP(p)} className="min-h-14 w-full py-2 text-left">
                  <b className="block">{p.nome}</b>
                  <span className="text-sm text-muted-foreground">{p.cidade}{p.formaPagamento === "por_viagem" ? ` · por viagem (${brl(p.valor)})` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
          {candidatos.length === 0 && <p className="text-muted-foreground">Ninguém encontrado.</p>}
          <BotaoGrande variante="contorno" onClick={() => setAdicionar(false)}>Fechar</BotaoGrande>
        </Modal>
      )}
    </section>
  );
}

function EntregaVolta({ ida, volta, setVolta, salvar, passageiros }: { ida: Ida; volta: Volta; setVolta: (v: Volta) => void; salvar: (i: Ida) => void; passageiros: Passageiro[] }) {
  const pas = (id: string) => passageiros.find((p) => p.id === id);
  const [outroLugar, setOutroLugar] = useState<Passageiro | null>(null);
  const [onde, setOnde] = useState("");
  const [novaParada, setNovaParada] = useState(false);
  const [faltaMarcar, setFaltaMarcar] = useState<string[] | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));

  const ainda = aindaNaVan(volta).filter((id) => pas(id));
  const prox = ainda[0] ? pas(ainda[0]) : undefined;
  const entregar = (p: Passageiro, r: "entregue" | "outro", lugar?: string) => {
    setVolta({ ...volta, entregas: [...volta.entregas, { pid: p.id, r, ...(lugar ? { onde: lugar } : {}) }] });
    toast.success(r === "entregue" ? `${primeiro(p.nome)} entregue` : `${primeiro(p.nome)} desceu em ${lugar}`);
  };
  const desfazer = () => { setVolta({ ...volta, entregas: volta.entregas.slice(0, -1) }); toast.success("Última marcação desfeita"); };
  const aoArrastar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const nova = arrayMove(ainda, ainda.indexOf(String(e.active.id)), ainda.indexOf(String(e.over.id)));
    setVolta({ ...volta, ordem: [...volta.entregas.map((x) => x.pid).filter((id) => volta.ordem.includes(id)), ...nova] });
  };
  const encerrar = () => {
    if (ainda.length) { setFaltaMarcar(ainda); return; }
    salvar({ ...ida, encerrada: Date.now() });
    toast.success("Viagem encerrada");
  };

  if (volta.parada) {
    return <ParadaAtual parada={volta.parada} bordo={ainda.map((id) => pas(id)!)} onMudar={(parada) => setVolta({ ...volta, parada })} onSeguir={(mot) => setVolta(encerrarParadaVolta(volta, mot, Date.now()))} />;
  }
  const rotas = partesRota(ainda.map((id) => enderecoCompleto(pas(id)!)));

  return (
    <>
      {prox ? (
        <section className="rounded-3xl border-4 border-accent bg-card p-5 shadow-lg">
          <p className="text-sm font-bold uppercase tracking-wide text-accent-strong">Próxima entrega</p>
          <h2 className="mt-1 text-2xl font-extrabold">{prox.nome}</h2>
          <p className="mt-1 flex items-start gap-2 text-lg"><MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />{enderecoCompleto(prox)}</p>
          {prox.referencia && <p className="mt-1 text-base text-muted-foreground">Referência: {prox.referencia}</p>}
          <a href={mapsPara(enderecoCompleto(prox))} target="_blank" rel="noreferrer" className="mt-4 flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground"><Navigation className="h-6 w-6" /> Navegar</a>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <a href={`tel:${prox.telefone.replace(/\D/g, "")}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary text-lg font-bold text-primary"><Phone className="h-5 w-5" /> Ligar</a>
            <a href={`${linkWhatsApp(prox.telefone)}?text=${encodeURIComponent(`Olá, ${primeiro(prox.nome)}! Estamos chegando na sua casa.`)}`} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-success text-lg font-bold text-success"><MessageCircle className="h-5 w-5" /> WhatsApp</a>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => entregar(prox, "entregue")} className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-success text-xl font-extrabold text-success-foreground"><Check className="h-7 w-7" /> Entregue</button>
            <button onClick={() => { setOutroLugar(prox); setOnde(""); }} className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-muted px-2 text-lg font-extrabold text-muted-foreground"><MapPin className="h-7 w-7" /> Desceu em outro lugar</button>
          </div>
        </section>
      ) : (
        <p className="rounded-3xl bg-success/15 p-6 text-center text-3xl font-extrabold text-success"><CheckCircle2 className="mx-auto mb-2 h-10 w-10" />Todos entregues</p>
      )}

      {ainda.length > 0 && rotas.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card text-lg font-bold text-primary">
          <RouteIcon className="h-5 w-5" /> Rota completa no Google Maps{rotas.length > 1 ? ` · Parte ${i + 1}` : ""}
        </a>
      ))}

      {ainda.length > 0 && <BotaoGrande variante="contorno" onClick={() => setNovaParada(true)}>Fazer parada no caminho</BotaoGrande>}
      <BotaoGrande variante={ainda.length ? "contorno" : "destaque"} onClick={encerrar}><Flag className="h-6 w-6" /> Encerrar viagem</BotaoGrande>
      {volta.entregas.length > 0 && (
        <button onClick={desfazer} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary underline"><Undo2 className="h-5 w-5" /> Desfazer última marcação</button>
      )}

      {ainda.length > 1 && (
        <section>
          <h3 className="mb-2 text-lg font-extrabold text-muted-foreground">Próximas entregas · arraste para mudar a ordem</h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoArrastar}>
            <SortableContext items={ainda} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">{ainda.map((id, i) => <ItemEntrega key={id} id={id} n={i + 1} p={pas(id)!} destaque={i === 0} />)}</ul>
            </SortableContext>
          </DndContext>
        </section>
      )}

      {volta.entregas.length > 0 && (
        <section>
          <h3 className="mb-2 text-lg font-extrabold text-muted-foreground">Já desceram</h3>
          <ul className="space-y-2">
            {volta.entregas.filter((e) => pas(e.pid)).map((e) => (
              <li key={e.pid} className={`flex items-center gap-3 rounded-2xl p-4 ${e.r === "entregue" ? "bg-success/15" : "bg-muted"}`}>
                {e.r === "entregue" ? <Check className="h-6 w-6 text-success" /> : <MapPin className="h-6 w-6 text-muted-foreground" />}
                <span className="flex-1 font-bold">{pas(e.pid)?.nome}</span>
                <span className="text-right text-sm font-bold text-muted-foreground">{e.r === "entregue" ? "Entregue" : e.r === "ficou" ? "Ficou na parada" : `Desceu em ${e.onde}`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {novaParada && <IniciarParada onFechar={() => setNovaParada(false)} onIniciar={(minutos, local) => { setVolta({ ...volta, parada: { inicio: Date.now(), minutos, local, chamada: false, naVan: {} } }); setNovaParada(false); toast.success(`Parada de ${minutos} minutos`); }} />}

      {outroLugar && (
        <Modal>
          <h3 className="text-xl font-extrabold">Onde {primeiro(outroLugar.nome)} desceu?</h3>
          <input className={campoClasse} placeholder="Ex.: Praça da Matriz" value={onde} onChange={(e) => setOnde(e.target.value)} autoFocus />
          {onde.trim() && <BotaoGrande onClick={() => { entregar(outroLugar, "outro", onde.trim()); setOutroLugar(null); }}>Confirmar</BotaoGrande>}
          <BotaoGrande variante="contorno" onClick={() => setOutroLugar(null)}>Cancelar</BotaoGrande>
        </Modal>
      )}

      {faltaMarcar && (
        <Modal>
          <h3 className="text-xl font-extrabold text-destructive">Ainda tem gente na van</h3>
          <p className="text-lg">Marque antes de encerrar: <b>{faltaMarcar.map((id) => pas(id)?.nome).join(", ")}</b></p>
          <BotaoGrande onClick={() => setFaltaMarcar(null)}>Entendi</BotaoGrande>
        </Modal>
      )}
    </>
  );
}

function ItemEntrega({ id, n, p, destaque }: { id: string; n: number; p: Passageiro; destaque: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ${destaque ? "ring-2 ring-accent" : ""} ${isDragging ? "z-10 opacity-80 shadow-lg" : ""}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-base font-extrabold text-primary-foreground">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{p.nome}</p>
        <p className="truncate text-sm text-muted-foreground">{p.cidade}{p.bairro ? ` · ${p.bairro}` : ""}</p>
      </div>
      <button {...attributes} {...listeners} aria-label={`Arrastar ${p.nome}`} className="flex h-12 w-12 touch-none items-center justify-center rounded-xl text-muted-foreground"><GripVertical className="h-6 w-6" /></button>
    </li>
  );
}

/** Resumo da viagem concluída (usado na tela da viagem e na ficha). */
export function ResumoViagem({ ida, passageiros }: { ida: Ida; passageiros: Passageiro[] }) {
  const nome = (id: string) => passageiros.find((p) => p.id === id)?.nome ?? "Passageiro";
  const volta = ida.volta;
  const embarcaram = ida.marcas.filter((m) => m.r !== "faltou").length + (volta?.extras.length ?? 0);
  const entregues = volta?.entregas.filter((e) => e.r !== "ficou").length ?? 0;
  const naoVoltaram = volta ? Object.entries(volta.status).flatMap(([pid, s]) => (s.r === "nao" ? [{ pid, motivo: s.motivo }] : [])) : [];
  const paradas = [...(ida.paradas ?? []).map((p) => ({ ...p, trecho: "Ida" })), ...(volta?.paradas ?? []).map((p) => ({ ...p, trecho: "Volta" }))];
  const ficaram = paradas.flatMap((p) => p.ficaram.map((f) => ({ ...f, trecho: p.trecho })));
  const cobrancas = [...ida.marcas.filter((m) => m.cobrou > 0), ...(volta?.extras.filter((e) => e.cobrou > 0) ?? [])];
  const L = ({ r, v }: { r: string; v: React.ReactNode }) => <div className="flex justify-between gap-3 py-2"><span className="text-muted-foreground">{r}</span><b className="text-right">{v}</b></div>;
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
      <h2 className="text-xl font-extrabold text-primary">Resumo da viagem</h2>
      <div className="divide-y text-lg">
        <L r="Saída" v={ida.inicio ? horaDe(ida.inicio) : "—"} />
        <L r="Chegada" v={ida.encerrada ? horaDe(ida.encerrada) : "—"} />
        <L r="Embarcaram" v={embarcaram} />
        <L r="Entregues" v={entregues} />
        <L r="Total da viagem" v={brl(totalCobrado(ida))} />
      </div>
      {naoVoltaram.length > 0 && <div><p className="font-extrabold">Não voltaram</p>{naoVoltaram.map((n) => <p key={n.pid}>{nome(n.pid)} — {n.motivo}</p>)}</div>}
      {ficaram.length > 0 && <div><p className="font-extrabold">Ficaram em parada</p>{ficaram.map((f, i) => <p key={i}>{nome(f.pid)} ({f.trecho}, {f.hora}) — {f.motivo}</p>)}</div>}
      <div>
        <p className="font-extrabold">Paradas feitas</p>
        {paradas.length === 0 ? <p className="text-muted-foreground">Nenhuma</p> : paradas.map((p, i) => <p key={i}>{p.trecho} · {horaDe(p.inicio)} · {p.local || "Sem local"} · {p.minutos} min</p>)}
      </div>
      <div>
        <p className="font-extrabold">Cobranças criadas</p>
        {cobrancas.length === 0 ? <p className="text-muted-foreground">Nenhuma</p> : cobrancas.map((c, i) => <p key={i} className="flex justify-between"><span>{nome(c.pid)}</span><b>{brl(c.cobrou)}</b></p>)}
      </div>
    </section>
  );
}
