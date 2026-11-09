import { useEffect, useState } from "react";
import { useModoDemo } from "@/lib/modoDemo";
import { AlertTriangle, Check, Copy, MessageCircle, Phone, Smartphone } from "lucide-react";
import { toast } from "sonner";
import type { Passageiro } from "@/data/store";
import { avisoParada, saidaParada, textoFaltam, type ParadaAtiva } from "@/data/viagens";
import { linkWhatsApp } from "@/lib/validacao";
import { BotaoGrande, campoClasse } from "@/components/app/Formulario";

const primeiro = (n: string) => n.split(" (")[0]!.split(" ")[0]!;
const MINUTOS = [10, 15, 20, 30];

/** Escolha da duração e local da parada. */
export function IniciarParada({ onIniciar, onFechar }: { onIniciar: (min: number, local: string) => void; onFechar: () => void }) {
  const [min, setMin] = useState(15);
  const [local, setLocal] = useState("");
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
        <h3 className="text-2xl font-extrabold">Fazer parada</h3>
        <p className="text-lg font-bold text-muted-foreground">Quanto tempo?</p>
        <div className="grid grid-cols-4 gap-2">
          {MINUTOS.map((m) => (
            <button key={m} onClick={() => setMin(m)} className={`min-h-16 rounded-2xl text-xl font-extrabold ${min === m ? "bg-primary text-primary-foreground" : "border-2 border-primary text-primary"}`}>{m}<span className="block text-xs">min</span></button>
          ))}
        </div>
        <input className={campoClasse} placeholder="Local (opcional) — ex.: Posto em Cornélio" value={local} onChange={(e) => setLocal(e.target.value)} />
        <BotaoGrande variante="destaque" onClick={() => onIniciar(min, local.trim())}>Começar parada de {min} min</BotaoGrande>
        <BotaoGrande variante="contorno" onClick={onFechar}>Voltar</BotaoGrande>
      </div>
    </div>
  );
}

/** Parada em andamento: contagem regressiva e chamada antes de sair. */
export function ParadaAtual({ parada: p, bordo, onMudar, onSeguir }: { parada: ParadaAtiva; bordo: Passageiro[]; onMudar: (p: ParadaAtiva) => void; onSeguir: (motivo: string) => void }) {
  const [agora, setAgora] = useState(() => Date.now());
  const [conferir, setConferir] = useState(false);
  const [alerta, setAlerta] = useState(false);
  const [motivo, setMotivo] = useState<"" | "conta" | "outro">("");
  const [outro, setOutro] = useState("");
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);

  const saida = saidaParada(p.inicio, p.minutos);
  const resta = Math.max(0, p.inicio + p.minutos * 60000 - agora);
  const mm = Math.floor(resta / 60000), ss = Math.floor((resta % 60000) / 1000);
  const aviso = avisoParada(p.minutos, saida);
  const faltando = bordo.filter((x) => !p.naVan[x.id]);
  const modoDemo = useModoDemo();
  const mudar = (naVan: Record<string, "manual" | "app">) => onMudar({ ...p, naVan });

  const alternar = (id: string) => { const n = { ...p.naVan }; if (n[id]) delete n[id]; else n[id] = "manual"; mudar(n); };
  const simular = () => {
    const n = { ...p.naVan };
    faltando.slice(0, Math.max(1, Math.ceil(faltando.length / 2))).forEach((x) => { n[x.id] = "app"; });
    mudar(n); toast.success("Confirmações simuladas");
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(aviso); toast.success("Aviso copiado. Cole no grupo do WhatsApp."); } catch { toast.error("Não deu para copiar"); } };
  const seguir = (mot: string) => {
    onSeguir(mot);
    toast.success(faltando.length && mot ? `Viagem retomada · ${faltando.length} ficou na parada` : "Viagem retomada");
  };

  if (!p.chamada) {
    return (
      <section className="space-y-4 rounded-3xl border-4 border-accent bg-card p-5 text-center shadow-lg">
        <p className="text-2xl font-extrabold">Parada — saída às {saida}</p>
        {p.local && <p className="text-lg text-muted-foreground">{p.local}</p>}
        <p className={`text-7xl font-extrabold tabular-nums ${resta <= 5 * 60000 ? "text-destructive" : "text-primary"}`}>{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</p>
        {resta <= 5 * 60000 && resta > 0 && <p className="rounded-2xl bg-accent/20 p-3 text-xl font-extrabold text-accent-strong">Faltam 5 minutos para sair</p>}
        {resta === 0 && <p className="rounded-2xl bg-destructive/15 p-3 text-xl font-extrabold text-destructive">Hora de sair!</p>}
        <BotaoGrande variante="contorno" onClick={copiar}><Copy className="h-5 w-5" /> Copiar aviso</BotaoGrande>
        <p className="text-sm text-muted-foreground">“{aviso}”</p>
        <BotaoGrande variante="destaque" onClick={() => onMudar({ ...p, chamada: true })}>Retomar viagem</BotaoGrande>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {faltando.length > 0 ? (
        <div className="rounded-3xl bg-destructive/15 p-4">
          <p className="text-xl font-extrabold text-destructive">{textoFaltam(faltando.map((x) => primeiro(x.nome)))}</p>
          <ul className="mt-2 space-y-2">
            {faltando.map((x) => (
              <li key={x.id} className="flex items-center gap-2">
                <span className="flex-1 font-bold">{x.nome}</span>
                <a href={`tel:${x.telefone.replace(/\D/g, "")}`} className="flex min-h-12 items-center gap-1 rounded-xl border-2 border-primary px-3 font-bold text-primary"><Phone className="h-4 w-4" /> Ligar</a>
                <a href={`${linkWhatsApp(x.telefone)}?text=${encodeURIComponent(`${primeiro(x.nome)}, a van já vai sair! Volte para a van, por favor.`)}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-1 rounded-xl border-2 border-success px-3 font-bold text-success"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-3xl bg-success/15 p-4 text-center text-xl font-extrabold text-success">Todos na van!</p>
      )}

      <h2 className="text-xl font-extrabold">Chamada · toque no nome</h2>
      <ul className="space-y-2">
        {bordo.map((x) => {
          const st = p.naVan[x.id];
          return (
            <li key={x.id}>
              <button onClick={() => alternar(x.id)} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 text-left text-lg font-bold ${st ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                {st ? <Check className="h-6 w-6" /> : <span className="h-6 w-6 rounded-full border-2 border-current" />}
                <span className="flex-1">{x.nome}</span>
                {st === "app" && <Smartphone className="h-5 w-5" aria-label="Confirmou pelo app" />}
                <span className="text-sm">{st ? "Na van" : "Aguardando"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {bordo.length === 0 && <p className="text-center text-muted-foreground">Ninguém na van agora.</p>}

      {faltando.length > 0 && <BotaoGrande variante="contorno" onClick={() => setConferir(true)}>Contei todos</BotaoGrande>}
      <button onClick={() => (faltando.length ? setAlerta(true) : seguir(""))}
        className={`flex min-h-16 w-full items-center justify-center rounded-2xl text-xl font-extrabold ${faltando.length ? "bg-muted text-muted-foreground" : "bg-success text-success-foreground"}`}>Seguir viagem</button>
      {modoDemo && faltando.length > 0 && <button onClick={simular} className="w-full text-sm text-muted-foreground underline">Simular confirmações pelo app</button>}

      {conferir && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-extrabold">Você conferiu todos que estão na van?</h3>
            <BotaoGrande variante="destaque" onClick={() => { const n = { ...p.naVan }; bordo.forEach((x) => { n[x.id] ??= "manual"; }); mudar(n); setConferir(false); }}>Sim, todos estão</BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => setConferir(false)}>Não, voltar</BotaoGrande>
          </div>
        </div>
      )}

      {alerta && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl border-4 border-destructive bg-card p-6">
            <h3 className="flex items-center gap-2 text-2xl font-extrabold text-destructive"><AlertTriangle className="h-7 w-7" /> Tem gente faltando!</h3>
            <p className="text-lg font-bold">{faltando.map((x) => x.nome).join(", ")}</p>
            <BotaoGrande onClick={() => { setAlerta(false); setMotivo(""); }}>Esperar</BotaoGrande>
            <p className="pt-2 font-bold text-muted-foreground">Seguir mesmo assim — por quê?</p>
            {(["conta", "outro"] as const).map((m) => (
              <button key={m} onClick={() => setMotivo(m)} className={`min-h-14 w-full rounded-2xl px-4 text-left text-lg font-bold ${motivo === m ? "bg-primary text-primary-foreground" : "border-2 border-primary text-primary"}`}>
                {m === "conta" ? "Avisou que vai seguir por conta própria" : "Outro"}
              </button>
            ))}
            {motivo === "outro" && <input className={campoClasse} placeholder="Escreva o motivo" value={outro} onChange={(e) => setOutro(e.target.value)} />}
            {(motivo === "conta" || (motivo === "outro" && outro.trim())) && (
              <BotaoGrande variante="perigo" onClick={() => { setAlerta(false); seguir(motivo === "conta" ? "Avisou que vai seguir por conta própria" : outro.trim()); }}>Seguir mesmo assim</BotaoGrande>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
