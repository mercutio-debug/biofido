import type { Metadata } from "next";
import { ServiziExtra } from "@/components/ServiziExtra";

export const metadata: Metadata = {
  title: "Servizi extra · BioFido",
  description:
    "Potenzia la tua attività bio: «Ci pensiamo noi» (ti mettiamo online noi), report di sostenibilità brandizzato e badge fisico verificato.",
  alternates: { canonical: "https://mercutio-debug.github.io/biofido/servizi-extra/" },
};

export default function ServiziExtraPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700">Servizi extra</h1>
      <p className="mt-2 max-w-2xl text-green-900/70">
        Oltre all&apos;abbonamento, alcuni servizi pensati per farti risparmiare tempo e
        dare valore alla tua sostenibilità. Guarda la demo di ciascuno.
      </p>
      <div className="mt-8">
        <ServiziExtra showPrices />
      </div>
      <p className="mt-8 text-sm text-green-900/60">
        Vuoi attivarne uno? Scrivici dalla tua dashboard o ai contatti del portale.
      </p>
    </div>
  );
}
