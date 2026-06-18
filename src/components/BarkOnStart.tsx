"use client";

import { useEffect } from "react";

/**
 * All'apertura dell'app, Fido saluta con un "bau bau" (file audio reale, più
 * caldo del suono sintetizzato). I browser bloccano l'audio finché l'utente non
 * interagisce: proviamo subito e, se serve, al primo tocco/clic. Una sola volta
 * per sessione.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function BarkOnStart() {
  useEffect(() => {
    if (sessionStorage.getItem("biofido_bark")) return;
    let fatto = false;

    function segna() {
      fatto = true;
      sessionStorage.setItem("biofido_bark", "1");
      pulisci();
    }

    async function suona() {
      if (fatto) return;
      try {
        const a = new Audio(`${BASE}/audio/bau.mp3`);
        a.volume = 0.75;
        await a.play(); // se l'autoplay è bloccato, lancia e aspettiamo un gesto
        segna();
      } catch {
        /* bloccato: riprovo al primo gesto */
      }
    }

    const onGesto = () => suona();
    function pulisci() {
      window.removeEventListener("pointerdown", onGesto);
      window.removeEventListener("keydown", onGesto);
      window.removeEventListener("touchstart", onGesto);
    }

    suona(); // tentativo immediato
    window.addEventListener("pointerdown", onGesto);
    window.addEventListener("keydown", onGesto);
    window.addEventListener("touchstart", onGesto);
    return pulisci;
  }, []);

  return null;
}
