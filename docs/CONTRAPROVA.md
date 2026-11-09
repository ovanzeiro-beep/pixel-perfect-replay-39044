# Contraprova

Gerado por `node scripts/conferir.mjs --registrar` em 2026-11-09 19:14 UTC.

| Etapa | Declarada | Checks da etapa | Resultado |
| --- | --- | --- | --- |
| 0 — Visual do login e PWA em tela cheia | concluida | 12/12 | OK |
| 1 — Fundação do mock: persistência e datas relativas | concluida | 14/14 | OK |
| 2 — Sessão e papéis (login simulado de verdade) | concluida | 22/22 | OK |
| 3 — Integridade dos dados | pendente | 0/4 | pendente |
| 4 — Viagem de ponta a ponta | pendente | 1/5 | pendente |
| 5 — Dinheiro e relatórios | pendente | 0/3 | pendente |
| 6 — Alertas e prazos | pendente | 0/3 | pendente |
| 7 — Área do passageiro completa | pendente | 0/2 | pendente |
| 8 — PWA lapidado | pendente | 0/3 | pendente |
| 9 — Qualidade final e congelamento do mock | pendente | 0/3 | pendente |

## O que falta

**Etapa 3 — Integridade dos dados**
- Testes do store
- Teste de exclusão em cascata
- Vencimento exigido para semanal/mensal
- Teste de cobrança negativa/desfazer

**Etapa 4 — Viagem de ponta a ponta**
- Resumo ao encerrar a viagem
- Histórico de viagens
- Atalhos simulados só em modo demo
- Manifesto/lista da viagem para compartilhar

**Etapa 5 — Dinheiro e relatórios**
- Cálculos de relatório
- Testes dos relatórios
- Tela de relatórios

**Etapa 6 — Alertas e prazos**
- Regras de alerta
- Testes dos alertas
- Início do vanzeiro mostra alertas

**Etapa 7 — Área do passageiro completa**
- Teste do fluxo do passageiro
- Recibos visíveis ao passageiro

**Etapa 8 — PWA lapidado**
- Aviso de atualização
- SW aceita atualizar sob comando
- Roteiro de teste em aparelho

**Etapa 9 — Qualidade final e congelamento do mock**
- Página 404 em português
- Interface de repositório (ponto de troca para o banco)
- Testes de rotas
- Lint limpo
