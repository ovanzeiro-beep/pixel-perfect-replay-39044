import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, IdCard, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useFrota, salvarMotorista, excluirMotorista, type Motorista } from "@/data/store";
import { validarMotorista, linkWhatsApp } from "@/lib/validacao";
import { Painel, Campo, campoClasse, BotaoGrande, Confirmar, Linha } from "@/components/app/Formulario";

export const Route = createFileRoute("/vanzeiro/motoristas")({
  head: () => ({
    meta: [
      { title: "Motoristas · O Vanzeiro" },
      { name: "description", content: "Seus motoristas: telefone, CNH e van." },
      { property: "og:title", content: "Motoristas · O Vanzeiro" },
      { property: "og:description", content: "Seus motoristas: telefone, CNH e van." },
    ],
  }),
  component: Motoristas,
});

const dataBR = (d: string) => (d ? d.split("-").reverse().join("/") : "");

function Motoristas() {
  const { motoristas, vans } = useFrota();
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Motorista | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<Motorista | null>(null);
  const nomeVan = (id?: string) => vans.find((v) => v.id === id)?.apelido ?? "";
  const aberto = motoristas.find((m) => m.id === abertoId);

  return (
    <div className="px-5 pt-6">
      <Toaster position="top-center" />
      <Link to="/vanzeiro/mais" className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-primary"><ArrowLeft className="h-5 w-5" /> Voltar</Link>
      <h1 className="text-3xl font-extrabold text-primary">Motoristas</h1>
      <div className="mt-5"><BotaoGrande variante="destaque" onClick={() => setEditando("novo")}><Plus className="h-6 w-6" /> Adicionar motorista</BotaoGrande></div>

      <ul className="mt-5 space-y-4">
        {motoristas.map((m) => (
          <li key={m.id}>
            <button onClick={() => setAbertoId(m.id)} className="flex w-full items-center gap-4 rounded-3xl bg-card p-5 text-left shadow-sm">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-extrabold text-primary-foreground">
                {m.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <div className="flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xl font-extrabold">{m.nome}{m.proprio && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">Dono</span>}</p>
                <p className="text-base text-muted-foreground">{m.telefone}</p>
                <p className="text-base">Van: <b>{nomeVan(m.vanId) || "—"}</b></p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {aberto && !editando && (
        <Painel titulo={aberto.nome} onFechar={() => setAbertoId(null)}>
          {aberto.proprio && <span className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">Dono</span>}
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${aberto.telefone.replace(/\D/g, "")}`} className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground"><Phone className="h-6 w-6" /> Ligar</a>
            <a href={linkWhatsApp(aberto.telefone)} target="_blank" rel="noreferrer" className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-success text-lg font-bold text-success-foreground"><MessageCircle className="h-6 w-6" /> WhatsApp</a>
          </div>
          <div>
            <Linha rotulo="Telefone" valor={aberto.telefone} />
            <Linha rotulo="Categoria da CNH" valor={aberto.cnh} />
            <Linha rotulo="Validade da CNH" valor={dataBR(aberto.cnhValidade)} />
            <Linha rotulo="Van" valor={nomeVan(aberto.vanId)} />
          </div>
          <BotaoGrande onClick={() => setEditando(aberto)}><Pencil className="h-5 w-5" /> Editar</BotaoGrande>
          {aberto.proprio
            ? <p className="text-center text-base text-muted-foreground"><IdCard className="mr-1 inline h-5 w-5" />O dono não pode ser excluído.</p>
            : <BotaoGrande variante="perigo" onClick={() => setExcluindo(aberto)}><Trash2 className="h-5 w-5" /> Excluir</BotaoGrande>}
        </Painel>
      )}

      {editando && <FormMotorista mot={editando === "novo" ? null : editando} onFechar={() => setEditando(null)} />}

      {excluindo && (
        <Confirmar titulo={`Excluir ${excluindo.nome}?`} texto="Essa ação não pode ser desfeita." onNao={() => setExcluindo(null)}
          onSim={() => { excluirMotorista(excluindo.id); setExcluindo(null); setAbertoId(null); toast.success("Motorista excluído"); }} />
      )}
    </div>
  );
}

function FormMotorista({ mot, onFechar }: { mot: Motorista | null; onFechar: () => void }) {
  const { vans } = useFrota();
  const [f, setF] = useState({ nome: mot?.nome ?? "", telefone: mot?.telefone ?? "", cnh: mot?.cnh ?? "D", cnhValidade: mot?.cnhValidade ?? "", vanId: mot?.vanId ?? "" });
  const [erros, setErros] = useState<ReturnType<typeof validarMotorista>>({});
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const er = validarMotorista(f);
    setErros(er);
    if (Object.keys(er).length) return;
    salvarMotorista({ ...f, id: mot?.id, nome: f.nome.trim() });
    toast.success("Motorista salvo");
    onFechar();
  };

  return (
    <Painel titulo={mot ? "Editar motorista" : "Novo motorista"} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <Campo label="Nome" obrigatorio erro={erros.nome}><input className={campoClasse} value={f.nome} onChange={muda("nome")} /></Campo>
        <Campo label="Telefone" obrigatorio erro={erros.telefone}><input className={campoClasse} type="tel" inputMode="tel" value={f.telefone} onChange={muda("telefone")} placeholder="(43) 99999-9999" /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Categoria da CNH">
            <select className={campoClasse} value={f.cnh} onChange={muda("cnh")}>{["B", "C", "D", "E"].map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
          <Campo label="Validade da CNH"><input type="date" className={campoClasse} value={f.cnhValidade} onChange={muda("cnhValidade")} /></Campo>
        </div>
        <Campo label="Van que costuma dirigir">
          <select className={campoClasse} value={f.vanId} onChange={muda("vanId")}>
            <option value="">Nenhuma</option>
            {vans.map((v) => <option key={v.id} value={v.id}>{v.apelido}</option>)}
          </select>
        </Campo>
        <BotaoGrande type="submit">Salvar motorista</BotaoGrande>
      </form>
    </Painel>
  );
}
