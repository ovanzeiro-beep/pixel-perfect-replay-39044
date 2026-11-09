import { useId } from "react";

/** Emblema do app: van + pino de rota sobre fundo azul. Cores fixas para funcionar também como ícone. */
export function LogoIcon({ className = "h-12 w-12", plano = false }: { className?: string; plano?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const bg = `bg${uid}`;
  const pin = `pin${uid}`;
  const mask = `mk${uid}`;
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="O Vanzeiro">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2F66A3" />
          <stop offset="1" stopColor="#0F2A47" />
        </linearGradient>
        <linearGradient id={pin} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC24A" />
          <stop offset="1" stopColor="#F28C00" />
        </linearGradient>
        <clipPath id={`cp${uid}`}>
          <rect width="512" height="512" rx="116" />
        </clipPath>
        <mask id={mask}>
          <rect width="512" height="512" fill="#fff" />
          <circle cx="176" cy="342" r="46" fill="#000" />
          <circle cx="346" cy="342" r="46" fill="#000" />
        </mask>
      </defs>
      {!plano && <rect width="512" height="512" rx="116" fill={`url(#${bg})`} />}
      {!plano && <path clipPath={`url(#cp${uid})`} d="M0 330C120 270 250 400 512 300V512H0Z" fill="#fff" opacity=".05" />}

      <path d="M70 410h372" stroke="#fff" strokeOpacity=".35" strokeWidth="10" strokeLinecap="round" strokeDasharray="2 26" />

      <g mask={`url(#${mask})`}>
        <path
          d="M104 332V236a36 36 0 0 1 36-36h180c15 0 28 7 36 19l44 62c5 7 8 15 8 24v27a12 12 0 0 1-12 12H116a12 12 0 0 1-12-12Z"
          fill="#fff"
        />
        <rect x="104" y="288" width="298" height="16" fill="#FFB020" />
        <rect x="132" y="226" width="52" height="42" rx="8" fill="#BFD9F2" />
        <rect x="194" y="226" width="52" height="42" rx="8" fill="#BFD9F2" />
        <rect x="256" y="226" width="52" height="42" rx="8" fill="#BFD9F2" />
        <path d="M320 226h14c6 0 10 2 13 7l23 35h-50z" fill="#BFD9F2" />
      </g>

      <circle cx="176" cy="342" r="34" fill="#0B1F34" />
      <circle cx="176" cy="342" r="14" fill="#E8EEF5" />
      <circle cx="346" cy="342" r="34" fill="#0B1F34" />
      <circle cx="346" cy="342" r="14" fill="#E8EEF5" />

      <path
        d="M392 62c-31 0-56 24-56 55 0 40 56 94 56 94s56-54 56-94c0-31-25-55-56-55Z"
        fill={`url(#${pin})`}
        stroke="#0F2A47"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <circle cx="392" cy="116" r="19" fill="#fff" />
    </svg>
  );
}

export function Logo({ size = "md", tema = "claro" }: { size?: "md" | "lg"; tema?: "claro" | "escuro" }) {
  const lg = size === "lg";
  const escuro = tema === "escuro";
  return (
    <div className="flex items-center gap-3">
      <LogoIcon className={lg ? "h-20 w-20 drop-shadow-lg" : "h-10 w-10"} />
      <span className={`font-extrabold tracking-tight ${lg ? "text-4xl" : "text-xl"} ${escuro ? "text-white" : "text-primary"}`}>
        O <span className={escuro ? "text-accent" : "text-accent-strong"}>Vanzeiro</span>
      </span>
    </div>
  );
}
