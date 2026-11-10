import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { EstadoVazio } from "@/components/app/EstadoVazio";
import { BotaoGrande, Campo, Confirmar, Painel, campoClasse } from "@/components/app/Formulario";
import { ICONE_CATEGORIA } from "@/components/app/categorias";
import { useFrota, salvarGasto, excluirGasto } from "@/data/repositorio";
import {
  CATEGORIAS,
  gastosDoMes,
  mesDe,
  nomeMes,
  somaMes,
  type Categoria,
  type Gasto,
  type Ocorrencia,
} from "@/data/financeiro";
import { brl, dataBR, isoDe } from "@/data/cobrancas";

export const Route = createFileRoute("/vanzeiro/gastos")({
  validateSearch: (s: Record<string, unknown>): { novo?: boolean } =>
    s["novo"] ? { novo: true } : {},
  head: () => ({
    meta: [
      { title: "Gastos · O Vanzeiro" },
      {
        name: "description",
        content: "Lance e acompanhe os gastos da sua van: diesel, manutenção, pedágio e mais.",
      },
      { property: "og:title", content: "Gastos · O Vanzeiro" },
      {
        property: "og:description",
        content: "Lance e acompanhe os gastos da sua van: diesel, manutenção, pedágio e mais.",
      },
    ],
  }),
  component: Gastos,
});

function Gastos() {
  const { gastos, vans, linhas } = useFrota();
  const { novo } = Route.useSearch();
  const navigate = useNavigate({ from: "/vanzeiro/gastos" });
  const [cat, setCat] = useState<Categoria | "">("");
  const [mesesMostrados, setMesesMostrados] = useState(3);
  const [vanId, setVanId] = useState("");
  const [editando, setEditando] = useState<Gasto | null>(null);
  const [criando, setCriando] = useState(false);
  const [excluir, setExcluir] = useState<Gasto | null>(null);
  const formAberto = criando || !!novo || !!editando;
  const fechar = () => {
    setCriando(false);
    setEditando(null);
    if (novo) void navigate({ search: {}, replace: true });
  };

  const meses = useMemo(() => {
    const hoje = mesDe(isoDe(new Date()));
    const primeiro = gastos.reduce((m, g) => (mesDe(g.data) < m ? mesDe(g.data) : m), hoje);
    const out: { mes: string; itens: Ocorrencia[]; total: number }[] = [];
    for (let m = hoje; m >= primeiro; m = somaMes(m, -1)) {
      const itens = gastosDoMes(gastos, m).filter(
        (g) => (!cat || g.categoria === cat) && (!vanId || g.vanId === vanId),
      );
      if (itens.length) out.push({ mes: m, itens, total: itens.reduce((s, g) => s + g.valor, 0) });
    }
    return out;
  }, [gastos, cat, vanId]);

  return (
    <div className="px-5 pb-8 pt-6">
      <Toaster position="top-center" />
      <Link
        to="/vanzeiro/mais"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-base font-semibold text-primary"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </Link>
      <h1 className="text-3xl font-extrabold text-primary">Gastos</h1>
      <div className="mt-4">
        <BotaoGrande variante="destaque" onClick={() => setCriando(true)}>
          <Plus className="h-6 w-6" /> Lançar gasto
        </BotaoGrande>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <select
          aria-label="Filtrar por categoria"
          className={campoClasse}
          value={cat}
          onChange={(e) => setCat(e.target.value as Categoria | "")}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar por van"
          className={campoClasse}
          value={vanId}
          onChange={(e) => setVanId(e.target.value)}
        >
          <option value="">Todas as vans</option>
          {vans.map((v) => (
            <option key={v.id} value={v.id}>
              {v.apelido}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 space-y-6">
        {meses.slice(0, mesesMostrados).map((m) => (
          <section key={m.mes}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-xl font-extrabold">{nomeMes(m.mes)}</h2>
              <p className="text-lg font-extrabold text-destructive">{brl(m.total)}</p>
            </div>
            <ul className="space-y-2">
              {m.itens.map((g) => {
                const Icone = ICONE_CATEGORIA[g.categoria];
                const original = gastos.find((x) => x.id === g.origemId)!;
                return (
                  <li
                    key={g.id}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-strong">
                      <Icone className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <p className="min-w-0 break-words font-extrabold">{g.categoria}</p>
                        <p className="shrink-0 font-extrabold">{brl(g.valor)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dataBR(g.data)}
                        {g.vanId
                          ? ` · ${vans.find((v) => v.id === g.vanId)?.apelido ?? "Van excluída"}`
                          : ""}
                        {g.linhaId
                          ? ` · ${linhas.find((l) => l.id === g.linhaId)?.nome ?? ""}`
                          : ""}
                      </p>
                      {(g.descricao || g.litros || g.mensal) && (
                        <p className="text-sm">
                          {g.mensal && (
                            <span className="mr-1 inline-flex items-center gap-1 font-bold text-primary">
                              <Repeat className="h-3 w-3" /> Todo mês ·
                            </span>
                          )}
                          {g.descricao}
                          {g.litros ? ` · ${g.litros} L` : ""}
                          {g.km ? ` · ${g.km.toLocaleString("pt-BR")} km` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <button
                        onClick={() => setEditando(original)}
                        aria-label="Editar"
                        className="flex h-11 w-11 items-center justify-center text-primary"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setExcluir(original)}
                        aria-label="Excluir"
                        className="flex h-11 w-11 items-center justify-center text-destructive"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {meses.length > mesesMostrados && (
          <BotaoGrande variante="contorno" onClick={() => setMesesMostrados((n) => n + 3)}>
            Mostrar meses anteriores ({meses.length - mesesMostrados})
          </BotaoGrande>
        )}
        {meses.length === 0 &&
          (gastos.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum gasto lançado ainda"
              texto='Toque em "Lançar gasto", no alto da tela, para registrar diesel, manutenção, pedágio e outros. O lucro do mês passa a contar com eles.'
            />
          ) : (
            <EstadoVazio
              titulo="Nenhum gasto com esse filtro"
              texto="Tente outra categoria ou van."
            />
          ))}
      </div>

      {formAberto && <FormGasto g={editando} onFechar={fechar} />}
      {excluir && (
        <Confirmar
          titulo="Excluir gasto?"
          texto={`${excluir.categoria} de ${brl(excluir.valor)} (${dataBR(excluir.data)})${excluir.mensal ? " — e todas as repetições mensais" : ""}.`}
          onSim={() => {
            excluirGasto(excluir.id);
            setExcluir(null);
            toast.success("Gasto excluído");
          }}
          onNao={() => setExcluir(null)}
        />
      )}
    </div>
  );
}

function FormGasto({ g, onFechar }: { g: Gasto | null; onFechar: () => void }) {
  const { vans, linhas } = useFrota();
  const [f, setF] = useState({
    valor: g ? String(g.valor).replace(".", ",") : "",
    data: g?.data ?? isoDe(new Date()),
    categoria: (g?.categoria ?? "Diesel") as Categoria,
    vanId: g?.vanId ?? "",
    linhaId: g?.linhaId ?? "",
    descricao: g?.descricao ?? "",
    litros: g?.litros ? String(g.litros) : "",
    km: g?.km ? String(g.km) : "",
    mensal: g?.mensal ?? false,
  });
  const [erros, setErros] = useState<{ valor?: string; data?: string }>({});
  const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
  const salvar = () => {
    const e: typeof erros = {};
    if (!(num(f.valor) > 0)) e.valor = "Digite o valor";
    if (!f.data) e.data = "Escolha a data";
    setErros(e);
    if (Object.keys(e).length) return;
    const diesel = f.categoria === "Diesel";
    salvarGasto({
      id: g?.id,
      valor: num(f.valor),
      data: f.data,
      categoria: f.categoria,
      vanId: f.vanId,
      linhaId: f.linhaId,
      descricao: f.descricao.trim(),
      litros: diesel && f.litros ? num(f.litros) : null,
      km: diesel && f.km ? num(f.km) : null,
      mensal: f.mensal,
    });
    toast.success(g ? "Gasto atualizado" : "Gasto lançado");
    onFechar();
  };
  return (
    <Painel titulo={g ? "Editar gasto" : "Lançar gasto"} onFechar={onFechar}>
      <Campo label="Valor (R$)" obrigatorio erro={erros.valor}>
        <input
          inputMode="decimal"
          className={`${campoClasse} text-2xl font-extrabold`}
          placeholder="0,00"
          value={f.valor}
          onChange={(e) => setF({ ...f, valor: e.target.value })}
        />
      </Campo>
      <Campo label="Data" obrigatorio erro={erros.data}>
        <input
          type="date"
          className={campoClasse}
          value={f.data}
          onChange={(e) => setF({ ...f, data: e.target.value })}
        />
      </Campo>
      <div>
        <p className="mb-1 text-base font-bold">Categoria</p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIAS.map((c) => {
            const Icone = ICONE_CATEGORIA[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => setF({ ...f, categoria: c })}
                className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center text-sm font-bold leading-tight ${f.categoria === c ? "bg-primary text-primary-foreground" : "border-2 border-primary text-primary"}`}
              >
                <Icone className="h-6 w-6" />
                {c}
              </button>
            );
          })}
        </div>
      </div>
      {f.categoria === "Diesel" && (
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Litros">
            <input
              inputMode="decimal"
              className={campoClasse}
              value={f.litros}
              onChange={(e) => setF({ ...f, litros: e.target.value })}
            />
          </Campo>
          <Campo label="Quilometragem">
            <input
              inputMode="numeric"
              className={campoClasse}
              value={f.km}
              onChange={(e) => setF({ ...f, km: e.target.value })}
            />
          </Campo>
        </div>
      )}
      <Campo label="Van">
        <select
          className={campoClasse}
          value={f.vanId}
          onChange={(e) => setF({ ...f, vanId: e.target.value })}
        >
          <option value="">Nenhuma</option>
          {vans.map((v) => (
            <option key={v.id} value={v.id}>
              {v.apelido}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Linha">
        <select
          className={campoClasse}
          value={f.linhaId}
          onChange={(e) => setF({ ...f, linhaId: e.target.value })}
        >
          <option value="">Nenhuma (gasto geral)</option>
          {linhas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Descrição">
        <input
          className={campoClasse}
          placeholder="Ex.: troca de óleo"
          value={f.descricao}
          onChange={(e) => setF({ ...f, descricao: e.target.value })}
        />
      </Campo>
      <button
        type="button"
        onClick={() => setF({ ...f, mensal: !f.mensal })}
        className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 text-left text-lg font-bold ${f.mensal ? "bg-primary text-primary-foreground" : "border-2 border-primary text-primary"}`}
      >
        <Repeat className="h-6 w-6" />
        <span className="flex-1">
          Repetir todo mês
          <span className="block text-sm font-semibold opacity-80">
            Para gastos fixos, como parcela da van ou seguro
          </span>
        </span>
        {f.mensal ? "Sim" : "Não"}
      </button>
      <BotaoGrande variante="destaque" onClick={salvar}>
        {g ? "Salvar" : "Lançar gasto"}
      </BotaoGrande>
    </Painel>
  );
}
