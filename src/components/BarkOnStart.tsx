"use client";

import { useEffect } from "react";

/**
 * All'apertura dell'app, Fido saluta con un simpatico "bau bau".
 * Il suono è sintetizzato con la Web Audio API (nessun file audio da scaricare,
 * funziona anche offline). I browser bloccano l'audio finché l'utente non
 * interagisce: quindi proviamo subito e, se viene bloccato, lo facciamo partire
 * al primo tocco/clic. Una sola volta per sessione, per non risultare invadenti.
 */

/** Un singolo "bau": tono con glissato discendente (la vocale a→u) + corpo. */
function abbaia(ctx: AudioContext, t0: number) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(0.55, t0 + 0.012); // attacco secco "b"
  out.gain.setValueAtTime(0.5, t0 + 0.06);
  out.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24); // decadimento
  out.connect(ctx.destination);

  // filtro caldo che si chiude (timbro da cagnolino)
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.Q.value = 7;
  filt.frequency.setValueAtTime(2600, t0);
  filt.frequency.exponentialRampToValueAtTime(750, t0 + 0.2);
  filt.connect(out);

  // due oscillatori: voce + corpo, entrambi scendono di tono come un vero "bau"
  for (const [type, f0, f1] of [
    ["sawtooth", 640, 240],
    ["square", 320, 120],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(f1, t0 + 0.18);
    osc.connect(filt);
    osc.start(t0);
    osc.stop(t0 + 0.26);
  }
}

function bauBau() {
  type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };
  const Ctx =
    window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
  if (!Ctx) return false;
  try {
    const ctx = new Ctx();
    const now = ctx.currentTime + 0.03;
    abbaia(ctx, now); // primo "bau"
    abbaia(ctx, now + 0.3); // secondo "bau"
    // chiudo il contesto a fine suono per non lasciarlo aperto
    window.setTimeout(() => ctx.close().catch(() => {}), 900);
    return ctx.state !== "suspended";
  } catch {
    return false;
  }
}

export function BarkOnStart() {
  useEffect(() => {
    if (sessionStorage.getItem("biofido_bark")) return;

    const fatto = () => sessionStorage.setItem("biofido_bark", "1");

    // tentativo immediato (funziona se l'app è già "sbloccata", es. PWA installata)
    if (bauBau()) {
      fatto();
      return;
    }

    // altrimenti: al primo gesto dell'utente
    const onGesto = () => {
      bauBau();
      fatto();
      remove();
    };
    const remove = () => {
      window.removeEventListener("pointerdown", onGesto);
      window.removeEventListener("keydown", onGesto);
      window.removeEventListener("touchstart", onGesto);
    };
    window.addEventListener("pointerdown", onGesto, { once: true });
    window.addEventListener("keydown", onGesto, { once: true });
    window.addEventListener("touchstart", onGesto, { once: true });
    return remove;
  }, []);

  return null;
}
