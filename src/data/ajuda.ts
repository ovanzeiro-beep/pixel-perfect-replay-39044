// Textos da tela "Como usar". Ficam aqui (e não dentro da tela) para serem revisados e testados em um lugar só.

export type TopicoAjuda = { id: string; titulo: string; passos: string[] };

export const AJUDA_VANZEIRO: TopicoAjuda[] = [
  {
    id: "comecar",
    titulo: "Primeiros passos",
    passos: [
      "Cadastre a sua van em Mais → Vans e o motorista em Mais → Motoristas.",
      "Crie a sua linha em Mais → Linhas: nome, dias da semana, horário de saída e volta, cidades do trajeto e destino.",
      "Cadastre os passageiros em Passageiros → Novo passageiro e escolha a linha de cada um.",
      "Depois é só acompanhar as viagens na aba Início e na aba Viagens.",
    ],
  },
  {
    id: "convite",
    titulo: "Convidar o passageiro para o app",
    passos: [
      "Abra o passageiro em Passageiros e toque em Enviar convite.",
      "O app abre o WhatsApp com a mensagem e o link já prontos. É só enviar.",
      "Quando o passageiro aceitar, aparece “No app” ao lado do nome dele.",
    ],
  },
  {
    id: "viagem",
    titulo: "Fazer uma viagem",
    passos: [
      "Em Viagens, toque na viagem do dia e depois em Iniciar viagem.",
      "A tela mostra a próxima parada. Toque em Google Maps ou Waze para navegar até o endereço.",
      "Para avisar quem está esperando, toque em Avisar: chegando (abre o WhatsApp com a mensagem pronta para o próximo passageiro) ou em Avisar o grupo que a van saiu (manda a previsão de cada um de uma vez).",
      "Quando o passageiro entrar na van, toque em Embarcou. Se ele não apareceu, toque em Não apareceu.",
      "Depois da última parada, toque em Seguir para o destino e, ao chegar, em Chegamos ao destino!",
      "Na volta, marque quem foi entregue. No fim, toque em Encerrar viagem para guardar o resumo.",
    ],
  },
  {
    id: "confirmacao",
    titulo: "Confirmações e lista de espera",
    passos: [
      "Cada passageiro responde “Vou” ou “Não vou” pelo app, até as 20h da véspera (o prazo aparece na viagem). Depois disso os botões somem para ele.",
      "Se alguém perder o prazo, abra a viagem, toque no nome dele e escolha Vai, Não vai ou Sem resposta. Só o vanzeiro consegue mudar depois do prazo.",
      "Se a van lotar, quem confirmar depois entra na lista de espera e sobe sozinho quando abrir uma vaga.",
      "Em Viagens, o botão Compartilhar lista da viagem manda a lista de passageiros pelo WhatsApp.",
      "Para cancelar um dia, abra a viagem e toque em Cancelar viagem.",
    ],
  },
  {
    id: "dinheiro",
    titulo: "Cobranças e recibos",
    passos: [
      "Em Dinheiro → Cobranças você vê quanto cada passageiro deve.",
      "Quando receber, toque em Marcar pagamento. O app quita primeiro as cobranças mais antigas e gera o recibo.",
      "Com vários atrasados, toque em Cobrar todos os atrasados: o app mostra a lista e você cobra um depois do outro, vendo quem já foi avisado.",
      "O recibo pode ser compartilhado com o passageiro pelo WhatsApp.",
      "Em Mais → Configurar cobrança você escolhe quantos dias antes de vencer o app avisa, muda o texto da mensagem de Cobrar e define se passageiro novo já paga na hora.",
      "Quem paga na hora da viagem: no cadastro do passageiro (Por viagem), ligue Paga na hora da viagem. Ao tocar em Embarcou, o app pergunta Pagou em dinheiro, Pagou no Pix ou Paga depois, e já gera o recibo.",
      "Cadastre a sua chave Pix em Mais → Meu perfil: o app reconhece se é CPF, celular, e-mail ou chave aleatória. Na mensagem de Cobrar vai o Pix copia e cola já com o valor.",
    ],
  },
  {
    id: "gastos",
    titulo: "Gastos e relatórios",
    passos: [
      "Em Mais → Gastos, toque em Lançar gasto: combustível, manutenção, etc. Marque “todo mês” para os que se repetem.",
      "Em Mais → Relatórios você vê o lucro por van e por linha no período que escolher.",
      "No mesmo lugar, o cartão Exportar baixa uma planilha (Excel ou Planilhas Google) ou salva o relatório em PDF.",
    ],
  },
  {
    id: "alertas",
    titulo: "Alertas do Início",
    passos: [
      "O Início avisa o que precisa de atenção: CNH vencendo, pagamento atrasado e passageiros que ainda não responderam.",
      "Os mais urgentes ficam sempre à vista. Toque em Ver mais para abrir os outros.",
      "O X dispensa um alerta. Ele volta se a situação mudar.",
    ],
  },
  {
    id: "dados",
    titulo: "Seus dados e o backup",
    passos: [
      "Neste momento os dados ficam salvos só no seu celular.",
      "Em Mais → Meu perfil → Backup dos dados, toque em Salvar backup de vez em quando.",
      "Se trocar de celular ou limpar o navegador, use Restaurar de um backup para recuperar tudo.",
      "Ainda no perfil, em Tamanho da letra, você deixa o texto maior se estiver difícil de ler.",
    ],
  },
  {
    id: "instalar",
    titulo: "Instalar o app no celular",
    passos: [
      "No Android (Chrome): toque em Instalar agora, quando aparecer, ou em ⋮ → Instalar app.",
      "No iPhone (Safari): toque em Compartilhar e depois em Adicionar à Tela de Início.",
      "Instalado, o app abre em tela cheia, como um aplicativo de verdade.",
    ],
  },
];

export const AJUDA_PASSAGEIRO: TopicoAjuda[] = [
  {
    id: "viagem",
    titulo: "Avisar se vai viajar",
    passos: [
      "Na tela Início ou em Minhas viagens, toque em Vou ou em Não vou em cada viagem.",
      "Responda antes do prazo que aparece no cartão da viagem (até as 20h da véspera). Depois disso os botões somem.",
      "Se precisar mudar depois do prazo, toque em Falar com o vanzeiro: ele consegue ajustar a sua resposta.",
      "Se a van estiver cheia, você entra na lista de espera (o cartão mostra a sua posição) e sobe quando abrir uma vaga.",
      "Para mudar a resposta, toque no outro botão.",
    ],
  },
  {
    id: "horario",
    titulo: "Saber o horário da van",
    passos: [
      "Cada viagem mostra o dia e o horário de saída.",
      "Também aparece o horário aproximado em que a van passa na sua parada.",
      "Com a van a caminho, o cartão da viagem mostra quantas paradas faltam até a sua. O aviso de que ela está chegando vem do vanzeiro, pelo WhatsApp.",
      "Para qualquer dúvida, use Ligar ou WhatsApp, no fim da tela Início.",
    ],
  },
  {
    id: "pagamento",
    titulo: "Pagar e ver recibos",
    passos: [
      "Em Pagamentos você vê se está em dia ou o que está em aberto. Um dia antes de vencer, o app avisa na tela inicial.",
      "Toque em Copiar Pix com o valor, abra o app do seu banco e cole: o valor já vem preenchido. Se preferir, Copiar chave Pix copia só a chave.",
      "Depois de pagar, toque em Avisar que paguei para mandar a mensagem ao vanzeiro.",
      "Os recibos ficam guardados na mesma tela.",
    ],
  },
  {
    id: "perfil",
    titulo: "Meu perfil e letra maior",
    passos: [
      "Em Meu perfil você confere os seus dados e o contato de emergência.",
      "Em Tamanho da letra, escolha Grande ou Muito grande se o texto estiver pequeno.",
    ],
  },
  {
    id: "instalar",
    titulo: "Instalar o app no celular",
    passos: [
      "No Android (Chrome): toque em Instalar agora, quando aparecer, ou em ⋮ → Instalar app.",
      "No iPhone (Safari): toque em Compartilhar e depois em Adicionar à Tela de Início.",
      "Instalado, o app abre em tela cheia, como um aplicativo de verdade.",
    ],
  },
];
