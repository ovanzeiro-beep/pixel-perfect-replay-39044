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
import type { Estado, Linha, Motorista, Passageiro, Van } from "./store";
import type { Forma, Recibo } from "./cobrancas";
import type { Gasto } from "./financeiro";
import type { Ajuste, Viagem } from "./viagens";

export type { Estado, Linha, Motorista, Passageiro, Van };
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
  /** Grava o ajuste de uma viagem (respostas, van/motorista da viagem, ida, volta, cancelamento). */
  ajustarViagem(viagemId: string, ajuste: Ajuste): void;
  responderViagemApp(passageiroId: string, viagemId: string, vai: boolean): void;
  confirmarParadaApp(passageiroId: string, viagemId: string): void;
  responderVoltaApp(passageiroId: string, viagemId: string, naVan: boolean, motivo?: string): void;

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
  obterEstado: mock.obterEstado,
  iniciarPersistencia: mock.iniciarPersistencia,
  restaurarExemplo: mock.restaurarExemplo,
  substituirTodosOsDados: mock.substituirTodosOsDados,
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
  ajustarViagem: mock.ajustarViagem,
  responderViagemApp: mock.responderViagemApp,
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
  obterEstado,
  iniciarPersistencia,
  restaurarExemplo,
  substituirTodosOsDados,
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
  ajustarViagem,
  responderViagemApp,
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
