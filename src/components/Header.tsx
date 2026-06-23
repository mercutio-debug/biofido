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
