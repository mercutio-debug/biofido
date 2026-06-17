import Link from "next/link";
import { BioFidoLogo } from "./Logo";

const nav = [
  { href: "/#mappa", label: "Mappa" },
  { href: "/#come-funziona", label: "Come funziona" },
  { href: "/abbonamenti", label: "Abbonamenti" },
  { href: "/prenotazioni", label: "Le mie prenotazioni" },
  { href: "/accedi", label: "Accedi" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e3eed7] bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="BioFido home" className="inline-flex items-center">
            <BioFidoLogo height={48} />
          </Link>
          <Link
            href="/accedi"
            title="Accesso amministratore"
            className="rounded-full border border-green-700 px-3 py-1 text-xs font-bold text-green-700 hover:bg-leaf"
          >
            🔐 Admin
          </Link>
        </div>
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
          <Link href="/registrati" className="btn-lime text-sm">
            Iscrivi la tua attività bio
          </Link>
        </nav>
        <Link href="/registrati" className="btn-lime text-xs lg:hidden">
          Iscrivi attività
        </Link>
      </div>
    </header>
  );
}
