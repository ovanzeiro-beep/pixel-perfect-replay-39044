// Service worker do O Vanzeiro.
// - Deixa o app instalável e abre mesmo sem internet (telas já visitadas + arquivos do app em cache).
// - Não troca de versão sozinho: espera o usuário tocar em "Atualizar" (mensagem SKIP_WAITING).
// define self.BUILD_ID; muda a cada build, então o navegador enxerga a versão nova.
// Se o arquivo faltar, o service worker continua valendo (só deixa de avisar sobre versões novas).
try { importScripts("/build-id.js"); } catch { /* sem carimbo */ }
const VERSAO = `vanzeiro-${self.BUILD_ID || "dev"}`;
const FONTES = "vanzeiro-fontes";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];
const ESPERA_REDE_MS = 5000;

const ehEstatico = (p) => p.startsWith("/assets/") || p.startsWith("/icons/") || p.startsWith("/screenshots/") || p === "/manifest.webmanifest";
const ehHtml = (res) => (res.headers.get("content-type") || "").includes("text/html");
// Resposta que veio de redirecionamento não pode ser servida de novo para uma navegação.
const guardavel = (res) => res && res.ok && !res.redirected && res.type !== "opaqueredirect";

// Guarda a tela de entrada e todos os arquivos do app (lista gerada no build), para abrir mesmo sem internet.
async function instalar() {
  const cache = await caches.open(VERSAO);
  await cache.addAll(PRECACHE);
  const arquivos = await fetch("/arquivos.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  await Promise.all(arquivos.map((u) => cache.add(u).catch(() => {})));
  try {
    const inicio = await fetch("/", { credentials: "same-origin" });
    if (guardavel(inicio) && ehHtml(inicio)) await cache.put("/", inicio);
  } catch { /* sem rede agora: a tela de entrada entra no cache na primeira visita */ }
}

self.addEventListener("install", (event) => {
  event.waitUntil(instalar());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith("vanzeiro-") && n !== VERSAO && n !== FONTES).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "SKIP_WAITING") self.skipWaiting();
  if (msg.type === "CACHE_URLS") event.waitUntil(guardarTelasEArquivos(msg.arquivos || [], msg.paginas || []));
});

// A página manda o que já carregou, para o que foi baixado antes do service worker existir também ficar guardado.
async function guardarTelasEArquivos(arquivos, paginas) {
  const cache = await caches.open(VERSAO);
  const mesmaOrigem = (u) => { try { return new URL(u, self.location.origin).origin === self.location.origin; } catch { return false; } };
  await Promise.all(arquivos.filter(mesmaOrigem).filter((u) => ehEstatico(new URL(u, self.location.origin).pathname)).map((u) => cache.add(u).catch(() => {})));
  await Promise.all(paginas.filter(mesmaOrigem).map(async (u) => {
    try {
      const res = await fetch(u, { credentials: "same-origin" });
      if (guardavel(res) && ehHtml(res)) await cache.put(u, res);
    } catch { /* sem rede agora: fica para a próxima visita */ }
  }));
}

async function navegar(req) {
  const cache = await caches.open(VERSAO);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rejeita) => setTimeout(() => rejeita(new Error("rede lenta")), ESPERA_REDE_MS)),
    ]);
    if (guardavel(res) && ehHtml(res)) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match(new URL(req.url).pathname)) || (await cache.match("/")) || (await cache.match(OFFLINE_URL));
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSAO);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (guardavel(res)) cache.put(req, res.clone());
  return res;
}

// Fontes do Google: mostra o que está guardado e atualiza por baixo dos panos.
async function fonte(req) {
  const cache = await caches.open(FONTES);
  const hit = await cache.match(req);
  const rede = fetch(req).then((res) => { if (res.status === 200 || res.type === "opaque") cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || rede;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(fonte(req));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(navegar(req));
    return;
  }
  if (ehEstatico(url.pathname)) event.respondWith(cacheFirst(req));
});
