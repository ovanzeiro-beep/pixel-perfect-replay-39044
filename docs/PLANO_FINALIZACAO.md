# Plano de finalização — O Vanzeiro (somente mock, sem banco de dados)

> **Status: todas as etapas (0 a 9) e o extra de backup (10) concluídos e conferidos** (`npm run conferir`). O mock está congelado e pronto para a fase de banco de dados ([`MIGRACAO_BANCO.md`](MIGRACAO_BANCO.md)).

**Meta:** o vanzeiro controla a viagem inteira pelo celular: quem vai, ida, paradas, volta, cobrança, gastos e lucro. Tudo com dados de exemplo; o banco entra numa fase futura sem refazer as telas.

## Como a gente confere cada etapa (fonte da verdade + contraprova)

- **Fonte da verdade:** `docs/fonte-da-verdade.json`. Lista cada etapa, o objetivo e os *checks* que provam que ela está pronta (arquivo existe, código contém/não contém algo, comandos passam).
- **Contraprova:** `npm run conferir` roda todos os checks contra o código real e diz, etapa por etapa, se está pronta, pendente ou **divergente** (declarada concluída mas falhando). `npm run conferir -- --registrar` grava o resultado em `docs/CONTRAPROVA.md`. `--rapido` pula tsc/testes/build.
- **Ritual de cada etapa:** (1) ler a etapa na fonte da verdade → (2) implementar → (3) `npm run conferir -- <n> --registrar` → (4) só então mudar `status` para `concluida` no JSON → (5) commit.

## Etapas

| # | Etapa | Resultado esperado | Status |
|---|---|---|---|
| 0 | Login bonito + PWA em tela cheia | Logo profissional, tela de entrada refeita, app instalável (Android/iPhone), tela cheia | **Concluída** |
| 1 | Fundação do mock | Dados persistem ao recarregar (localStorage versionado), "restaurar exemplo", datas relativas a hoje, IDs sem colisão | **Concluída** |
| 2 | Sessão e papéis | Entrar guarda quem é e o papel; rotas `/vanzeiro` e `/passageiro` protegidas; botão Sair; passageiro vem da sessão | **Concluída** |
| 3 | Integridade dos dados | Excluir passageiro limpa cobranças/recibos/respostas; vencimento obrigatório em cobrança semanal/mensal; testes do `store.ts` | **Concluída** |
| 4 | Viagem de ponta a ponta | Encerrar viagem com resumo, histórico de viagens, lista/manifesto para compartilhar; atalhos "simulados" só em modo demonstração | **Concluída** |
| 5 | Dinheiro e relatórios | Lucro por van/linha/período, ocupação média, comprovante compartilhável | **Concluída** |
| 6 | Alertas e prazos | CNH vencendo, cobrança atrasada, prazo de confirmação da viagem (avisos dentro do app) | **Concluída** |
| 7 | Área do passageiro completa | Fluxo testado, recibos visíveis, convite sem atalho falso | **Concluída** |
| 8 | PWA lapidado | Aviso "nova versão disponível", funcionamento offline básico, roteiro de teste em aparelho real | **Concluída** |
| 9 | Qualidade e congelamento | 404/erros em português, testes de rotas, lint limpo, `repositorio.ts` (ponto único para trocar mock por banco) | **Concluída** |
| 10 | Extra: backup dos dados | Salvar backup em arquivo, restaurar com prévia, desfazer e lembrete (pedido depois do plano) | **Concluída** |

Ordem sugerida: 1 → 2 → 3 (base sólida), depois 4 → 5 → 6 (valor para o vanzeiro), 7 (passageiro), 8 → 9 (acabamento).

## Fora do escopo agora

Banco de dados, login Google real, envio real de WhatsApp/notificação push, pagamento Pix automatizado. Ficam para a fase de banco (o Lovable gerencia o schema).

## Limites conhecidos do PWA

- **Android (Chrome):** `display: fullscreen` esconde as barras do sistema. O convite de instalação aparece sozinho no login.
- **iPhone (Safari):** a Apple não oferece convite automático nem tela cheia total. O app abre sem a barra do Safari (modo standalone); o login mostra o passo a passo "Compartilhar → Adicionar à Tela de Início".
- O service worker só é registrado no build de produção (não no `vite dev`).

## Como funciona o login simulado (Etapa 2)

1. "Entrar com Google" leva à escolha de perfil (ainda sem conta real).
2. Escolher "Sou vanzeiro" ou um passageiro cria a sessão, salva no aparelho (`vanzeiro:sessao`).
3. `/vanzeiro/*`, `/ida/*` só abrem para o vanzeiro e `/passageiro/*` só para o passageiro; quem não pode é redirecionado.
4. Abrir o app já logado (inclusive pelo ícone instalado) vai direto para a área; "Sair" apaga a sessão.
5. Ao trocar o login simulado por login real, só `src/data/sessao.ts` muda.

## Ciclo da viagem (Etapa 4)

1. **Preparar:** na ficha da viagem, "Compartilhar lista da viagem" manda a lista (ordem do trajeto, telefone e endereço, espera e quem não respondeu) pelo celular ou WhatsApp.
2. **Ida:** embarque parada a parada, paradas no caminho, destino.
3. **Volta:** chamada, entrega na ordem inversa, "Encerrar viagem".
4. **Resumo:** horários, embarques, entregas, cobranças; "Compartilhar resumo" e "Ver histórico de viagens".
5. **Histórico** (Mais → Histórico de viagens): todas as viagens realizadas, por mês, com filtro por linha e resumo de cada uma.
6. **Modo demonstração** (Perfil do vanzeiro): só quando ligado aparecem os atalhos que simulam respostas dos passageiros.

## Relatórios (Etapa 5)

Em **Mais → Relatórios** (ou pelo botão no Financeiro):

- **Período:** este mês, mês passado, últimos 3 meses, este ano ou datas à escolha.
- **Lucro por van:** o que entra vem das linhas que a van faz; os gastos, da van (ou da linha, se o gasto não tiver van).
- **Lucro por linha** e linha "Gastos gerais" para o que não é de nenhuma.
- **Ocupação:** embarques ÷ lugares da van nas viagens realizadas (respeita troca de van na viagem).
- **Combustível:** litros, preço por litro, consumo (km/L, método do tanque cheio) e custo por km. O consumo só aparece com 2 ou mais leituras de km.
- **Compartilhar:** relatório em texto pelo celular ou WhatsApp; recibos também podem ser compartilhados ou copiados.
- **Conferência:** um mês fechado nos relatórios dá exatamente o mesmo recebido, gastos e lucro do Financeiro (há teste para isso).

## Alertas (Etapa 6)

Aparecem no topo do Início do vanzeiro, com um selo vermelho no menu "Início" quando algo pede atenção:

| Alerta | Quando aparece | Nível |
| --- | --- | --- |
| CNH | vence em até 60 dias (até 15 dias ou vencida = urgente) | atenção / urgente |
| Pagamentos atrasados | qualquer cobrança vencida e em aberto (15 dias ou mais = urgente) | atenção / urgente |
| Prazo de confirmação | faltam menos de 24h para fechar (véspera, 20h) e há quem não respondeu; depois do prazo vira urgente | atenção / urgente |
| Viagem lotada | tem lista de espera | informação |

- O prazo (véspera, 20h) está em `PRAZO` (`src/data/alertas.ts`) e aparece na ficha da viagem e na tela do passageiro, calculado de verdade.
- "Dispensar" esconde o alerta; ele **volta sozinho** se a situação mudar (mais gente atrasada, CNH vencendo de vez). "Mostrar de novo" traz todos de volta.
- Os alertas se atualizam a cada minuto. São avisos dentro do app; notificações no celular (push) ficam para a fase com servidor.

## Área do passageiro (Etapa 7)

- **Recibos:** Pagamentos → "Meus recibos" lista só os recibos do próprio passageiro; dá para abrir, compartilhar e copiar.
- **Avisos:** no Início, em Pagamentos e em Minhas viagens aparecem pagamento atrasado, prazo para responder a viagem (véspera, 20h) e viagem cancelada.
- **Minhas viagens:** mostra o prazo e o horário aproximado na parada do passageiro (saída + 20 min por cidade do trajeto; é estimativa).
- **Convite de verdade:** o link `/convite/:id` abre o app, valida (convite enviado e passageiro ativo), cria a sessão e leva à confirmação dos dados. O botão "Simular aceite" do vanzeiro só aparece no modo demonstração.
- **Limite do mock:** os dados ficam no aparelho do vanzeiro. O link de convite só funciona nesse mesmo aparelho; em outro celular aparece "Convite não encontrado". Isso só se resolve com banco de dados (fase futura).
- **Testes de tela:** `src/test/passageiro-fluxo.test.tsx` renderiza as telas reais do passageiro (recibos, confirmar presença, convite, acesso).

## PWA lapidado (Etapa 8)

- **Offline de verdade:** na instalação o service worker guarda todos os arquivos do app (lista gerada em cada build, `arquivos.json`) e a tela de entrada. Sem internet o app abre, navega entre as telas e usa os dados do aparelho. Uma faixa amarela avisa "Sem internet".
- **Nova versão sem susto:** cada build é carimbado (`build-id.js`). Quando há versão nova aparece "Nova versão do app disponível"; ela **só troca quando a pessoa toca em Atualizar** (dados e login continuam). "Depois" esconde; o aviso volta na próxima abertura.
- **Instalar:** o cartão de instalação aparece na entrada e também em Meu perfil. O aviso do navegador é guardado no início do app (ele chega uma única vez).
- **Janela de instalação do Android** com capturas de tela do app.
- **Roteiro:** `docs/teste-em-aparelho.md` (Android, iPhone, offline, nova versão, convite, limites conhecidos).
- **Validado com service worker real:** instalação, offline (tela visitada, navegação, tela nunca aberta), e atualização com rebuild e redeploy de verdade.
- **Teste local de produção:** `NITRO_PRESET=node-server npx vite build` e `node .output/server/index.mjs` (o preview padrão é da Cloudflare e não roda no Node).

## Qualidade final e congelamento do mock (Etapa 9)

- **Lint limpo (zero erros e zero avisos):** o código foi formatado com Prettier (commit só de formatação, sem mudança de comportamento) e os últimos problemas reais foram corrigidos. A contraprova exige `eslint --max-warnings 0`.
- **404 e telas de erro em português**, com a marca do app, inclusive a página de erro do servidor (HTML puro). Um teste proíbe frases-padrão em inglês na interface.
- **Testes de rotas:** todas as rotas do app são classificadas (pública, só vanzeiro ou só passageiro) e cada uma é testada para quem entra, quem não entra e quem é de outro papel. Rota nova sem classificação faz o teste falhar de propósito.
- **Repositório (`src/data/repositorio.ts`):** contrato tipado (`Leitura` + `Escrita`) cumprido pelo mock. Todas as telas importam dados só dele (um teste confere), e há uma suíte de contrato que roda contra qualquer implementação.
- **Guia de migração:** [`MIGRACAO_BANCO.md`](MIGRACAO_BANCO.md) mapeia as tabelas, o que é calculado (não se grava), os cuidados e como pedir o banco ao Lovable.
- **README** atualizado: o que o app faz, como rodar e a regra de ouro dos dados.

## Extra: backup e restauração dos dados (pedido depois do plano)

Como os dados ficam só no aparelho, limpar os dados do navegador ou trocar de celular apagaria tudo. Por isso (Mais → Meu perfil → **Backup dos dados**):

- **Salvar backup:** gera um arquivo `vanzeiro-backup-AAAA-MM-DD.json` (no celular abre o compartilhar: WhatsApp, Drive, Arquivos; "Só baixar o arquivo" baixa direto). O arquivo tem versão do formato, resumo e uma **assinatura de integridade**.
- **Restaurar:** escolhe o arquivo, o app **confere** (arquivo de outro app, vazio, corrompido, alterado à mão, de versão mais nova ou com registros inválidos são recusados com mensagem em português) e mostra uma **prévia** (no backup × agora) antes de substituir.
- **Desfazer:** antes de substituir os dados (restaurar backup ou "Restaurar dados de exemplo") o app guarda uma **cópia de segurança**; "Desfazer e voltar aos dados de antes" devolve tudo, inclusive depois de recarregar.
- **Lembrete:** o Início avisa "Faça um backup dos seus dados" quando houve 15 ou mais alterações e o último backup foi há 7 dias ou mais (ou nunca); vira urgente com 100 alterações ou 30 dias.
- O arquivo de backup guarda tudo (passageiros, linhas, vans, cobranças, recibos, gastos, viagens). **Não** inclui o login (sessão) nem o modo demonstração.
- Na futura fase de banco, o mesmo arquivo serve para importar os dados de quem já usa o app (`docs/MIGRACAO_BANCO.md`).
