import Link from "next/link";
import { BioFidoLogo } from "./Logo";
import { InstallApp } from "./InstallApp";
import { LEGALE } from "@/lib/legale";
import { URL_ECOVISA } from "@/lib/portale";

// ECO-VISA è il portale "madre" di BioFido: le legende rimandano alle sue pagine
// sul dominio ufficiale ecovisa.it (NON al mirror github).
const ECOVISA = URL_ECOVISA;

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[#e3eed7] bg-leaf">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <BioFidoLogo height={52} />
          <p className="mt-3 max-w-sm text-sm text-green-900/80">
            BioFido è il segugio del biologico: annusa per te produttori, negozi
            e attività bio vicino alla tua posizione, fino a 70 km, e ti guida
            fin lì. Spesa a chilometro zero, filiera corta.
          </p>
          {/* installazione disponibile in qualsiasi momento, anche dopo il popup */}
          <InstallApp />
          {/* logo ECO-VISA cliccabile (senza cornice) → portale madre */}
          <a
            href={ECOVISA}
            target="_blank"
            rel="noopener noreferrer"
            title="Vai su ECO-VISA"
            className="mt-5 inline-flex items-center gap-2 text-green-800 hover:text-lime-600"
          >
            <svg width={26} height={26} viewBox="0 0 64 64" aria-hidden>
              <defs>
                <linearGradient id="ev-ftr" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#8cc63f" />
                  <stop offset="1" stopColor="#327413" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="url(#ev-ftr)" />
              <g fill="none" stroke="#eaffd6" strokeWidth="2" opacity="0.85">
                <ellipse cx="32" cy="32" rx="12" ry="28" />
                <line x1="4" y1="32" x2="60" y2="32" />
              </g>
              <path d="M32 16c10 4 14 12 12 22-10 2-18-4-18-14 0-3 2-6 6-8z" fill="#eaffd6" opacity="0.95" />
            </svg>
            <span className="font-display text-lg">ECO-VISA</span>
          </a>
        </div>
        <div>
          <h4 className="label mb-2">App</h4>
          <ul className="space-y-1 text-sm">
            <li><Link href="/#mappa" className="hover:text-lime-500">Mappa attività bio</Link></li>
            <li><Link href="/bio" className="hover:text-lime-500">Attività bio per città</Link></li>
            <li><Link href="/registrati" className="hover:text-lime-500">Iscrivi la tua attività</Link></li>
            <li><Link href="/accedi" className="hover:text-lime-500">Area aziende</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="label mb-2">Progetto</h4>
          <ul className="space-y-1 text-sm">
            <li>
              <a href={ECOVISA} className="hover:text-lime-500" target="_blank" rel="noopener noreferrer">
                Spesa a chilometro zero
              </a>
            </li>
            <li>
              <a href={`${ECOVISA}/calcola/`} className="hover:text-lime-500" target="_blank" rel="noopener noreferrer">
                Come si calcola l&apos;impronta del trasporto
              </a>
            </li>
            <li>
              <a href={`${ECOVISA}/abbonamenti/`} className="hover:text-lime-500" target="_blank" rel="noopener noreferrer">
                Il progetto Pangea Etico
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#dceac9] py-4 text-center text-xs text-green-900/60">
        Tutti i diritti sono riservati - Ligusto Srl 2026 ·{" "}
        <a href={LEGALE.privacy} className="hover:text-lime-500 hover:underline" target="_blank" rel="noopener noreferrer">
          Privacy e cookie
        </a>{" "}
        ·{" "}
        <a href={LEGALE.recesso} className="hover:text-lime-500 hover:underline" target="_blank" rel="noopener noreferrer">
          Diritto di recesso e cancellazione account
        </a>{" "}
        ·{" "}
        <a href={LEGALE.terminiVendita} className="hover:text-lime-500 hover:underline" target="_blank" rel="noopener noreferrer">
          Termini di vendita
        </a>{" "}
        ·{" "}
        <a href={LEGALE.condizioniVenditori} className="hover:text-lime-500 hover:underline" target="_blank" rel="noopener noreferrer">
          Condizioni per i venditori
        </a>{" "}
        · Mappe © OpenStreetMap
      </div>
    </footer>
  );
}
