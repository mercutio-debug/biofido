"use client";

/**
 * Banner che ricorda all'azienda che ha scelto di condividere la sua scheda anche
 * sul portale gemello, con un tasto ben visibile per andare a vederla lì. Così,
 * anche se si fossero dimenticati di aver spuntato l'opzione, hanno sempre sotto
 * gli occhi un promemoria e la possibilità di controllare com'è la loro scheda
 * sull'altro portale. Componente portale-agnostico (cp tra i due portali).
 */
export function CrossPortalBanner({
  attiva,
  url,
  altroPortale,
}: {
  /** true = il cross-publish verso l'altro portale è selezionato */
  attiva: boolean;
  /** indirizzo della propria scheda sull'altro portale (/azienda/[slug]) */
  url: string;
  altroPortale: "ECO-VISA" | "BioFido";
}) {
  if (!attiva) return null;
  return (
    <div className="mt-4 rounded-2xl border-2 border-[#cfe0b0] bg-leaf/50 p-4">
      <div className="flex items-center gap-2 font-display text-base text-green-800">
        <span className="rounded-md bg-green-700 px-2 py-0.5 text-sm font-bold tracking-wide text-white">
          {altroPortale}
        </span>
        Hai scelto di condividere la tua scheda anche su {altroPortale}
      </div>
      <p className="mt-1 text-sm text-green-900/75">
        {altroPortale} è il portale <strong>gemello</strong>: vai a vedere com&apos;è la tua
        scheda anche lì, così sai esattamente cosa vedono i clienti su quel portale.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-lime mt-3 inline-flex"
      >
        👀 Vai a vedere la mia scheda su {altroPortale} →
      </a>
    </div>
  );
}
