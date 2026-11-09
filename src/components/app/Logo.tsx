export function LogoIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="4" y="22" width="50" height="26" rx="7" className="fill-primary" />
      <path d="M38 22h8c4 0 7 3 8 7l2 7v5H38z" className="fill-primary" />
      <rect x="10" y="27" width="10" height="8" rx="2" className="fill-primary-foreground" />
      <rect x="23" y="27" width="10" height="8" rx="2" className="fill-primary-foreground" />
      <path d="M40 27h5c2 0 3 1 4 3l1 5H40z" className="fill-primary-foreground" />
      <circle cx="16" cy="49" r="6" className="fill-foreground" />
      <circle cx="44" cy="49" r="6" className="fill-foreground" />
      <circle cx="16" cy="49" r="2.5" className="fill-background" />
      <circle cx="44" cy="49" r="2.5" className="fill-background" />
      <path d="M50 2c-6 0-10 4-10 9.5C40 18 50 26 50 26s10-8 10-14.5C60 6 56 2 50 2z" className="fill-accent" />
      <circle cx="50" cy="11.5" r="3.5" className="fill-background" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <LogoIcon className={lg ? "h-20 w-20" : "h-10 w-10"} />
      <span className={`font-extrabold tracking-tight text-primary ${lg ? "text-4xl" : "text-xl"}`}>
        O <span className="text-accent-strong">Vanzeiro</span>
      </span>
    </div>
  );
}
