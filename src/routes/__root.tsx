import { toast } from "sonner";
import { FalhaDeGravacao, registrarFalhaDeGravacao } from "@/data/gravacao";
import { IndicadorSalvando } from "@/components/app/IndicadorSalvando";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { capturarInstalacao, registrarServiceWorker } from "../lib/pwa";
import { SCRIPT_TAMANHO_LETRA, iniciarTamanhoLetra } from "../lib/tamanhoLetra";
import { iniciarPersistencia } from "../data/repositorio";
import { AtualizacaoApp } from "../components/app/AtualizacaoApp";
import { SemConexao } from "../components/app/SemConexao";
import { TelaMensagem, botaoPrincipal, botaoSecundario } from "../components/app/TelaMensagem";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <TelaMensagem
      codigo="404"
      titulo="Página não encontrada"
      texto="Esta página não existe ou foi movida. Volte para o início e continue por lá."
    >
      <Link to="/" className={botaoPrincipal}>
        Ir para o início
      </Link>
    </TelaMensagem>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <TelaMensagem
      titulo="Não conseguimos abrir esta página"
      texto="Algo deu errado do nosso lado. Tente de novo; se continuar, volte para o início. Seus dados continuam salvos neste aparelho."
      {...(import.meta.env.DEV
        ? { detalhe: error instanceof Error ? error.message : String(error) }
        : {})}
    >
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className={botaoPrincipal}
      >
        Tentar de novo
      </button>
      <a href="/" className={botaoSecundario}>
        Ir para o início
      </a>
    </TelaMensagem>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#14304f" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "O Vanzeiro" },
      { title: "O Vanzeiro" },
      { name: "description", content: "Sua van organizada, sem caderno." },
      { name: "author", content: "O Vanzeiro" },
      { property: "og:title", content: "O Vanzeiro" },
      { property: "og:description", content: "Sua van organizada, sem caderno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/icons/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [{ children: SCRIPT_TAMANHO_LETRA }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    iniciarTamanhoLetra();
    capturarInstalacao();
    registrarServiceWorker();
    const pararDeSalvar = iniciarPersistencia();
    // Gravação que falha (sem internet, servidor fora): avisa a pessoa e não deixa o erro "solto" no console.
    const tirarAviso = registrarFalhaDeGravacao(() =>
      toast.error("Não foi possível salvar. Confira a internet e tente de novo."),
    );
    const aoRejeitar = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof FalhaDeGravacao) e.preventDefault();
    };
    window.addEventListener("unhandledrejection", aoRejeitar);
    return () => {
      pararDeSalvar();
      tirarAviso();
      window.removeEventListener("unhandledrejection", aoRejeitar);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] print:hidden mx-auto max-w-md space-y-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto space-y-2">
          <AtualizacaoApp />
          <SemConexao />
          <IndicadorSalvando />
        </div>
      </div>
    </QueryClientProvider>
  );
}
