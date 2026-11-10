# Ver a van ao vivo e avisar "a van está chegando"

Análise feita em 10/11/2026. O pedido: o passageiro ver a van quando ela está vindo e receber um aviso no celular de que ela está chegando.

## O que o app faz hoje (sem banco)

- **Avisos pelo vanzeiro, no WhatsApp:**
  - *Avisar: chegando* (tela da ida, próxima parada): abre o WhatsApp do passageiro com a mensagem pronta, incluindo o horário combinado da escala. Não inventa "uns 5 minutos".
  - *Avisar o grupo que a van saiu*: compartilha uma mensagem única com a previsão de cada passageiro que ainda falta embarcar.
  - Na volta, o botão de WhatsApp da próxima parada continua ("Estamos chegando na sua casa").
- **Cartão do passageiro com a van a caminho:** mostra "Faltam N paradas para a sua" (ou "A próxima parada é a sua!"), como a volta já fazia. É uma estimativa por **paradas**, não por distância.
- O passageiro só vê isso se abrir o app, e só no mesmo aparelho do vanzeiro (enquanto não houver banco).

## O que NÃO existe e por que depende do banco

| Recurso | O que exige |
| --- | --- |
| **Van no mapa ao vivo** | O celular do vanzeiro precisa enviar a posição a cada 10 a 15 segundos para um servidor, e o celular do passageiro recebe em tempo real. Hoje cada aparelho guarda os dados só nele. |
| **Notificação "a van está chegando"** | Notificação push: servidor que envia, passageiro autorizando e o registro do aparelho dele guardado. |

## Como seria (para a fase do banco)

### Posição ao vivo
- O app do vanzeiro usa a localização do navegador (`geolocation.watchPosition`) **só enquanto a viagem está aberta**, e mantém a tela ligada (`Wake Lock`).
- Limite do navegador: com o celular bloqueado ou o app em segundo plano, a localização **para**. O vanzeiro precisa deixar o app aberto na viagem. Gasta bateria.
- Tabela nova (pedida ao Lovable, não escrita aqui): `posicoes_da_van` com viagem, latitude, longitude, hora e precisão; só a posição mais recente importa, o histórico se apaga ao encerrar a viagem.
- Regra de acesso: só os passageiros **daquela viagem**, só **enquanto ela está em andamento**.
- Mapa: OpenStreetMap (gratuito, respeitar a política de uso) ou Google Maps (cobra por uso). Com o pino da van, o da parada do passageiro e o tempo estimado.
- **LGPD:** a localização do vanzeiro é dado pessoal. Ele precisa saber que está sendo compartilhada e poder desligar; o passageiro só vê durante a viagem.

### Notificação push
- Service worker com tratamento de `push` e `notificationclick`; chaves VAPID guardadas em Secrets do Lovable; função no servidor que envia; tabela `inscricoes_push` por passageiro.
- **Android (Chrome):** funciona com o app instalado ou não. **iPhone:** só com o app **instalado na tela inicial** e iOS 16.4 ou mais novo; o passageiro precisa aceitar a permissão.
- **Quando disparar** (decisão a tomar):
  1. **Por paradas** (mais simples, não depende de GPS): quando o vanzeiro marca a parada anterior à do passageiro, avisa "a van está a 1 parada de você".
  2. **Por distância** (depende da posição ao vivo): quando a van chega a X metros ou Y minutos do endereço do passageiro.
  3. **Manual**: um botão do vanzeiro "Avisar que estou chegando" que dispara a notificação (substitui o WhatsApp).
- Recomendação: começar pelo item 1 (e o 3), e fazer o 2 junto com a posição ao vivo.

## Ordem sugerida
1. Banco + login real (`MIGRACAO_BANCO.md`).
2. Push por paradas e botão manual (sem GPS).
3. Posição ao vivo e mapa, com o aviso por distância.
