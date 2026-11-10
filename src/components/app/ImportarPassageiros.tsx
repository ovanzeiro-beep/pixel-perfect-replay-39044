import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { BotaoGrande, Painel } from "@/components/app/Formulario";
import {
  NOME_DO_CAMPO,
  analisarImportacao,
  lerTabela,
  modeloDeImportacao,
  type ItemImportacao,
} from "@/data/importacao";
import { configDaCobranca, importarPassageiros, useFrota, useVanzeiro } from "@/data/repositorio";
import { lerArquivoTexto, salvarArquivo } from "@/lib/compartilhar";

const ROTULO: Record<ItemImportacao["situacao"], string> = {
  novo: "Novo",
  duplicado: "Já cadastrado",
  erro: "Corrigir",
};
const COR: Record<ItemImportacao["situacao"], string> = {
  novo: "bg-success/15 text-success",
  duplicado: "bg-muted text-muted-foreground",
  erro: "bg-destructive/15 text-destructive",
};

/** Lê o arquivo; se os acentos vierem quebrados (CSV salvo pelo Excel antigo), lê de novo como Windows-1252. */
async function lerComAcentos(arquivo: File): Promise<string> {
  const utf8 = await lerArquivoTexto(arquivo);
  return utf8.includes("�") ? lerArquivoTexto(arquivo, "windows-1252") : utf8;
}

export function ImportarPassageiros({ onFechar }: { onFechar: () => void }) {
  const { linhas, passageiros, configCobranca } = useFrota();
  const vanzeiro = useVanzeiro();
  const [texto, setTexto] = useState("");
  const [nomeDoArquivo, setNomeDoArquivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const analise = useMemo(
    () =>
      texto.trim()
        ? analisarImportacao(lerTabela(texto), {
            linhas,
            existentes: passageiros.map((p) => ({ nome: p.nome, telefone: p.telefone })),
            cidadePadrao: vanzeiro.cidade,
            pagaNaHoraPadrao: configDaCobranca({ configCobranca }).pagaNaHoraPadrao,
          })
        : null,
    [texto, linhas, passageiros, vanzeiro.cidade, configCobranca],
  );
  const novos = analise?.itens.filter((i) => i.situacao === "novo") ?? [];
  const duplicados = analise?.itens.filter((i) => i.situacao === "duplicado").length ?? 0;
  const erros = analise?.itens.filter((i) => i.situacao === "erro").length ?? 0;

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      setTexto(await lerComAcentos(arquivo));
      setNomeDoArquivo(arquivo.name);
    } catch {
      toast.error("Não deu para ler esse arquivo. Salve a planilha como CSV e tente de novo.");
    }
  };

  const importar = async () => {
    if (enviando || novos.length === 0) return;
    setEnviando(true);
    try {
      const ids = await importarPassageiros(novos.map((i) => i.dados!));
      toast.success(
        ids.length === 1 ? "1 passageiro importado" : `${ids.length} passageiros importados`,
      );
      onFechar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Painel titulo="Importar de planilha" onFechar={onFechar}>
      <p className="text-base text-muted-foreground">
        Tem os passageiros numa planilha? Escolha o arquivo (CSV) ou cole o texto copiado do Excel
        ou do Planilhas Google. Antes de gravar, você confere tudo.
      </p>

      <div className="space-y-3 rounded-3xl bg-card p-4 shadow-sm">
        <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-primary px-4 text-lg font-bold text-primary">
          <FileSpreadsheet className="h-5 w-5" />
          {nomeDoArquivo || "Escolher arquivo CSV"}
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            aria-label="Arquivo da planilha"
            className="sr-only"
            onChange={(e) => void escolher(e.target.files?.[0])}
          />
        </label>
        <textarea
          aria-label="Ou cole aqui o texto da planilha"
          placeholder="Ou cole aqui o que você copiou da planilha (com a primeira linha de títulos)"
          className="min-h-28 w-full rounded-2xl border-2 bg-card p-3 text-base outline-none focus:border-primary"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setNomeDoArquivo("");
          }}
        />
        <button
          type="button"
          onClick={() =>
            void salvarArquivo("modelo-passageiros.csv", modeloDeImportacao(), {
              tipo: "text/csv;charset=utf-8",
              soBaixar: true,
            })
          }
          className="flex min-h-11 items-center gap-2 text-base font-bold text-primary underline"
        >
          <Download className="h-4 w-4" /> Baixar planilha de exemplo
        </button>
        <p className="text-sm text-muted-foreground">
          No Excel: Arquivo → Salvar como → "CSV (separado por vírgulas)". Colunas: Nome e Telefone
          são obrigatórios; também podem ir Endereço, Número, Bairro, Cidade, Linha, Forma de
          pagamento, Valor, Vencimento e Observações.
        </p>
      </div>

      {analise && analise.itens.length === 0 && (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 p-3 text-base font-semibold text-destructive"
        >
          Não encontrei passageiros nesse texto. Confira se a primeira linha tem os títulos das
          colunas.
        </p>
      )}

      {analise && analise.itens.length > 0 && (
        <section aria-label="Conferência" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {analise.colunas.temCabecalho
              ? `Colunas reconhecidas: ${analise.colunas.campos
                  .filter(Boolean)
                  .map((c) => NOME_DO_CAMPO[c!])
                  .join(", ")}.`
              : "A planilha não tem títulos: assumi Nome, Telefone e Valor, nessa ordem."}
            {analise.colunas.ignoradas.length > 0 &&
              ` Ignorei: ${analise.colunas.ignoradas.join(", ")}.`}
          </p>
          <p className="text-lg font-extrabold">
            {novos.length} {novos.length === 1 ? "pronto" : "prontos"} para importar
            {duplicados > 0 &&
              ` · ${duplicados} já ${duplicados === 1 ? "cadastrado" : "cadastrados"}`}
            {erros > 0 && ` · ${erros} para corrigir`}
          </p>
          <ul className="space-y-2">
            {analise.itens.map((i) => (
              <li key={i.linhaNaPlanilha} className="rounded-2xl bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-extrabold">{i.nome || "(sem nome)"}</p>
                    <p className="text-sm text-muted-foreground">
                      Linha {i.linhaNaPlanilha} · {i.telefone || "sem telefone"}
                    </p>
                    {i.resumo && <p className="text-sm">{i.resumo}</p>}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${COR[i.situacao]}`}
                  >
                    {ROTULO[i.situacao]}
                  </span>
                </div>
                {i.problemas.map((p) => (
                  <p key={p} className="mt-1 text-sm font-semibold text-destructive">
                    {p}
                  </p>
                ))}
                {i.avisos.map((a) => (
                  <p key={a} className="mt-1 text-sm text-muted-foreground">
                    {a}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {erros > 0 && (
            <p className="text-sm text-muted-foreground">
              As linhas para corrigir não serão importadas. Corrija na planilha e escolha o arquivo
              de novo.
            </p>
          )}
          <BotaoGrande
            variante="destaque"
            onClick={importar}
            disabled={novos.length === 0 || enviando}
          >
            {novos.length === 0
              ? "Nada para importar"
              : `Importar ${novos.length} ${novos.length === 1 ? "passageiro" : "passageiros"}`}
          </BotaoGrande>
        </section>
      )}
    </Painel>
  );
}
