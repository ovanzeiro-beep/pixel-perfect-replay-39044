import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Fuel, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { brl, dataBR, isoDe } from "@/data/cobrancas";
import { historicoViagens } from "@/data/historico";
import {
  csv,
  linhasGastos,
  linhasRecebimentos,
  linhasResumo,
  nomeDoArquivoExportado,
  type TipoExportacao,
} from "@/data/exportacao";
import {
  PRESETS,
  combustivelPorVan,
  nomePeriodo,
  ocupacaoPorLinha,
  periodoPreset,
  periodoValido,
  relatorioPeriodo,
  textoRelatorio,
  type Linha3,
  type Periodo,
  type PresetPeriodo,
} from "@/data/relatorios";
import { useFrota, useVanzeiro } from "@/data/repositorio";
import { campoClasse } from "@/components/app/Formulario";
import { compartilharTexto, salvarArquivo } from "@/lib/compartilhar";

export const Route = createFileRoute("/vanzeiro/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · O Vanzeiro" },
      {
        name: "description",
        content: "Lucro por van e por linha, ocupação das viagens e combustível.",
      },
      { property: "og:title", content: "Relatórios · O Vanzeiro" },
      {
        property: "og:description",
        content: "Lucro por van e por linha, ocupação das viagens e combustível.",
      },
    ],
  }),
  component: Relatorios,
});

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function Tres({ l }: { l: Linha3 }) {
  return (
    <li className="py-3">
      <p className="font-extrabold">{l.nome}</p>
      <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Recebeu</p>
          <p className="font-bold text-success">{brl(l.recebido)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Gastou</p>
          <p className="font-bold text-destructive">{brl(l.gastos)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Lucro</p>
          <p className={`font-bold ${l.lucro >= 0 ? "text-success" : "text-destructive"}`}>
            {brl(l.lucro)}
          </p>
        </div>
      </div>
    </li>
  );
}

function Relatorios() {
  const vanzeiro = useVanzeiro();
  const { cobrancas, gastos, linhas, vans, passageiros, ajustes } = useFrota();
  const hoje = isoDe(new Date());
  const [preset, setPreset] = useState<PresetPeriodo | "outro">("mes");
  const [custom, setCustom] = useState<Periodo>({ de: periodoPreset("mes", hoje).de, ate: hoje });
  const periodo = preset === "outro" ? custom : periodoPreset(preset, hoje);
  const valido = periodoValido(periodo);
  const { de, ate } = periodo;

  const linhaDoPassageiro = (pid: string) =>
    passageiros.find((p) => p.id === pid)?.linhaIds[0] ?? "";

  const dados = useMemo(() => {
    if (!valido) return null;
    const intervalo = { de, ate };
    const linhaDoPassageiro = (pid: string) =>
      passageiros.find((p) => p.id === pid)?.linhaIds[0] ?? "";
    const rel = relatorioPeriodo({ cobrancas, gastos, linhas, vans, linhaDoPassageiro }, intervalo);
    const ocupacao = ocupacaoPorLinha(historicoViagens(ajustes), linhas, vans, intervalo);
    const combustivel = combustivelPorVan(gastos, intervalo, vans);
    return { rel, ocupacao, combustivel };
  }, [valido, de, ate, cobrancas, gastos, linhas, vans, passageiros, ajustes]);

  const chip = (a: boolean) =>
    `min-h-11 shrink-0 rounded-full border-2 px-4 text-base font-bold ${a ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`;
  const enviar = async () => {
    if (!dados) return;
    const r = await compartilharTexto(
      textoRelatorio({ periodo, vanzeiro: vanzeiro.nome, ...dados }),
      `Relatório — ${nomePeriodo(periodo)}`,
    );
    if (r === "whatsapp") toast.success("Abrindo o WhatsApp com o relatório");
  };

  const exportar = async (tipo: TipoExportacao) => {
    if (!dados) return;
    const ctx = { cobrancas, gastos, linhas, vans, passageiros, linhaDoPassageiro };
    const linhasDoArquivo =
      tipo === "recebimentos"
        ? linhasRecebimentos(ctx, periodo)
        : tipo === "gastos"
          ? linhasGastos(ctx, periodo)
          : linhasResumo(periodo, dados.rel, dados.ocupacao, dados.combustivel, vanzeiro.nome);
    const r = await salvarArquivo(nomeDoArquivoExportado(tipo, periodo), csv(linhasDoArquivo), {
      tipo: "text/csv;charset=utf-8",
    });
    if (r === "cancelado") return;
    toast.success(
      r === "compartilhado"
        ? "Planilha enviada"
        : "Planilha baixada. Abra no Excel ou no Planilhas Google.",
    );
  };

  return (
    <div className="space-y-5 px-5 pb-8 pt-6 print:max-w-none print:space-y-3 print:px-0 print:pt-0">
      <Toaster position="top-center" />
      <div className="hidden print:block">
        <p className="text-2xl font-extrabold">O Vanzeiro — Relatório</p>
        <p className="text-lg">
          {vanzeiro.nome}
          {vanzeiro.cidade ? ` · ${vanzeiro.cidade} - ${vanzeiro.estado}` : ""}
        </p>
        <p className="text-lg font-bold">
          {nomePeriodo(periodo)} ({dataBR(periodo.de)} a {dataBR(periodo.ate)})
        </p>
      </div>
      <Link
        to="/vanzeiro/mais"
        className="inline-flex items-center gap-2 text-base font-semibold text-primary print:hidden"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </Link>
      <h1 className="text-3xl font-extrabold text-primary print:hidden">Relatórios</h1>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 print:hidden">
        {PRESETS.map((p) => (
          <button key={p.id} className={chip(preset === p.id)} onClick={() => setPreset(p.id)}>
            {p.nome}
          </button>
        ))}
        <button className={chip(preset === "outro")} onClick={() => setPreset("outro")}>
          Outro período
        </button>
      </div>

      {preset === "outro" && (
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-card p-4 shadow-sm">
          <label className="block text-sm font-bold">
            De
            <input
              type="date"
              className={campoClasse}
              value={custom.de}
              max={custom.ate || undefined}
              onChange={(e) => setCustom({ ...custom, de: e.target.value })}
            />
          </label>
          <label className="block text-sm font-bold">
            Até
            <input
              type="date"
              className={campoClasse}
              value={custom.ate}
              min={custom.de || undefined}
              onChange={(e) => setCustom({ ...custom, ate: e.target.value })}
            />
          </label>
        </div>
      )}

      {!valido || !dados ? (
        <p className="rounded-2xl bg-destructive/10 p-4 text-center font-bold text-destructive">
          Escolha as duas datas, com o início antes do fim.
        </p>
      ) : (
        <>
          <p className="text-lg font-bold text-muted-foreground print:hidden">
            {nomePeriodo(periodo)}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-success/10 p-3">
              <p className="text-sm font-bold text-muted-foreground">Recebido</p>
              <p className="whitespace-nowrap text-base font-extrabold text-success">
                {brl(dados.rel.recebido)}
              </p>
            </div>
            <div className="rounded-2xl bg-destructive/10 p-3">
              <p className="text-sm font-bold text-muted-foreground">Gastos</p>
              <p className="whitespace-nowrap text-base font-extrabold text-destructive">
                {brl(dados.rel.gastos)}
              </p>
            </div>
            <div
              className={`rounded-2xl p-3 ${dados.rel.lucro >= 0 ? "bg-success/15" : "bg-destructive/15"}`}
            >
              <p className="text-sm font-bold text-muted-foreground">Lucro</p>
              <p
                className={`whitespace-nowrap text-base font-extrabold ${dados.rel.lucro >= 0 ? "text-success" : "text-destructive"}`}
              >
                {brl(dados.rel.lucro)}
              </p>
            </div>
          </div>
          {dados.rel.margem !== null && (
            <p className="-mt-2 text-center text-sm text-muted-foreground">
              O lucro é {dados.rel.margem}% do que você recebeu.
            </p>
          )}

          <section className="rounded-3xl bg-card p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-primary">Lucro por van</h2>
            <p className="text-sm text-muted-foreground">
              O que entra vem das linhas que a van faz.
            </p>
            <ul className="mt-2 divide-y">
              {dados.rel.porVan.map((l) => (
                <Tres key={l.id || "sem"} l={l} />
              ))}
            </ul>
            {dados.rel.porVan.length === 0 && (
              <p className="mt-2 text-muted-foreground">Nenhuma van cadastrada.</p>
            )}
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-primary">Lucro por linha</h2>
            <ul className="mt-2 divide-y">
              {dados.rel.porLinha.map((l) => (
                <Tres key={l.id || "gerais"} l={l} />
              ))}
            </ul>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-primary">Ocupação das viagens</h2>
            {dados.ocupacao.linhas.length === 0 ? (
              <p className="mt-2 text-muted-foreground">Nenhuma viagem realizada neste período.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {dados.ocupacao.geral.viagens} viagens · {dados.ocupacao.geral.pct}% dos lugares
                  ocupados
                </p>
                <ul className="mt-3 space-y-4">
                  {dados.ocupacao.linhas.map((o) => (
                    <li key={o.linhaId}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold">{o.nome}</span>
                        <span className="text-lg font-extrabold">{o.pct}%</span>
                      </div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${o.pct >= 70 ? "bg-success" : o.pct >= 40 ? "bg-accent" : "bg-destructive"}`}
                          style={{ width: `${Math.min(100, o.pct)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {num(o.embarques)} de {num(o.lugares)} lugares em média · {o.viagens}{" "}
                        viagens
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-primary">
              <Fuel className="h-6 w-6 text-accent-strong" /> Combustível
            </h2>
            {dados.combustivel.length === 0 ? (
              <p className="mt-2 text-muted-foreground">
                Nenhum abastecimento com litros neste período. Informe os litros e o km ao lançar o
                gasto de diesel.
              </p>
            ) : (
              <ul className="mt-2 divide-y">
                {dados.combustivel.map((c) => (
                  <li key={c.vanId} className="py-3">
                    <p className="font-extrabold">
                      {c.nome}{" "}
                      <span className="text-sm font-semibold text-muted-foreground">
                        · {c.abastecimentos} abastecimentos
                      </span>
                    </p>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Litros</p>
                        <p className="font-bold">{num(c.litros)} L</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Preço/litro</p>
                        <p className="font-bold">{brl(c.precoLitro)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gasto</p>
                        <p className="font-bold text-destructive">{brl(c.valor)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Consumo</p>
                        <p className="font-bold">
                          {c.kmPorLitro ? `${num(c.kmPorLitro)} km/L` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Custo/km</p>
                        <p className="font-bold">{c.custoPorKm ? brl(c.custoPorKm) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Km rodados</p>
                        <p className="font-bold">{c.kmRodados ? num(c.kmRodados) : "—"}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-label="Exportar"
            className="space-y-3 rounded-3xl bg-card p-5 shadow-sm print:hidden"
          >
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-primary">
              <FileSpreadsheet className="h-6 w-6 text-accent-strong" /> Exportar
            </h2>
            <p className="text-sm text-muted-foreground">
              Planilhas (CSV) para o Excel ou o Planilhas Google, com o período escolhido acima. Bom
              para mandar ao contador.
            </p>
            {(
              [
                ["recebimentos", "Planilha de recebimentos"],
                ["gastos", "Planilha de gastos"],
                ["resumo", "Planilha do resumo (van, linha, ocupação)"],
              ] as const
            ).map(([tipo, rotulo]) => (
              <button
                key={tipo}
                onClick={() => void exportar(tipo)}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card px-3 text-center text-lg font-bold text-primary"
              >
                <FileSpreadsheet className="h-5 w-5 shrink-0" /> {rotulo}
              </button>
            ))}
            <button
              onClick={() => window.print()}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card text-lg font-bold text-primary"
            >
              <Printer className="h-5 w-5" /> Imprimir ou salvar em PDF
            </button>
          </section>

          <button
            onClick={enviar}
            className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-success text-lg font-extrabold text-success-foreground print:hidden"
          >
            <Share2 className="h-6 w-6" /> Compartilhar relatório
          </button>
        </>
      )}
    </div>
  );
}
