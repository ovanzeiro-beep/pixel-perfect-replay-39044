import { useRef, useState } from "react";
import { Download, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { BotaoGrande, Confirmar } from "@/components/app/Formulario";
import {
  apagarCopiaDeSeguranca,
  criarBackup,
  guardarCopiaDeSeguranca,
  marcarBackupFeito,
  nomeDoArquivoDeBackup,
  resumoDoEstado,
  serializarBackup,
  useBackupMeta,
  useCopiaDeSeguranca,
  validarBackup,
  zerarAlteracoes,
  type Backup,
} from "@/data/backup";
import { obterEstado, substituirTodosOsDados } from "@/data/repositorio";
import { lerArquivoTexto, salvarArquivo } from "@/lib/compartilhar";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const ROTULOS: [keyof ReturnType<typeof resumoDoEstado>, string][] = [
  ["passageiros", "passageiros"],
  ["linhas", "linhas"],
  ["vans", "vans"],
  ["motoristas", "motoristas"],
  ["viagensRealizadas", "viagens feitas"],
  ["cobrancas", "cobranças"],
  ["recibos", "recibos"],
  ["gastos", "gastos"],
];

function Comparacao({
  backup,
  agora,
}: {
  backup: ReturnType<typeof resumoDoEstado>;
  agora: ReturnType<typeof resumoDoEstado>;
}) {
  return (
    <table className="mt-3 w-full text-left text-base">
      <thead>
        <tr className="text-sm text-muted-foreground">
          <th scope="col" className="py-1 font-semibold">
            <span className="sr-only">Item</span>
          </th>
          <th scope="col" className="py-1 pr-1 text-right font-extrabold text-primary">
            No backup
          </th>
          <th scope="col" className="py-1 pl-1 text-right font-extrabold">
            Agora
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {ROTULOS.map(([k, nome]) => (
          <tr key={k} className={backup[k] !== agora[k] ? "bg-accent/15" : undefined}>
            <th scope="row" className="py-1.5 pr-2 font-normal text-muted-foreground">
              {nome}
            </th>
            <td className="py-1.5 pr-1 text-right font-extrabold">{backup[k]}</td>
            <td className="py-1.5 pl-1 text-right font-extrabold">{agora[k]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Backup em arquivo: salvar, restaurar (com prévia e confirmação) e desfazer a última substituição. */
export function BackupDados({ soRestaurar = false }: { soRestaurar?: boolean } = {}) {
  const meta = useBackupMeta();
  const copia = useCopiaDeSeguranca();
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Backup | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const salvar = async (soBaixar: boolean) => {
    const backup = criarBackup(obterEstado());
    const r = await salvarArquivo(nomeDoArquivoDeBackup(), serializarBackup(backup), { soBaixar });
    if (r === "cancelado") return;
    marcarBackupFeito(backup.criadoEm);
    toast.success(
      r === "compartilhado"
        ? "Backup enviado. Guarde o arquivo num lugar seguro."
        : "Backup baixado. Guarde o arquivo num lugar seguro.",
    );
  };

  const escolher = async (arquivo: File | undefined) => {
    if (entrada.current) entrada.current.value = "";
    if (!arquivo) return;
    setErro(null);
    try {
      const resultado = validarBackup(await lerArquivoTexto(arquivo));
      if (resultado.ok) setPrevia(resultado.backup);
      else setErro(resultado.erro);
    } catch {
      setErro("Não deu para ler o arquivo. Tente escolher de novo.");
    }
  };

  const desfazer = () => {
    const c = copia;
    if (!c) return;
    substituirTodosOsDados(c.dados);
    apagarCopiaDeSeguranca();
    zerarAlteracoes();
    toast.success("Pronto: os dados de antes foram devolvidos");
  };

  const restaurar = () => {
    if (!previa) return;
    guardarCopiaDeSeguranca(obterEstado(), "restauração de backup");
    substituirTodosOsDados(previa.dados);
    marcarBackupFeito(previa.criadoEm);
    setPrevia(null);
    toast.success("Backup restaurado", { action: { label: "Desfazer", onClick: desfazer } });
  };

  const atual = resumoDoEstado(obterEstado());

  return (
    <section
      aria-label="Backup dos dados"
      className="mt-4 space-y-3 rounded-3xl bg-card p-5 shadow-sm"
    >
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <ShieldCheck className="h-5 w-5 text-accent-strong" />{" "}
        {soRestaurar ? "Já usa o app? Restaure seu backup" : "Backup dos dados"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {soRestaurar
          ? "Trocou de celular ou limpou os dados? Escolha o arquivo de backup (vanzeiro-backup-….json) e tudo volta: passageiros, cobranças, recibos e viagens."
          : "Seus dados ficam só neste aparelho. Salve um backup de vez em quando: se trocar de celular ou os dados do app forem apagados, você restaura tudo."}
      </p>
      {!soRestaurar && (
        <>
          <p className="rounded-2xl bg-muted px-4 py-3 text-base font-semibold">
            {meta.ultimoBackup
              ? `Último backup: ${quando(meta.ultimoBackup)}`
              : "Você ainda não fez backup."}
            {meta.alteracoes > 0 && (
              <span className="block text-sm font-normal text-muted-foreground">
                {meta.alteracoes}{" "}
                {meta.ultimoBackup
                  ? `${meta.alteracoes === 1 ? "alteração" : "alterações"} desde então`
                  : `${meta.alteracoes === 1 ? "alteração feita" : "alterações feitas"} só neste aparelho`}
              </span>
            )}
          </p>

          <BotaoGrande variante="destaque" onClick={() => void salvar(false)}>
            <Download className="h-5 w-5" /> Salvar backup
          </BotaoGrande>
          <button
            onClick={() => void salvar(true)}
            className="min-h-11 w-full text-center text-sm font-semibold text-muted-foreground underline"
          >
            Só baixar o arquivo
          </button>
        </>
      )}

      <input
        ref={entrada}
        type="file"
        accept=".json,application/json"
        aria-label="Escolher arquivo de backup"
        className="sr-only"
        onChange={(e) => void escolher(e.target.files?.[0])}
      />
      <BotaoGrande variante="contorno" onClick={() => entrada.current?.click()}>
        <Upload className="h-5 w-5" /> Restaurar de um backup
      </BotaoGrande>

      {erro && (
        <p
          role="alert"
          className="rounded-2xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 font-bold text-destructive"
        >
          {erro}
        </p>
      )}

      {copia && (
        <div className="rounded-2xl border-2 border-dashed border-primary/40 p-4">
          <p className="font-bold">Dá para desfazer a última substituição</p>
          <p className="text-sm text-muted-foreground">
            Dados de antes da {copia.motivo}, guardados em {quando(copia.salvoEm)}.
          </p>
          <div className="mt-3">
            <BotaoGrande variante="contorno" onClick={desfazer}>
              <RotateCcw className="h-5 w-5" /> Desfazer e voltar aos dados de antes
            </BotaoGrande>
          </div>
        </div>
      )}

      {previa && (
        <Confirmar
          titulo="Restaurar este backup?"
          texto={`Backup feito em ${quando(previa.criadoEm)}. Ele vai substituir os dados deste aparelho. Os dados de agora ficam guardados e você pode desfazer.`}
          sim="Sim, restaurar"
          onSim={restaurar}
          onNao={() => setPrevia(null)}
        >
          <Comparacao backup={previa.resumo} agora={atual} />
        </Confirmar>
      )}
    </section>
  );
}
