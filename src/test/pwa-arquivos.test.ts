import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(p, "utf8");
const manifest = JSON.parse(ler("public/manifest.webmanifest")) as {
  display: string;
  display_override: string[];
  start_url: string;
  scope: string;
  orientation: string;
  id: string;
  lang: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
  screenshots: { src: string; sizes: string; form_factor: string }[];
  shortcuts: { url: string; icons: { src: string }[] }[];
};
const dimensoesPng = (p: string) => {
  const b = readFileSync(p);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
};
const arquivoPublico = (src: string) => `public${src}`;

describe("manifest", () => {
  it("pede tela cheia (com padrão de reserva) e fica em pé", () => {
    expect(manifest.display).toBe("fullscreen");
    expect(manifest.display_override).toEqual(["fullscreen", "standalone"]);
    expect(manifest.orientation).toBe("portrait");
  });
  it("tem identidade, escopo e idioma", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url.startsWith("/")).toBe(true);
    expect(manifest.lang).toBe("pt-BR");
  });
  it("todo ícone existe e tem o tamanho que diz ter", () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const i of manifest.icons) {
      expect(existsSync(arquivoPublico(i.src)), i.src).toBe(true);
      expect(dimensoesPng(arquivoPublico(i.src)), i.src).toBe(i.sizes);
    }
  });
  it("tem ícone 192, 512 e um 'maskable' de 512 (Android)", () => {
    const tem = (tam: string, uso: string) =>
      manifest.icons.some((i) => i.sizes === tam && (i.purpose ?? "any") === uso);
    expect(tem("192x192", "any")).toBe(true);
    expect(tem("512x512", "any")).toBe(true);
    expect(tem("512x512", "maskable")).toBe(true);
  });
  it("as capturas de tela existem e respeitam o tamanho", () => {
    expect(manifest.screenshots.length).toBeGreaterThanOrEqual(2);
    for (const s of manifest.screenshots) {
      expect(existsSync(arquivoPublico(s.src)), s.src).toBe(true);
      expect(dimensoesPng(arquivoPublico(s.src)), s.src).toBe(s.sizes);
      expect(s.form_factor).toBe("narrow");
    }
  });
  it("os atalhos usam ícones que existem", () => {
    for (const a of manifest.shortcuts)
      for (const i of a.icons) expect(existsSync(arquivoPublico(i.src)), i.src).toBe(true);
  });
  it("ícone do iPhone e tela offline existem", () => {
    expect(existsSync("public/icons/apple-touch-icon.png")).toBe(true);
    expect(dimensoesPng("public/icons/apple-touch-icon.png")).toBe("180x180");
    expect(existsSync("public/offline.html")).toBe(true);
  });
});

describe("service worker (sw.js)", () => {
  const sw = ler("public/sw.js");
  it("NÃO troca de versão sozinho: só quando a página manda SKIP_WAITING", () => {
    expect(sw.match(/skipWaiting\(\)/g)).toHaveLength(1);
    expect(sw).toMatch(/msg\.type === "SKIP_WAITING"\) self\.skipWaiting\(\)/);
    expect(sw).not.toMatch(
      /install[\s\S]{0,400}self\.skipWaiting\(\)\s*\)\s*;?\s*\}\)\s*;?\s*\n\s*self\.addEventListener\("activate"/,
    );
  });
  it("importa o carimbo do build, para o navegador enxergar cada versão nova", () => {
    expect(sw).toContain('importScripts("/build-id.js")');
    expect(sw).toMatch(/const VERSAO = `vanzeiro-\$\{self\.BUILD_ID/);
  });
  it("guarda os arquivos do app listados no build e a tela de entrada", () => {
    expect(sw).toContain("/arquivos.json");
    expect(sw).toMatch(/cache\.put\("\/",/);
  });
  it("tem plano B offline em camadas: página igual, tela de entrada, tela 'sem conexão'", () => {
    expect(sw).toMatch(
      /cache\.match\(req\)[\s\S]*cache\.match\("\/"\)[\s\S]*cache\.match\(OFFLINE_URL\)/,
    );
  });
  it("não guarda resposta de redirecionamento nem de erro", () => {
    expect(sw).toMatch(/res\.ok && !res\.redirected/);
  });
  it("só mexe em GET e limpa as versões antigas", () => {
    expect(sw).toMatch(/req\.method !== "GET"\) return/);
    expect(sw).toMatch(/caches\.delete\(n\)/);
  });
  it("não apaga o cache das fontes ao trocar de versão", () => {
    expect(sw).toMatch(/n !== VERSAO && n !== FONTES/);
  });
});

describe("build", () => {
  it("o plugin carimba cada build e gera a lista de arquivos", () => {
    const v = ler("vite.config.ts");
    expect(v).toContain("public/build-id.js");
    expect(v).toContain("arquivos.json");
    expect(v).toMatch(/servicoOffline/);
  });
  it("o carimbo gerado não vai para o git", () => {
    expect(ler(".gitignore")).toContain("public/build-id.js");
  });
  it("o app registra o service worker sem usar o cache do navegador para checar versão", () => {
    expect(ler("src/lib/pwa.ts")).toContain('updateViaCache: "none"');
  });
  it("o index tem o link do manifest e as meta de tela cheia", () => {
    const r = ler("src/routes/__root.tsx");
    expect(r).toContain('rel: "manifest"');
    expect(r).toContain("viewport-fit=cover");
    expect(r).toContain("apple-mobile-web-app-capable");
    expect(r).toContain("<AtualizacaoApp />");
    expect(r).toContain("<SemConexao />");
  });
});
