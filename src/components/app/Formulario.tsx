import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

export function Painel({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 mx-auto max-w-md overflow-y-auto bg-background pb-10">
      <div className="sticky top-0 flex items-center gap-3 border-b bg-card px-4 py-3">
        <button onClick={onFechar} aria-label="Voltar" className="flex h-12 w-12 items-center justify-center rounded-xl text-primary"><ArrowLeft className="h-6 w-6" /></button>
        <h2 className="text-xl font-extrabold text-primary">{titulo}</h2>
      </div>
      <div className="space-y-4 px-5 pt-5">{children}</div>
    </div>
  );
}

export function Campo({ label, erro, obrigatorio, children }: { label: string; erro?: string; obrigatorio?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-base font-bold">{label}{obrigatorio && <span className="text-destructive"> *</span>}</span>
      {children}
      {erro && <span className="mt-1 block text-base font-semibold text-destructive">{erro}</span>}
    </label>
  );
}

export const campoClasse = "w-full min-h-14 rounded-2xl border-2 bg-card px-4 text-lg outline-none focus:border-primary";

export function BotaoGrande({ children, onClick, variante = "primario", type = "button" }: { children: ReactNode; onClick?: () => void; variante?: "primario" | "contorno" | "perigo" | "destaque"; type?: "button" | "submit" }) {
  const v = {
    primario: "bg-primary text-primary-foreground",
    destaque: "bg-accent text-accent-foreground",
    contorno: "border-2 border-primary text-primary bg-card",
    perigo: "border-2 border-destructive text-destructive bg-card",
  }[variante];
  return <button type={type} onClick={onClick} className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold ${v}`}>{children}</button>;
}

export function Confirmar({ titulo, texto, onSim, onNao, children }: { titulo: string; texto: string; onSim: () => void; onNao: () => void; children?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-6">
        <div className="flex items-start justify-between"><h3 className="text-xl font-extrabold">{titulo}</h3><button onClick={onNao} aria-label="Fechar"><X className="h-6 w-6" /></button></div>
        <p className="mt-2 text-lg text-muted-foreground">{texto}</p>
        {children}
        <div className="mt-5 space-y-3">
          <button onClick={onSim} className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-destructive text-lg font-bold text-destructive-foreground">Sim, excluir</button>
          <BotaoGrande variante="contorno" onClick={onNao}>Cancelar</BotaoGrande>
        </div>
      </div>
    </div>
  );
}

export function Linha({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-3 text-lg"><span className="text-muted-foreground">{rotulo}</span><span className="text-right font-bold">{valor || "—"}</span></div>
  );
}
