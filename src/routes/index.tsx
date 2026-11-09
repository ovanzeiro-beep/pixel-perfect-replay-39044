import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "O Vanzeiro — Sua van organizada, sem caderno" }, { name: "description", content: "Passageiros, viagens, rotas e cobranças da sua van em um só lugar." }, { property: "og:title", content: "O Vanzeiro — Sua van organizada, sem caderno" }, { property: "og:description", content: "Passageiros, viagens, rotas e cobranças da sua van em um só lugar." }] }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-primary px-6 py-12 text-primary-foreground">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="rounded-[2rem] bg-background p-6 shadow-xl"><LogoIcon className="h-28 w-28" /></div>
        <h1 className="mt-8 text-5xl font-extrabold tracking-tight">O <span className="text-accent">Vanzeiro</span></h1>
        <p className="mt-4 text-xl opacity-90">Sua van organizada, sem caderno</p>
      </div>
      <Link to="/perfil" className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-background text-lg font-bold text-foreground shadow-lg">
        <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35 44 30 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
        Entrar com Google
      </Link>
      <p className="mt-4 text-center text-sm opacity-70">Versão de teste — o login ainda é simulado.</p>
    </div>
  );
}
