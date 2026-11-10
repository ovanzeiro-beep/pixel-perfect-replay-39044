import { Navigation } from "lucide-react";
import { linkGoogleMaps, linkWaze } from "@/lib/navegacao";

/** Dois botões para navegar até o endereço: Google Maps ou Waze (o motorista escolhe o que usa). */
export function NavegarCom({
  endereco,
  rotulo = "Navegar",
}: {
  endereco: string;
  rotulo?: string;
}) {
  const base =
    "flex min-h-16 flex-col items-center justify-center rounded-2xl text-lg font-extrabold leading-tight";
  return (
    <div role="group" aria-label={rotulo} className="grid grid-cols-2 gap-3">
      <a
        href={linkGoogleMaps(endereco)}
        target="_blank"
        rel="noreferrer"
        aria-label={`${rotulo} com Google Maps`}
        className={`${base} bg-primary text-primary-foreground`}
      >
        <Navigation className="h-6 w-6" /> Google Maps
      </a>
      <a
        href={linkWaze(endereco)}
        target="_blank"
        rel="noreferrer"
        aria-label={`${rotulo} com Waze`}
        className={`${base} bg-[#33CCFF] text-slate-900`}
      >
        <Navigation className="h-6 w-6" /> Waze
      </a>
    </div>
  );
}
