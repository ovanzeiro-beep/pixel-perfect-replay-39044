import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// ===== Service worker: registro e aviso de versão nova =====
let esperando: ServiceWorker | null = null;
let recarregarAoTrocar = false;
let registrado = false;
const ouvintes = new Set<() => void>();
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};
const avisar = () => ouvintes.forEach((f) => f());

const IDADE_CHECAGEM_MS = 30 * 60 * 1000;

/** Lista o que a página já carregou, para o service worker guardar também o que veio antes dele existir. */
function arquivosCarregados(): string[] {
  return performance
    .getEntriesByType("resource")
    .map((r) => r.name)
    .filter((u) => {
      try {
        return new URL(u).origin === location.origin;
      } catch {
        return false;
      }
    });
}

export function registrarServiceWorker() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !import.meta.env.PROD ||
    registrado
  )
    return;
  registrado = true;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recarregarAoTrocar) location.reload();
  });
  const iniciar = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      // Só é "atualização" se já havia versão antiga controlando a página (na primeira instalação não há o que avisar).
      const marcar = (w: ServiceWorker | null) => {
        if (w && navigator.serviceWorker.controller) {
          esperando = w;
          avisar();
        }
      };
      marcar(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const novo = reg.installing;
        novo?.addEventListener("statechange", () => {
          if (novo.state === "installed") marcar(novo);
        });
      });
      const checar = () => {
        void reg.update().catch(() => {});
      };
      setInterval(checar, IDADE_CHECAGEM_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checar();
      });
      void navigator.serviceWorker.ready.then((r) =>
        r.active?.postMessage({
          type: "CACHE_URLS",
          arquivos: arquivosCarregados(),
          paginas: [location.pathname + location.search],
        }),
      );
    } catch {
      /* sem service worker: o app funciona normalmente, só não instala/abre offline */
    }
  };
  if (document.readyState === "complete") void iniciar();
  else window.addEventListener("load", () => void iniciar(), { once: true });
}

/** Ativa a versão nova e recarrega a página. */
export function atualizarApp() {
  if (!esperando) return;
  recarregarAoTrocar = true;
  esperando.postMessage({ type: "SKIP_WAITING" });
}

export function useAtualizacaoApp() {
  const disponivel = useSyncExternalStore(
    assinar,
    () => esperando !== null,
    () => false,
  );
  return { disponivel, atualizar: atualizarApp };
}

/** Só para os testes: simula uma versão nova esperando. */
export function __definirVersaoEsperando(w: ServiceWorker | null) {
  esperando = w;
  avisar();
}

// ===== Conexão =====
const aoMudarConexao = (f: () => void) => {
  window.addEventListener("online", f);
  window.addEventListener("offline", f);
  return () => {
    window.removeEventListener("online", f);
    window.removeEventListener("offline", f);
  };
};
export const useOnline = () =>
  useSyncExternalStore(
    aoMudarConexao,
    () => navigator.onLine,
    () => true,
  );

// ===== Instalação =====
function estaInstalado() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

function ehIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export type EstadoInstalacao = {
  instalado: boolean;
  podeInstalar: boolean;
  ios: boolean;
  instalar: () => Promise<void>;
};

// O navegador avisa que dá para instalar uma única vez, logo no começo: por isso a captura é do app inteiro (não de uma tela).
let eventoInstalacao: BeforeInstallPromptEvent | null = null;
let instaladoAgora = false;
let capturando = false;

/** Chamar uma vez, no início do app (navegador). */
export function capturarInstalacao() {
  if (typeof window === "undefined" || capturando) return;
  capturando = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoInstalacao = e as BeforeInstallPromptEvent;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    instaladoAgora = true;
    eventoInstalacao = null;
    avisar();
  });
}

// Já no carregamento do módulo (antes da hidratação), para não perder o aviso do navegador.
capturarInstalacao();

export function useInstalarApp(): EstadoInstalacao {
  const evento = useSyncExternalStore(
    assinar,
    () => eventoInstalacao,
    () => null,
  );
  const jaInstalado = useSyncExternalStore(
    assinar,
    () => instaladoAgora,
    () => false,
  );
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalado(estaInstalado());
    setIos(ehIOS());
  }, []);

  async function instalar() {
    if (!eventoInstalacao) return;
    const e = eventoInstalacao;
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") instaladoAgora = true;
    eventoInstalacao = null;
    avisar();
  }

  return { instalado: instalado || jaInstalado, podeInstalar: evento !== null, ios, instalar };
}
