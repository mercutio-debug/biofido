import Link from "next/link";

/** Logo ECO-VISA: globo + foglia, ispirato al globo Pangea del PDF. */
export function EcoVisaLogo({ size = 38 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id="ev-globe" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8cc63f" />
            <stop offset="1" stopColor="#327413" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#ev-globe)" />
        {/* meridiani / paralleli */}
        <g fill="none" stroke="#eaffd6" strokeWidth="1.6" opacity="0.85">
          <ellipse cx="32" cy="32" rx="12" ry="28" />
          <ellipse cx="32" cy="32" rx="24" ry="28" />
          <line x1="4" y1="32" x2="60" y2="32" />
          <path d="M8 20 H56 M8 44 H56" />
        </g>
        {/* foglia */}
        <path
          d="M32 16c10 4 14 12 12 22-10 2-18-4-18-14 0-3 2-6 6-8z"
          fill="#eaffd6"
          opacity="0.95"
        />
        <path d="M30 38c2-8 6-12 12-15" stroke="#327413" strokeWidth="1.6" fill="none" />
      </svg>
      <span className="leading-none">
        <span className="font-display text-2xl tracking-tight text-green-800">
          ECO
        </span>
        <span className="font-display text-2xl tracking-tight text-lime-500">
          -VISA
        </span>
      </span>
    </span>
  );
}

/**
 * Badge BioFido — scudo "stile Superman" con "Bio" + foglia,
 * ricreato in SVG a partire dal logo originale (osso + scudo a diamante).
 */
export function BioFidoBadge({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="BioFido">
      <defs>
        <linearGradient id="bf-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7d417" />
          <stop offset="1" stopColor="#f2a200" />
        </linearGradient>
      </defs>
      {/* contorno rosso del diamante (mantello) */}
      <path
        d="M50 6 L92 34 L50 96 L8 34 Z"
        fill="#e8332a"
        stroke="#b71c12"
        strokeWidth="2"
      />
      {/* scudo giallo interno */}
      <path d="M50 16 L82 36 L50 86 L18 36 Z" fill="url(#bf-shield)" />
      {/* foglia bio */}
      <g transform="translate(50 44)">
        <path
          d="M0 -12c9 3 13 11 11 19-9 1-16-4-16-12 0-2 2-5 5-7z"
          fill="#4a8f1e"
        />
        <path d="M-2 6c1-7 5-11 10-14" stroke="#2f6f12" strokeWidth="1.6" fill="none" />
      </g>
      <text
        x="50"
        y="40"
        textAnchor="middle"
        fontFamily="Anton, Impact, sans-serif"
        fontSize="15"
        fill="#7a1f00"
      >
        Bio
      </text>
    </svg>
  );
}

/**
 * Logo BioFido completo, fedele all'originale di Maurizio:
 * scudo/mantello rosso con diamante giallo + foglia e scritta "Bio",
 * combinato con l'osso bianco su cui è scritto "fido".
 */
export function BioFidoLogo({ height = 46 }: { height?: number }) {
  const w = (height * 260) / 160;
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 260 160"
      aria-label="BioFido"
      role="img"
    >
      <defs>
        <linearGradient id="bf-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe45c" />
          <stop offset="1" stopColor="#f2a200" />
        </linearGradient>
      </defs>

      {/* scudo rosso (mantello) */}
      <rect
        x="82" y="30" width="96" height="96" rx="18"
        transform="rotate(45 130 78)"
        fill="#e2231a" stroke="#b71c12" strokeWidth="3"
      />
      {/* diamante giallo interno */}
      <rect
        x="93" y="41" width="74" height="74" rx="12"
        transform="rotate(45 130 78)"
        fill="url(#bf-gold)"
      />
      {/* foglia bio */}
      <path d="M130 46 C141 49 145 60 138 71 C127 69 123 57 130 46 Z" fill="#4a8f1e" />
      <path d="M131 50 C131 58 131 65 134 70" stroke="#2f6f12" strokeWidth="1.5" fill="none" />
      {/* scritta "Bio" */}
      <text
        x="130" y="100" textAnchor="middle"
        fontFamily="Anton, Impact, sans-serif" fontSize="30" fill="#2f6f12"
      >
        Bio
      </text>

      {/* osso con "fido" */}
      <g transform="translate(130 138) rotate(-7)">
        {/* contorno grigio (osso leggermente più grande, fa da bordo) */}
        <g fill="#cdd3c7" transform="scale(1.07)">
          <rect x="-58" y="-13" width="116" height="26" rx="13" />
          <circle cx="-58" cy="-9" r="15" />
          <circle cx="-58" cy="9" r="15" />
          <circle cx="58" cy="-9" r="15" />
          <circle cx="58" cy="9" r="15" />
        </g>
        {/* osso bianco */}
        <g fill="#ffffff">
          <rect x="-58" y="-13" width="116" height="26" rx="13" />
          <circle cx="-58" cy="-9" r="15" />
          <circle cx="-58" cy="9" r="15" />
          <circle cx="58" cy="-9" r="15" />
          <circle cx="58" cy="9" r="15" />
        </g>
        <text
          x="0" y="9" textAnchor="middle"
          fontFamily="Anton, Impact, sans-serif" fontSize="28" fontStyle="italic"
          fill="#2f6f12"
        >
          fido
        </text>
      </g>
    </svg>
  );
}

export function BioFidoWordmark() {
  return (
    <Link href="/biofido" className="inline-flex items-center gap-2">
      <BioFidoBadge size={34} />
      <span className="font-display text-2xl">
        <span className="text-cape-red">Bio</span>
        <span className="text-green-700">fido</span>
      </span>
    </Link>
  );
}
