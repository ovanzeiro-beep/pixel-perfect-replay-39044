// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { mkdirSync, writeFileSync } from "node:fs";
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Carimba cada build no service worker (public/sw.js importa /build-id.js). Sem isso o navegador não perceberia
// que existe uma versão nova do app e o aviso "Nova versão disponível" nunca apareceria.
// Também gera /arquivos.json (todos os arquivos do app) para o service worker guardá-los e o app abrir offline.
const BUILD_ID = Date.now().toString(36);
const servicoOffline: Plugin = {
  name: "servico-offline",
  apply: "build",
  buildStart() {
    mkdirSync("public", { recursive: true });
    writeFileSync("public/build-id.js", `self.BUILD_ID = ${JSON.stringify(BUILD_ID)};\n`);
  },
  generateBundle(_opcoes, pacote) {
    if (this.environment?.name !== "client") return;
    const arquivos = Object.keys(pacote)
      .filter((f) => /^assets\/.+\.(js|css)$/.test(f))
      .map((f) => `/${f}`);
    this.emitFile({ type: "asset", fileName: "arquivos.json", source: JSON.stringify(arquivos) });
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { plugins: [servicoOffline] },
});
