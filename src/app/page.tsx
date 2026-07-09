import Image from "next/image";
import Link from "next/link";
import { MapExperience } from "@/components/MapExperience";
import { BioFidoLogo } from "@/components/Logo";
import { GoldPromoBanner } from "@/components/GoldPromoBanner";
import { OnboardingPromo } from "@/components/OnboardingPromo";
import { LegendaSemaforo } from "@/components/LegendaSemaforo";
import { InstallPopup } from "@/components/InstallPopup";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "https://biofido.it/" },
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <BioFidoLogo height={132} />
            <p className="mt-4 max-w-md text-lg text-green-900/80">
              Il segugio del biologico. Trova sulla mappa i produttori, i negozi
              e le attività bio <strong>vicino a te</strong> — fino a 70 km, il
              vero <strong>chilometro zero</strong> — e fatti guidare fin lì.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#mappa" className="btn-lime">🐾 Cerca bio vicino a me</a>
              <a
                href="https://ecovisa.it/calcola"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-lime-500 bg-white px-5 py-2.5 font-bold text-green-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-leaf"
              >
                <svg width="15" height="21" viewBox="0 0 15 21" aria-hidden="true" className="flex-none">
                  <rect x="1.5" y="1" width="12" height="19" rx="4.5" fill="#33402c" />
                  <circle cx="7.5" cy="6" r="2.3" fill="#e2231a" />
                  <circle cx="7.5" cy="10.5" r="2.3" fill="#f6c416" />
                  <circle cx="7.5" cy="15" r="2.3" fill="#45a82f" />
                </svg>
                Calcola il tuo semaforo della filiera
              </a>
              <Link href="/registrati" className="btn-ghost">Hai un&apos;attività? Iscriviti</Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border-4 border-cape-red shadow-lg">
            <Image
              src={`${BASE}/brand/biofido-logo.jpg`}
              alt="BioFido — il cane del biologico"
              width={669}
              height={669}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </section>

      {/* MAPPA */}
      <section id="mappa" className="mt-6 scroll-mt-20">
        <MapExperience />
      </section>

      {/* «Ci pensiamo noi»: invito alle attività, SOPRA la cornice semaforo (ritmo promo) */}
      <OnboardingPromo />

      {/* SEMAFORO — il nostro elemento distintivo, subito sotto la mappa */}
      <section id="semaforo" className="mx-auto mt-8 max-w-6xl px-4 scroll-mt-20">
        <div className="rounded-3xl border-2 border-lime-500 bg-leaf/40 p-6 md:p-8">
          <div className="text-center">
            <span className="inline-block rounded-full bg-lime-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Il nostro elemento distintivo
            </span>
            <h2 className="title-pangea mt-3 text-3xl text-green-700 md:text-4xl">
              Che semaforo ha il tuo prodotto?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-green-900/80">
              Ogni prodotto bio ha un semaforo della filiera che misura quanto le sue
              materie prime arrivano da vicino — non una somma di CO₂, ma un giudizio
              qualitativo della composizione. Ecco una scheda d&apos;esempio per ogni tonalità.
            </p>
          </div>
          <div className="mt-7">
            <LegendaSemaforo />
          </div>

          {/* Com'è fatto il calcolatore (vive su ECO-VISA, il nostro riferimento) */}
          <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-[#cde3a8] bg-white/70 p-4 text-sm text-green-900/80">
            <strong className="text-green-800">Com&apos;è fatto:</strong> inserisci lo
            stabilimento e le materie prime con la loro origine. Il calcolatore mostra in
            tempo reale i chilometri, la CO₂ e il <strong>semaforo del prodotto</strong>, con
            il colore di ogni singolo ingrediente. Lo strumento vive su ECO-VISA — per
            compilarlo basta un click 👇
          </div>

          <div className="mt-4 text-center">
            <a
              href="https://ecovisa.it/calcola"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lime inline-flex items-center gap-2"
            >
              <svg width="14" height="20" viewBox="0 0 15 21" aria-hidden="true" className="flex-none">
                <rect x="1.5" y="1" width="12" height="19" rx="4.5" fill="#33402c" />
                <circle cx="7.5" cy="6" r="2.3" fill="#e2231a" />
                <circle cx="7.5" cy="10.5" r="2.3" fill="#f6c416" />
                <circle cx="7.5" cy="15" r="2.3" fill="#45a82f" />
              </svg>
              Prova il calcolatore su ECO-VISA
            </a>
          </div>
        </div>
      </section>

      {/* Banner Gold: invito alle aziende (sotto la mappa) */}
      <GoldPromoBanner portale="BioFido" />

      {/* Popup «installa l'app»: SOLO sulla home e SOLO la prima volta (non più a ogni pagina) */}
      <InstallPopup />
    </div>
  );
}
