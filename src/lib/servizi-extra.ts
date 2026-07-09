/**
 * Dati dei "servizi extra" una-tantum / ricorrenti mostrati nella vetrina e in
 * dashboard. La demo di ciascuno è una presentazione statica in /demo/<key>/.
 * Gemello con BioFido: tenere allineati key, testo e prezzi.
 */
export type ServizioExtra = {
  key: "onboarding" | "report" | "badge";
  emoji: string;
  nome: string;
  desc: string;
  prezzo: string;
  /** prezzo numerico in € (per il totale nel carrello) */
  prezzoNum: number;
};

export const SERVIZI_EXTRA: ServizioExtra[] = [
  {
    key: "onboarding",
    emoji: "🚀",
    nome: "Ci pensiamo noi",
    desc: "Mettiamo online la tua azienda: tu invii listino e foto, al resto pensiamo noi. Negozio completo, verificato e pubblicato.",
    prezzo: "€ 59 una-tantum · −10% entro il 31/12/2026",
    prezzoNum: 59,
  },
  {
    key: "report",
    emoji: "📊",
    nome: "Report della Filiera",
    desc: "Un PDF professionale della tua impronta di trasporto, col tuo marchio. Da mostrare a clienti, partner e bandi. Si rigenera ogni anno.",
    prezzo: "€ 19 / anno",
    prezzoNum: 19,
  },
  {
    key: "badge",
    emoji: "🏅",
    nome: "Badge fisico",
    desc: "Il sigillo «Impronta verificata» da esporre: targhetta con QR al passaporto, busta brandizzata e set di adesivi per il punto vendita.",
    prezzo: "€ 29 + spedizione",
    prezzoNum: 29,
  },
];
