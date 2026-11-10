# Varredura ponta a ponta antes do banco de dados

Feita em 10/11/2026 sobre a `main` (etapa 18, `08215df`). Objetivo: achar erros, fluxos mal feitos, código morto e lacunas, e deixar um plano para começar o banco sem surpresa.

## Resumo

- **O app em si está sólido:** nenhum erro de console, nenhuma requisição falha e nenhuma tela quebrada em 212 cliques automáticos (vanzeiro e passageiro). A viagem completa (ida, parada, volta, entrega, encerramento) funciona do começo ao fim, e a camada de dados está bem coberta por testes (492 testes).
- **O que impede de "só trocar por banco":** não é bug, é **desenho pensado para um aparelho só**. Cinco pontos (P0 abaixo) precisam mudar antes ou junto com o banco, senão aparecem vazamento de dados entre passageiros, respostas sobrescritas e telas que esperam resposta imediata.
- **Já corrigido nesta varredura:** componente morto, links "Voltar" pequenos demais para o dedo e campo de busca sem rótulo (detalhes no fim).

## Como foi feito

| Frente | O que foi rodado | Resultado |
| --- | --- | --- |
| Código morto | `knip` (arquivos, exportações e dependências sem uso) | 1 componente morto real; o resto é modelo do Lovable (veja P2) |
| Prontidão para o banco | Busca por uso direto do store, `localStorage`, estado inteiro nas telas, escritas em bloco, retornos de escrita | 5 pontos P0 e 5 pontos P1 |
| Navegador real | Percurso de 212 cliques nas 18 telas, os dois papéis, capturando erros de página, de console e requisições falhas | 0 problemas |
| Fluxo da viagem | Viagem completa no navegador: iniciar, embarcar 4, seguir, chegar, chamada da volta, entregar, encerrar, resumo | Funciona, 0 erros |
| Cobertura | `vitest --coverage`: 67% das linhas, 56% dos ramos | Dados bem cobertos; **telas da viagem quase sem teste** (P1) |
| Acessibilidade | Botões e campos sem nome, alvos de toque pequenos, um título por tela | 3 itens menores, já corrigidos |
| Segurança | Segredos no repositório e no histórico, `.env` | Limpo (feito na etapa 16) |

## Achados

### P0: resolver antes de ligar o banco

1. **O passageiro hoje lê os dados de todo mundo.** As telas do passageiro usam o estado inteiro (`useFrota()`, `useViagens()`) e filtram o que é dele **na tela**: nomes, telefones, endereços, cobranças e recibos de outros passageiros chegam ao aparelho dele. Com banco e regra de acesso (RLS), isso **quebra as telas** ou, pior, vaza dados. Arquivos: `passageiro.index`, `passageiro.viagens`, `passageiro.pagamentos`, `passageiro.perfil`, `passageiro.convite`, `AvisosPassageiro`.
   - **Correção:** leituras próprias do passageiro no contrato (só ele, as linhas dele, as viagens dele com contagem de lugares e as cobranças e recibos dele).
2. **Gravar a viagem inteira de uma vez.** `ajustarViagem(id, ajusteInteiro)` substitui tudo: respostas, lista de espera, extras, ida, volta e cancelamento. Hoje é um aparelho só. Com banco, **passageiro e vanzeiro gravam ao mesmo tempo** (ex.: o passageiro responde "Vou" enquanto o vanzeiro marca embarque) e o último a gravar **apaga** a alteração do outro. Usos: `ida.$viagemId` (2), `vanzeiro.viagens` (4) e o passageiro via `responderViagemApp`, `confirmarParadaApp` e `responderVoltaApp`.
   - **Correção:** operações pequenas (responder, marcar embarque, iniciar parada, cancelar viagem, etc.), cada uma mexendo só no que é dela.
3. **Escritas síncronas.** Todas as 36 operações do contrato respondem na hora. Com banco são `Promise`. Boa notícia: só **5 pontos** usam o valor devolvido (`salvarPassageiro` e `marcarPagamento` devolvem id e recibo; `lancarCobranca` e `responderViagemApp` devolvem sim/não). Faltam também estados de "salvando" e de erro de rede.
   - **Correção:** contrato assíncrono, com o mock devolvendo `Promise` e as telas esperando o resultado.
4. **Embarque e cobrança em duas gravações.** Em `ida.$viagemId.tsx` e `VoltaViagem.tsx`, marcar o embarque grava a viagem e **depois** lança a cobrança, em chamadas separadas. Se a segunda falhar, o passageiro fica marcado mas sem cobrança (ou o contrário).
   - **Correção:** uma operação só ("embarcou, cobrou X"), atômica no banco.
5. **Identidade e convite são de mentira.** A tela "Qual é o seu nome?" lista **todos** os passageiros (no banco seria um vazamento de nomes). O link de convite usa o **id do passageiro** (previsível). A sessão é um valor guardado no aparelho.
   - **Correção:** login real (Google) e convite com **token aleatório e prazo**; a tela de escolha de nome sai do app real e fica só no modo demonstração.

### P1: resolver junto com o banco

6. **Os tipos de dados moram no arquivo do mock** (`store.ts`) e quatro módulos os importam de lá. Eles devem ir para um arquivo neutro (`tipos.ts`) que o mock e o banco compartilham.
7. **Telas da viagem quase sem teste automático:** `VoltaViagem` 2%, `ParadaCaminho` 3%, `ResumoViagem` 0%, `Financeiro` 0%; telas de cadastro (passageiros, linhas, vans, motoristas, dinheiro) entre 14% e 35%. Elas foram conferidas à mão e em navegador, mas **os roteiros de navegador não estão no repositório**. Sem teste, trocar a camada de dados é arriscado justamente nas telas mais importantes.
8. **Falha ao gravar no aparelho passa em silêncio** (`gravar()` devolve `false` e ninguém avisa), por exemplo com o armazenamento cheio. E **duas janelas abertas** (app instalado e navegador) **sobrescrevem** uma à outra, porque não há escuta de mudanças. Com banco os dois problemas somem; no modo demonstração continuam.
9. **Prazos e atrasos usam o relógio do aparelho** (`new Date()` em 17 arquivos). Com banco, a regra do prazo de confirmação precisa ser validada **no servidor**; o relógio do celular pode estar errado.
10. **Offline com banco:** o service worker guarda só o app, não os dados. Falta decidir o que acontece sem internet: só leitura? Fila de gravações?
11. **LGPD:** o app guarda dados pessoais de terceiros (nome, telefone, endereço, contato de emergência, CNH). No banco vira obrigação: aviso de privacidade, consentimento do passageiro no convite e como apagar os dados de quem pedir.

### P2: arrumação, sem pressa

12. **Modelo do Lovable sem uso:** 45 arquivos em `src/components/ui/` e cerca de 40 dependências ligadas a eles (accordion, calendar, chart, etc.). Só o `sonner` é usado. **Não mexer agora**: o Lovable usa esses componentes quando gera telas novas, e mexer em dependências mexe no lock.
13. **Arquivos grandes:** `VoltaViagem` 811 linhas, `store` 760, `vanzeiro.dinheiro` 682, `vanzeiro.passageiros` 647, `vanzeiro.linhas` 643. Funciona; dificulta manutenção.
14. **Exportações sem uso** (constantes e tipos que só o próprio arquivo usa) e `recebidoMes` só usado internamente. Inofensivo.

### Verificado e sem problema

- Telas só importam dados de `@/data/repositorio` (há teste que impede o contrário).
- Dinheiro sempre arredondado em 2 casas; sem uso de ponto flutuante solto nos totais.
- Sem `TODO`, `FIXME` nem `console.log` esquecidos.
- Sem segredo no repositório nem no histórico; `.env` no `.gitignore`.
- PWA: tela cheia, instalação, offline das telas visitadas e aviso de versão nova.
- Regra do prazo valendo na gravação, com o vanzeiro podendo ajustar.

## Checklist

**Feito nesta varredura**
- [x] Removido o componente morto `EmConstrucao.tsx`.
- [x] Links "Voltar" com 44 px de altura em 9 telas (antes 24 px).
- [x] Campo de busca de passageiros com rótulo para leitor de tela.
- [x] Varredura de console, requisições e fluxo da viagem sem erros.

**Antes do banco (preparação, sem banco)**
- [ ] P0-1 Leituras próprias do passageiro e telas do passageiro usando só elas.
- [ ] P0-2 Operações pequenas de viagem no contrato, no mock e nas telas.
- [ ] P0-4 Operação única "embarque + cobrança" (e a equivalente da volta).
- [ ] P0-3 Contrato assíncrono, com estados de salvando e erro nas telas.
- [ ] P1-6 Tipos em `tipos.ts`.
- [ ] P1-7 Testes de tela da viagem (ida, volta, resumo), do financeiro e dos cadastros.
- [ ] P1-8 Aviso quando não conseguir gravar e sincronia entre janelas (modo demonstração).
- [ ] Rodar `npm run conferir` e a suíte de contrato contra o mock já no formato final.

**No dia do banco (com o Lovable)**
- [ ] Decidir os pontos da seção "Decisões suas" abaixo.
- [ ] Entregar ao Lovable `docs/MIGRACAO_BANCO.md` e `src/data/repositorio.ts` (esquema, regras de acesso por vanzeiro, login Google).
- [ ] P0-5 Login real, convite com token e fim da tela de escolha de nome.
- [ ] Implementação do repositório com banco, passando a **mesma** suíte de contrato.
- [ ] P1-9 Prazo e atrasos validados no servidor.
- [ ] P1-10 Estratégia offline definida e testada.
- [ ] P1-11 Aviso de privacidade e consentimento no convite.
- [ ] Teste com dois aparelhos: vanzeiro e passageiro ao mesmo tempo (resposta e embarque simultâneos não se apagam).
- [ ] Teste de acesso: um passageiro não vê dados de outro; um vanzeiro não vê dados de outro vanzeiro.
- [ ] Migração dos dados que já estiverem em aparelhos (via arquivo de backup) e modo demonstração mantido.

## Plano de correção

Ordem pensada para que cada passo deixe o app funcionando e testado (`npm run conferir` verde) e para que o banco entre por último, sem mexer nas telas.

| Passo | O que fazer | Mexe em | Pronto quando |
| --- | --- | --- | --- |
| 1 | **Leituras do passageiro**: `usePassageiroVisao()` (ele, linhas, viagens dele, cobranças e recibos dele, Pix, vanzeiro) | contrato, mock, 6 telas do passageiro | Teste prova que o passageiro **não recebe** dados de outro; telas sem `useFrota()` |
| 2 | **Operações pequenas de viagem**: responder, marcar embarque, iniciar e encerrar parada, cancelar, extras, ida e volta | contrato, mock, `ida`, `VoltaViagem`, `vanzeiro.viagens` | Nenhuma tela usa `ajustarViagem` com o ajuste inteiro; teste de duas respostas "simultâneas" mantém as duas |
| 3 | **Embarque + cobrança atômicos** | contrato, mock, `ida`, `VoltaViagem` | Uma chamada só; teste de falha no meio não deixa estado pela metade |
| 4 | **Tipos neutros** (`tipos.ts`) | `store.ts` e quatro módulos | `tsc` limpo; `store.ts` só implementa |
| 5 | **Testes das telas da viagem e do financeiro** | testes novos | Cobertura de `VoltaViagem`, `ParadaCaminho`, `ResumoViagem` e `Financeiro` acima de 70% |
| 6 | **Contrato assíncrono** (`Promise`), com "salvando" e erro de rede | contrato, mock, telas | Todas as escritas esperam; os 5 pontos que usam retorno funcionam com `await` |
| 7 | **Aviso de falha ao gravar** e sincronia entre janelas (modo demonstração) | store, banner | Armazenamento cheio mostra aviso; duas janelas não se apagam |
| 8 | **Contraprova** (nova etapa 19: "pronto para o banco") | `fonte-da-verdade.json` | `npm run conferir` verde, incluindo a suíte de contrato no formato final |

Os passos 1 a 3 e 6 são os de maior risco e os que mais valem fazer **antes** do banco. Os passos 4, 5, 7 e 8 podem ir em paralelo.

## Decisões suas (para o dia do banco)

1. **Como o passageiro entra?** Google como o vanzeiro, ou link de convite com código por SMS/WhatsApp, ou só pelo link? (Passageiro nem sempre tem conta Google.)
2. **Um vanzeiro por conta?** E os **motoristas** que não são o dono: têm login próprio ou só aparecem na escala?
3. **Sem internet:** o app só mostra o que já carregou, ou deixa marcar embarque e sincroniza depois? (A segunda opção dá mais trabalho e é a que mais ajuda na estrada.)
4. **Modo demonstração:** continua existindo com dados de exemplo no aparelho, sem banco? (Recomendado.)
5. **Dados que já estão em aparelhos:** importar pelo arquivo de backup ou começar do zero?
6. **LGPD:** quem é o responsável pelos dados dos passageiros (o vanzeiro) e qual texto de privacidade aparece no convite.
7. **Pagamento:** continua só registro manual (Pix copia e cola), sem cobrança automática?

## O que não vale fazer agora

- Remover o modelo de componentes do Lovable e suas dependências (P2-12).
- Reescrever arquivos grandes sem necessidade (P2-13).
- Mexer em `supabase/migrations/`: o esquema é pedido ao Lovable (veja `AGENTS.md`).
