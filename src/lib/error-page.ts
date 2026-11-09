/** Página de erro mostrada pelo servidor quando nem o app consegue carregar (HTML puro, sem JavaScript do app). */
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Não conseguimos abrir esta página · O Vanzeiro</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#14304f" />
    <style>
      body { font: 17px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #f5f8fc; color: #14304f; display: grid; place-items: center; min-height: 100vh; min-height: 100dvh; margin: 0; padding: 1.5rem; box-sizing: border-box; }
      .card { max-width: 26rem; width: 100%; text-align: center; }
      .marca { width: 5.5rem; height: 5.5rem; border-radius: 1.4rem; margin: 0 auto 1.25rem; background: linear-gradient(135deg, #2f66a3, #0f2a47); display: grid; place-items: center; font-size: 2.6rem; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; font-weight: 800; }
      p { color: #4b5d73; margin: 0 0 1.75rem; }
      .actions { display: grid; gap: 0.75rem; }
      a, button { display: flex; align-items: center; justify-content: center; min-height: 3.5rem; border-radius: 1rem; font: inherit; font-weight: 800; cursor: pointer; text-decoration: none; border: 2px solid #14304f; }
      .primary { background: #14304f; color: #fff; }
      .secondary { background: #fff; color: #14304f; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="marca" aria-hidden="true">🚐</div>
      <h1>Não conseguimos abrir esta página</h1>
      <p>Algo deu errado do nosso lado. Tente de novo; se continuar, volte para o início.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar de novo</button>
        <a class="secondary" href="/">Ir para o início</a>
      </div>
    </div>
  </body>
</html>`;
}
