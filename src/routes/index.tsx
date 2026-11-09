import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Route as RouteIcon, ShieldCheck, Wallet } from "lucide-react";
import { LogoIcon } from "@/components/app/Logo";
import { InstalarApp } from "@/components/app/InstalarApp";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "O Vanzeiro — Sua van organizada, sem caderno" }, { name: "description", content: "Passageiros, viagens, rotas e cobranças da sua van em um só lugar." }, { property: "og:title", content: "O Vanzeiro — Sua van organizada, sem caderno" }, { property: "og:description", content: "Passageiros, viagens, rotas e cobranças da sua van em um só lugar." }] }),
  component: Index,
});

const beneficios = [
  { icon: CalendarCheck, texto: "Viagens e presenças em dia" },
  { icon: RouteIcon, texto: "Ida, paradas e volta no celular" },
  { icon: Wallet, texto: "Cobranças e gastos organizados" },
];

function Index() {
  return (
    <div className="login-fundo relative isolate flex min-h-[100dvh] flex-col overflow-hidden text-white">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-sky-300/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-32 bottom-1/3 -z-10 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="animar-entrada relative">
            <div aria-hidden className="absolute inset-0 -z-10 scale-110 rounded-[2.5rem] bg-sky-300/30 blur-2xl" />
            <LogoIcon className="h-36 w-36 drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]" />
          </div>
          <h1 className="animar-entrada mt-8 text-5xl font-extrabold tracking-tight [animation-delay:80ms]">
            O <span className="text-accent">Vanzeiro</span>
          </h1>
          <p className="animar-entrada mt-3 text-lg text-white/80 [animation-delay:140ms]">Sua van organizada, sem caderno</p>

          <ul className="animar-entrada mt-9 w-full space-y-3 text-left [animation-delay:220ms]">
            {beneficios.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-semibold">{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="animar-entrada mt-8 space-y-4 [animation-delay:300ms]">
          <InstalarApp />
          <Link
            to="/perfil"
            className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white text-lg font-bold text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition active:scale-[0.99]"
          >
            <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35 44 30 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
            Entrar com Google
          </Link>
          <p className="flex items-center justify-center gap-2 text-center text-sm text-white/60">
            <ShieldCheck className="h-4 w-4" /> Versão de teste — o login ainda é simulado.
          </p>
        </div>
      </div>
    </div>
  );
}
