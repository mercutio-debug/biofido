/**
 * Utilità prezzo in stile italiano (simbolo €, virgola decimale, due cifre).
 * Condiviso ECO-VISA / BioFido: tenere i due file allineati.
 */

/**
 * Estrae il valore numerico (in euro) da un prezzo "sporco": accetta "9",
 * "9.5", "9,50", "€ 9,50", "1.234,56". Ritorna null se non c'è alcun numero
 * (es. "su richiesta"). Riconosce da solo qual è il separatore decimale.
 */
export function parseEuro(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[^\d.,-]/g, "");
  if (!/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let decimalSep = "";
  if (lastComma > -1 && lastDot > -1) decimalSep = lastComma > lastDot ? "," : ".";
  else if (lastComma > -1) decimalSep = ",";
  else if (lastDot > -1) decimalSep = ".";

  let normalized = cleaned;
  if (decimalSep) {
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = cleaned.split(thousandSep).join("").replace(decimalSep, ".");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Come parseEuro ma in centesimi interi (per Stripe / colonne *_cents). */
export function euroToCents(raw: string | number | null | undefined): number | null {
  const n = parseEuro(raw);
  return n == null ? null : Math.round(n * 100);
}

/**
 * Formattazione prezzo in stile italiano: simbolo €, virgola decimale e due
 * cifre. Accetta input "sporchi" ("9", "9.5", "9,50", "€ 9,50", "1.234,56") e li
 * normalizza in "€ 9,50". È idempotente (rieseguirlo non cambia il risultato).
 * Se la stringa non contiene numeri (es. "su richiesta") la lascia invariata.
 */
export function formatPrezzo(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  // nessun numero: prezzo testuale ("su richiesta"), lascio com'è
  if (!/\d/.test(s.replace(/[^\d.,-]/g, ""))) return s;
  const n = parseEuro(s);
  if (n == null) return s;
  return "€ " + n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
