import { Link, Outlet } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Logo } from "./Logo";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

export function AppShell({ items }: { items: NavItem[] }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Logo />
      </header>
      <main className="flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t bg-card pb-[env(safe-area-inset-bottom)]">
        <ul className="flex">
          {items.map((it) => (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                activeOptions={{ exact: it.exact ?? false }}
                className="flex min-h-[68px] flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground"
                activeProps={{ className: "text-primary [&_svg]:text-accent-strong" }}
              >
                <it.icon className="h-6 w-6" />
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
