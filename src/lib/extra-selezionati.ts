/**
 * Selezione condivisa dei servizi extra (onboarding/report/badge) tra: le spunte
 * in fondo ai piani, la cornice "estensione Gold" e il pagamento finale. Così
 * ciò che spunti viene pagato insieme all'abbonamento. Stato in memoria di
 * pagina (basta: piani, cornice e pagamento sono nella stessa dashboard).
 */
const sel = new Set<string>();
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function getExtraScelti(): string[] {
  return [...sel];
}
export function isExtraScelto(key: string): boolean {
  return sel.has(key);
}
export function setExtraScelto(key: string, on: boolean) {
  if (on) sel.add(key);
  else sel.delete(key);
  emit();
}
export function toggleExtraScelto(key: string) {
  setExtraScelto(key, !sel.has(key));
}
/** Rimuove dalla selezione i servizi non ammessi dal piano scelto. */
export function pulisciExtraNonAmmessi(ammessi: string[]) {
  let cambiato = false;
  for (const k of [...sel]) {
    if (!ammessi.includes(k)) {
      sel.delete(k);
      cambiato = true;
    }
  }
  if (cambiato) emit();
}
export function onExtraChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
