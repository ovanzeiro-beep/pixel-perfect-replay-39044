// Guia "Primeiros passos" do Início: o que falta fazer para começar a usar o app de verdade.
import type { Estado } from "./tipos";

export const ID_GUIA = "primeiros-passos";

export type Passo = {
  id: "van" | "linha" | "passageiros" | "convites" | "pix" | "backup";
  titulo: string;
  descricao: string;
  feito: boolean;
  destino: "/vanzeiro/vans" | "/vanzeiro/linhas" | "/vanzeiro/passageiros" | "/vanzeiro/perfil";
  /** Os três primeiros passos são o essencial: o guia some quando os três estão feitos. */
  essencial: boolean;
};

export function passosIniciais(
  e: Pick<Estado, "vans" | "linhas" | "passageiros" | "chavePix">,
  backup: { ultimoBackup: string | null },
): Passo[] {
  return [
    {
      id: "van",
      titulo: "Cadastre sua van",
      descricao: "Apelido, placa e quantos lugares ela tem.",
      feito: e.vans.length > 0,
      destino: "/vanzeiro/vans",
      essencial: true,
    },
    {
      id: "linha",
      titulo: "Crie sua primeira linha",
      descricao: "Os dias, os horários e o trajeto da viagem.",
      feito: e.linhas.length > 0,
      destino: "/vanzeiro/linhas",
      essencial: true,
    },
    {
      id: "passageiros",
      titulo: "Cadastre seus passageiros",
      descricao: "Nome, telefone, endereço e quanto cada um paga.",
      feito: e.passageiros.length > 0,
      destino: "/vanzeiro/passageiros",
      essencial: true,
    },
    {
      id: "convites",
      titulo: "Convide seus passageiros pelo app",
      descricao: "Eles confirmam presença e veem os pagamentos pelo celular.",
      feito: e.passageiros.some((p) => p.convite !== "nao_enviado"),
      destino: "/vanzeiro/passageiros",
      essencial: false,
    },
    {
      id: "pix",
      titulo: "Coloque sua chave Pix",
      descricao: "Ela vai junto nas mensagens de cobrança.",
      feito: e.chavePix.trim() !== "",
      destino: "/vanzeiro/perfil",
      essencial: false,
    },
    {
      id: "backup",
      titulo: "Faça seu primeiro backup",
      descricao: "Guarde uma cópia dos seus dados fora do celular.",
      feito: backup.ultimoBackup !== null,
      destino: "/vanzeiro/perfil",
      essencial: false,
    },
  ];
}

/** O guia aparece enquanto faltar algum passo essencial e a pessoa não o tiver escondido. */
export const guiaVisivel = (passos: Passo[], escondido: boolean) =>
  !escondido && passos.some((p) => p.essencial && !p.feito);
