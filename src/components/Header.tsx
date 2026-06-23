import Link from "next/link";
import { BioFidoLogo } from "./Logo";
import { UserMenu } from "./UserMenu";

const nav = [
  { href: "/#mappa", label: "Mappa" },
  { href: "/#come-funziona", label: "Come funziona" },
  { href: "/servizi-extra", label: "Servizi extra" },
  { href: "/abbonamenti", label: "Abbonamenti" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e3eed7] bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="BioFido home" className="inline-flex items-center">
          <BioFidoLogo height={48} />
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Tasto "Vai su ECO-VISA" sempre visibile, anche nell'app/mobile */}
          <a
            href="https://ecovisa.it"
            target="_blank"
            rel="noopener noreferrer"
            title="Vai su ECO-VISA"
            className="inline-flex items-center gap-1.5 rounded-full border border-green-700 px-2.5 py-1 text-xs font-bold text-green-800 hover:bg-leaf"
          >
            <svg width={18} height={18} viewBox="0 0 64 64" aria-hidden>
              <defs>
                <linearGradient id="ev-hdr" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#8cc63f" />
                  <stop offset="1" stopColor="#327413" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="url(#ev-hdr)" />
              <g fill="none" stroke="#eaffd6" strokeWidth="2" opacity="0.85">
                <ellipse cx="32" cy="32" rx="12" ry="28" />
                <line x1="4" y1="32" x2="60" y2="32" />
              </g>
              <path d="M32 16c10 4 14 12 12 22-10 2-18-4-18-14 0-3 2-6 6-8z" fill="#eaffd6" opacity="0.95" />
            </svg>
            ECO-VISA
          </a>
          <nav className="hidden items-center gap-5 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm font-semibold text-green-800 hover:text-lime-500"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
