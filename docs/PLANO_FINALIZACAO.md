# Plano de finalização — O Vanzeiro (somente mock, sem banco de dados)

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
| 2 | Sessão e papéis | Entrar guarda quem é e o papel; rotas `/vanzeiro` e `/passageiro` protegidas; botão Sair; passageiro vem da sessão | Pendente |
| 3 | Integridade dos dados | Excluir passageiro limpa cobranças/recibos/respostas; vencimento obrigatório em cobrança semanal/mensal; testes do `store.ts` | Pendente |
| 4 | Viagem de ponta a ponta | Encerrar viagem com resumo, histórico de viagens, lista/manifesto para compartilhar; atalhos "simulados" só em modo demonstração | Pendente |
| 5 | Dinheiro e relatórios | Lucro por van/linha/período, ocupação média, comprovante compartilhável | Pendente |
| 6 | Alertas e prazos | CNH vencendo, cobrança atrasada, prazo de confirmação da viagem (avisos dentro do app) | Pendente |
| 7 | Área do passageiro completa | Fluxo testado, recibos visíveis, convite sem atalho falso | Pendente |
| 8 | PWA lapidado | Aviso "nova versão disponível", funcionamento offline básico, roteiro de teste em aparelho real | Pendente |
| 9 | Qualidade e congelamento | 404/erros em português, testes de rotas, lint limpo, `repositorio.ts` (ponto único para trocar mock por banco) | Pendente |

Ordem sugerida: 1 → 2 → 3 (base sólida), depois 4 → 5 → 6 (valor para o vanzeiro), 7 (passageiro), 8 → 9 (acabamento).

## Fora do escopo agora

Banco de dados, login Google real, envio real de WhatsApp/notificação push, pagamento Pix automatizado. Ficam para a fase de banco (o Lovable gerencia o schema).

## Limites conhecidos do PWA

- **Android (Chrome):** `display: fullscreen` esconde as barras do sistema. O convite de instalação aparece sozinho no login.
- **iPhone (Safari):** a Apple não oferece convite automático nem tela cheia total. O app abre sem a barra do Safari (modo standalone); o login mostra o passo a passo "Compartilhar → Adicionar à Tela de Início".
- O service worker só é registrado no build de produção (não no `vite dev`).
