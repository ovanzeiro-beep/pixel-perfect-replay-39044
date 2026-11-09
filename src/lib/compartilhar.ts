/** Abre o compartilhar do celular; sem ele, abre o WhatsApp com o texto pronto. */
export async function compartilharTexto(
  texto: string,
  titulo: string,
): Promise<"compartilhado" | "whatsapp" | "cancelado"> {
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

/** Lê o conteúdo de um arquivo escolhido pelo usuário (FileReader funciona em todo navegador). */
export function lerArquivoTexto(arquivo: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result ?? ""));
    leitor.onerror = () => reject(leitor.error ?? new Error("Não deu para ler o arquivo."));
    leitor.readAsText(arquivo);
  });
}

/** Baixa um arquivo (vai para a pasta de downloads do navegador). */
export function baixarArquivo(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Guarda um arquivo: no celular abre o compartilhar (WhatsApp, Drive, "Salvar em Arquivos"); sem isso, baixa.
 * Com `soBaixar`, sempre baixa.
 */
export async function salvarArquivo(
  nome: string,
  conteudo: string,
  { tipo = "application/json", soBaixar = false }: { tipo?: string; soBaixar?: boolean } = {},
): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const arquivo = new File([conteudo], nome, { type: tipo });
  if (
    !soBaixar &&
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [arquivo] })
  ) {
    try {
      await navigator.share({ files: [arquivo], title: nome });
      return "compartilhado";
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return "cancelado";
    }
  }
  baixarArquivo(arquivo);
  return "baixado";
}
