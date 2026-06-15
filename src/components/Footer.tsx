import Link from "next/link";
import { BioFidoBadge } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[#e3eed7] bg-leaf">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="inline-flex items-center gap-2">
            <BioFidoBadge size={34} />
            <span className="font-display text-2xl">
              <span className="text-cape-red">Bio</span>
              <span className="text-green-700">fido</span>
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-green-900/80">
            BioFido è il segugio del biologico: annusa per te produttori, negozi
            e attività bio vicino alla tua posizione, fino a 70 km, e ti guida
            fin lì. Spesa a chilometro zero, filiera corta.
          </p>
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
          <ul className="space-y-1 text-sm text-green-900/80">
            <li>Chilometro zero</li>
            <li>Filiera corta</li>
            <li>Biologico certificato</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#dceac9] py-4 text-center text-xs text-green-900/60">
        © 2026 BioFido — parte del progetto Pangea Etico. Mappe © OpenStreetMap.
      </div>
    </footer>
  );
}
