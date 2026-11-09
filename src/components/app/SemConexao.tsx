import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/pwa";

/** Faixa discreta quando o aparelho está sem internet: o app segue funcionando com os dados do aparelho. */
export function SemConexao() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-accent-foreground shadow-lg">
      <WifiOff className="h-5 w-5 shrink-0" />
      <p className="text-sm font-bold leading-snug">Sem internet. O app continua funcionando com os dados salvos neste aparelho.</p>
    </div>
  );
}
