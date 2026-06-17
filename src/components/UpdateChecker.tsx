"use client";

import { useEffect, useState } from "react";

/**
 * Auto-aggiornamento della PWA. Confronta l'id di questa build
 * (NEXT_PUBLIC_BUILD_ID, fissato a build-time) con quello pubblicato online in
 * version.json (letto SEMPRE fresco, senza cache). Se non coincidono significa
 * che è uscita una versione nuova ma il browser/PWA sta servendo quella vecchia
 * dalla cache:
 *   - al primo caricamento ricarica da solo (una volta), scavalcando la cache;
 *   - se l'utente torna sull'app, mostra un pulsantino "Aggiorna".
 */
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function UpdateChecker() {
  const [novita, setNovita] = useState(false);

  useEffect(() => {
    if (BUILD === "dev") return; // in sviluppo non serve
    let attivo = true;

    async function controlla(autoReload: boolean) {
      try {
        const r = await fetch(`${BASE}/version.json`, { cache: "no-store" });
        if (!r.ok || !attivo) return;
        const { build } = (await r.json()) as { build?: string };
        if (!build || build === BUILD) return; // già aggiornati

        if (autoReload) {
          // ricarico una sola volta per quella build (evita loop se la cache
          // continuasse a servire il vecchio nonostante il cache-busting)
          const chiave = `biofido_reload_${build}`;
          if (!sessionStorage.getItem(chiave)) {
            sessionStorage.setItem(chiave, "1");
            const u = new URL(window.location.href);
            u.searchParams.set("v", build); // URL diverso = la cache non vale
            window.location.replace(u.toString());
            return;
          }
        }
        setNovita(true);
      } catch {
        /* offline o file assente: ignoro */
      }
    }

    controlla(true);
    const onFocus = () => controlla(false);
    window.addEventListener("focus", onFocus);
    const iv = window.setInterval(() => controlla(false), 5 * 60 * 1000);
    return () => {
      attivo = false;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(iv);
    };
  }, []);

  if (!novita) return null;
  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed bottom-4 right-4 z-[3000] rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-green-800"
    >
      🔄 Nuova versione — Aggiorna
    </button>
  );
}
