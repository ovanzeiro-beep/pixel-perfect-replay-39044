/**
 * Apoio dos testes que abrem o app inteiro. No primeiro acesso real a conta começa vazia; estes testes
 * representam quem já tem dados (os de exemplo) salvos no aparelho, então gravam esses dados antes de abrir.
 * Chame DEPOIS de `vi.resetModules()`, para valer para os módulos que serão usados no teste.
 */
export async function semearExemploNoAparelho(): Promise<void> {
  const { criarEstadoExemplo } = await import("@/data/store");
  const { gravar } = await import("@/data/persistencia");
  localStorage.clear();
  gravar(localStorage, criarEstadoExemplo());
}

/** Conta de quem já fez o primeiro acesso mas ainda não cadastrou nada. */
export async function semearContaVazia(): Promise<void> {
  const { criarEstadoVazio } = await import("@/data/store");
  const { gravar } = await import("@/data/persistencia");
  localStorage.clear();
  const vazio = criarEstadoVazio();
  gravar(localStorage, {
    ...vazio,
    perfil: {
      nome: "Maria Souza",
      cidade: "Londrina",
      estado: "PR",
      telefone: "(43) 99999-0000",
      email: "",
      configurado: true,
    },
    motoristas: [
      {
        id: "m1",
        nome: "Maria Souza",
        telefone: "(43) 99999-0000",
        cnh: "D",
        cnhValidade: "",
        proprio: true,
        vanId: "",
      },
    ],
  });
}
