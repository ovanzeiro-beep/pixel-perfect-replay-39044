import type { ReactNode } from "react";
import { LogoIcon } from "./Logo";

/** Tela cheia com a marca do app, para mensagens como "página não encontrada" e "algo deu errado". */
export function TelaMensagem({
  titulo,
  texto,
  codigo,
  detalhe,
  children,
}: {
  titulo: string;
  texto: string;
  codigo?: string;
  detalhe?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-8 py-10 text-center">
      <LogoIcon className="h-24 w-24 drop-shadow-lg" />
      {codigo && (
        <p className="mt-6 text-6xl font-extrabold tracking-tight text-accent-strong">{codigo}</p>
      )}
      <h1 className={`${codigo ? "mt-2" : "mt-6"} text-2xl font-extrabold text-primary`}>
        {titulo}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{texto}</p>
      <div className="mt-8 flex w-full flex-col gap-3">{children}</div>
      {detalhe && (
        <details className="mt-8 w-full text-left text-sm text-muted-foreground">
          <summary className="cursor-pointer font-semibold">Detalhes técnicos</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-muted p-3">
            {detalhe}
          </pre>
        </details>
      )}
    </div>
  );
}

export const botaoPrincipal =
  "flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground";
export const botaoSecundario =
  "flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-primary bg-card text-lg font-bold text-primary";
