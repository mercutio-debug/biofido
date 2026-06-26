import Image from "next/image";
import Link from "next/link";
import { MapExperience } from "@/components/MapExperience";
import { BioFidoLogo } from "@/components/Logo";
import { GoldPromoBanner } from "@/components/GoldPromoBanner";
import { OnboardingPromo } from "@/components/OnboardingPromo";
import { LegendaSemaforo } from "@/components/LegendaSemaforo";
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
              <Link href="/registrati" className="btn-ghost">Sei un&apos;attività? Iscriviti</Link>
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

      {/* Riquadro promozionale: demo onboarding incorporata, sotto la mappa */}
      <OnboardingPromo />

      {/* Banner Gold: invito alle aziende (sotto la mappa) */}
      <GoldPromoBanner portale="BioFido" />

      {/* Semaforo di sostenibilità: cosa ci distingue (stesso criterio di ECO-VISA) */}
      <section className="mx-auto mt-12 max-w-6xl px-4">
        <h2 className="font-display text-2xl text-green-800 sm:text-3xl">
          Il semaforo di sostenibilità
        </h2>
        <p className="mt-2 max-w-2xl text-green-900/80">
          Ogni prodotto bio ha un semaforo che misura quanto le sue materie prime
          arrivano da vicino — è la caratteristica che ci distingue. Ecco una scheda
          d&apos;esempio per ogni tonalità, dal verde a km0 fino alle filiere più lunghe.
        </p>
        <div className="mt-5">
          <LegendaSemaforo />
        </div>
      </section>
    </div>
  );
}
