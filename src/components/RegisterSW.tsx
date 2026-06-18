"use client";

import { useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Registra il service worker a ogni visita (non solo quando si attivano le
 * notifiche). Serve a rendere BioFido installabile come app: con un SW attivo
 * + manifest, su Android/Chrome compare «Installa app» / «Aggiungi a Home».
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${BASE}/sw.js`).catch(() => {
      /* registrazione non disponibile (es. contesto non sicuro): ignoro */
    });
  }, []);
  return null;
}
