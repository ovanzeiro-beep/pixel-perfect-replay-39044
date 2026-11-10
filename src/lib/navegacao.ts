// Links para abrir a navegação no app que o motorista preferir. Só montam o endereço: não usam GPS nem guardam nada.

/** Google Maps: rota de carro até o endereço, saindo de onde o motorista está. */
export const linkGoogleMaps = (endereco: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}&travelmode=driving`;

/** Waze: abre o app (ou o site) já navegando até o endereço. O Waze aceita um destino só, sem paradas no meio. */
export const linkWaze = (endereco: string) =>
  `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`;
