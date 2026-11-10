// Textos prontos para compartilhar (WhatsApp): a lista da viagem e o resumo da viagem concluída.
import type { Linha, Motorista, Passageiro, Van } from "./tipos";
import { brl } from "./cobrancas";
import { diaSemana, dataCurta, horaDe, ordenarParadas, type Ida, type Viagem } from "./viagens";
import { estatisticasIda } from "./historico";
import { enderecoCompleto } from "@/lib/validacao";

type DadosManifesto = {
  viagem: Viagem;
  linha: Linha | undefined;
  van: Van | undefined;
  motorista: Motorista | undefined;
  passageiros: Passageiro[];
};

const quandoTexto = (data: string) => `${diaSemana(data).toLowerCase()}, ${dataCurta(data)}`;

/** Lista da viagem: quem vai (na ordem do trajeto), com telefone e endereço, mais lista de espera e quem não respondeu. */
export function textoManifesto({
  viagem: v,
  linha,
  van,
  motorista,
  passageiros,
}: DadosManifesto): string {
  const pas = (id: string) => passageiros.find((p) => p.id === id);
  const nome = (id: string) => pas(id)?.nome ?? "Passageiro";
  const vao = ordenarParadas(
    v.vao.filter((id) => pas(id)),
    (id) => pas(id)?.cidade ?? "",
    linha?.paradas ?? [],
  );
  const linhas: string[] = [
    `*Lista da viagem — ${linha?.nome ?? "Viagem"}*`,
    `${quandoTexto(v.data)} · saída ${v.saida}${v.volta ? ` · volta ${v.volta}` : ""}`,
    `Van: ${van ? `${van.apelido} (${van.placa})` : "sem van"} · Motorista: ${motorista?.nome ?? "sem motorista"}`,
    `Confirmados: ${vao.length}${v.lugares ? ` de ${v.lugares} lugares` : ""}`,
    "",
  ];
  if (vao.length === 0) linhas.push("Ninguém confirmou ainda.");
  vao.forEach((id, i) => {
    const p = pas(id)!;
    linhas.push(`${i + 1}. ${p.nome} — ${p.telefone}`);
    linhas.push(`   ${enderecoCompleto(p)}${p.referencia ? ` (${p.referencia})` : ""}`);
  });
  const espera = v.espera.filter((id) => pas(id));
  if (espera.length)
    linhas.push(
      "",
      `*Lista de espera:* ${espera.map((id, i) => `${i + 1}º ${nome(id)}`).join(", ")}`,
    );
  const sem = v.sem.filter((id) => pas(id));
  if (sem.length) linhas.push("", `*Sem resposta:* ${sem.map(nome).join(", ")}`);
  return linhas.join("\n");
}

/** Resumo da viagem já encerrada. */
export function textoResumoViagem({
  linhaNome,
  data,
  ida,
  passageiros,
}: {
  linhaNome: string;
  data: string;
  ida: Ida;
  passageiros: Passageiro[];
}): string {
  const nome = (id: string) => passageiros.find((p) => p.id === id)?.nome ?? "Passageiro";
  const s = estatisticasIda(ida);
  const volta = ida.volta;
  const faltaram = ida.marcas.filter((m) => m.r === "faltou").map((m) => nome(m.pid));
  const naoVoltaram = volta
    ? Object.entries(volta.status).flatMap(([pid, st]) =>
        st.r === "nao" ? [`${nome(pid)} (${st.motivo || "sem motivo"})`] : [],
      )
    : [];
  const linhas = [
    `*Viagem concluída — ${linhaNome}*`,
    `${quandoTexto(data)} · saída ${ida.inicio ? horaDe(ida.inicio) : "—"} · chegada ${ida.encerrada ? horaDe(ida.encerrada) : "—"}`,
    `Embarcaram: ${s.embarcaram} · Entregues: ${s.entregues}`,
    `Total cobrado na viagem: ${brl(s.total)}`,
  ];
  if (faltaram.length) linhas.push(`Não apareceram: ${faltaram.join(", ")}`);
  if (naoVoltaram.length) linhas.push(`Não voltaram: ${naoVoltaram.join(", ")}`);
  if (s.paradas) linhas.push(`Paradas feitas: ${s.paradas}`);
  return linhas.join("\n");
}
