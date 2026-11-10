import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bus, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useFrota, salvarVan, excluirVan, type Van } from "@/data/repositorio";
import { validarVan, formatarPlaca, normalizarPlaca } from "@/lib/validacao";
import {
  Painel,
  Campo,
  campoClasse,
  BotaoGrande,
  Confirmar,
  Linha,
} from "@/components/app/Formulario";

export const Route = createFileRoute("/vanzeiro/vans")({
  head: () => ({
    meta: [
      { title: "Vans · O Vanzeiro" },
      { name: "description", content: "Suas vans: placa, lugares, motorista e linhas." },
      { property: "og:title", content: "Vans · O Vanzeiro" },
      { property: "og:description", content: "Suas vans: placa, lugares, motorista e linhas." },
    ],
  }),
  component: Vans,
});

function Situacao({ s }: { s: Van["situacao"] }) {
  return s === "rodando" ? (
    <span className="shrink-0 rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-success">
      Rodando
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-accent/25 px-3 py-1 text-sm font-bold text-accent-strong">
      Em manutenção
    </span>
  );
}

function Vans() {
  const { vans, motoristas, linhas } = useFrota();
  const linhasDa = (id: string) => linhas.filter((l) => l.vanId === id);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Van | "nova" | null>(null);
  const [excluindo, setExcluindo] = useState<Van | null>(null);
  const nomeMot = (id: string) => motoristas.find((m) => m.id === id)?.nome ?? "";
  const aberta = vans.find((v) => v.id === abertaId);

  return (
    <div className="px-5 pt-6">
      <Toaster position="top-center" />
      <Link
        to="/vanzeiro/mais"
        className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-primary"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </Link>
      <h1 className="text-3xl font-extrabold text-primary">Vans</h1>
      <div className="mt-5">
        <BotaoGrande variante="destaque" onClick={() => setEditando("nova")}>
          <Plus className="h-6 w-6" /> Adicionar van
        </BotaoGrande>
      </div>

      <ul className="mt-5 space-y-4">
        {vans.map((v) => (
          <li key={v.id}>
            <button
              onClick={() => setAbertaId(v.id)}
              className="w-full rounded-3xl bg-card p-5 text-left shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bus className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 break-words">
                    <p className="text-xl font-extrabold">{v.apelido}</p>
                    <p className="text-muted-foreground">
                      {v.modelo}
                      {v.ano ? ` · ${v.ano}` : ""}
                    </p>
                  </div>
                </div>
                <Situacao s={v.situacao} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-base">
                <p>
                  <span className="text-muted-foreground">Placa </span>
                  <b>{formatarPlaca(v.placa)}</b>
                </p>
                <p>
                  <span className="text-muted-foreground">Lugares </span>
                  <b>{v.lugares}</b>
                </p>
                <p className="col-span-2">
                  <span className="text-muted-foreground">Motorista </span>
                  <b>{nomeMot(v.motoristaId) || "—"}</b>
                </p>
                <p className="col-span-2">
                  <span className="text-muted-foreground">Linhas </span>
                  <b>
                    {linhasDa(v.id)
                      .map((l) => l.nome)
                      .join(", ") || "Nenhuma"}
                  </b>
                </p>
              </div>
            </button>
          </li>
        ))}
        {vans.length === 0 && (
          <p className="text-center text-lg text-muted-foreground">Nenhuma van cadastrada.</p>
        )}
      </ul>

      {aberta && !editando && (
        <Painel titulo={aberta.apelido} onFechar={() => setAbertaId(null)}>
          <Situacao s={aberta.situacao} />
          <div>
            <Linha rotulo="Modelo" valor={aberta.modelo} />
            <Linha rotulo="Ano" valor={aberta.ano} />
            <Linha rotulo="Cor" valor={aberta.cor} />
            <Linha rotulo="Placa" valor={formatarPlaca(aberta.placa)} />
            <Linha rotulo="Lugares" valor={aberta.lugares} />
            <Linha rotulo="Motorista" valor={nomeMot(aberta.motoristaId)} />
            <Linha
              rotulo="Linhas"
              valor={
                linhasDa(aberta.id)
                  .map((l) => l.nome)
                  .join(", ") || "Nenhuma"
              }
            />
            <Linha rotulo="Observações" valor={aberta.observacoes} />
          </div>
          <BotaoGrande onClick={() => setEditando(aberta)}>
            <Pencil className="h-5 w-5" /> Editar
          </BotaoGrande>
          <BotaoGrande variante="perigo" onClick={() => setExcluindo(aberta)}>
            <Trash2 className="h-5 w-5" /> Excluir
          </BotaoGrande>
        </Painel>
      )}

      {editando && (
        <FormVan van={editando === "nova" ? null : editando} onFechar={() => setEditando(null)} />
      )}

      {excluindo && (
        <Confirmar
          titulo={`Excluir ${excluindo.apelido}?`}
          texto="Essa ação não pode ser desfeita."
          onNao={() => setExcluindo(null)}
          onSim={() => {
            excluirVan(excluindo.id);
            setExcluindo(null);
            setAbertaId(null);
            toast.success("Van excluída");
          }}
        >
          {linhasDa(excluindo.id).length > 0 && (
            <div className="mt-3 rounded-2xl bg-accent/20 p-4 text-base">
              <b>Atenção:</b> esta van atende as linhas:{" "}
              {linhasDa(excluindo.id)
                .map((l) => l.nome)
                .join(", ")}
              .
            </div>
          )}
        </Confirmar>
      )}
    </div>
  );
}

function FormVan({ van, onFechar }: { van: Van | null; onFechar: () => void }) {
  const { motoristas } = useFrota();
  const [f, setF] = useState({
    apelido: van?.apelido ?? "",
    modelo: van?.modelo ?? "",
    ano: van?.ano ? String(van.ano) : "",
    cor: van?.cor ?? "",
    placa: van ? formatarPlaca(van.placa) : "",
    lugares: van ? String(van.lugares) : "",
    motoristaId: van?.motoristaId ?? "",
    observacoes: van?.observacoes ?? "",
    situacao: van?.situacao ?? ("rodando" as Van["situacao"]),
  });
  const [erros, setErros] = useState<ReturnType<typeof validarVan>>({});
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const er = validarVan(f);
    setErros(er);
    if (Object.keys(er).length) return;
    salvarVan({
      ...f,
      id: van?.id,
      placa: normalizarPlaca(f.placa),
      lugares: Number(f.lugares),
      ano: f.ano ? Number(f.ano) : null,
      apelido: f.apelido.trim(),
    });
    toast.success("Van salva");
    onFechar();
  };

  return (
    <Painel titulo={van ? "Editar van" : "Nova van"} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <Campo label="Apelido" obrigatorio erro={erros.apelido}>
          <input
            className={campoClasse}
            value={f.apelido}
            onChange={muda("apelido")}
            placeholder="Ex.: Van Branca"
          />
        </Campo>
        <Campo label="Modelo">
          <input
            className={campoClasse}
            value={f.modelo}
            onChange={muda("modelo")}
            placeholder="Ex.: Sprinter 415"
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Ano">
            <input
              className={campoClasse}
              inputMode="numeric"
              value={f.ano}
              onChange={muda("ano")}
            />
          </Campo>
          <Campo label="Cor">
            <input className={campoClasse} value={f.cor} onChange={muda("cor")} />
          </Campo>
        </div>
        <Campo label="Placa" obrigatorio erro={erros.placa}>
          <input
            className={`${campoClasse} uppercase`}
            value={f.placa}
            onChange={muda("placa")}
            placeholder="ABC-1234 ou ABC1D23"
          />
        </Campo>
        <Campo label="Número de lugares" obrigatorio erro={erros.lugares}>
          <input
            className={campoClasse}
            inputMode="numeric"
            value={f.lugares}
            onChange={muda("lugares")}
          />
        </Campo>
        <Campo label="Motorista que costuma dirigir">
          <select className={campoClasse} value={f.motoristaId} onChange={muda("motoristaId")}>
            <option value="">Nenhum</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Campo>
        <div>
          <span className="mb-1 block text-base font-bold">Situação</span>
          <div className="grid grid-cols-2 gap-3">
            {(["rodando", "manutencao"] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setF({ ...f, situacao: s })}
                className={`min-h-14 rounded-2xl border-2 text-lg font-bold ${f.situacao === s ? (s === "rodando" ? "border-success bg-success/15 text-success" : "border-accent bg-accent/25 text-accent-strong") : "bg-card text-muted-foreground"}`}
              >
                {s === "rodando" ? "Rodando" : "Em manutenção"}
              </button>
            ))}
          </div>
        </div>
        <Campo label="Observações">
          <textarea
            className={`${campoClasse} min-h-24 py-3`}
            value={f.observacoes}
            onChange={muda("observacoes")}
          />
        </Campo>
        <BotaoGrande type="submit">Salvar van</BotaoGrande>
      </form>
    </Painel>
  );
}
