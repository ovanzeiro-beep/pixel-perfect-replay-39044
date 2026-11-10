# Conheça o O Vanzeiro (como ele está hoje)

Este documento é para você, dono do app. Explica **o que o app faz, para quem, quais são os benefícios** e traz um **checklist para conferir tudo**. Está escrito em linguagem simples, sem termos técnicos.

Estado em 10/11/2026: etapas 0 a 33 concluídas e conferidas. **Ainda sem banco de dados.**

---

## 1. O que é

O **O Vanzeiro** é um aplicativo de celular (instala na tela inicial, como um app de loja) para quem **transporta passageiros de van**: escolar, faculdade, visitas, excursões e viagens de fim de semana.

Ele troca o caderno, o grupo de WhatsApp e a calculadora por um lugar só, onde o vanzeiro controla **viagens, passageiros, dinheiro e gastos**, e onde o passageiro **avisa se vai viajar e vê o que deve**.

Tem **duas áreas**:

| Área           | Quem usa      | Para quê                                                                          |
| -------------- | ------------- | --------------------------------------------------------------------------------- |
| **Vanzeiro**   | O dono da van | Organiza tudo: linhas, vans, motoristas, passageiros, viagens, cobranças e gastos |
| **Passageiro** | Quem viaja    | Responde "vou / não vou", vê o horário, paga e consulta recibos                   |

---

## 2. O que o vanzeiro faz no app

### Montar o negócio

- **Vans:** apelido, modelo, placa, lugares, motorista, situação (rodando ou na manutenção).
- **Motoristas:** nome, telefone, CNH e validade (o app avisa quando a CNH está vencendo).
- **Linhas:** o trajeto que a van faz, com dias da semana (ou viagem única), horário de saída e volta, paradas em ordem, destino, van, motorista e valores (por viagem e mensal).
- **Passageiros:** cadastro completo (endereço, contato de emergência, observações), a forma de pagamento (por viagem, semanal ou mensal), o valor e o dia do vencimento. Um passageiro pode estar em várias linhas.
- **Importar de planilha:** traz a lista de passageiros de um arquivo CSV (Excel ou Planilhas Google). Antes de gravar, mostra linha a linha o que está pronto, o que já existe e o que precisa de correção.
- **Exportar para planilha:** baixa a lista de passageiros no mesmo formato.
- **Convite:** manda o link do app para cada passageiro pelo WhatsApp, com a mensagem pronta.

### Fazer as viagens

- **Confirmações:** cada passageiro responde "vou / não vou" até as **20h da véspera**. Passou o prazo, só o vanzeiro muda a resposta.
- **Lotação e lista de espera:** se a van lota, quem confirmar depois entra na fila e **sobe sozinho** quando abre uma vaga.
- **Lembrar quem não respondeu:** abre o WhatsApp de cada um com a mensagem pronta.
- **Passageiro extra:** acrescenta alguém só numa viagem.
- **Trocar van ou motorista só numa viagem:** o app avisa se a van nova não comporta quem já confirmou.
- **Cancelar a viagem** (com confirmação) e **avisar** os confirmados.
- **Compartilhar a lista da viagem** pelo WhatsApp.
- **Férias e feriados:** pausa uma linha ou todas por um período. As viagens somem, o passageiro é avisado e o plano pode deixar de ser cobrado.

### Rodar a viagem (tela de "ida")

- **Ida:** marca quem embarcou ou faltou, na ordem do trajeto, e reordena quem falta.
- **Paradas no caminho:** cronômetro da parada, quem está na van, chamada de quem falta.
- **Avisar "estou chegando":** abre o WhatsApp do passageiro com o horário combinado da escala.
- **Waze ou Google Maps:** botão para navegar até cada passageiro.
- **Volta:** chamada de quem volta, entrega passageiro por passageiro (inclusive "deixei em outro lugar"), com opção de desfazer.
- **Encerrar a viagem** e ver o **resumo** (quem foi, quem faltou, dinheiro).
- **Marcar e desmarcar** funciona de ponta a ponta sem perder o que o passageiro já respondeu pelo app.

### Dinheiro

- **Cobrança automática:** por viagem (ao embarcar), semanal e mensal (gerada no dia do vencimento).
- **Pagar na hora da viagem:** para quem paga por viagem, ao embarcar o app pergunta "dinheiro ou Pix?" e já gera a baixa e o **recibo**.
- **Pix copia e cola** com o valor certo da cobrança e **chave Pix** do vanzeiro (celular, CPF, CNPJ, e-mail ou aleatória).
- **Recibos** numerados em sequência; dá para desfazer um recibo ou cancelar uma cobrança.
- **Quem está devendo:** total, dias de atraso, e **cobrar todos os atrasados em sequência** pelo WhatsApp, com texto que você mesmo configura.
- **Avisos de vencimento:** o app avisa o vanzeiro e o passageiro alguns dias antes (você escolhe de 1 a 7).
- **Configurar cobrança:** dias de aviso, texto da mensagem e "paga na hora" como padrão.

### Gastos e relatórios

- **Gastos:** combustível (com litros e km), pedágio, manutenção etc., por van ou linha, inclusive gastos que **repetem todo mês**.
- **Resultado do mês** na tela inicial: recebido, gastos, lucro e quanto ainda falta receber.
- **Relatórios:** lucro por van e por linha, ocupação das viagens e consumo de combustível, por período.
- **Exportar** recebimentos, gastos e resumo em planilha, ou **imprimir / salvar em PDF**.
- **Histórico de viagens** já feitas.

### Segurança dos dados

- **Backup em arquivo** (com conferência de que o arquivo não foi alterado) e **restaurar**, inclusive para trocar de celular.
- **Alertas no Início:** CNH vencendo, cobranças atrasadas, lembrete de fazer backup, passageiros sem resposta.
- **Começar do zero** (com cópia de segurança antes) e **modo demonstração** com dados de exemplo.

---

## 3. O que o passageiro faz no app

- **Avisar se vai viajar** (Vou / Não vou), até o prazo.
- **Ver o horário da van** e quantas paradas faltam para a dele quando a van está a caminho.
- **Confirmar presença** na parada e **dizer se volta na van** (ou o motivo de não voltar).
- **Ver o que deve**, o aviso de vencimento, **pagar por Pix copia e cola** e ver o **histórico de recibos**.
- **Ver avisos** de pausa (férias e feriados) e de vencimento.
- **Meu perfil** com **letra maior** (acessibilidade) e instalação do app.
- O passageiro **só enxerga os dados dele** (isso já foi desenhado e testado no app).

---

## 4. Benefícios para você

| Antes (caderno e WhatsApp)               | Com o app                                                            |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Perguntar um por um quem vai amanhã      | O passageiro responde sozinho; você só lembra quem não respondeu     |
| Esquecer quem já pagou ou quanto deve    | Cobrança e recibo automáticos, lista de quem deve com dias de atraso |
| Van lotada e confusão de vagas           | Lista de espera que preenche sozinha                                 |
| Escrever a mensagem de cobrança toda vez | Mensagem pronta no WhatsApp, em um toque                             |
| Não saber se a viagem dá lucro           | Lucro por van e por linha, gastos do mês, relatórios                 |
| Perder tudo se o celular quebrar         | Backup em arquivo e restauração                                      |
| Lista de passageiros em planilha         | Importa e exporta planilha                                           |
| Não perder o fio nas férias              | Pausas de linha com aviso aos passageiros                            |

Também: **letra grande e botões grandes** (pensado para uso no meio da viagem), **funciona offline** nas telas já abertas, **instala como app** e **protege dados** (nenhum dado vai para fora do aparelho hoje).

---

## 5. Importante: o que o app ainda NÃO faz (sem banco de dados)

Isto precisa ficar claro para você:

1. **Hoje os dados ficam em cada aparelho.** O celular do vanzeiro e o do passageiro **não conversam** entre si. Quando o passageiro responde "vou", isso **não chega** ao celular do vanzeiro, a não ser no mesmo aparelho (modo demonstração). **Por isso o banco de dados é o passo que faz o app valer de verdade.**
2. **Login de verdade** (Google) e convite com código seguro: hoje o login é simulado.
3. **Ver a van no mapa ao vivo** e **notificação push** ("a van está chegando"). Hoje o aviso é pelo WhatsApp que o vanzeiro dispara com um toque.
4. **Pix confirmado automaticamente.** Hoje o vanzeiro dá a baixa.
5. **Cobrança por WhatsApp sem você tocar.** Hoje o app prepara a mensagem e você envia.
6. **Prazo e regras valendo no servidor**, para ninguém mexer no relógio do celular.

Tudo isso está planejado em `docs/MIGRACAO_BANCO.md`, `docs/VAN_AO_VIVO.md` e `docs/VARREDURA_PRE_BANCO.md`.

---

## 6. Qualidade (o que foi conferido)

- **750 testes automáticos** passam, **88% do código coberto por testes**.
- **Contraprova** (`npm run conferir`): 34 etapas conferidas, todas OK.
- **Contrato com o banco:** as **55 operações** de gravação têm teste para o banco passar depois.
- **Navegador real:** 135 cliques em 21 telas dos dois papéis, sem nenhum erro.
- **Acessibilidade:** sem violações; cores com contraste de leitura (inclusive sob sol forte).
- **Segurança:** nenhum segredo no código; backup com conferência de integridade; planilhas protegidas contra fórmulas maliciosas.

---

## 7. Checklist para você

### A. Antes de testar

- [ ] Publiquei a versão mais recente no Lovable (Publish → Update).
- [ ] Instalei o app na tela inicial do celular (ou atualizei o que já estava instalado).

### B. Testar no celular (roteiro completo em `docs/teste-em-aparelho.md`)

- [ ] Fiz o primeiro acesso: cadastrei meu perfil.
- [ ] Cadastrei uma van, um motorista e uma linha com paradas.
- [ ] Cadastrei um passageiro (e testei **Importar de planilha** com a planilha de exemplo).
- [ ] Abri uma viagem, mudei a resposta de um passageiro e testei a lista de espera.
- [ ] Rodei uma viagem inteira: ida, parada, volta, entrega e encerramento.
- [ ] Testei **pagar na hora** (dinheiro e Pix) e conferi o recibo.
- [ ] Gerei uma cobrança, usei **Pix copia e cola** e dei baixa.
- [ ] Mandei uma **cobrança pelo WhatsApp** com minha mensagem personalizada.
- [ ] Lancei um gasto e conferi o resultado do mês e os relatórios.
- [ ] Marquei **Férias e feriados** e vi as viagens sumirem.
- [ ] Fiz um **backup**, e **restaurei** em outro aparelho.
- [ ] Exportei a lista de passageiros e abri no Excel/Planilhas.
- [ ] Aumentei a **letra** e usei o app ao ar livre (sol forte).
- [ ] Testei o app **sem internet** nas telas já abertas.

### C. Decisões que preciso tomar antes do banco

- [ ] Como o passageiro entra: Google, link de convite ou telefone?
- [ ] E se duas pessoas tiverem o mesmo telefone (irmãos)?
- [ ] Sem internet: só leitura, ou marcar embarque e sincronizar depois?
- [ ] O modo demonstração continua existindo?
- [ ] Os dados que já estão em celulares: importar pelo backup ou começar do zero?
- [ ] LGPD: quem é o responsável pelos dados e qual texto de privacidade vai no convite?
- [ ] O pagamento continua só como registro manual (Pix copia e cola)?
- [ ] Cada vanzeiro tem uma conta só? Os motoristas têm login próprio?

### D. Quando eu pedir o banco

- [ ] Avisar ao Claude "pode começar o banco".
- [ ] Revisar e aprovar o pedido que ele vai fazer ao Lovable.
- [ ] Testar com **dois aparelhos ao mesmo tempo** (vanzeiro e passageiro): a resposta do passageiro tem que chegar ao vanzeiro.
- [ ] Conferir que **um passageiro não vê dados de outro** e que um vanzeiro não vê dados de outro vanzeiro.

---

## 8. Mapa dos documentos

| Documento                     | Para quê                                             |
| ----------------------------- | ---------------------------------------------------- |
| `docs/CONHECA_O_APP.md`       | Este guia                                            |
| `docs/teste-em-aparelho.md`   | Roteiro para testar no celular                       |
| `docs/PLANO_FINALIZACAO.md`   | Lista de todas as etapas feitas                      |
| `docs/VARREDURA_PRE_BANCO.md` | Análises antes do banco, decisões suas e o que falta |
| `docs/MIGRACAO_BANCO.md`      | O que entregar ao Lovable para criar o banco         |
| `docs/VAN_AO_VIVO.md`         | Mapa ao vivo e notificação "a van está chegando"     |
| `docs/PUBLICACAO.md`          | Como publicar o app                                  |
| `docs/CONTRAPROVA.md`         | Resultado da conferência automática de cada etapa    |
