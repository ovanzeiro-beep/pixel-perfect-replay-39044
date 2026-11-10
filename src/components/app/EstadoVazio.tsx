import { Link } from "@tanstack/react-router";

/**
 * Tela ou lista sem nada: diz o que é, por que está vazia e o que fazer em seguida.
 * (Evita o "Nenhum encontrado" seco, que não diz se ainda não há nada ou se o filtro escondeu tudo.)
 */
export function EstadoVazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto?: string;
  acao?:
    | { rotulo: string; para: "/vanzeiro/linhas" | "/vanzeiro/passageiros" | "/vanzeiro/vans" }
    | { rotulo: string; aoTocar: () => void };
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-muted-foreground/30 p-6 text-center">
      <p className="text-lg font-extrabold">{titulo}</p>
      {texto && <p className="mt-1 text-base text-muted-foreground">{texto}</p>}
      {acao &&
        ("para" in acao ? (
          <Link
            to={acao.para}
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl bg-accent px-6 text-lg font-bold text-accent-foreground"
          >
            {acao.rotulo}
          </Link>
        ) : (
          <button
            type="button"
            onClick={acao.aoTocar}
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-primary px-6 text-lg font-bold text-primary"
          >
            {acao.rotulo}
          </button>
        ))}
    </div>
  );
}
