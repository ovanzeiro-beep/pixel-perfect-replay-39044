import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Copy, MapPin, MessageCircle, Pencil, Phone, Plus, Search, Send, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { vanzeiro, linkConviteExemplo, type FormaPagamento } from "@/data/exemplo";
import {
  useFrota, salvarPassageiro, atualizarPassageiro, desativarPassageiro, excluirPassageiro, estaDevendo, DIAS,
  type Passageiro, type Linha,
} from "@/data/store";
import { validarPassageiro, mensagemConvite, linkWhatsApp } from "@/lib/validacao";
import { Painel, Campo, campoClasse, BotaoGrande, Confirmar, Linha as Item } from "@/components/app/Formulario";

export const Route = createFileRoute("/vanzeiro/passageiros")({
  head: () => ({
    meta: [
      { title: "Passageiros · O Vanzeiro" },
      { name: "description", content: "Seus passageiros: contato, endereço, linhas, pagamento e convite pelo WhatsApp." },
      { property: "og:title", content: "Passageiros · O Vanzeiro" },
      { property: "og:description", content: "Seus passageiros: contato, endereço, linhas, pagamento e convite pelo WhatsApp." },
    ],
  }),
  component: Passageiros,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (d: string) => (d ? d.split("-").reverse().join("/") : "");
const FORMAS: { id: FormaPagamento; nome: string }[] = [
  { id: "por_viagem", nome: "Por viagem" }, { id: "semanal", nome: "Semanal" }, { id: "mensal", nome: "Mensal" },
];
const SEMANA = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const nomeForma = (f: FormaPagamento) => FORMAS.find((x) => x.id === f)!.nome;
const vencTexto = (p: Passageiro) =>
  !p.vencimento ? "" : p.formaPagamento === "semanal" ? `Toda ${p.vencimento}` : p.formaPagamento === "mensal" ? `Dia ${p.vencimento}` : "";
const CONVITE = { nao_enviado: "Não enviado", enviado: "Enviado", no_app: "No app" } as const;
const mapa = (p: Passageiro) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.endereco}, ${p.numero} - ${p.bairro}, ${p.cidade} - PR`)}`;
const sugestao = (l: Linha | undefined, f: FormaPagamento) => (!l ? null : f === "mensal" ? l.valorMensal : f === "por_viagem" ? l.valorViagem : null);

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border-2 px-4 text-base font-bold ${ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
      {children}
    </button>
  );
}

function Pagamento({ p }: { p: Passageiro }) {
  return estaDevendo(p)
    ? <span className="rounded-full bg-destructive/15 px-3 py-1 text-sm font-bold text-destructive">Devendo {brl(p.emAberto)}</span>
    : <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-success">Em dia</span>;
}

function Convite({ p }: { p: Passageiro }) {
  return p.convite === "no_app"
    ? <span className="inline-flex items-center gap-1 text-sm font-bold text-success"><CheckCircle2 className="h-5 w-5" /> No app</span>
    : <span className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground"><Clock className="h-5 w-5" /> {CONVITE[p.convite]}</span>;
}

function Passageiros() {
  const { passageiros, linhas } = useFrota();
  const [busca, setBusca] = useState("");
  const [fLinha, setFLinha] = useState("");
  const [fPag, setFPag] = useState<"" | "em_dia" | "devendo">("");
  const [fConv, setFConv] = useState<"" | "aceito" | "pendente">("");
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Passageiro | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<Passageiro | null>(null);
  const [perguntarConvite, setPerguntarConvite] = useState<string | null>(null);

  const nomeLinha = (id: string) => linhas.find((l) => l.id === id)?.nome ?? "";
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return passageiros.filter((p) =>
      (!b || p.nome.toLowerCase().includes(b)) &&
      (!fLinha || p.linhaIds.includes(fLinha)) &&
      (!fPag || (fPag === "devendo") === estaDevendo(p)) &&
      (!fConv || (fConv === "aceito") === (p.convite === "no_app")));
  }, [passageiros, busca, fLinha, fPag, fConv]);
  const aberto = passageiros.find((p) => p.id === abertoId);
  const convidar = passageiros.find((p) => p.id === perguntarConvite);

  const enviarConvite = (p: Passageiro) => {
    const msg = mensagemConvite(p.nome.split(" (")[0]!, vanzeiro.nome, linkConviteExemplo(p.id));
    window.open(`${linkWhatsApp(p.telefone)}?text=${encodeURIComponent(msg)}`, "_blank");
    if (p.convite !== "no_app") atualizarPassageiro(p.id, { convite: "enviado" });
    toast.success("Convite enviado");
  };

  return (
    <div className="px-5 pt-6">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-extrabold text-primary">Passageiros</h1>
      <div className="mt-5"><BotaoGrande variante="destaque" onClick={() => setEditando("novo")}><Plus className="h-6 w-6" /> Novo passageiro</BotaoGrande></div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input className={`${campoClasse} pl-12`} placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="mt-3 space-y-2">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip ativo={!fLinha} onClick={() => setFLinha("")}>Todas as linhas</Chip>
          {linhas.map((l) => <Chip key={l.id} ativo={fLinha === l.id} onClick={() => setFLinha(fLinha === l.id ? "" : l.id)}>{l.nome}</Chip>)}
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip ativo={fPag === "em_dia"} onClick={() => setFPag(fPag === "em_dia" ? "" : "em_dia")}>Em dia</Chip>
          <Chip ativo={fPag === "devendo"} onClick={() => setFPag(fPag === "devendo" ? "" : "devendo")}>Devendo</Chip>
          <Chip ativo={fConv === "aceito"} onClick={() => setFConv(fConv === "aceito" ? "" : "aceito")}>Convite aceito</Chip>
          <Chip ativo={fConv === "pendente"} onClick={() => setFConv(fConv === "pendente" ? "" : "pendente")}>Convite pendente</Chip>
        </div>
      </div>

      <p className="mt-3 text-base text-muted-foreground">{lista.length} passageiro(s)</p>
      <ul className="mt-2 space-y-3">
        {lista.map((p) => (
          <li key={p.id}>
            <button onClick={() => setAbertoId(p.id)} className={`w-full rounded-3xl bg-card p-4 text-left shadow-sm ${p.ativo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-extrabold leading-tight">{p.nome}</p>
                  <p className="text-base text-muted-foreground">{p.cidade} · {nomeForma(p.formaPagamento)}</p>
                </div>
                <Convite p={p} />
              </div>
              <p className="mt-2 text-base">{p.linhaIds.map(nomeLinha).join(", ") || (p.ativo ? "Sem linha" : "Desativado")}</p>
              <div className="mt-2"><Pagamento p={p} /></div>
            </button>
          </li>
        ))}
        {lista.length === 0 && <p className="py-6 text-center text-lg text-muted-foreground">Nenhum passageiro encontrado.</p>}
      </ul>

      {aberto && !editando && (
        <Painel titulo={aberto.nome} onFechar={() => setAbertoId(null)}>
          {!aberto.ativo && <p className="rounded-2xl bg-muted p-3 font-bold text-muted-foreground">Passageiro desativado — histórico guardado.</p>}
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${aberto.telefone.replace(/\D/g, "")}`} className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground"><Phone className="h-6 w-6" /> Ligar</a>
            <a href={linkWhatsApp(aberto.telefone)} target="_blank" rel="noreferrer" className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-success text-lg font-bold text-success-foreground"><MessageCircle className="h-6 w-6" /> WhatsApp</a>
          </div>
          <div>
            <Item rotulo="Telefone" valor={aberto.telefone} />
            <Item rotulo="Endereço" valor={[aberto.endereco && `${aberto.endereco}${aberto.numero ? `, ${aberto.numero}` : ""}`, aberto.bairro, aberto.cidade].filter(Boolean).join(" — ")} />
            <Item rotulo="Referência" valor={aberto.referencia} />
          </div>
          <a href={mapa(aberto)} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card text-lg font-bold text-primary"><MapPin className="h-5 w-5" /> Ver no mapa</a>
          <div>
            <Item rotulo="Linha(s)" valor={aberto.linhaIds.map(nomeLinha).join(", ") || "Nenhuma"} />
            <Item rotulo="Pagamento" valor={`${nomeForma(aberto.formaPagamento)} · ${brl(aberto.valor)}`} />
            <Item rotulo="Vencimento" valor={vencTexto(aberto)} />
            <Item rotulo="Deve agora" valor={<span className={estaDevendo(aberto) ? "text-destructive" : "text-success"}>{estaDevendo(aberto) ? brl(aberto.emAberto) : "Nada — em dia"}</span>} />
            <Item rotulo="Último pagamento" valor={dataBR(aberto.ultimoPagamento)} />
            <Item rotulo="Emergência" valor={[aberto.emergenciaNome, aberto.emergenciaTelefone].filter(Boolean).join(" · ")} />
            <Item rotulo="Observações" valor={aberto.observacoes} />
            <Item rotulo="Convite" valor={<Convite p={aberto} />} />
          </div>

          <Link to="/vanzeiro/dinheiro" search={{ p: aberto.id }} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card text-lg font-bold text-primary">Ver histórico de pagamentos</Link>

          <div className="rounded-3xl bg-accent/15 p-4 space-y-3">
            <p className="text-lg font-extrabold">Convite para o app</p>
            <BotaoGrande variante="destaque" onClick={() => enviarConvite(aberto)}><Send className="h-5 w-5" /> Enviar convite</BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => { void navigator.clipboard?.writeText(linkConviteExemplo(aberto.id)); toast.success("Link copiado"); }}><Copy className="h-5 w-5" /> Copiar link do convite</BotaoGrande>
            {aberto.convite !== "no_app" && (
              <button onClick={() => { atualizarPassageiro(aberto.id, { convite: "no_app" }); toast.success("Aceite simulado"); }} className="w-full py-2 text-sm font-semibold text-muted-foreground underline">Simular aceite (teste)</button>
            )}
          </div>

          <BotaoGrande onClick={() => setEditando(aberto)}><Pencil className="h-5 w-5" /> Editar</BotaoGrande>
          {aberto.ativo && (
            <BotaoGrande variante="contorno" onClick={() => { desativarPassageiro(aberto.id); toast.success("Passageiro desativado"); }}><UserX className="h-5 w-5" /> Desativar</BotaoGrande>
          )}
          <BotaoGrande variante="perigo" onClick={() => setExcluindo(aberto)}><Trash2 className="h-5 w-5" /> Excluir</BotaoGrande>
        </Painel>
      )}

      {editando && (
        <FormPassageiro pas={editando === "novo" ? null : editando} linhas={linhas}
          onFechar={() => setEditando(null)}
          onSalvo={(id, novo) => { setEditando(null); if (novo || passageiros.find((x) => x.id === id)?.convite !== "no_app") setPerguntarConvite(id); }} />
      )}

      {convidar && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-extrabold">Enviar convite agora pelo WhatsApp?</h3>
            <p className="text-lg text-muted-foreground">{convidar.nome} poderá confirmar viagens e ver pagamentos pelo app.</p>
            <BotaoGrande variante="destaque" onClick={() => { enviarConvite(convidar); setPerguntarConvite(null); }}><Send className="h-5 w-5" /> Sim, enviar</BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => setPerguntarConvite(null)}>Agora não</BotaoGrande>
          </div>
        </div>
      )}

      {excluindo && (
        <Confirmar titulo={`Excluir ${excluindo.nome}?`} texto="O passageiro e o histórico dele serão apagados. Se quiser guardar o histórico, use “Desativar”." onNao={() => setExcluindo(null)}
          onSim={() => { excluirPassageiro(excluindo.id); setExcluindo(null); setAbertoId(null); toast.success("Passageiro excluído"); }} />
      )}
    </div>
  );
}

function FormPassageiro({ pas, linhas, onFechar, onSalvo }: { pas: Passageiro | null; linhas: Linha[]; onFechar: () => void; onSalvo: (id: string, novo: boolean) => void }) {
  const [f, setF] = useState({
    nome: pas?.nome ?? "", telefone: pas?.telefone ?? "", endereco: pas?.endereco ?? "", numero: pas?.numero ?? "", bairro: pas?.bairro ?? "",
    cidade: pas?.cidade ?? "Jacarezinho", referencia: pas?.referencia ?? "", linhaIds: pas?.linhaIds ?? [],
    formaPagamento: pas?.formaPagamento ?? ("por_viagem" as FormaPagamento), valor: pas ? String(pas.valor) : "", vencimento: pas?.vencimento ?? "",
    emergenciaNome: pas?.emergenciaNome ?? "", emergenciaTelefone: pas?.emergenciaTelefone ?? "", observacoes: pas?.observacoes ?? "",
  });
  const [erros, setErros] = useState<ReturnType<typeof validarPassageiro>>({});
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const linhaDe = (id: string | undefined) => linhas.find((l) => l.id === id);

  const alternaLinha = (id: string) => {
    const tem = f.linhaIds.includes(id);
    const ids = tem ? f.linhaIds.filter((x) => x !== id) : [...f.linhaIds, id];
    const s = !tem ? sugestao(linhaDe(id), f.formaPagamento) : null;
    setF({ ...f, linhaIds: ids, valor: s ? String(s) : f.valor });
  };
  const mudaForma = (fp: FormaPagamento) => {
    const s = sugestao(linhaDe(f.linhaIds[0]), fp);
    setF({ ...f, formaPagamento: fp, valor: s ? String(s) : f.valor, vencimento: fp === f.formaPagamento ? f.vencimento : "" });
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const er = validarPassageiro(f); setErros(er);
    if (Object.keys(er).length) return;
    const id = salvarPassageiro({
      ...f, id: pas?.id, nome: f.nome.trim(), valor: Number(f.valor.replace(",", ".")) || 0,
      emAberto: pas?.emAberto ?? 0, ativo: f.linhaIds.length > 0 || (pas?.ativo ?? true),
      convite: pas?.convite ?? "nao_enviado", ultimoPagamento: pas?.ultimoPagamento ?? "",
    });
    toast.success("Passageiro salvo");
    onSalvo(id, !pas);
  };

  const chip = (a: boolean) => `min-h-12 rounded-2xl border-2 px-3 text-base font-bold ${a ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`;

  return (
    <Painel titulo={pas ? "Editar passageiro" : "Novo passageiro"} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <Campo label="Nome" obrigatorio erro={erros.nome}><input className={campoClasse} value={f.nome} onChange={muda("nome")} /></Campo>
        <Campo label="Telefone (com DDD)" obrigatorio erro={erros.telefone}><input type="tel" inputMode="tel" className={campoClasse} value={f.telefone} onChange={muda("telefone")} placeholder="(43) 99999-9999" /></Campo>
        <Campo label="Rua"><input className={campoClasse} value={f.endereco} onChange={muda("endereco")} placeholder="Ex.: Rua Paraná" /></Campo>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Número"><input className={campoClasse} value={f.numero} onChange={muda("numero")} /></Campo>
          <div className="col-span-2"><Campo label="Bairro"><input className={campoClasse} value={f.bairro} onChange={muda("bairro")} /></Campo></div>
        </div>
        <Campo label="Cidade"><input className={campoClasse} value={f.cidade} onChange={muda("cidade")} /></Campo>
        <Campo label="Ponto de referência"><input className={campoClasse} value={f.referencia} onChange={muda("referencia")} placeholder="Ex.: casa amarela, portão azul" /></Campo>

        <div>
          <span className="mb-1 block text-base font-bold">Linha(s)</span>
          <div className="flex flex-wrap gap-2">{linhas.map((l) => <button type="button" key={l.id} className={chip(f.linhaIds.includes(l.id))} onClick={() => alternaLinha(l.id)}>{l.nome}</button>)}</div>
        </div>
        <div>
          <span className="mb-1 block text-base font-bold">Forma de pagamento</span>
          <div className="grid grid-cols-3 gap-2">{FORMAS.map((x) => <button type="button" key={x.id} className={chip(f.formaPagamento === x.id)} onClick={() => mudaForma(x.id)}>{x.nome}</button>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Valor (R$)" obrigatorio erro={erros.valor}><input inputMode="decimal" className={campoClasse} value={f.valor} onChange={muda("valor")} /></Campo>
          {f.formaPagamento === "semanal" && (
            <Campo label="Vence toda" obrigatorio erro={erros.vencimento}><select className={campoClasse} value={f.vencimento} onChange={muda("vencimento")}><option value="">—</option>{SEMANA.map((d, i) => <option key={d} value={d}>{DIAS[i]!.curto}</option>)}</select></Campo>
          )}
          {f.formaPagamento === "mensal" && (
            <Campo label="Vence no dia" obrigatorio erro={erros.vencimento}><select className={campoClasse} value={f.vencimento} onChange={muda("vencimento")}><option value="">—</option>{Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => <option key={d}>{d}</option>)}</select></Campo>
          )}
        </div>

        <p className="pt-2 text-lg font-extrabold text-primary">Contato de emergência (opcional)</p>
        <Campo label="Nome"><input className={campoClasse} value={f.emergenciaNome} onChange={muda("emergenciaNome")} /></Campo>
        <Campo label="Telefone" erro={erros.emergenciaTelefone}><input type="tel" className={campoClasse} value={f.emergenciaTelefone} onChange={muda("emergenciaTelefone")} /></Campo>
        <Campo label="Observações"><textarea className={`${campoClasse} min-h-24 py-3`} value={f.observacoes} onChange={muda("observacoes")} /></Campo>
        <BotaoGrande type="submit">Salvar passageiro</BotaoGrande>
      </form>
    </Painel>
  );
}
