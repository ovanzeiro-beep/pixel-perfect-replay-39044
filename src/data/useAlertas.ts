import { useEffect, useMemo, useState } from "react";
import { contarAtencao, filtrarDispensados, gerarAlertas } from "./alertas";
import { useBackupMeta } from "./backup";
import { useFrota, useViagens } from "./repositorio";

/** Alertas atuais do vanzeiro (sem os dispensados). Recalcula a cada minuto para o prazo andar sozinho. */
export function useAlertas() {
  const { motoristas, cobrancas, passageiros, linhas, alertasDispensados } = useFrota();
  const viagens = useViagens();
  const backup = useBackupMeta();
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    const todos = gerarAlertas({
      motoristas,
      cobrancas,
      passageiros,
      linhas,
      viagens,
      agora,
      backup,
    });
    const alertas = filtrarDispensados(todos, alertasDispensados);
    return { alertas, atencao: contarAtencao(alertas), dispensados: todos.length - alertas.length };
  }, [motoristas, cobrancas, passageiros, linhas, viagens, agora, backup, alertasDispensados]);
}
