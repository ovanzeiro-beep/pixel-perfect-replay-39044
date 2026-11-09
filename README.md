# O Vanzeiro

Sua van organizada, sem caderno: passageiros, viagens, rotas, cobranças, gastos e relatórios do vanzeiro num aplicativo para o celular, em tela cheia, que também funciona sem internet.

> **Estado atual: versão de teste com dados de exemplo** salvos no próprio aparelho. **Ainda não há banco de dados** nem login real (o "Entrar com Google" é simulado). O caminho para o banco está em [`docs/MIGRACAO_BANCO.md`](docs/MIGRACAO_BANCO.md).

**App publicado**: https://pixel-perfect-replay-39044.lovable.app

Este projeto foi feito com [Lovable](https://lovable.dev) e continua conectado a ele: o que for enviado para a branch conectada aparece no editor do Lovable. Editor: https://lovable.dev/projects/2e6aea9f-0024-4c57-a5e7-dfb8095ba732

## O que o app faz

- **Vanzeiro:** viagens (confirmações, lista de espera, ida e volta, histórico), passageiros e convites, dinheiro (cobranças, recibos), gastos, relatórios (lucro por van e linha, ocupação, combustível) com **exportação para planilha (CSV) e PDF**, **tamanho da letra ajustável**, alertas (CNH, atrasos, prazo de confirmação).
- **Passageiro:** confirma presença, vê horário e parada, pagamentos e recibos, avisos.
- **Primeiro acesso:** a conta nova começa **vazia**, com boas-vindas (nome, celular, cidade), um guia de primeiros passos e, para quem já tem um backup, a opção de restaurar. Quem já usava o app com dados continua como estava.
- **Celular:** instala como aplicativo (Android e iPhone), abre em tela cheia, funciona offline e avisa quando há versão nova.

## Como rodar

Precisa de Node.js (e, de preferência, [Bun](https://bun.sh)).

```sh
bun install        # ou: npm install
bun run dev        # abre em http://localhost:3000 (o service worker só roda no build de produção)
```

| Comando | Para que serve |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes (`vitest`) |
| `npm run lint` | Lint (Prettier + ESLint); `npm run format` formata o código |
| `npx tsc --noEmit` | Checagem de tipos |
| `npm run build` | Build de produção |
| `npm run conferir` | **Contraprova**: confere cada etapa do plano contra o código real (`-- --registrar` grava em `docs/CONTRAPROVA.md`) |

Para testar o app instalável e offline no computador, use um build para Node: `NITRO_PRESET=node-server npx vite build` e `node .output/server/index.mjs` (o `vite preview` padrão é da Cloudflare e não roda no Node).

## Estrutura

```
src/routes/        telas (uma por arquivo; roteamento por arquivo do TanStack Start)
src/components/    componentes do app (app/) e do shadcn/ui (ui/)
src/data/          dados e regras: repositorio.ts (ponto único de acesso), store.ts (mock), sessao.ts (login simulado),
                   cobrancas.ts, financeiro.ts, viagens.ts, alertas.ts, relatorios.ts, historico.ts, manifesto.ts ...
src/lib/           utilidades (PWA, compartilhar, validações, convite)
public/            manifest, service worker, ícones e capturas de tela do PWA
docs/              plano, fonte da verdade, contraprova e guias
```

**Regra de ouro:** telas e componentes importam dados **só** de `@/data/repositorio` (um teste confere). É isso que permite trocar o mock pelo banco sem refazer as telas.

## Documentação do projeto

- [`docs/PLANO_FINALIZACAO.md`](docs/PLANO_FINALIZACAO.md): plano por etapas e como cada parte funciona.
- [`docs/fonte-da-verdade.json`](docs/fonte-da-verdade.json) e [`docs/CONTRAPROVA.md`](docs/CONTRAPROVA.md): o que cada etapa promete e a prova de que está pronta.
- [`docs/MIGRACAO_BANCO.md`](docs/MIGRACAO_BANCO.md): guia para trocar o mock pelo banco de dados.
- [`docs/teste-em-aparelho.md`](docs/teste-em-aparelho.md): roteiro de teste no celular de verdade.

## Para quem usa o Lovable

Banco de dados, arquivos gerados (como `src/routeTree.gen.ts`) e segredos são gerenciados pelo Lovable: não edite `supabase/migrations/` nem arquivos "gerados automaticamente" à mão (veja `AGENTS.md`).
