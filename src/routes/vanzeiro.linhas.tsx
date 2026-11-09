import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Clock, MapPinned, Pause, Pencil, Play, Plus, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  useFrota, salvarLinha, alternarLinha, excluirLinha, colocarNaLinha, tirarDaLinha,
  DIAS, TIPOS_LINHA, type Linha, type Passageiro,
} from "@/data/store";
import { validarLinha } from "@/lib/validacao";
import { Painel, Campo, campoClasse, BotaoGrande, Confirmar, Linha as Item } from "@/components/app/Formulario";

export const Route = createFileRoute("/vanzeiro/linhas")({
  head: () => ({
    meta: [
      { title: "Linhas · O Vanzeiro" },
      { name: "description", content: "Suas linhas: dias, horários, trajeto, van e passageiros." },
      { property: "og:title", content: "Linhas · O Vanzeiro" },
      { property: "og:description", content: "Suas linhas: dias, horários, trajeto, van e passageiros." },
    ],
  }),
  component: Linhas,
});

const brl = (v: number | null) => (v ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "");
const dataBR = (d: string) => (d ? d.split("-").reverse().join("/") : "");
const diasTexto = (l: Linha) =>
  l.frequencia === "unica" ? `Viagem única · ${dataBR(l.data)}` : DIAS.filter((d) => l.dias.includes(d.id)).map((d) => d.curto).join(", ");
const devendo = (p: Passageiro) => p.situacao === "atrasado_1_semana";

function Etiqueta({ children, tom = "primario" }: { children: React.ReactNode; tom?: "primario" | "verde" | "cinza" }) {
  const c = { primario: "bg-primary/10 text-primary", verde: "bg-success/15 text-success", cinza: "bg-muted text-muted-foreground" }[tom];
  return <span className={`rounded-full px-3 py-1 text-sm font-bold ${c}`}>{children}</span>;
}

function Linhas() {
  const { linhas, vans, motoristas, passageiros } = useFrota();
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Linha | "nova" | null>(null);
  const [excluindo, setExcluindo] = useState<Linha | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [tirando, setTirando] = useState<Passageiro | null>(null);

  const van = (id: string) => vans.find((v) => v.id === id);
  const mot = (id: string) => motoristas.find((m) => m.id === id)?.nome ?? "";
  const dela = (id: string) => passageiros.filter((p) => p.linhaId === id);
  const aberta = linhas.find((l) => l.id === abertaId);

  const Ocupacao = ({ l }: { l: Linha }) => {
    const n = dela(l.id).length, lug = van(l.vanId)?.lugares ?? 0;
    return (
      <>
        <b>{n} de {lug || "?"}</b>
        {lug > 0 && n > lug && <span className="mt-2 block rounded-xl bg-accent/25 px-3 py-2 text-sm font-bold text-accent-strong">Passou do número de lugares da van</span>}
      </>
    );
  };

  return (
    <div className="px-5 pt-6">
      <Toaster position="top-center" />
      <Link to="/vanzeiro/mais" className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-primary"><ArrowLeft className="h-5 w-5" /> Voltar</Link>
      <h1 className="text-3xl font-extrabold text-primary">Linhas</h1>
      <div className="mt-5"><BotaoGrande variante="destaque" onClick={() => setEditando("nova")}><Plus className="h-6 w-6" /> Nova linha</BotaoGrande></div>

      <ul className="mt-5 space-y-4">
        {linhas.map((l) => (
          <li key={l.id}>
            <button onClick={() => setAbertaId(l.id)} className={`w-full rounded-3xl bg-card p-5 text-left shadow-sm ${l.ativa ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Etiqueta>{l.tipo}</Etiqueta>
                <Etiqueta tom={l.ativa ? "verde" : "cinza"}>{l.ativa ? "Ativa" : "Pausada"}</Etiqueta>
              </div>
              <p className="mt-2 text-xl font-extrabold">{l.nome}</p>
              <p className="mt-1 text-base font-semibold">{diasTexto(l)}</p>
              <p className="flex items-center gap-2 text-base text-muted-foreground"><Clock className="h-4 w-4" /> Saída {l.saida || "—"} · Volta {l.volta || "—"}</p>
              <p className="mt-2 flex items-start gap-2 text-base"><MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" />{l.paradas.join(" → ") || "Trajeto não informado"}</p>
              <p className="mt-2 text-base"><span className="text-muted-foreground">Van </span><b>{van(l.vanId)?.apelido ?? "—"}</b><span className="text-muted-foreground"> · Motorista </span><b>{mot(l.motoristaId) || "—"}</b></p>
              <div className="mt-1 text-base"><span className="text-muted-foreground">Passageiros </span><Ocupacao l={l} /></div>
            </button>
          </li>
        ))}
        {linhas.length === 0 && <p className="text-center text-lg text-muted-foreground">Nenhuma linha cadastrada.</p>}
      </ul>

      {aberta && !editando && (
        <Painel titulo={aberta.nome} onFechar={() => setAbertaId(null)}>
          <div className="flex flex-wrap gap-2"><Etiqueta>{aberta.tipo}</Etiqueta><Etiqueta tom={aberta.ativa ? "verde" : "cinza"}>{aberta.ativa ? "Ativa" : "Pausada"}</Etiqueta></div>
          <div>
            <Item rotulo="Dias" valor={diasTexto(aberta)} />
            <Item rotulo="Saída" valor={aberta.saida} />
            <Item rotulo="Volta prevista" valor={aberta.volta} />
            <Item rotulo="Trajeto" valor={aberta.paradas.join(" → ")} />
            <Item rotulo="Destino" valor={aberta.destino} />
            <Item rotulo="Van" valor={van(aberta.vanId)?.apelido} />
            <Item rotulo="Motorista" valor={mot(aberta.motoristaId)} />
            <Item rotulo="Passageiros" valor={<Ocupacao l={aberta} />} />
            <Item rotulo="Valor por viagem" valor={brl(aberta.valorViagem)} />
            <Item rotulo="Valor mensal" valor={brl(aberta.valorMensal)} />
            <Item rotulo="Observações" valor={aberta.observacoes} />
          </div>

          <h3 className="pt-2 text-xl font-extrabold text-primary">Passageiros da linha</h3>
          <ul className="divide-y rounded-2xl bg-card px-4">
            {dela(aberta.id).map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className={`h-4 w-4 shrink-0 rounded-full ${devendo(p) ? "bg-destructive" : "bg-success"}`} aria-label={devendo(p) ? "Devendo" : "Em dia"} />
                <div className="flex-1"><p className="font-bold">{p.nome}</p><p className="text-sm text-muted-foreground">{p.cidade} · {devendo(p) ? "Devendo" : "Em dia"}</p></div>
                <button onClick={() => setTirando(p)} aria-label={`Tirar ${p.nome} da linha`} className="flex h-12 w-12 items-center justify-center rounded-xl text-destructive"><UserMinus className="h-6 w-6" /></button>
              </li>
            ))}
            {dela(aberta.id).length === 0 && <li className="py-4 text-center text-muted-foreground">Nenhum passageiro nesta linha.</li>}
          </ul>
          <BotaoGrande variante="destaque" onClick={() => setEscolhendo(true)}><UserPlus className="h-5 w-5" /> Adicionar passageiro à linha</BotaoGrande>

          <div className="space-y-3 pt-2">
            <BotaoGrande onClick={() => setEditando(aberta)}><Pencil className="h-5 w-5" /> Editar</BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => { alternarLinha(aberta.id); toast.success(aberta.ativa ? "Linha pausada" : "Linha ativada"); }}>
              {aberta.ativa ? <><Pause className="h-5 w-5" /> Pausar</> : <><Play className="h-5 w-5" /> Ativar</>}
            </BotaoGrande>
            <BotaoGrande variante="perigo" onClick={() => setExcluindo(aberta)}><Trash2 className="h-5 w-5" /> Excluir</BotaoGrande>
          </div>
        </Painel>
      )}

      {aberta && escolhendo && (
        <EscolherPassageiros linha={aberta} passageiros={passageiros} nomeLinha={(id) => linhas.find((l) => l.id === id)?.nome ?? ""} onFechar={() => setEscolhendo(false)} />
      )}

      {tirando && aberta && (
        <Confirmar titulo={`Tirar ${tirando.nome}?`} texto={`Ele(a) sai da linha "${aberta.nome}", mas continua cadastrado(a).`} onNao={() => setTirando(null)}
          onSim={() => { tirarDaLinha(tirando.id); setTirando(null); toast.success("Passageiro tirado da linha"); }} />
      )}

      {editando && <FormLinha linha={editando === "nova" ? null : editando} onFechar={() => setEditando(null)} />}

      {excluindo && (
        <Confirmar titulo={`Excluir ${excluindo.nome}?`} texto="Essa ação não pode ser desfeita." onNao={() => setExcluindo(null)}
          onSim={() => { excluirLinha(excluindo.id); setExcluindo(null); setAbertaId(null); toast.success("Linha excluída"); }}>
          <div className="mt-3 rounded-2xl bg-accent/20 p-4 text-base">
            {dela(excluindo.id).length > 0
              ? <><b>Atenção:</b> {dela(excluindo.id).length} passageiros estão nesta linha e ficarão sem linha.</>
              : "Nenhum passageiro está nesta linha."}
          </div>
        </Confirmar>
      )}
    </div>
  );
}

function EscolherPassageiros({ linha, passageiros, nomeLinha, onFechar }: { linha: Linha; passageiros: Passageiro[]; nomeLinha: (id: string) => string; onFechar: () => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const fora = passageiros.filter((p) => p.linhaId !== linha.id);
  const alterna = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <Painel titulo="Escolher passageiros" onFechar={onFechar}>
      <ul className="space-y-2">
        {fora.map((p) => {
          const ok = sel.includes(p.id);
          return (
            <li key={p.id}>
              <button onClick={() => alterna(p.id)} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 px-4 text-left ${ok ? "border-primary bg-primary/10" : "bg-card"}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${ok ? "border-primary bg-primary text-primary-foreground" : ""}`}>{ok && "✓"}</span>
                <span className="flex-1"><b className="block">{p.nome}</b><span className="text-sm text-muted-foreground">{p.cidade}{p.linhaId ? ` · hoje em: ${nomeLinha(p.linhaId)}` : " · sem linha"}</span></span>
              </button>
            </li>
          );
        })}
        {fora.length === 0 && <p className="text-center text-muted-foreground">Todos os passageiros já estão nesta linha.</p>}
      </ul>
      <BotaoGrande onClick={() => { if (!sel.length) return; colocarNaLinha(linha.id, sel); toast.success(sel.length === 1 ? "Passageiro adicionado" : `${sel.length} passageiros adicionados`); onFechar(); }}>
        Adicionar {sel.length > 0 ? `(${sel.length})` : ""}
      </BotaoGrande>
    </Painel>
  );
}

function FormLinha({ linha, onFechar }: { linha: Linha | null; onFechar: () => void }) {
  const { vans, motoristas } = useFrota();
  const [f, setF] = useState({
    nome: linha?.nome ?? "", tipo: linha?.tipo ?? ("Visita" as Linha["tipo"]), frequencia: linha?.frequencia ?? ("semanal" as Linha["frequencia"]),
    dias: linha?.dias ?? [], data: linha?.data ?? "", saida: linha?.saida ?? "", volta: linha?.volta ?? "",
    paradas: linha?.paradas ?? [], destino: linha?.destino ?? "", vanId: linha?.vanId ?? "", motoristaId: linha?.motoristaId ?? "",
    valorViagem: linha?.valorViagem ? String(linha.valorViagem) : "", valorMensal: linha?.valorMensal ? String(linha.valorMensal) : "",
    observacoes: linha?.observacoes ?? "",
  });
  const [cidade, setCidade] = useState("");
  const [erros, setErros] = useState<ReturnType<typeof validarLinha>>({});
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const mover = (i: number, d: number) => {
    const p = [...f.paradas]; const j = i + d; if (j < 0 || j >= p.length) return;
    [p[i], p[j]] = [p[j]!, p[i]!]; setF({ ...f, paradas: p });
  };
  const addCidade = () => { const c = cidade.trim(); if (!c) return; setF({ ...f, paradas: [...f.paradas, c] }); setCidade(""); };
  const num = (s: string) => { const n = Number(s.replace(",", ".")); return s.trim() && n > 0 ? n : null; };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const er = validarLinha(f); setErros(er);
    if (Object.keys(er).length) return;
    salvarLinha({ ...f, id: linha?.id, nome: f.nome.trim(), valorViagem: num(f.valorViagem), valorMensal: num(f.valorMensal), ativa: linha?.ativa ?? true });
    toast.success("Linha salva");
    onFechar();
  };

  const chip = (ativo: boolean) => `min-h-12 rounded-2xl border-2 px-3 text-base font-bold ${ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`;

  return (
    <Painel titulo={linha ? "Editar linha" : "Nova linha"} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <Campo label="Nome da linha" obrigatorio erro={erros.nome}><input className={campoClasse} value={f.nome} onChange={muda("nome")} placeholder="Ex.: Londrina - Fim de semana" /></Campo>
        <div>
          <span className="mb-1 block text-base font-bold">Tipo de serviço</span>
          <div className="flex flex-wrap gap-2">{TIPOS_LINHA.map((t) => <button type="button" key={t} className={chip(f.tipo === t)} onClick={() => setF({ ...f, tipo: t })}>{t}</button>)}</div>
        </div>
        <div>
          <span className="mb-1 block text-base font-bold">Frequência</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={chip(f.frequencia === "semanal")} onClick={() => setF({ ...f, frequencia: "semanal" })}>Toda semana</button>
            <button type="button" className={chip(f.frequencia === "unica")} onClick={() => setF({ ...f, frequencia: "unica" })}>Viagem única</button>
          </div>
        </div>
        {f.frequencia === "semanal" ? (
          <div>
            <span className="mb-1 block text-base font-bold">Dias</span>
            <div className="grid grid-cols-4 gap-2">
              {DIAS.map((d) => (
                <button type="button" key={d.id} className={chip(f.dias.includes(d.id))}
                  onClick={() => setF({ ...f, dias: f.dias.includes(d.id) ? f.dias.filter((x) => x !== d.id) : [...f.dias, d.id] })}>{d.curto}</button>
              ))}
            </div>
            {erros.dias && <span className="mt-1 block font-semibold text-destructive">{erros.dias}</span>}
          </div>
        ) : (
          <Campo label="Data da viagem" erro={erros.data}><input type="date" className={campoClasse} value={f.data} onChange={muda("data")} /></Campo>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Saída"><input type="time" className={campoClasse} value={f.saida} onChange={muda("saida")} /></Campo>
          <Campo label="Volta prevista"><input type="time" className={campoClasse} value={f.volta} onChange={muda("volta")} /></Campo>
        </div>

        <div>
          <span className="mb-1 block text-base font-bold">Cidades do trajeto (em ordem)</span>
          <ol className="space-y-2">
            {f.paradas.map((c, i) => (
              <li key={`${c}-${i}`} className="flex items-center gap-2 rounded-2xl bg-card p-2 pl-4 shadow-sm">
                <span className="w-6 font-bold text-accent-strong">{i + 1}</span>
                <span className="flex-1 text-lg font-semibold">{c}</span>
                <button type="button" aria-label="Subir" onClick={() => mover(i, -1)} className="flex h-11 w-11 items-center justify-center rounded-xl text-primary disabled:opacity-30" disabled={i === 0}><ArrowUp className="h-5 w-5" /></button>
                <button type="button" aria-label="Descer" onClick={() => mover(i, 1)} className="flex h-11 w-11 items-center justify-center rounded-xl text-primary disabled:opacity-30" disabled={i === f.paradas.length - 1}><ArrowDown className="h-5 w-5" /></button>
                <button type="button" aria-label="Remover" onClick={() => setF({ ...f, paradas: f.paradas.filter((_, j) => j !== i) })} className="flex h-11 w-11 items-center justify-center rounded-xl text-destructive"><X className="h-5 w-5" /></button>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex gap-2">
            <input className={campoClasse} value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Nome da cidade"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCidade(); } }} />
            <button type="button" onClick={addCidade} aria-label="Adicionar cidade" className="flex min-h-14 min-w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Plus className="h-6 w-6" /></button>
          </div>
        </div>

        <Campo label="Destino"><input className={campoClasse} value={f.destino} onChange={muda("destino")} placeholder="Ex.: Londrina - Centro" /></Campo>
        <Campo label="Van">
          <select className={campoClasse} value={f.vanId} onChange={muda("vanId")}><option value="">Nenhuma</option>{vans.map((v) => <option key={v.id} value={v.id}>{v.apelido} ({v.lugares} lugares)</option>)}</select>
        </Campo>
        <Campo label="Motorista">
          <select className={campoClasse} value={f.motoristaId} onChange={muda("motoristaId")}><option value="">Nenhum</option>{motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Valor por viagem (R$)"><input className={campoClasse} inputMode="decimal" value={f.valorViagem} onChange={muda("valorViagem")} placeholder="150" /></Campo>
          <Campo label="Valor mensal (R$)"><input className={campoClasse} inputMode="decimal" value={f.valorMensal} onChange={muda("valorMensal")} placeholder="320" /></Campo>
        </div>
        <Campo label="Observações"><textarea className={`${campoClasse} min-h-24 py-3`} value={f.observacoes} onChange={muda("observacoes")} /></Campo>
        <BotaoGrande type="submit">Salvar linha</BotaoGrande>
      </form>
    </Painel>
  );
}
