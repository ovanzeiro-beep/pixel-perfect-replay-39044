/** Abre o compartilhar do celular; sem ele, abre o WhatsApp com o texto pronto. */
export async function compartilharTexto(texto: string, titulo: string): Promise<"compartilhado" | "whatsapp" | "cancelado"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: titulo, text: texto });
      return "compartilhado";
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return "cancelado";
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  return "whatsapp";
}
