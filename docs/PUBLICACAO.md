# Publicação do app (para ter o link de instalar no celular)

O app roda no **Lovable** (projeto "Pixel Perfect Replay"). O código que está na `main` do GitHub é sincronizado com o Lovable, e o Lovable publica o site com HTTPS (obrigatório para instalar como app).

## Situação em 10/11/2026

- Projeto no Lovable: **publicado** (público), editor em `https://lovable.dev/projects/2e6aea9f-0024-4c57-a5e7-dfb8095ba732`.
- O Lovable já tinha recebido o último commit da `main` (etapa 17, `b9db5c3`).
- Link de teste (preview): `https://id-preview--2e6aea9f-0024-4c57-a5e7-dfb8095ba732.lovable.app`.
- O **endereço publicado** (o que você passa para motoristas e passageiros) aparece no botão **Publish** do editor do Lovable. Não consegui ler esse endereço pelas ferramentas nem abrir o site daqui (a rede desta sessão não alcança o domínio do Lovable), então **confira esse passo você mesmo**.

## Passo a passo para publicar uma versão nova

1. Garanta que a `main` do GitHub tem a versão que você quer (o `npm run conferir` precisa estar todo OK).
2. Abra o projeto no editor do Lovable e toque em **Publish** → **Update**. (Sem isso o site no ar continua na versão anterior.)
3. Espere terminar e abra o endereço publicado no celular.
4. Os celulares que já têm o app instalado mostram o aviso **"Nova versão disponível"**. Ao tocar em atualizar, o app recarrega na versão nova.

## Conferir depois de publicar (5 minutos)

1. Abra o endereço no **Chrome do Android**: a tela de entrada aparece e, depois de alguns segundos, o botão **Instalar agora** (ou ⋮ → Instalar app).
2. No **iPhone (Safari)**: Compartilhar → Adicionar à Tela de Início.
3. Abra o app instalado: deve abrir em **tela cheia**, sem barra do navegador.
4. Ligue o modo avião e abra de novo: as telas já visitadas abrem e aparece a faixa **"Sem internet"**.
5. Siga o roteiro completo em [`teste-em-aparelho.md`](teste-em-aparelho.md).

## O que já foi conferido na versão de produção (neste repositório)

- `npm run build` gera o site com manifesto (`fullscreen`), ícones (192, 512, maskable e Apple), página offline e service worker.
- Em navegador real, na build de produção: o service worker assume a página, guarda os 92 arquivos do app, abre telas já visitadas sem internet e mostra a faixa "Sem internet".
- Sem aviso de erro no console ao abrir a entrada e o perfil, com letra normal ou muito grande.
- Uma observação conhecida e inofensiva: abrir **sem internet** uma tela que **nunca foi aberta** faz o navegador registrar um aviso técnico no console (o app usa uma tela guardada como base). A tela aparece normalmente.

## Antes de divulgar para outras pessoas

- O **login é simulado** e os dados ficam **só no celular de cada pessoa**. Isso serve para testar. Para uso de verdade por vários motoristas, é preciso o banco de dados e o login real (veja [`MIGRACAO_BANCO.md`](MIGRACAO_BANCO.md)).
- A tela de entrada já avisa "Versão de teste — o login ainda é simulado".
- O convite de passageiro por link **só funciona no celular do vanzeiro** enquanto não houver banco.
- Segredos e chaves ficam no **Secrets** do Lovable, nunca no repositório.

## Se algo der errado

- No editor do Lovable, use o **histórico** para voltar a uma versão anterior e publique de novo.
- No GitHub, a `main` tem um commit de merge por etapa; dá para ver exatamente o que mudou em cada uma.
