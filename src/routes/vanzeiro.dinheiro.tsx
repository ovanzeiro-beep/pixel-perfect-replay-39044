import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, MessageCircle, Receipt, Search, Share2, Undo2, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { EstadoVazio } from "@/components/app/EstadoVazio";
import { Financeiro } from "@/components/app/Financeiro";
import { BotaoGrande, Campo, Confirmar, Painel, campoClasse } from "@/components/app/Formulario";
import {
  useFrota,
  marcarPagamento,
  desfazerRecibo,
  cancelarCob,
  type Passageiro,
  useVanzeiro,
  configDaCobranca,
} from "@/data/repositorio";
import {
  aberto,
  brl,
  dataBR,
  estadoCob,
  isoDe,
  mensagemCobrar,
  nomeEstado,
  recebidoNoMes,
  resumoPassageiro,
  textoRecibo,
  totalEmAberto,
  venceEm7Dias,
  type Cobranca,
  type Forma,
  type Recibo,
} from "@/data/cobrancas";
import { pixComValor } from "@/lib/pix";
import { linkWhatsApp } from "@/lib/validacao";
import { compartilharTexto } from "@/lib/compartilhar";

export const Route = createFileRoute("/vanzeiro/dinheiro")({
  validateSearch: (s: Record<string, unknown>): { p?: string } =>
    typeof s["p"] === "string" ? { p: s["p"] } : {},
  head: () => ({
    meta: [
      { title: "Dinheiro · O Vanzeiro" },
      {
        name: "description",
        content: "Cobranças, pagamentos e recibos dos passageiros da sua van.",
      },
      { property: "og:title", content: "Dinheiro · O Vanzeiro" },
      {
        property: "og:description",
        content: "Cobranças, pagamentos e recibos dos passageiros da sua van.",
      },
    ],
  }),
  component: Dinheiro,
});

const primeiro = (n: string) => n.split(" (")[0]!.split(" ")[0]!;
const COR = {
  vermelho: { barra: "bg-destructive", texto: "text-destructive" },
  amarelo: { barra: "bg-accent", texto: "text-accent-strong" },
  verde: { barra: "bg-success", texto: "text-success" },
} as const;
const FILTROS = [
  { id: "todos", nome: "Todos" },
  { id: "devendo", nome: "Devendo" },
  { id: "a_vencer", nome: "A vencer" },
  { id: "pagos", nome: "Pagos" },
] as const;

function Dinheiro() {
  const [aba, setAba] = useState<"cobrancas" | "financeiro">("cobrancas");
  return (
    <div className="px-5 pt-6">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-extrabold text-primary">Dinheiro</h1>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
        {(["cobrancas", "financeiro"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`min-h-12 rounded-xl text-lg font-bold ${aba === a ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            {a === "cobrancas" ? "Cobranças" : "Financeiro"}
          </button>
        ))}
      </div>
      {aba === "cobrancas" ? <Cobrancas /> : <Financeiro />}
    </div>
  );
}

function useCobrar() {
  const { chavePix, cobrancas, configCobranca } = useFrota();
  const vanzeiro = useVanzeiro();
  const modelo = configDaCobranca({ configCobranca }).textoCobranca;
  const [semPix, setSemPix] = useState(false);
  const hoje = isoDe(new Date());
  /** Abre o WhatsApp com a cobrança. Devolve `true` se abriu (e não faltou chave Pix ou valor em aberto). */
  const cobrar = (p: Passageiro): boolean => {
    if (!chavePix) {
      setSemPix(true);
      return false;
    }
    const r = resumoPassageiro(cobrancas, p.id, hoje);
    if (r.total <= 0) {
      toast("Nada em aberto para cobrar");
      return false;
    }
    window.open(
      `${linkWhatsApp(p.telefone)}?text=${encodeURIComponent(mensagemCobrar(primeiro(p.nome), r.total, r.refs, chavePix, pixComValor(chavePix, r.total, vanzeiro), modelo))}`,
      "_blank",
    );
    return true;
  };
  const aviso = semPix ? (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
        <h3 className="text-xl font-extrabold">Cadastre sua chave Pix</h3>
        <p className="text-lg text-muted-foreground">
          A mensagem de cobrança leva a sua chave Pix. Cadastre no “Meu perfil”.
        </p>
        <Link
          to="/vanzeiro/perfil"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground"
        >
          Ir para Meu perfil
        </Link>
        <BotaoGrande variante="contorno" onClick={() => setSemPix(false)}>
          Agora não
        </BotaoGrande>
      </div>
    </div>
  ) : null;
  return { cobrar, aviso };
}

function Cobrancas() {
  const { passageiros, linhas, cobrancas, chavePix, pausas } = useFrota();
  const { p: abrirId } = Route.useSearch();
  const navigate = useNavigate({ from: "/vanzeiro/dinheiro" });
  const hoje = isoDe(new Date());
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todos");
  const [linhaId, setLinhaId] = useState("");
  const [busca, setBusca] = useState("");
  const [pagando, setPagando] = useState<{
    p: Passageiro;
    ids?: string[] | undefined;
    valor: number;
  } | null>(null);
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const { cobrar, aviso } = useCobrar();
  const [cobrandoTodos, setCobrandoTodos] = useState(false);

  // Quem está com pagamento atrasado, do mais antigo para o mais recente.
  const atrasados = useMemo(
    () =>
      passageiros
        .map((p) => ({ p, r: resumoPassageiro(cobrancas, p.id, hoje) }))
        .filter(({ r }) => r.total > 0 && r.diasAtraso > 0)
        .sort((a, b) => b.r.diasAtraso - a.r.diasAtraso || b.r.total - a.r.total),
    [passageiros, cobrancas, hoje],
  );

  const lista = useMemo(
    () =>
      passageiros
        .filter((p) => p.ativo || cobrancas.some((c) => c.pid === p.id))
        .map((p) => ({ p, r: resumoPassageiro(cobrancas, p.id, hoje) }))
        .filter(
          ({ p, r }) =>
            (filtro === "todos" ||
              (filtro === "devendo"
                ? r.cor === "vermelho"
                : filtro === "a_vencer"
                  ? r.qtd > 0 && r.cor !== "vermelho"
                  : r.qtd === 0)) &&
            (!linhaId || p.linhaIds.includes(linhaId)) &&
            p.nome.toLowerCase().includes(busca.trim().toLowerCase()),
        )
        .sort(
          (a, b) =>
            b.r.diasAtraso - a.r.diasAtraso ||
            b.r.total - a.r.total ||
            a.p.nome.localeCompare(b.p.nome),
        ),
    [passageiros, cobrancas, filtro, linhaId, busca, hoje],
  );

  const aberto_ = abrirId ? passageiros.find((p) => p.id === abrirId) : undefined;
  const abrir = (id?: string) => void navigate({ search: id ? { p: id } : {}, replace: !id });
  const copiarPix = () => {
    if (!chavePix) {
      toast.error("Cadastre a chave Pix no Meu perfil");
      return;
    }
    void navigator.clipboard?.writeText(chavePix).then(
      () => toast.success("Chave Pix copiada"),
      () => toast.error("Não deu para copiar"),
    );
  };

  return (
    <div className="space-y-4 pb-6 pt-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-3xl bg-destructive/10 p-4">
          <p className="font-bold text-muted-foreground">Em aberto</p>
          <p className="text-3xl font-extrabold text-destructive">
            {brl(totalEmAberto(cobrancas))}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-success/10 p-4">
            <p className="text-sm font-bold text-muted-foreground">Recebido no mês</p>
            <p className="text-xl font-extrabold text-success">
              {brl(recebidoNoMes(cobrancas, hoje))}
            </p>
          </div>
          <div className="rounded-3xl bg-accent/15 p-4">
            <p className="text-sm font-bold text-muted-foreground">Vence nos próximos 7 dias</p>
            <p className="text-xl font-extrabold text-accent-strong">
              {brl(venceEm7Dias(cobrancas, hoje, passageiros, pausas ?? []))}
            </p>
          </div>
        </div>
      </div>

      {atrasados.length >= 2 && (
        <BotaoGrande variante="destaque" onClick={() => setCobrandoTodos(true)}>
          <MessageCircle className="h-5 w-5" /> Cobrar todos os atrasados ({atrasados.length})
        </BotaoGrande>
      )}
      <BotaoGrande variante="contorno" onClick={copiarPix}>
        <Copy className="h-5 w-5" /> Copiar chave Pix
      </BotaoGrande>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`min-h-12 shrink-0 rounded-full px-5 text-lg font-bold ${filtro === f.id ? "bg-primary text-primary-foreground" : "border-2 border-primary text-primary"}`}
          >
            {f.nome}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${campoClasse} pl-12`}
            placeholder="Buscar pelo nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <select
          className={campoClasse}
          value={linhaId}
          onChange={(e) => setLinhaId(e.target.value)}
          aria-label="Filtrar por linha"
        >
          <option value="">Todas as linhas</option>
          {linhas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-3">
        {lista.map(({ p, r }) => (
          <li key={p.id} className="overflow-hidden rounded-3xl bg-card shadow-sm">
            <div className="flex">
              <span className={`w-2 shrink-0 ${COR[r.cor].barra}`} />
              <div className="flex-1 p-4">
                <button onClick={() => abrir(p.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-extrabold leading-tight">{p.nome}</p>
                    <p className={`shrink-0 text-lg font-extrabold ${COR[r.cor].texto}`}>
                      {r.total > 0 ? brl(r.total) : "Em dia"}
                    </p>
                  </div>
                  <p className="mt-1 text-base text-muted-foreground">
                    {r.qtd === 0
                      ? "Nenhuma cobrança em aberto"
                      : `${r.qtd} ${r.qtd === 1 ? "cobrança em aberto" : "cobranças em aberto"}`}
                    {r.diasAtraso > 0 && (
                      <span className="font-bold text-destructive">
                        {" "}
                        · atrasado há {r.diasAtraso} dias
                      </span>
                    )}
                    {r.cor === "amarelo" && (
                      <span className="font-bold text-accent-strong"> · vence em breve</span>
                    )}
                  </p>
                </button>
                {r.total > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPagando({ p, valor: r.total })}
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-success text-lg font-bold text-success-foreground"
                    >
                      <Wallet className="h-5 w-5" /> Marcar pago
                    </button>
                    <button
                      onClick={() => cobrar(p)}
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-success text-lg font-bold text-success"
                    >
                      <MessageCircle className="h-5 w-5" /> Cobrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
        {lista.length === 0 && (
          <li>
            {passageiros.length === 0 ? (
              <EstadoVazio
                titulo="Ainda não há cobranças"
                texto="Cadastre os seus passageiros e as cobranças aparecem aqui, com quem deve e quanto."
                acao={{ rotulo: "Cadastrar passageiros", para: "/vanzeiro/passageiros" }}
              />
            ) : (
              <EstadoVazio
                titulo="Ninguém com esse filtro ou busca"
                texto="Tente outro filtro ou limpe a busca."
                acao={{
                  rotulo: "Limpar filtros",
                  aoTocar: () => {
                    setFiltro("todos");
                    setLinhaId("");
                    setBusca("");
                  },
                }}
              />
            )}
          </li>
        )}
      </ul>

      {aberto_ && (
        <Historico
          p={aberto_}
          onFechar={() => abrir()}
          onPagar={(ids, valor) => setPagando({ p: aberto_, ids, valor })}
          onRecibo={setRecibo}
          onCobrar={() => cobrar(aberto_)}
          onCopiarPix={copiarPix}
        />
      )}
      {pagando && (
        <JanelaPagamento
          {...pagando}
          onFechar={() => setPagando(null)}
          onPago={(r) => {
            setPagando(null);
            setRecibo(r);
          }}
        />
      )}
      {cobrandoTodos && (
        <CobrarTodos
          itens={atrasados.map(({ p, r }) => ({ p, total: r.total, dias: r.diasAtraso }))}
          cobrar={cobrar}
          onFechar={() => setCobrandoTodos(false)}
        />
      )}
      {recibo && <JanelaRecibo r={recibo} onFechar={() => setRecibo(null)} />}
      {aviso}
    </div>
  );
}

/** Cobra um atrasado depois do outro: o WhatsApp abre uma conversa por vez, e aqui fica a conta de quem já foi avisado. */
function CobrarTodos({
  itens,
  cobrar,
  onFechar,
}: {
  itens: { p: Passageiro; total: number; dias: number }[];
  cobrar: (p: Passageiro) => boolean;
  onFechar: () => void;
}) {
  const [avisados, setAvisados] = useState<Set<string>>(new Set());
  const proximo = itens.find((i) => !avisados.has(i.p.id));
  return (
    <Painel titulo="Cobrar todos os atrasados" onFechar={onFechar}>
      <p className="text-lg font-bold">
        {avisados.size} de {itens.length} avisados
      </p>
      <p className="text-sm text-muted-foreground">
        O WhatsApp abre uma conversa por vez: toque em Cobrar, envie a mensagem e volte aqui para o
        próximo.
      </p>
      <ul className="space-y-2">
        {itens.map(({ p, total, dias }) => {
          const feito = avisados.has(p.id);
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl p-3 ${proximo?.p.id === p.id ? "border-2 border-accent bg-accent/10" : "bg-card"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="break-words font-extrabold">{p.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {brl(total)} · atrasado há {dias} {dias === 1 ? "dia" : "dias"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (cobrar(p)) setAvisados((s) => new Set(s).add(p.id));
                }}
                aria-label={feito ? `Cobrar ${p.nome} de novo` : `Cobrar ${p.nome}`}
                className={`flex min-h-12 shrink-0 items-center gap-1 rounded-xl px-4 font-bold ${feito ? "border-2 border-success text-success" : "bg-success text-success-foreground"}`}
              >
                {feito ? "Avisado ✓" : "Cobrar"}
              </button>
            </li>
          );
        })}
      </ul>
      {!proximo && (
        <p className="text-center text-lg font-extrabold text-success">Todos avisados!</p>
      )}
    </Painel>
  );
}

function JanelaPagamento({
  p,
  ids,
  valor,
  onFechar,
  onPago,
}: {
  p: Passageiro;
  ids?: string[] | undefined;
  valor: number;
  onFechar: () => void;
  onPago: (r: Recibo) => void;
}) {
  const [v, setV] = useState(valor.toFixed(2).replace(".", ","));
  const [forma, setForma] = useState<Forma>("pix");
  const [data, setData] = useState(isoDe(new Date()));
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    if (enviando) return;
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (!n || n <= 0) {
      setErro("Digite o valor recebido");
      return;
    }
    if (!data) {
      setErro("Escolha a data");
      return;
    }
    setEnviando(true);
    let r: Awaited<ReturnType<typeof marcarPagamento>>;
    try {
      r = await marcarPagamento(p.id, n, forma, data, ids);
    } catch {
      setEnviando(false);
      return;
    }
    setEnviando(false);
    if (!r) {
      setErro("Não há nada em aberto");
      return;
    }
    toast.success(`Pagamento de ${brl(r.valor)} marcado`);
    if (n > r.valor) toast(`Sobrou ${brl(n - r.valor)} além do que estava em aberto`);
    onPago(r);
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
        <h3 className="text-xl font-extrabold">Pagamento de {primeiro(p.nome)}</h3>
        <Campo label="Valor recebido (R$)" erro={erro}>
          <input
            inputMode="decimal"
            className={`${campoClasse} text-2xl font-extrabold`}
            value={v}
            onChange={(e) => {
              setV(e.target.value);
              setErro("");
            }}
          />
        </Campo>
        <div>
          <p className="mb-1 text-base font-bold">Forma</p>
          <div className="grid grid-cols-2 gap-2">
            {(["pix", "dinheiro"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setForma(f)}
                className={`min-h-14 rounded-2xl text-lg font-bold ${forma === f ? "bg-primary text-primary-foreground" : "border-2 border-primary text-primary"}`}
              >
                {f === "pix" ? "Pix" : "Dinheiro"}
              </button>
            ))}
          </div>
        </div>
        <Campo label="Data">
          <input
            type="date"
            className={campoClasse}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Campo>
        <p className="text-sm text-muted-foreground">
          Se for só uma parte, o valor quita primeiro as cobranças mais antigas.
        </p>
        <BotaoGrande variante="destaque" onClick={confirmar} disabled={enviando}>
          Confirmar pagamento
        </BotaoGrande>
        <BotaoGrande variante="contorno" onClick={onFechar}>
          Cancelar
        </BotaoGrande>
      </div>
    </div>
  );
}

function JanelaRecibo({ r, onFechar }: { r: Recibo; onFechar: () => void }) {
  const vanzeiro = useVanzeiro();
  const { passageiros } = useFrota();
  const p = passageiros.find((x) => x.id === r.pid);
  const texto = textoRecibo(r, vanzeiro.nome, p?.nome ?? "Passageiro");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
        <h3 className="flex items-center gap-2 text-xl font-extrabold">
          <Receipt className="h-6 w-6 text-primary" /> Recibo
        </h3>
        <pre className="whitespace-pre-wrap rounded-2xl bg-muted p-4 font-sans text-base">
          {texto}
        </pre>
        {p && (
          <a
            href={`${linkWhatsApp(p.telefone)}?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-success text-lg font-bold text-success-foreground"
          >
            <MessageCircle className="h-5 w-5" /> Enviar recibo pelo WhatsApp
          </a>
        )}
        <div className="grid grid-cols-2 gap-3">
          <BotaoGrande
            variante="contorno"
            onClick={async () => {
              const x = await compartilharTexto(
                texto,
                `Recibo nº ${String(r.numero).padStart(4, "0")}`,
              );
              if (x === "whatsapp") toast.success("Abrindo o WhatsApp com o recibo");
            }}
          >
            <Share2 className="h-5 w-5" /> Compartilhar
          </BotaoGrande>
          <BotaoGrande
            variante="contorno"
            onClick={() => {
              void navigator.clipboard?.writeText(texto).then(
                () => toast.success("Recibo copiado"),
                () => toast.error("Não deu para copiar"),
              );
            }}
          >
            <Copy className="h-5 w-5" /> Copiar
          </BotaoGrande>
        </div>
        <BotaoGrande variante="contorno" onClick={onFechar}>
          Fechar
        </BotaoGrande>
      </div>
    </div>
  );
}

function Historico({
  p,
  onFechar,
  onPagar,
  onRecibo,
  onCobrar,
  onCopiarPix,
}: {
  p: Passageiro;
  onFechar: () => void;
  onPagar: (ids: string[] | undefined, valor: number) => void;
  onRecibo: (r: Recibo) => void;
  onCobrar: () => void;
  onCopiarPix: () => void;
}) {
  const { cobrancas, recibos } = useFrota();
  const hoje = isoDe(new Date());
  const minhas = cobrancas
    .filter((c) => c.pid === p.id)
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  const meusRecibos = recibos
    .filter((r) => r.pid === p.id)
    .sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
  const r = resumoPassageiro(cobrancas, p.id, hoje);
  const [desfazer, setDesfazer] = useState<Recibo | null>(null);
  const [cancelar, setCancelar] = useState<Cobranca | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState("");

  const corEstado = (c: Cobranca) =>
    ({
      paga: "text-success",
      cancelada: "text-muted-foreground",
      atrasada: "text-destructive",
      vence_logo: "text-accent-strong",
      a_vencer: "text-muted-foreground",
    })[estadoCob(c, hoje)];

  return (
    <Painel titulo={p.nome} onFechar={onFechar}>
      <div className={`rounded-3xl p-4 ${r.total > 0 ? "bg-destructive/10" : "bg-success/10"}`}>
        <p className="font-bold text-muted-foreground">Deve agora</p>
        <p
          className={`text-3xl font-extrabold ${r.total > 0 ? "text-destructive" : "text-success"}`}
        >
          {r.total > 0 ? brl(r.total) : "Nada — em dia"}
        </p>
      </div>
      {r.total > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onPagar(undefined, r.total)}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-success text-lg font-bold text-success-foreground"
          >
            <Wallet className="h-5 w-5" /> Marcar pago
          </button>
          <button
            onClick={onCobrar}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-success text-lg font-bold text-success"
          >
            <MessageCircle className="h-5 w-5" /> Cobrar
          </button>
        </div>
      )}
      <BotaoGrande variante="contorno" onClick={onCopiarPix}>
        <Copy className="h-5 w-5" /> Copiar chave Pix
      </BotaoGrande>

      <section>
        <h3 className="mb-2 text-lg font-extrabold">Cobranças</h3>
        <ul className="space-y-2">
          {minhas.map((c) => (
            <li
              key={c.id}
              className={`rounded-2xl bg-card p-4 shadow-sm ${c.cancelada ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-lg font-extrabold ${c.cancelada ? "line-through" : ""}`}>
                    {c.ref}
                  </p>
                  <p className={`font-bold ${corEstado(c)}`}>{nomeEstado(c, hoje)}</p>
                </div>
                <p className="text-lg font-extrabold">{brl(c.valor)}</p>
              </div>
              {c.pagamentos.map((pg, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  Pago {brl(pg.valor)} em {dataBR(pg.data)} ·{" "}
                  {pg.forma === "pix" ? "Pix" : "Dinheiro"} · recibo nº{" "}
                  {String(pg.recibo).padStart(4, "0")}
                </p>
              ))}
              {c.cancelada && (
                <p className="text-sm text-muted-foreground">Cancelada: {c.cancelada}</p>
              )}
              {aberto(c) > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onPagar([c.id], aberto(c))}
                    className="min-h-12 rounded-xl bg-success/15 font-bold text-success"
                  >
                    Marcar paga
                  </button>
                  <button
                    onClick={() => {
                      setCancelar(c);
                      setMotivo("");
                      setErroMotivo("");
                    }}
                    className="min-h-12 rounded-xl border-2 border-destructive font-bold text-destructive"
                  >
                    Cancelar cobrança
                  </button>
                </div>
              )}
            </li>
          ))}
          {minhas.length === 0 && <p className="text-muted-foreground">Nenhuma cobrança ainda.</p>}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-lg font-extrabold">Recibos</h3>
        <ul className="space-y-2">
          {meusRecibos.map((rc) => (
            <li key={rc.numero} className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex justify-between gap-2">
                <p className="font-extrabold">Recibo nº {String(rc.numero).padStart(4, "0")}</p>
                <p className="font-extrabold text-success">{brl(rc.valor)}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {dataBR(rc.data)} · {rc.forma === "pix" ? "Pix" : "Dinheiro"} · {rc.refs.join(", ")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onRecibo(rc)}
                  className="flex min-h-12 items-center justify-center gap-1 rounded-xl border-2 border-primary font-bold text-primary"
                >
                  <Receipt className="h-4 w-4" /> Ver recibo
                </button>
                <button
                  onClick={() => setDesfazer(rc)}
                  className="flex min-h-12 items-center justify-center gap-1 rounded-xl border-2 border-destructive font-bold text-destructive"
                >
                  <Undo2 className="h-4 w-4" /> Desfazer pagamento
                </button>
              </div>
            </li>
          ))}
          {meusRecibos.length === 0 && (
            <p className="text-muted-foreground">Nenhum pagamento marcado.</p>
          )}
        </ul>
      </section>

      {desfazer && (
        <Confirmar
          titulo="Desfazer pagamento?"
          texto={`O pagamento de ${brl(desfazer.valor)} (recibo nº ${String(desfazer.numero).padStart(4, "0")}) será desfeito e o valor volta a ficar em aberto.`}
          onSim={() => {
            desfazerRecibo(desfazer.numero);
            setDesfazer(null);
            toast.success("Pagamento desfeito");
          }}
          onNao={() => setDesfazer(null)}
          sim="Sim, desfazer"
        />
      )}
      {cancelar && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-card p-6">
            <h3 className="flex items-center gap-2 text-xl font-extrabold">
              <XCircle className="h-6 w-6 text-destructive" /> Cancelar {cancelar.ref}
            </h3>
            <p className="text-muted-foreground">Cobrança cancelada não conta como dívida.</p>
            <Campo label="Motivo" obrigatorio erro={erroMotivo}>
              <input
                className={campoClasse}
                placeholder="Ex.: viagem cancelada"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setErroMotivo("");
                }}
              />
            </Campo>
            <BotaoGrande
              variante="perigo"
              onClick={() => {
                if (!motivo.trim()) {
                  setErroMotivo("Escreva o motivo");
                  return;
                }
                cancelarCob(cancelar.id, motivo.trim());
                setCancelar(null);
                toast.success("Cobrança cancelada");
              }}
            >
              Cancelar cobrança
            </BotaoGrande>
            <BotaoGrande variante="contorno" onClick={() => setCancelar(null)}>
              Voltar
            </BotaoGrande>
          </div>
        </div>
      )}
    </Painel>
  );
}
