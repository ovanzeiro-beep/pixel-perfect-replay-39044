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
| 2 | Sessão e papéis | Entrar guarda quem é e o papel; rotas `/vanzeiro` e `/passageiro` protegidas; botão Sair; passageiro vem da sessão | **Concluída** |
| 3 | Integridade dos dados | Excluir passageiro limpa cobranças/recibos/respostas; vencimento obrigatório em cobrança semanal/mensal; testes do `store.ts` | **Concluída** |
| 4 | Viagem de ponta a ponta | Encerrar viagem com resumo, histórico de viagens, lista/manifesto para compartilhar; atalhos "simulados" só em modo demonstração | **Concluída** |
| 5 | Dinheiro e relatórios | Lucro por van/linha/período, ocupação média, comprovante compartilhável | **Concluída** |
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
