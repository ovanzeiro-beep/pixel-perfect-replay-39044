# Migração do mock para banco de dados

Hoje o app roda inteiro em **dados de exemplo guardados no aparelho** (`src/data/store.ts`). Este documento é o guia para, numa fase futura, trocar isso por um banco de dados **sem refazer as telas**.

> **Nesta fase não há banco de dados** e nada aqui foi implementado: é só o mapa. O banco é gerenciado pelo Lovable (veja "Como pedir o banco ao Lovable").

## A ideia: um ponto único de troca

```
Telas e componentes  →  src/data/repositorio.ts  →  implementação
                          (contrato `Repositorio`)     hoje: mock (store.ts)
                                                       amanhã: banco
```

- Telas importam dados **só** de `@/data/repositorio` (um teste garante: `src/data/repositorio.test.ts`).
- O contrato `Repositorio` = `Leitura` (hooks que devolvem o dado atual) + `Escrita` (operações que mudam algo).
- Para trocar: criar a implementação com banco que cumpra `Repositorio` e apontar `repositorio` para ela. As telas continuam iguais.
- A **suíte de contrato** (`describe.each(IMPLEMENTACOES)` no mesmo teste) só usa a interface. Basta incluir a implementação nova na lista para conferir todo o comportamento combinado contra ela.

## O contrato (operações)

**Leitura:** `useFrota`, `useViagens`, `useDadosProntos`, `obterEstado`.

**Ciclo de vida:** `iniciarPersistencia`, `restaurarExemplo`, `substituirTodosOsDados` (restaurar backup; com banco vira importação em lote).

**Vans e motoristas:** `salvarVan`, `excluirVan`, `salvarMotorista`, `excluirMotorista`.

**Linhas:** `salvarLinha`, `alternarLinha`, `excluirLinha`, `colocarNaLinha`, `tirarDaLinha`.

**Passageiros:** `salvarPassageiro`, `atualizarPassageiro`, `desativarPassageiro`, `excluirPassageiro`, `aceitarConvite`.

**Viagens:** `ajustarViagem`, `responderViagemApp`, `confirmarParadaApp`, `responderVoltaApp`.

**Dinheiro:** `lancarCobranca`, `marcarPagamento`, `desfazerRecibo`, `cancelarCob`, `salvarChavePix`, `salvarGasto`, `excluirGasto`.

**Alertas:** `dispensarAlerta`, `restaurarAlertas`.

Regras de negócio que a implementação nova **precisa manter** (já cobertas por testes):

- `excluirPassageiro` apaga também cobranças, recibos e marcações em viagens; `desativarPassageiro` guarda dívida e histórico.
- `excluirLinha` apaga as viagens dela e deixa gastos e cobranças **sem linha** (o dinheiro não some); `excluirVan`/`excluirMotorista` só desvinculam.
- O motorista `proprio` (o vanzeiro) não pode ser excluído.
- `lancarCobranca` com valor negativo remove a cobrança ainda não paga; se já foi paga, **cancela** (o recibo fica); sem cobrança para tirar, devolve `false`.
- `marcarPagamento` quita as cobranças **mais antigas primeiro**, devolve o recibo (número sequencial crescente) e `null` se nada estava em aberto.
- Lotação: quem confirma além dos lugares da van vai para a lista de espera; quando abre vaga, o primeiro da espera sobe.

## O que mudar ao trocar (e cuidados)

| Tema | Hoje (mock) | Com banco |
| --- | --- | --- |
| Síncrono × assíncrono | Tudo síncrono | Cada escrita vira `Promise`. As que devolvem valor (`salvarPassageiro` → id, `marcarPagamento` → recibo, `lancarCobranca` → boolean) devolvem `Promise` do mesmo valor. Os hooks de leitura mantêm a assinatura, por cima de um cache (o projeto já tem `@tanstack/react-query`). |
| Ids | Texto curto gerado no aparelho (`src/data/ids.ts`) | Ids gerados pelo banco (uuid). Cuidado: o id da viagem é `"<linhaId>_<AAAA-MM-DD>"` e o de cobrança periódica é `"<passageiroId>_<tipo>_<vencimento>"`; esses são **chaves compostas** previsíveis, mantenha-as assim ou troque por colunas. |
| Dono dos dados | Um aparelho = um vanzeiro | Todo registro pertence a um vanzeiro. Passageiro só enxerga o que é dele (hoje garantido na tela; no banco, na política de acesso). |
| Login | `src/data/sessao.ts` (simulado: papel + passageiro) | Login real (Google). Só o módulo de sessão muda; os hooks `useSessao`/`usePassageiroId` continuam. |
| Convite | Link `/convite/:idDoPassageiro` (só funciona no aparelho do vanzeiro) | Token de convite aleatório e com validade, guardado no banco. A tela `/convite/$passageiroId` passa a validar o token. |
| Dinheiro | Número com 2 casas | Guardar em centavos (inteiro) ou `numeric(12,2)`; nunca ponto flutuante. |
| Datas | Texto `AAAA-MM-DD` e `HH:MM` (sem fuso) | Manter como data e hora locais do vanzeiro (`date` e `time`), **sem fuso**: a van roda no horário local. |
| Perfil do vanzeiro | Constante `vanzeiro` em `src/data/exemplo.ts` | Registro do usuário logado (nome, cidade, telefone, e-mail). |
| Prazo e limites | Constantes em `src/data/alertas.ts` (`PRAZO`, CNH 15/60 dias, atraso 15 dias) | Podem virar configuração por vanzeiro. |
| Avisos fora do app | Só dentro do app | Notificação push e lembretes por WhatsApp exigem servidor/agendador. |

## Entidades (o que virar tabela)

Fonte: tipos em `src/data/store.ts`, `cobrancas.ts`, `financeiro.ts` e `viagens.ts`.

| Entidade | Campos principais |
| --- | --- |
| **vanzeiro** (usuário) | nome, cidade, estado, telefone, e-mail, chave Pix |
| **vans** | apelido, modelo, placa, lugares, ano, cor, motorista, situação (rodando/manutenção), observações |
| **motoristas** | nome, telefone, categoria e validade da CNH, é o próprio vanzeiro, van |
| **linhas** | nome, tipo, frequência (semanal/única), dias da semana ou data, saída, volta, destino, van, motorista, valor por viagem e mensal, ativa, observações |
| **linha_paradas** | linha, posição, cidade (o trajeto, em ordem) |
| **passageiros** | nome, telefone, endereço (rua, número, bairro, cidade, referência), forma de pagamento (por viagem/semanal/mensal), valor, vencimento (dia da semana ou do mês), contato de emergência, observações, estado do convite (não enviado/enviado/no app), ativo |
| **passageiro_linhas** | passageiro × linha (um passageiro pode estar em várias linhas) |
| **cobrancas** | passageiro, tipo (viagem/semana/mês), referência, vencimento, valor, cancelada (motivo), linha |
| **pagamentos** | cobrança, valor, data, forma (dinheiro/pix), recibo |
| **recibos** | número (sequencial por vanzeiro), passageiro, valor, forma, data, referências |
| **gastos** | valor, data, categoria, van, linha, descrição, litros, km, repete todo mês |
| **viagem_ajustes** | (linha, data), van e motorista da viagem, cancelada, lista de espera, extras |
| **viagem_respostas** | viagem, passageiro, resposta (vai/não/sem/espera), ordem de confirmação |
| **viagem_ida / viagem_volta** | marcações de embarque, paradas, chamada e entregas. Podem ser tabelas próprias ou um `jsonb` por viagem (é o formato de `Ida` e `Volta` em `viagens.ts`) |
| **alertas_dispensados** | alerta, assinatura |

## O que NÃO se grava (é calculado)

Para não ficar fora de sincronia, continuam derivados:

- **Viagens** (próximas e passadas): geradas das linhas ativas + ajustes (`montarViagens`).
- **`emAberto` e `ultimoPagamento` do passageiro**: vêm das cobranças e pagamentos.
- **Cobranças semanais e mensais**: geradas no dia do vencimento (`gerarPeriodicas`). No banco, pode ser uma rotina diária, mantendo o id composto para não duplicar.
- **Histórico de viagens, relatórios, ocupação, combustível, alertas**: calculados dos dados acima.

## Passos sugeridos

1. Criar o esquema (veja abaixo) e as regras de acesso por vanzeiro.
2. Implementar `Leitura` (`useFrota`, `useViagens`, `useDadosProntos`, `obterEstado`) sobre o banco, entregando o mesmo formato `Estado`.
3. Implementar `Escrita` operação por operação, começando por vans/motoristas/linhas/passageiros.
4. Rodar a suíte de contrato (`src/data/repositorio.test.ts`) contra a implementação nova até passar tudo.
5. Dinheiro e viagens (cobranças, recibos, ida e volta): são as partes com mais regras; conferir com os testes de `store.test.ts`, `cobrancas.test.ts` e `viagens.test.ts`.
6. Trocar `src/data/sessao.ts` por login real e o link de convite por token.
7. Trocar o ponto de `repositorio` para a implementação com banco; manter o mock disponível para o modo demonstração e para os testes.
8. Importar os dados do aparelho do vanzeiro (opcional): ler `localStorage` (`vanzeiro:dados`) **ou o arquivo de backup** (`vanzeiro-backup-*.json`, formato versionado e com conferência de integridade: `src/data/backup.ts`) e gravar no banco uma vez. O backup em arquivo é um bom ponto de partida: vanzeiros que já usam o app podem enviar o arquivo e importar.

## Como pedir o banco ao Lovable

O esquema do banco **não é escrito à mão neste repositório**: não crie nem edite `supabase/migrations/` (veja `AGENTS.md`). O caminho é pedir ao Lovable (no editor, ou com a ferramenta `send_message` do Lovable MCP), entregando este documento e o arquivo `src/data/repositorio.ts`. Segredos e chaves ficam no gerenciamento de segredos do Lovable, nunca no código.

## Critérios para dizer "migrou"

- [ ] `npm run conferir` continua com todas as etapas concluídas.
- [ ] A suíte de contrato passa contra a implementação com banco.
- [ ] Nenhuma tela mudou (o teste que proíbe importar o store direto continua passando).
- [ ] Um vanzeiro não enxerga dados de outro; um passageiro só enxerga os dele.
- [ ] Os fluxos ponta a ponta (viagem completa, convite, recibos) funcionam em dois aparelhos diferentes.
