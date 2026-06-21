import Link from "next/link";
import { BioFidoLogo } from "./Logo";
import { InstallApp } from "./InstallApp";
import { LEGALE } from "@/lib/legale";

// ECO-VISA è il portale "madre" di BioFido: le legende rimandano alle sue pagine.
const ECOVISA = "https://mercutio-debug.github.io/eco-visa";

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
        </div>
        <div>
          <h4 className="label mb-2">App</h4>
          <ul className="space-y-1 text-sm">
            <li><Link href="/#mappa" className="hover:text-lime-500">Mappa attività bio</Link></li>
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
                Come si calcola l&apos;impronta ecologica
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
