import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Bus, Clock, MessageCircle, Play, Repeat, Share2, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { prazoViagem } from "@/data/alertas";
import { useFrota, useViagens, ajustarViagem, type Passageiro } from "@/data/store";
import { definirResposta, sobram, aplicarNovaVan, rotuloDia, horaDe, diaSemana, dataCurta, type Viagem, type Situacao, type Resposta, type Ajuste } from "@/data/viagens";
import { linkWhatsApp } from "@/lib/validacao";
import { ResumoViagem } from "@/components/app/ResumoViagem";
import { textoManifesto } from "@/data/manifesto";
import { compartilharTexto } from "@/lib/compartilhar";
import { Painel, Campo, campoClasse, BotaoGrande, Confirmar } from "@/components/app/Formulario";

export const Route = createFileRoute("/vanzeiro/viagens")({
  validateSearch: (s: Record<string, unknown>): { v?: string } => (typeof s["v"] === "string" ? { v: s["v"] } : {}),
  head: () => ({
    meta: [
      { title: "Viagens · O Vanzeiro" },
      { name: "description", content: "Viagens das próximas semanas: confirmações, lotação e lista de espera." },
      { property: "og:title", content: "Viagens · O Vanzeiro" },
      { property: "og:description", content: "Viagens das próximas semanas: confirmações, lotação e lista de espera." },
    ],
  }),
  component: Viagens,
});

const SITUACAO: Record<Situacao, { nome: string; cls: string }> = {
  agendada: { nome: "Agendada", cls: "bg-primary/10 text-primary" },
  lotada: { nome: "Lotada", cls: "bg-accent/25 text-accent-strong" },
  andamento: { nome: "Em andamento", cls: "bg-primary text-primary-foreground" },
  concluida: { nome: "Concluída", cls: "bg-success/15 text-success" },
  cancelada: { nome: "Cancelada", cls: "bg-destructive/15 text-destructive" },
};
const primeiro = (n: string) => n.split(" (")[0]!.split(" ")[0]!;
const zap = (tel: string, msg: string) => `${linkWhatsApp(tel)}?text=${encodeURIComponent(msg)}`;

function Barra({ v }: { v: Viagem }) {
  const pct = v.lugares ? Math.min(100, Math.round((v.vao.length / v.lugares) * 100)) : 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-base font-bold"><span>Confirmados</span><span>{v.vao.length} de {v.lugares || "?"}</span></div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${v.situacao === "lotada" ? "bg-accent" : "bg-success"}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Viagens() {
  const { v: abertaId } = Route.useSearch();
  const navigate = useNavigate({ from: "/vanzeiro/viagens" });
  const { linhas, vans, motoristas } = useFrota();
  const viagens = useViagens();
  const [aba, setAba] = useState<"proximas" | "anteriores">("proximas");
  const agora = new Date();

  const lista = aba === "proximas" ? viagens.filter((v) => !v.passada) : viagens.filter((v) => v.passada).reverse();
  const grupos = lista.reduce<Record<string, Viagem[]>>((g, v) => ((g[v.data] ??= []).push(v), g), {});
  const nomeLinha = (id: string) => linhas.find((l) => l.id === id)?.nome ?? "";
  const aberta = viagens.find((v) => v.id === abertaId);
  const abrir = (id?: string) => navigate({ search: id ? { v: id } : {} });

  return (
    <div className="px-5 pt-6">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-extrabold text-primary">Viagens</h1>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
        {(["proximas", "anteriores"] as const).map((a) => (
          <button key={a} onClick={() => setAba(a)} className={`min-h-12 rounded-xl text-lg font-bold ${aba === a ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>
            {a === "proximas" ? "Próximas" : "Anteriores"}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-5">
        {Object.entries(grupos).map(([data, vs]) => (
          <section key={data}>
            <h2 className="mb-2 text-lg font-extrabold text-muted-foreground">{rotuloDia(data, agora)}</h2>
            <ul className="space-y-3">
              {vs.map((v) => (
                <li key={v.id}>
                  <button onClick={() => abrir(v.id)} className="w-full rounded-3xl bg-card p-4 text-left shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-lg font-extrabold leading-tight">{nomeLinha(v.linhaId)}</p>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${SITUACAO[v.situacao].cls}`}>{SITUACAO[v.situacao].nome}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Saída {v.saida || "—"}</p>
                    <p className="flex items-center gap-2 text-base text-muted-foreground"><Bus className="h-4 w-4" /> {vans.find((x) => x.id === v.vanId)?.apelido ?? "Sem van"} · {motoristas.find((m) => m.id === v.motoristaId)?.nome ?? "Sem motorista"}</p>
                    <Barra v={v} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {lista.length === 0 && <p className="py-6 text-center text-lg text-muted-foreground">Nenhuma viagem por aqui.</p>}
      </div>

      {aberta && <FichaViagem v={aberta} onFechar={() => abrir()} />}
    </div>
  );
}

function FichaViagem({ v, onFechar }: { v: Viagem; onFechar: () => void }) {
  const { linhas, vans, motoristas, passageiros } = useFrota();
  const [tocado, setTocado] = useState<Passageiro | null>(null);
  const [lembrar, setLembrar] = useState(false);
  const [adicionar, setAdicionar] = useState(false);
  const [trocar, setTrocar] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const [avisarCancel, setAvisarCancel] = useState(false);
  const [construcao, setConstrucao] = useState(false);

  const linha = linhas.find((l) => l.id === v.linhaId);
  const van = vans.find((x) => x.id === v.vanId);
  const pas = (id: string) => passageiros.find((p) => p.id === id)!;
  const quando = `${diaSemana(v.data).toLowerCase()}, ${dataCurta(v.data)}`;
  const editavel = !v.passada;

  const responder = (p: Passageiro, r: Exclude<Resposta, "espera">) => {
    const res = definirResposta(v.ajuste, p.id, r, v.lugares);
    ajustarViagem(v.id, res.ajuste);
    setTocado(null);
    if (res.subiu) toast.success(`${primeiro(pas(res.subiu).nome)} entrou na viagem no lugar de ${primeiro(p.nome)}`);
    else if (res.foiParaEspera) toast.success(`${primeiro(p.nome)} foi para a lista de espera`);
    else toast.success("Resposta salva");
  };

  const grupos: { titulo: string; ids: string[]; cor: string }[] = [
    { titulo: "Vão", ids: v.vao, cor: "bg-success" },
    { titulo: "Sem resposta", ids: v.sem, cor: "bg-muted-foreground" },
    { titulo: "Não vão", ids: v.nao, cor: "bg-destructive" },
    { titulo: "Lista de espera", ids: v.espera, cor: "bg-accent" },
  ];

  return (
    <Painel titulo={linha?.nome ?? "Viagem"} onFechar={onFechar}>
      <div className="rounded-3xl bg-primary p-5 text-primary-foreground">
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${v.situacao === "andamento" ? "bg-accent text-accent-foreground" : "bg-primary-foreground text-primary"}`}>{SITUACAO[v.situacao].nome}</span>
        <p className="mt-3 text-xl font-extrabold">{rotuloDia(v.data, new Date())} · {v.saida}</p>
        <p className="mt-1 opacity-90">{van?.apelido ?? "Sem van"} ({v.lugares} lugares) · {motoristas.find((m) => m.id === v.motoristaId)?.nome ?? "Sem motorista"}</p>
        <p className="mt-2 text-sm font-semibold text-accent">{prazoViagem(v.data, new Date()).rotulo}</p>
      </div>
      <Barra v={v} />

      {(editavel || v.ajuste.ida) && !v.ajuste.cancelada && (
        <Link to="/ida/$viagemId" params={{ viagemId: v.id }} className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-xl font-extrabold text-accent-foreground"><Play className="h-6 w-6" /> {v.ajuste.ida ? "Abrir viagem" : "Iniciar viagem"}</Link>
      )}

      {!v.ajuste.cancelada && v.vao.length > 0 && (
        <BotaoGrande variante="contorno" onClick={async () => {
          const r = await compartilharTexto(textoManifesto({ viagem: v, linha, van, motorista: motoristas.find((m) => m.id === v.motoristaId), passageiros }), `Lista da viagem — ${linha?.nome ?? ""}`);
          if (r === "whatsapp") toast.success("Abrindo o WhatsApp com a lista");
        }}><Share2 className="h-5 w-5" /> Compartilhar lista da viagem</BotaoGrande>
      )}

      {v.ajuste.ida?.encerrada && <ResumoViagem ida={v.ajuste.ida} passageiros={passageiros} />}

      {grupos.map((g) => g.ids.length > 0 && (
        <section key={g.titulo}>
          <h3 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><span className={`h-4 w-4 rounded-full ${g.cor}`} /> {g.titulo} ({g.ids.length})</h3>
          <ul className="divide-y rounded-2xl bg-card px-4 shadow-sm">
            {g.ids.map((id, i) => {
              const p = pas(id);
              return (
                <li key={id} className="flex items-center gap-2 py-2">
                  <button disabled={!editavel} onClick={() => setTocado(p)} className="min-h-12 flex-1 text-left">
                    <p className="font-bold">{g.titulo === "Lista de espera" ? `${i + 1}º · ` : ""}{p.nome}</p>
                    <p className="text-sm text-muted-foreground">{p.cidade}{v.ajuste.extras.includes(id) ? " · só nesta viagem" : ""}</p>
                  </button>
                  <a href={linkWhatsApp(p.telefone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${p.nome}`} className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/15 text-success"><MessageCircle className="h-6 w-6" /></a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {(v.ajuste.ida?.paradas?.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 text-lg font-extrabold">Paradas</h3>
          <ul className="space-y-2">
            {v.ajuste.ida!.paradas!.map((pa, i) => (
              <li key={i} className="rounded-2xl bg-card p-4 shadow-sm">
                <p className="font-bold">{horaDe(pa.inicio)} · {pa.local || "Sem local"} · {pa.minutos} min</p>
                {pa.ficaram.length === 0 ? <p className="text-sm text-success">Todos voltaram para a van</p>
                  : pa.ficaram.map((f) => <p key={f.pid} className="text-sm text-destructive">{passageiros.find((x) => x.id === f.pid)?.nome ?? "Passageiro"} ficou na parada às {f.hora} — {f.motivo}</p>)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {v.passageiroIds.length === 0 && <p className="text-center text-muted-foreground">Nenhum passageiro nesta viagem.</p>}

      {editavel && (
        <div className="space-y-3 pt-2">
          <BotaoGrande variante="contorno" onClick={() => setLembrar(true)}><Bell className="h-5 w-5" /> Lembrar quem não respondeu</BotaoGrande>
          <BotaoGrande variante="contorno" onClick={() => setAdicionar(true)}><UserPlus className="h-5 w-5" /> Adicionar passageiro só nesta viagem</BotaoGrande>
          <BotaoGrande variante="contorno" onClick={() => setTrocar(true)}><Repeat className="h-5 w-5" /> Trocar van ou motorista</BotaoGrande>
          <BotaoGrande variante="perigo" onClick={() => setCancelar(true)}><XCircle className="h-5 w-5" /> Cancelar viagem</BotaoGrande>
        </div>
      )}

      {tocado && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-extrabold">{tocado.nome}</h3>
            <p className="text-muted-foreground">Qual a resposta para a viagem de {quando}?</p>
            <button onClick={() => responder(tocado, "vai")} className="min-h-14 w-full rounded-2xl bg-success text-lg font-bold text-success-foreground">Vai</button>
            <button onClick={() => responder(tocado, "nao")} className="min-h-14 w-full rounded-2xl bg-destructive text-lg font-bold text-destructive-foreground">Não vai</button>
            <BotaoGrande variante="contorno" onClick={() => responder(tocado, "sem")}>Sem resposta</BotaoGrande>
            <button onClick={() => setTocado(null)} className="w-full py-2 font-semibold text-muted-foreground">Fechar</button>
          </div>
        </div>
      )}

      {lembrar && (
        <Painel titulo="Lembrar quem não respondeu" onFechar={() => setLembrar(false)}>
          {v.sem.length === 0 && <p className="text-center text-lg text-muted-foreground">Todo mundo já respondeu.</p>}
          <ul className="space-y-2">
            {v.sem.map((id) => {
              const p = pas(id);
              const msg = `Olá, ${primeiro(p.nome)}! Você vai na viagem de ${quando}? Responda pelo app O Vanzeiro ou aqui mesmo.`;
              return (
                <li key={id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
                  <span className="flex-1 font-bold">{p.nome}</span>
                  <a href={zap(p.telefone, msg)} target="_blank" rel="noreferrer" onClick={() => toast.success("Lembrete aberto no WhatsApp")} className="flex min-h-12 items-center gap-2 rounded-xl bg-success px-4 font-bold text-success-foreground"><MessageCircle className="h-5 w-5" /> Lembrar</a>
                </li>
              );
            })}
          </ul>
        </Painel>
      )}

      {adicionar && (
        <Painel titulo="Só nesta viagem" onFechar={() => setAdicionar(false)}>
          <ul className="space-y-2">
            {passageiros.filter((p) => !v.passageiroIds.includes(p.id)).map((p) => (
              <li key={p.id}>
                <button onClick={() => { ajustarViagem(v.id, { ...v.ajuste, extras: [...v.ajuste.extras, p.id] }); setAdicionar(false); toast.success(`${primeiro(p.nome)} adicionado nesta viagem`); }}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-card px-4 text-left shadow-sm">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <span><b className="block">{p.nome}</b><span className="text-sm text-muted-foreground">{p.cidade}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </Painel>
      )}

      {trocar && <TrocarVan v={v} onFechar={() => setTrocar(false)} />}

      {cancelar && (
        <Confirmar titulo="Cancelar esta viagem?" texto={`A viagem de ${quando} será cancelada. ${v.vao.length} passageiros estão confirmados.`}
          onNao={() => setCancelar(false)}
          onSim={() => { ajustarViagem(v.id, { ...v.ajuste, cancelada: true }); setCancelar(false); toast.success("Viagem cancelada"); if (v.vao.length) setAvisarCancel(true); }} />
      )}

      {avisarCancel && (
        <Painel titulo="Avisar os confirmados" onFechar={() => setAvisarCancel(false)}>
          <p className="text-lg text-muted-foreground">Toque para avisar cada um pelo WhatsApp.</p>
          <ul className="space-y-2">
            {v.vao.map((id) => {
              const p = pas(id);
              const msg = `Olá, ${primeiro(p.nome)}! A viagem de ${quando} (${linha?.nome ?? ""}) foi cancelada. Qualquer dúvida, fale comigo.`;
              return (
                <li key={id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
                  <span className="flex-1 font-bold">{p.nome}</span>
                  <a href={zap(p.telefone, msg)} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-2 rounded-xl bg-success px-4 font-bold text-success-foreground"><MessageCircle className="h-5 w-5" /> Avisar</a>
                </li>
              );
            })}
          </ul>
        </Painel>
      )}

      {construcao && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6 text-center">
            <p className="text-xl font-extrabold">Em construção</p>
            <p className="text-lg text-muted-foreground">Iniciar a viagem chega nas próximas etapas.</p>
            <BotaoGrande onClick={() => setConstrucao(false)}>Entendi</BotaoGrande>
          </div>
        </div>
      )}
    </Painel>
  );
}

function TrocarVan({ v, onFechar }: { v: Viagem; onFechar: () => void }) {
  const { vans, motoristas } = useFrota();
  const [vanId, setVanId] = useState(v.vanId);
  const [motId, setMotId] = useState(v.motoristaId);
  const [aviso, setAviso] = useState<number | null>(null);
  const nova = vans.find((x) => x.id === vanId);

  const aplicar = () => {
    let aj: Ajuste = { ...v.ajuste, motoristaId: motId };
    if (vanId !== v.vanId) aj = aplicarNovaVan(aj, vanId, nova?.lugares ?? 0);
    ajustarViagem(v.id, aj);
    toast.success("Viagem atualizada");
    onFechar();
  };
  const salvar = () => {
    const s = vanId !== v.vanId ? sobram(v.ajuste, nova?.lugares ?? 0) : 0;
    if (s > 0) setAviso(s); else aplicar();
  };

  return (
    <Painel titulo="Trocar só nesta viagem" onFechar={onFechar}>
      <Campo label="Van">
        <select className={campoClasse} value={vanId} onChange={(e) => setVanId(e.target.value)}>
          {vans.map((x) => <option key={x.id} value={x.id}>{x.apelido} ({x.lugares} lugares)</option>)}
        </select>
      </Campo>
      <Campo label="Motorista">
        <select className={campoClasse} value={motId} onChange={(e) => setMotId(e.target.value)}>
          <option value="">Nenhum</option>
          {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </Campo>
      <BotaoGrande onClick={salvar}>Salvar</BotaoGrande>
      {aviso !== null && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-extrabold">Vai faltar lugar</h3>
            <p className="text-lg text-muted-foreground">A {nova?.apelido} tem {nova?.lugares} lugares. <b className="text-foreground">{aviso} {aviso === 1 ? "pessoa confirmada sobra" : "pessoas confirmadas sobram"}</b> e {aviso === 1 ? "vai" : "vão"} para o começo da lista de espera.</p>
            <BotaoGrande onClick={aplicar}>Trocar mesmo assim</BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => setAviso(null)}>Voltar</BotaoGrande>
          </div>
        </div>
      )}
    </Painel>
  );
}
