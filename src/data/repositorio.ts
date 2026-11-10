/**
 * REPOSITÓRIO: o ponto único de acesso aos dados do app.
 *
 * Telas e componentes importam os dados SÓ daqui (nunca de `./store`). Hoje o contrato é cumprido pelo
 * mock (`store.ts`: dados de exemplo salvos no aparelho). Quando entrar o banco de dados, uma nova
 * implementação cumpre o mesmo contrato e é trocada AQUI, sem mexer nas telas. Veja docs/MIGRACAO_BANCO.md.
 *
 * Regras para manter o contrato saudável (um teste confere):
 *  - toda operação nova do mock entra no contrato `Repositorio` abaixo;
 *  - nenhuma tela importa `./store` direto.
 */
import * as mock from "./store";
import type { Estado, Linha, Motorista, Passageiro, PerfilVanzeiro, Van } from "./store";
import type { Forma, Recibo } from "./cobrancas";
import type { Gasto } from "./financeiro";
import type { StatusVolta, Viagem } from "./viagens";
import type { ConvitePreview, VisaoPassageiro } from "./visaoPassageiro";

export type { Estado, Linha, Motorista, Passageiro, PerfilVanzeiro, Van };
export type {
  ConvitePreview,
  MinhaIda,
  MinhaLinha,
  MinhaViagem,
  VisaoPassageiro,
} from "./visaoPassageiro";
// Regras e listas de domínio (não são acesso a dados): continuam saindo do mesmo lugar para as telas.
export { TIPOS_LINHA, DIAS, estaDevendo } from "./store";

/** Novo cadastro (sem `id`) ou edição (com `id`). */
type Salvar<T, Fora extends PropertyKey = never> = Omit<T, Fora | "id"> & {
  id?: string | undefined;
};

/**
 * Leitura. Hoje são hooks do React que devolvem sempre o dado atual e re-renderizam quando ele muda.
 * Com banco, a mesma assinatura se mantém por cima de um cache (o projeto já tem react-query).
 */
export interface Leitura {
  /** Todos os dados do vanzeiro: vans, motoristas, linhas, passageiros, cobranças, recibos, gastos, viagens ajustadas. */
  useFrota(): Estado;
  /** Viagens calculadas a partir das linhas (próximas e passadas), já com as respostas dos passageiros. */
  useViagens(): Viagem[];
  /** Fica verdadeiro quando os dados do aparelho/banco terminaram de carregar. */
  useDadosProntos(): boolean;
  /** Dados do próprio vanzeiro (nome, cidade, telefone...) e se o primeiro acesso já foi concluído. */
  useVanzeiro(): PerfilVanzeiro;
  /**
   * O que UM passageiro pode ver: o cadastro dele, as linhas e viagens dele, as cobranças e recibos dele.
   * É a ÚNICA leitura das telas do passageiro: nenhum dado de outro passageiro chega ao aparelho dele.
   */
  usePassageiroVisao(passageiroId: string): VisaoPassageiro;
  /** Prévia do convite (tela aberta antes do login): existe, é válido e se já entrou no app. Sem dados pessoais. */
  useConvite(passageiroId: string): ConvitePreview;
  /** Leitura pontual, fora de componentes (testes, funções). */
  obterEstado(): Estado;
}

/**
 * Escrita. No mock tudo é síncrono. Com banco, cada operação vira assíncrona (Promise): as que devolvem valor
 * (`salvarPassageiro` → id, `marcarPagamento` → recibo, `lancarCobranca` → boolean) passam a devolver Promise do mesmo valor.
 */
export interface Escrita {
  // --- Ciclo de vida
  /** Carrega os dados salvos e passa a salvar a cada mudança. Devolve a função que para de salvar. */
  iniciarPersistencia(): () => void;
  /** Volta tudo aos dados de exemplo (modo teste). */
  restaurarExemplo(): void;
  /** Troca todos os dados de uma vez: restaurar um backup ou desfazer uma restauração. */
  substituirTodosOsDados(estado: Estado): void;
  /** Apaga tudo e volta ao primeiro acesso (conta vazia). Guarde antes uma cópia de segurança. */
  comecarDoZero(): void;

  // --- Perfil do vanzeiro
  /** Salva os dados do vanzeiro e conclui o primeiro acesso; cria/atualiza também o motorista "próprio". */
  salvarPerfil(perfil: Omit<PerfilVanzeiro, "configurado">): void;

  // --- Vans e motoristas
  salvarVan(van: Salvar<Van>): void;
  excluirVan(id: string): void;
  salvarMotorista(motorista: Salvar<Motorista, "proprio">): void;
  /** O próprio vanzeiro (motorista `proprio`) não pode ser excluído. */
  excluirMotorista(id: string): void;

  // --- Linhas
  salvarLinha(linha: Salvar<Linha>): void;
  alternarLinha(id: string): void;
  /** Some da linha, suas viagens e deixa gastos/cobranças dela sem linha. */
  excluirLinha(id: string): void;
  colocarNaLinha(linhaId: string, passageiroIds: string[]): void;
  tirarDaLinha(passageiroId: string, linhaId: string): void;

  // --- Passageiros
  /** Devolve o id do passageiro salvo. */
  salvarPassageiro(passageiro: Salvar<Passageiro>): string;
  atualizarPassageiro(id: string, mudancas: Partial<Passageiro>): void;
  /** Guarda o histórico e a dívida; sai das linhas. */
  desativarPassageiro(id: string): void;
  /** Apaga o passageiro e tudo dele: cobranças, recibos e marcações em viagens. */
  excluirPassageiro(id: string): void;
  aceitarConvite(passageiroId: string): void;

  // --- Viagens
  // Operações PEQUENAS: cada uma mexe só no que é dela, sobre o dado mais recente (ninguém grava a viagem inteira).
  // Assim passageiro e vanzeiro mexendo ao mesmo tempo não apagam o trabalho um do outro.
  // As que devolvem `false` não encontraram a viagem ou não tinham o que mudar.

  // O passageiro, pelo app
  /** Devolve `false` se o prazo de confirmação já acabou (o passageiro não muda mais; o vanzeiro ajusta em `definirRespostaDoPassageiro`). */
  responderViagemApp(passageiroId: string, viagemId: string, vai: boolean): boolean;
  confirmarParadaApp(passageiroId: string, viagemId: string): boolean;
  responderVoltaApp(
    passageiroId: string,
    viagemId: string,
    naVan: boolean,
    motivo?: string,
  ): boolean;

  // O vanzeiro: a viagem em geral
  /** Marca Vai / Não vai / Sem resposta de um passageiro, respeitando lotação e fila de espera. `null`: viagem não encontrada. */
  definirRespostaDoPassageiro(
    viagemId: string,
    passageiroId: string,
    resposta: "vai" | "nao" | "sem",
  ): { foiParaEspera: boolean; subiu?: string } | null;
  adicionarExtraNaViagem(viagemId: string, passageiroId: string): boolean;
  cancelarViagem(viagemId: string): boolean;
  /** Troca o motorista e, se informada, a van da viagem (quem não cabe vai para a lista de espera). */
  trocarVanOuMotoristaDaViagem(viagemId: string, motoristaId: string, vanId?: string): boolean;

  // O vanzeiro: a ida
  iniciarIda(viagemId: string, ordem: string[]): boolean;
  /** Marca embarcou / não apareceu. Quem paga por viagem e embarcou recebe a cobrança NA MESMA operação. */
  marcarEmbarque(
    viagemId: string,
    passageiroId: string,
    resposta: "embarcou" | "faltou",
  ): { ok: boolean; cobrou: number };
  /** Desfaz a última marcação e a cobrança dela, NA MESMA operação. `cobrancaAchada: false` avisa que não havia cobrança a tirar. */
  desfazerUltimaMarcacaoDaIda(viagemId: string): { ok: boolean; cobrancaAchada: boolean };
  reordenarFaltamNaIda(viagemId: string, faltam: string[]): boolean;
  mudarFaseDaIda(viagemId: string, fase: "paradas" | "a_caminho" | "chegou"): boolean;
  iniciarVolta(viagemId: string): boolean;
  encerrarViagem(viagemId: string): boolean;

  // O vanzeiro: parada no caminho (na ida ou na volta)
  iniciarParada(viagemId: string, trecho: "ida" | "volta", minutos: number, local: string): boolean;
  /** Marca ou desmarca (`null`) quem está na van na parada, sem apagar o que os outros já marcaram. */
  marcarPresencasNaParada(
    viagemId: string,
    trecho: "ida" | "volta",
    mudancas: Record<string, "manual" | "app" | null>,
  ): boolean;
  pedirChamadaNaParada(viagemId: string, trecho: "ida" | "volta"): boolean;
  encerrarParada(viagemId: string, trecho: "ida" | "volta", motivo: string): boolean;

  // O vanzeiro: a volta
  /** Marca ou desmarca (`null`) quem volta na van, sem apagar o que os outros já responderam. */
  marcarStatusNaVolta(viagemId: string, mudancas: Record<string, StatusVolta | null>): boolean;
  iniciarEntregas(viagemId: string, ordem: string[]): boolean;
  /** Quem só volta entra na chamada; quem paga por viagem e ainda não foi cobrado recebe a cobrança NA MESMA operação. */
  adicionarExtraNaVolta(viagemId: string, passageiroId: string): { ok: boolean; cobrou: number };
  entregarNaVolta(
    viagemId: string,
    passageiroId: string,
    resposta: "entregue" | "outro",
    onde?: string,
  ): boolean;
  desfazerEntregaNaVolta(viagemId: string): boolean;
  reordenarEntregasDaVolta(viagemId: string, aindaNaVan: string[]): boolean;

  // --- Dinheiro
  /** Soma (valor > 0) ou tira (valor < 0) uma cobrança de viagem. Devolve false se não achou cobrança para tirar. */
  lancarCobranca(passageiroId: string, valor: number, linhaId?: string): boolean;
  /** Quita as cobranças mais antigas primeiro e devolve o recibo (ou null se não havia o que pagar). */
  marcarPagamento(
    passageiroId: string,
    valor: number,
    forma: Forma,
    data: string,
    soIds?: string[],
  ): Recibo | null;
  desfazerRecibo(numero: number): void;
  cancelarCob(cobrancaId: string, motivo: string): void;
  salvarChavePix(chave: string): void;
  salvarGasto(gasto: Salvar<Gasto>): void;
  excluirGasto(id: string): void;

  // --- Alertas
  dispensarAlerta(id: string, assinatura: string): void;
  restaurarAlertas(): void;
}

export type Repositorio = Leitura & Escrita;

/** A implementação em uso. Para trocar o mock pelo banco, é aqui que se muda. */
export const repositorio: Repositorio = {
  useFrota: mock.useFrota,
  useViagens: mock.useViagens,
  useDadosProntos: mock.useDadosProntos,
  useVanzeiro: mock.useVanzeiro,
  usePassageiroVisao: mock.usePassageiroVisao,
  useConvite: mock.useConvite,
  obterEstado: mock.obterEstado,
  iniciarPersistencia: mock.iniciarPersistencia,
  restaurarExemplo: mock.restaurarExemplo,
  substituirTodosOsDados: mock.substituirTodosOsDados,
  comecarDoZero: mock.comecarDoZero,
  salvarPerfil: mock.salvarPerfil,
  salvarVan: mock.salvarVan,
  excluirVan: mock.excluirVan,
  salvarMotorista: mock.salvarMotorista,
  excluirMotorista: mock.excluirMotorista,
  salvarLinha: mock.salvarLinha,
  alternarLinha: mock.alternarLinha,
  excluirLinha: mock.excluirLinha,
  colocarNaLinha: mock.colocarNaLinha,
  tirarDaLinha: mock.tirarDaLinha,
  salvarPassageiro: mock.salvarPassageiro,
  atualizarPassageiro: mock.atualizarPassageiro,
  desativarPassageiro: mock.desativarPassageiro,
  excluirPassageiro: mock.excluirPassageiro,
  aceitarConvite: mock.aceitarConvite,
  responderViagemApp: mock.responderViagemApp,
  definirRespostaDoPassageiro: mock.definirRespostaDoPassageiro,
  adicionarExtraNaViagem: mock.adicionarExtraNaViagem,
  cancelarViagem: mock.cancelarViagem,
  trocarVanOuMotoristaDaViagem: mock.trocarVanOuMotoristaDaViagem,
  iniciarIda: mock.iniciarIda,
  marcarEmbarque: mock.marcarEmbarque,
  desfazerUltimaMarcacaoDaIda: mock.desfazerUltimaMarcacaoDaIda,
  reordenarFaltamNaIda: mock.reordenarFaltamNaIda,
  mudarFaseDaIda: mock.mudarFaseDaIda,
  iniciarVolta: mock.iniciarVolta,
  encerrarViagem: mock.encerrarViagem,
  iniciarParada: mock.iniciarParada,
  marcarPresencasNaParada: mock.marcarPresencasNaParada,
  pedirChamadaNaParada: mock.pedirChamadaNaParada,
  encerrarParada: mock.encerrarParada,
  marcarStatusNaVolta: mock.marcarStatusNaVolta,
  iniciarEntregas: mock.iniciarEntregas,
  adicionarExtraNaVolta: mock.adicionarExtraNaVolta,
  entregarNaVolta: mock.entregarNaVolta,
  desfazerEntregaNaVolta: mock.desfazerEntregaNaVolta,
  reordenarEntregasDaVolta: mock.reordenarEntregasDaVolta,
  confirmarParadaApp: mock.confirmarParadaApp,
  responderVoltaApp: mock.responderVoltaApp,
  lancarCobranca: mock.lancarCobranca,
  marcarPagamento: mock.marcarPagamento,
  desfazerRecibo: mock.desfazerRecibo,
  cancelarCob: mock.cancelarCob,
  salvarChavePix: mock.salvarChavePix,
  salvarGasto: mock.salvarGasto,
  excluirGasto: mock.excluirGasto,
  dispensarAlerta: mock.dispensarAlerta,
  restaurarAlertas: mock.restaurarAlertas,
};

// As telas usam estas funções diretamente (import nomeado), todas vindas do `repositorio` acima.
export const {
  useFrota,
  useViagens,
  useDadosProntos,
  useVanzeiro,
  usePassageiroVisao,
  useConvite,
  obterEstado,
  iniciarPersistencia,
  restaurarExemplo,
  substituirTodosOsDados,
  comecarDoZero,
  salvarPerfil,
  salvarVan,
  excluirVan,
  salvarMotorista,
  excluirMotorista,
  salvarLinha,
  alternarLinha,
  excluirLinha,
  colocarNaLinha,
  tirarDaLinha,
  salvarPassageiro,
  atualizarPassageiro,
  desativarPassageiro,
  excluirPassageiro,
  aceitarConvite,
  responderViagemApp,
  definirRespostaDoPassageiro,
  adicionarExtraNaViagem,
  cancelarViagem,
  trocarVanOuMotoristaDaViagem,
  iniciarIda,
  marcarEmbarque,
  desfazerUltimaMarcacaoDaIda,
  reordenarFaltamNaIda,
  mudarFaseDaIda,
  iniciarVolta,
  encerrarViagem,
  iniciarParada,
  marcarPresencasNaParada,
  pedirChamadaNaParada,
  encerrarParada,
  marcarStatusNaVolta,
  iniciarEntregas,
  adicionarExtraNaVolta,
  entregarNaVolta,
  desfazerEntregaNaVolta,
  reordenarEntregasDaVolta,

  confirmarParadaApp,
  responderVoltaApp,
  lancarCobranca,
  marcarPagamento,
  desfazerRecibo,
  cancelarCob,
  salvarChavePix,
  salvarGasto,
  excluirGasto,
  dispensarAlerta,
  restaurarAlertas,
} = repositorio;
