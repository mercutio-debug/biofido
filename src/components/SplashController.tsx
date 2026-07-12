"use client";

import { useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Controlla lo splash di lancio. Lo splash (#biofido-splash) è già renderizzato
 * nell'HTML dal layout, così COPRE la pagina dal primo frame (niente lampo di
 * homepage). Qui: lo tengo ~3s, poi lo faccio sfumare, faccio partire l'ABBAIO
 * proprio quando ricompare la homepage, e lo rimuovo. Una sola volta per
 * sessione (non riappare a ogni navigazione). Se l'autoplay è bloccato, l'abbaio
 * scatta al primo tocco.
 */
export function SplashController() {
  useEffect(() => {
    const s = document.getElementById("biofido-splash");
    if (!s) return;

    // già lanciato in questa sessione → via subito lo splash, niente ripetizioni
    if (sessionStorage.getItem("biofido_launch")) {
      s.remove();
      return;
    }
    sessionStorage.setItem("biofido_launch", "1");

    const a = new Audio(`${BASE}/audio/bau.mp3`);
    a.preload = "auto";
    a.volume = 0.75;
    let barked = false;
    // Trucco "muted → unmuted": i WebView bloccano l'audio all'apertura senza un
    // gesto dell'utente, MA l'autoplay MUTO è sempre permesso. Avvio muto e poi
    // tolgo il muto: il suono si sente lo stesso, senza dover toccare lo schermo.
    const bark = () => {
      if (barked) return;
      a.muted = true;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          barked = true;
          a.muted = false;
        }).catch(() => {});
      }
    };
    // fallback: se l'autoplay è bloccato (browser), abbaia al primo tocco
    window.addEventListener("pointerdown", bark);
    window.addEventListener("touchstart", bark);

    const t = window.setTimeout(() => {
      bark(); // «abbaio quando compare la homepage»
      s.style.opacity = "0";
      window.setTimeout(() => s.remove(), 450);
    }, 3000);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", bark);
      window.removeEventListener("touchstart", bark);
    };
  }, []);

  return null;
}
