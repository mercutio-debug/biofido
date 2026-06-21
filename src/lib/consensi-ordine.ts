/**
 * Consensi richiesti al momento dell'ordine (prodotti e servizi).
 *
 * Tre flag OBBLIGATORI: il tasto "Paga" si attiva solo quando sono tutti e tre
 * spuntati. Sopra le checkbox il modale mostra SEMPRE i dati del venditore
 * (ragione sociale, P.IVA, sede), così l'identità del venditore è chiara.
 *
 * Nota giuridica: il trattamento dei dati per evadere l'ordine si basa
 * sull'ESECUZIONE DEL CONTRATTO (art. 6.1.b GDPR), non sul consenso: per questo
 * il terzo flag è formulato come presa visione + accettazione della condivisione
 * col venditore, non come "consenso". Un eventuale consenso marketing sarebbe un
 * flag separato e FACOLTATIVO (mai tra questi tre).
 *
 * Modulo condiviso ECO-VISA / BioFido: tenere identico nei due repo.
 */
import { LEGALE } from "./legale";

export type ConsensoOrdine = {
  id: "termini" | "venditore" | "privacy";
  /** etichetta accanto alla checkbox; {LINK} è sostituito dal link sotto */
  testo: string;
  /** link da inserire al posto di {LINK}, se presente */
  link?: { label: string; href: string };
  /** tutti obbligatori per attivare il pagamento */
  richiesto: true;
};

export const CONSENSI_ORDINE: ConsensoOrdine[] = [
  {
    id: "termini",
    testo: "Ho letto e accetto i {LINK}.",
    link: { label: "Termini di vendita", href: LEGALE.terminiVendita },
    richiesto: true,
  },
  {
    id: "venditore",
    testo:
      "Confermo di acquistare direttamente dall'azienda venditrice indicata sopra (ragione sociale e P.IVA) e prendo atto che la piattaforma agisce solo come intermediaria, non come venditore.",
    richiesto: true,
  },
  {
    id: "privacy",
    testo:
      "Ho letto l'{LINK} e accetto che i miei dati personali (nome, contatti e indirizzo) siano trattati da Ligusto Srl e condivisi con l'azienda venditrice per gestire ed evadere l'ordine, la spedizione e la fatturazione.",
    link: { label: "Informativa privacy", href: LEGALE.privacy },
    richiesto: true,
  },
];

/** true se tutti i consensi obbligatori sono stati spuntati. */
export function consensiCompleti(spuntati: Record<string, boolean>): boolean {
  return CONSENSI_ORDINE.every((c) => spuntati[c.id]);
}
