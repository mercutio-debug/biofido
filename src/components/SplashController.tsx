"use client";

import { useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Controlla lo splash di lancio. Lo splash (#biofido-splash) è già renderizzato
 * nell'HTML dal layout, così COPRE la pagina dal primo frame (niente lampo di
 * homepage). Qui: lo tengo ~3s, poi lo faccio sfumare e rimuovo, e faccio partire
 * l'ABBAIO. Una sola volta per sessione (non riappare a ogni navigazione).
 *
 * Audio: al 3° secondo tento l'autoplay; se il WebView lo blocca (molti motori
 * richiedono un'ATTIVAZIONE dell'utente — un tocco/clic, non basta lo scroll),
 * l'abbaio scatta al PRIMO gesto ovunque nella pagina. Ascolto in fase di cattura
 * su window E document per intercettare quel primo gesto il prima possibile.
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
    let done = false;

    const EVENTI = [
      "pointerdown",
      "pointerup",
      "touchstart",
      "touchend",
      "mousedown",
      "click",
      "keydown",
    ];

    function stacca() {
      EVENTI.forEach((ev) => {
        window.removeEventListener(ev, suona, true);
        document.removeEventListener(ev, suona, true);
      });
    }

    function suona() {
      if (done) return;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          done = true;
          stacca();
        }).catch(() => {
          /* bloccato (nessuna attivazione utente ancora): resto in ascolto */
        });
      } else {
        done = true;
        stacca();
      }
    }

    // ascolto il primo gesto (in cattura, su window e document → il prima possibile)
    EVENTI.forEach((ev) => {
      window.addEventListener(ev, suona, true);
      document.addEventListener(ev, suona, true);
    });

    const t = window.setTimeout(() => {
      suona(); // tentativo di autoplay all'apertura (se il WebView lo consente)
      s.style.opacity = "0";
      window.setTimeout(() => s.remove(), 450);
    }, 3000);

    return () => {
      window.clearTimeout(t);
      stacca();
    };
  }, []);

  return null;
}
