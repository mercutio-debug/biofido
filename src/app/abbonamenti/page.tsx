import type { Metadata } from "next";
import {
  ManifestoQualita,
  PianiAbbonamento,
  AmiciDiFido,
} from "@/components/Abbonamenti";

export const metadata: Metadata = {
  title: "Abbonamenti — BioFido",
  description:
    "I piani di BioFido per le aziende: mostra il tuo valore vero, non il prezzo più basso. Free, Silver e Gold, e l'offerta Amici di Fido per i primi iscritti.",
};

export default function AbbonamentiPage() {
  return (
    <div className="space-y-12 py-10">
      <header className="mx-auto max-w-6xl px-4">
        <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
          Per le aziende
        </div>
        <h1 className="title-pangea text-4xl text-green-700 md:text-5xl">
          Abbonamenti
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-green-900/80">
          Su BioFido non vince chi costa meno: vince chi fa il prodotto migliore.
          Scegli quanto far risaltare il tuo lavoro.
        </p>
      </header>

      <ManifestoQualita />

      <section className="mx-auto max-w-6xl px-4">
        <PianiAbbonamento />
      </section>

      <AmiciDiFido />
    </div>
  );
}
