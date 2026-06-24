/**
 * Rileva se BioFido sta girando come APP INSTALLATA (TWA Android / PWA in
 * standalone), invece che in una normale scheda del browser.
 *
 * Regola schede azienda:
 *  - in APP  → la scheda si apre IN-APP (modale), senza cambiare pagina;
 *  - nel BROWSER (desktop o mobile web) → si apre la pagina /azienda/[slug],
 *    con URL proprio (condivisibile e indicizzabile → SEO).
 */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const mql = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    const androidTwa = document.referrer.startsWith("android-app://");
    return !!(mql || iosStandalone || androidTwa);
  } catch {
    return false;
  }
}
