# Roteiro de teste do app no celular

Use este roteiro num **celular de verdade** (o navegador do computador não mostra tela cheia nem a instalação do mesmo jeito).
O app precisa estar num endereço **https** (o link publicado do Lovable serve). Marque cada item; se algo falhar, anote o aparelho, o navegador e o que apareceu.

## Antes de começar

- [ ] Abra o link do app no celular **com internet** e deixe a tela de entrada carregar por completo (isso guarda o app para uso offline).
- [ ] Anote: modelo do celular, versão do Android/iOS, navegador.

## Android (Chrome)

1. **Instalar**
   - [ ] Na tela de entrada aparece o cartão **"Instale o app no celular"** com o botão "Instalar agora" (se não aparecer: menu ⋮ → "Instalar app" / "Adicionar à tela inicial").
   - [ ] O ícone da van azul com pino laranja aparece na tela inicial, com o nome **Vanzeiro**.
   - [ ] Depois de instalado, o cartão de instalação some.
2. **Tela cheia**
   - [ ] Abrindo pelo ícone, o app ocupa **100% da tela**: sem barra de endereço e sem as barras do sistema.
   - [ ] Nada fica escondido atrás da câmera/entalhe (topo) nem da barra de gestos (embaixo): o menu inferior fica inteiro visível.
   - [ ] Girar o celular não quebra a tela (o app é feito para ficar em pé).
3. **Uso normal**
   - [ ] Entrar como vanzeiro, abrir Viagens, Passageiros, Dinheiro, Mais.
   - [ ] Cadastrar um passageiro, fechar o app (deslizar para fora) e abrir de novo: **o cadastro continua lá**.
   - [ ] Abrir pelo ícone já entra direto na área (sem pedir login de novo).
4. **Sem internet**
   - [ ] Ligar o **modo avião** e abrir o app pelo ícone: ele abre normalmente.
   - [ ] Aparece a faixa amarela **"Sem internet. O app continua funcionando…"**.
   - [ ] Navegar entre as abas e cadastrar/alterar algo funciona.
   - [ ] Desligar o modo avião: a faixa some sozinha.
5. **Nova versão**
   - [ ] Depois que uma versão nova for publicada, abrir o app **com internet**: aparece **"Nova versão do app disponível"** (pode levar alguns segundos; fechar e abrir de novo ajuda).
   - [ ] "Depois" esconde o aviso; ele volta na próxima abertura.
   - [ ] "Atualizar agora" recarrega o app e **os dados e o login continuam** como estavam.
6. **Compartilhar**
   - [ ] "Compartilhar lista da viagem", "Compartilhar resumo", recibo e relatório abrem o compartilhar do celular (WhatsApp na lista).

## iPhone (Safari)

O iPhone **não oferece** o botão de instalar e **não esconde tudo** como o Android: o app abre sem a barra do Safari, mas a barra de estado e a linha de gestos continuam. Isso é limite da Apple.

1. **Instalar**
   - [ ] No Safari (precisa ser o Safari), tocar em **Compartilhar** → **Adicionar à Tela de Início** → Adicionar.
   - [ ] O cartão "Como instalar no iPhone" na tela de entrada mostra esses passos.
2. **Abrir**
   - [ ] Abrindo pelo ícone, **não aparece a barra do Safari**.
   - [ ] O topo do app não fica embaixo do relógio/entalhe; o menu inferior não fica embaixo da linha de gestos.
3. **Uso e sem internet**
   - [ ] Repetir os itens "Uso normal" e "Sem internet" do Android.
4. **Nova versão**
   - [ ] Repetir o item "Nova versão" (no iPhone pode precisar fechar o app por completo e abrir de novo).

## Exportar e imprimir

- [ ] Mais → Relatórios → escolha um período → **Exportar**: "Planilha de recebimentos", "Planilha de gastos" e "Planilha do resumo". No celular abre o **compartilhar** (WhatsApp, Drive, e-mail); sem ele, baixa o arquivo `vanzeiro-…csv`.
- [ ] Abra o arquivo no **Excel** ou no **Planilhas Google**: colunas separadas, **acentos certos**, valores com vírgula (ex.: 150,00) reconhecidos como número.
- [ ] O total da planilha de recebimentos e o de gastos batem com os números do relatório na tela.
- [ ] **Imprimir ou salvar em PDF**: no celular escolha "Salvar como PDF" (ou impressora). O PDF tem o cabeçalho "O Vanzeiro — Relatório", seu nome, a cidade e o período, **sem** menu, botões nem avisos.

## Pagar na hora da viagem

- [ ] Passageiros → abra um que paga **Por viagem** → editar: ligue **Paga na hora da viagem** e salve. Na lista, aparece "· paga na hora".
- [ ] Inicie uma viagem com ele: ao tocar em **Embarcou**, o app pergunta **Pagou em dinheiro / Pagou no Pix / Paga depois**.
- [ ] Escolha uma forma de pagamento: aparece "embarcou · pagou R$ … (recibo nº …)". Em Dinheiro → recibos o recibo está lá e **nada fica em aberto** para ele.
- [ ] **Desfazer última marcação**: o recibo e a cobrança somem junto.
- [ ] No fim, o **Resumo da viagem** mostra "Recebido na hora".

## Avisar que a van está chegando

- [ ] Na ida, na próxima parada, toque em **Avisar: chegando**: abre o WhatsApp do passageiro com a mensagem pronta (com o horário combinado, sem "uns 5 minutos").
- [ ] Toque em **Avisar o grupo que a van saiu**: abre o compartilhar (ou o WhatsApp) com a lista de quem ainda falta e o horário previsto de cada um. Quem já embarcou não aparece.
- [ ] No celular do passageiro (se for o mesmo aparelho do teste): com a van a caminho, o cartão mostra "Faltam N paradas para a sua".

## Navegar com Waze ou Google Maps

- [ ] Inicie uma viagem: na **próxima parada** aparecem os botões **Google Maps** e **Waze**. Toque em cada um: abre o app (ou o site) já com o endereço do passageiro.
- [ ] "Rota completa no Google Maps" abre com todas as paradas; o texto explica que o Waze vai uma parada por vez.
- [ ] Depois de embarcar todos, "Seguir para o destino" → "Navegar até o destino" mostra os dois botões.

## Como usar (ajuda dentro do app)

- [ ] Motorista: Mais → **Como usar o app**. Os assuntos abrem e fecham ao tocar. Siga "Fazer uma viagem" com uma viagem de verdade e veja se cada passo bate com o que a tela mostra.
- [ ] Passageiro: Meu perfil → **Como usar o app**. Peça a uma pessoa que nunca usou para tentar responder uma viagem **só lendo a ajuda**. Anote onde ela travou.

## Prazo de confirmação

- [ ] Passageiro, **antes do prazo** (até 20h da véspera): "Vou" e "Não vou" funcionam e dá para mudar a resposta.
- [ ] Passageiro, **depois do prazo**: os botões somem, aparece "O prazo para responder acabou" e **Falar com o vanzeiro** abre o WhatsApp com a mensagem pronta.
- [ ] Vanzeiro, **depois do prazo**: abra a viagem, toque no nome do passageiro e escolha Vai ou Não vai. Salva normalmente.

## Dados no aparelho (duas janelas e falha ao salvar)

- [ ] Abra o app instalado e o mesmo endereço no navegador ao mesmo tempo. Mude algo (ex.: chave Pix) em um: **o outro acompanha** sem precisar recarregar.
- [ ] (Só se conseguir) Abra o app em **aba anônima** e faça uma mudança: deve aparecer o aviso "Seus dados não estão sendo salvos", com o atalho para backup.

## Tamanho da letra

- [ ] Perfil → **Tamanho da letra** → "Muito grande": a letra de todo o app aumenta na hora. Navegue por Viagens, Passageiros, Dinheiro, Gastos, Relatórios e Histórico: **nada corta nem aparece rolagem para o lado**.
- [ ] Feche e abra o app: continua no tamanho escolhido, sem "piscar" no tamanho normal.
- [ ] Volte para "Normal": tudo retorna ao tamanho original.

## Primeiro acesso (conta nova)

- [ ] Instale o app e entre ("Entrar com Google" → "Sou vanzeiro"): abre a tela **"Bem-vindo ao O Vanzeiro"** (conta vazia, sem passageiros de exemplo).
- [ ] "Começar" sem preencher mostra o que falta, em português. Preencha nome, celular com DDD, cidade e estado e toque em **Começar**.
- [ ] O Início mostra **"Boa tarde, [seu nome]"** e o guia **Primeiros passos** (van, linha, passageiros, convites, Pix, backup). Cada passo leva à tela certa e é marcado quando feito. O guia some quando van, linha e passageiros estão cadastrados, ou em "Esconder este guia".
- [ ] Meu perfil → **Seus dados**: mudar o nome ou a cidade atualiza o cabeçalho.
- [ ] Fechar o app e abrir de novo **não volta** às boas-vindas.
- [ ] Nas boas-vindas, **"Prefiro ver o app com dados de exemplo"** abre o app com a demonstração.
- [ ] Meu perfil → **Começar do zero**: pede confirmação, apaga tudo e volta às boas-vindas, onde aparece **"Desfazer e voltar aos dados de antes"**.
- [ ] **Quem já usava o app** (com dados): ao atualizar o app, abre direto como antes, com todos os dados e sem passar pelas boas-vindas.
- [ ] **Celular novo:** nas boas-vindas use **"Restaurar de um backup"** com o arquivo salvo: entra com tudo.

## Backup

- [ ] Em Mais → Meu perfil → **Backup dos dados** → "Salvar backup": no celular abre o **compartilhar** (WhatsApp, Drive, "Salvar em Arquivos" no iPhone). Guarde o arquivo `vanzeiro-backup-AAAA-MM-DD.json` fora do celular.
- [ ] Sem compartilhar, "Só baixar o arquivo" salva na pasta de downloads.
- [ ] Depois do backup aparece **"Último backup: data e hora"**.
- [ ] Mude algo (ex.: a chave Pix), volte em "Restaurar de um backup", escolha o arquivo: aparece a **prévia** (no backup × agora) e o aviso. Confirmando, os dados voltam ao do arquivo.
- [ ] Logo depois de restaurar aparece **"Desfazer e voltar aos dados de antes"** e ele devolve o que estava antes.
- [ ] Escolher um arquivo qualquer (foto, texto) mostra um aviso em português e não muda nada.
- [ ] Depois de várias alterações e uma semana sem backup, aparece o alerta **"Faça um backup dos seus dados"** no Início.
- [ ] **Troca de celular:** instale o app no celular novo, entre, abra Backup → "Restaurar de um backup" e escolha o arquivo: tudo volta (passageiros, cobranças, recibos, viagens).

## Convite do passageiro

- [ ] No celular do vanzeiro, copiar o "link do convite" de um passageiro e abrir **no mesmo aparelho**: abre a tela do convite, confirma os dados e entra no app.
- [ ] Abrir o mesmo link em **outro** celular mostra "Convite não encontrado". **Isso é esperado na versão de teste**: os dados ficam só no aparelho do vanzeiro. Só passa a funcionar entre aparelhos quando houver banco de dados.

## Limites conhecidos (não são defeitos)

- **Primeiro acesso exige internet.** Antes disso não há o que guardar para o modo offline.
- **Fonte:** sem internet no primeiro acesso, o texto usa a fonte padrão do celular (a "Nunito" só é guardada depois de uma visita com internet).
- **Tela que nunca foi aberta, estando offline:** abre, mas o navegador pode registrar um aviso técnico de "hidratação" no console. Não afeta o uso.
- **Dados ficam no aparelho.** Limpar os dados do navegador/do app apaga tudo. Para voltar ao exemplo: Mais → Meu perfil → "Restaurar dados de exemplo".
- **Avisos** (CNH, atrasos, prazo) aparecem dentro do app; notificação com o app fechado depende do servidor (fase futura).
- No iPhone, dados de um site aberto só no Safari (sem instalar) podem ser apagados pelo sistema após ~7 dias sem uso; o app **instalado** não tem esse limite.

## Testar no computador antes de publicar (opcional)

```sh
NITRO_PRESET=node-server npx vite build
PORT=5188 HOST=127.0.0.1 node .output/server/index.mjs
# abrir http://127.0.0.1:5188 no Chrome (localhost conta como seguro para instalar e usar o service worker)
```

No Chrome do computador: DevTools → Application → Service Workers / Manifest mostram o estado do PWA; marque "Offline" para simular a falta de internet.
