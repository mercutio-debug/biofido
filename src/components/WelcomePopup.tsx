"use client";

import { useEffect, useState } from "react";

/**
 * Popup di benvenuto mostrato all'ingresso nel portale (una volta per sessione).
 * Invita a uscire "dalle quattro mura" e ad andare a conoscere i produttori.
 * Sotto il testo, l'illustrazione della "scatola-navicella": una casa-scatola
 * di cartone coi lati sfondati, atterrata sulla Terra come un'astronave, da cui
 * le persone escono stupite per esplorare il mondo vero.
 */
export function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("biofido_welcome")) setOpen(true);
  }, []);

  function close() {
    sessionStorage.setItem("biofido_welcome", "1");
    setOpen(false);
  }

  function esplora() {
    close();
    document.getElementById("mappa")?.scrollIntoView({ behavior: "smooth" });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/55 p-4"
      onClick={close}
    >
      <div
        className="card max-h-[94vh] w-full max-w-xl overflow-y-auto p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 sm:p-8">
          <button
            onClick={close}
            className="absolute right-4 top-3 text-2xl leading-none text-green-900/40 hover:text-green-900"
            aria-label="Chiudi"
          >
            ×
          </button>

          <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
            Esci dalla scatola
          </div>
          <p className="mt-2 text-lg font-semibold leading-snug text-green-900 sm:text-xl">
            Non rimanere ad aspettare che il mondo ti arrivi rinchiuso dentro ad
            un pacchetto:{" "}
            <span className="text-green-700">
              vieni a conoscere, visitare ed incontrare chi lavora anche per
              rendere il TUO MONDO un posto migliore
            </span>{" "}
            → prenota una visita all&apos;interno di un&apos;azienda agricola, di
            una fattoria didattica o di un laboratorio artigianale,{" "}
            <span className="text-green-700">
              esplora nuovi universi, dietro casa tua!
            </span>
          </p>

          <CartonShip className="mt-5 w-full" />

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button onClick={esplora} className="btn-lime">
              🐾 Esplora le aziende
            </button>
            <button onClick={close} className="btn-ghost">
              Più tardi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** L'illustrazione: scatola-astronave coi quattro lati aperti, salotto al
 *  centro, persone che escono stupite sulla Terra. */
function CartonShip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 680 420" className={className} role="img"
      aria-label="Una casa-scatola di cartone coi lati aperti, atterrata sulla Terra come un'astronave, con le persone che escono per esplorare">
      <defs>
        <linearGradient id="ws-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dceffb" />
          <stop offset="60%" stopColor="#eaf6e6" />
          <stop offset="100%" stopColor="#f3fbe9" />
        </linearGradient>
        <linearGradient id="ws-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfe7a6" />
          <stop offset="100%" stopColor="#a7cf73" />
        </linearGradient>
        <linearGradient id="ws-kL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ecd0a8" /><stop offset="100%" stopColor="#dcb985" />
        </linearGradient>
        <linearGradient id="ws-kM" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6a874" /><stop offset="100%" stopColor="#c0925f" />
        </linearGradient>
        <linearGradient id="ws-kD" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b78651" /><stop offset="100%" stopColor="#9c6c3d" />
        </linearGradient>
        <radialGradient id="ws-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#bdea7e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#bdea7e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ws-lamp" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* cielo + sole + scintille (vibe spaziale) */}
      <rect width="680" height="420" fill="url(#ws-sky)" />
      <circle cx="582" cy="66" r="38" fill="#fff0b8" opacity="0.85" />
      <g fill="#ffffff">
        <path d="M120 60 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" opacity=".8"/>
        <path d="M470 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" opacity=".7"/>
        <path d="M250 30 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" opacity=".6"/>
      </g>
      {/* traiettoria d'atterraggio */}
      <path d="M560 70 Q470 150 370 150" fill="none" stroke="#9bbf6a"
        strokeWidth="2.5" strokeDasharray="3 9" strokeLinecap="round" opacity=".7" />

      {/* terra (pianeta) + colline */}
      <path d="M0 312 Q340 262 680 312 L680 420 0 420Z" fill="url(#ws-ground)" />
      <path d="M40 318 q150 -34 300 -6 q150 28 300 -4 L640 332 40 332Z"
        fill="#9cc468" opacity=".5" />
      {/* alberello a destra (mondo vero da esplorare) */}
      <g>
        <rect x="612" y="300" width="7" height="26" rx="3" fill="#8a6a3f" />
        <circle cx="615" cy="296" r="20" fill="#5aa238" />
        <circle cx="602" cy="304" r="13" fill="#69b343" />
        <circle cx="628" cy="304" r="13" fill="#69b343" />
      </g>

      {/* alone d'atterraggio + zampe da astronave */}
      <ellipse cx="333" cy="332" rx="178" ry="26" fill="url(#ws-glow)" />
      <g stroke="#8a5e35" strokeWidth="7" strokeLinecap="round">
        <line x1="272" y1="314" x2="244" y2="358" />
        <line x1="398" y1="314" x2="428" y2="358" />
        <line x1="336" y1="322" x2="336" y2="366" />
      </g>
      <g fill="#8a5e35">
        <ellipse cx="244" cy="360" rx="11" ry="5" />
        <ellipse cx="428" cy="360" rx="11" ry="5" />
        <ellipse cx="336" cy="368" rx="11" ry="5" />
      </g>

      {/* ---- SCATOLA (cubo: lato destro, cima, fronte) ---- */}
      <path d="M400 175 L442 149 L442 294 L400 320 Z" fill="url(#ws-kD)" />
      <path d="M250 175 L292 149 L442 149 L400 175 Z" fill="url(#ws-kL)" />
      <rect x="250" y="175" width="150" height="145" fill="url(#ws-kM)" />

      {/* apertura frontale (salotto) — fronte sfondato */}
      <path d="M264 198 L386 198 L386 320 L264 320 Z" fill="#2c2114" />
      <rect x="266" y="200" width="118" height="40" fill="#3a2c1b" />
      {/* quadro alla parete */}
      <rect x="296" y="210" width="26" height="20" rx="2" fill="#fff" />
      <rect x="299" y="213" width="20" height="14" fill="#9ec6e8" />
      {/* lampada da terra + luce */}
      <ellipse cx="372" cy="248" rx="26" ry="30" fill="url(#ws-lamp)" />
      <rect x="370" y="246" width="4" height="66" fill="#caa24f" />
      <path d="M362 246 L382 246 L378 230 L366 230 Z" fill="#ffd76a" />
      {/* tappeto + divano */}
      <ellipse cx="324" cy="314" rx="56" ry="9" fill="#6a5038" />
      <path d="M288 300 q0 -22 18 -22 l36 0 q18 0 18 22 l0 12 -72 0 Z" fill="#d98a5b" />
      <rect x="288" y="288" width="72" height="14" rx="6" fill="#e29a6c" />
      <rect x="296" y="296" width="22" height="14" rx="4" fill="#c8784a" />
      <rect x="330" y="296" width="22" height="14" rx="4" fill="#c8784a" />

      {/* ---- lembi aperti su tutti i lati ---- */}
      {/* fronte (verso l'alto) */}
      <path d="M250 175 L400 175 L410 140 L260 140 Z" fill="url(#ws-kL)" stroke="#b78a55" strokeWidth="1.5" />
      {/* retro */}
      <path d="M292 149 L442 149 L452 115 L302 115 Z" fill="#e7c79c" stroke="#c79f6f" strokeWidth="1.5" />
      {/* sinistra */}
      <path d="M250 175 L292 149 L266 120 L224 146 Z" fill="url(#ws-kM)" stroke="#b78a55" strokeWidth="1.5" />
      {/* destra */}
      <path d="M400 175 L442 149 L468 174 L426 200 Z" fill="url(#ws-kD)" stroke="#9c6c3d" strokeWidth="1.5" />
      {/* pannello frontale sinistro spalancato (lato sfondato) */}
      <path d="M250 175 L250 320 L214 302 L216 158 Z" fill="url(#ws-kL)" stroke="#b78a55" strokeWidth="1.5" />
      {/* nastro da pacco + etichetta di spedizione */}
      <rect x="250" y="232" width="150" height="12" fill="#e9d3ad" opacity=".7" />
      <rect x="330" y="252" width="40" height="26" rx="2" fill="#fbf4e4" stroke="#caa86f" />
      <line x1="336" y1="260" x2="364" y2="260" stroke="#b89a64" strokeWidth="2" />
      <line x1="336" y1="266" x2="364" y2="266" stroke="#b89a64" strokeWidth="2" />
      <line x1="336" y1="272" x2="356" y2="272" stroke="#b89a64" strokeWidth="2" />

      {/* ---- persone che escono, stupite ---- */}
      {/* in soglia (più piccola, dietro) */}
      <g stroke="#327413" strokeLinecap="round">
        <circle cx="322" cy="296" r="6" fill="#f2c89a" stroke="none" />
        <path d="M322 302 l0 16" strokeWidth="7" stroke="#4a8f1e" />
        <path d="M322 306 l-8 -8 M322 306 l8 -8" strokeWidth="3" stroke="#f2c89a" />
        <path d="M318 318 l-4 8 M326 318 l4 8" strokeWidth="3" />
      </g>
      {/* davanti a sinistra (braccia al cielo) */}
      <g>
        <path d="M236 300 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3z" fill="#f7d417" />
        <circle cx="252" cy="322" r="8" fill="#f2c89a" />
        <path d="M252 330 l0 20" stroke="#e8332a" strokeWidth="9" strokeLinecap="round" />
        <path d="M250 334 l-14 -12 M254 334 l14 -12" stroke="#f2c89a" strokeWidth="4" strokeLinecap="round" />
        <path d="M248 350 l-5 10 M256 350 l5 10" stroke="#33414a" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* davanti a destra (braccia al cielo) */}
      <g>
        <path d="M420 296 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3z" fill="#f7d417" />
        <circle cx="406" cy="324" r="8" fill="#e8b88a" />
        <path d="M406 332 l0 20" stroke="#2f6f12" strokeWidth="9" strokeLinecap="round" />
        <path d="M404 336 l-14 -12 M408 336 l14 -12" stroke="#e8b88a" strokeWidth="4" strokeLinecap="round" />
        <path d="M402 352 l-5 10 M410 352 l5 10" stroke="#33414a" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
