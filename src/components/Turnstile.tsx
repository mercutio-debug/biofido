"use client";

import { useEffect, useRef } from "react";

/**
 * Widget "non sono un robot" di Cloudflare Turnstile, agganciato all'auth di
 * Supabase (signUp / signInWithPassword accettano un `captchaToken`).
 *
 * È INERTE finché non è impostata `NEXT_PUBLIC_TURNSTILE_SITEKEY`: senza chiave
 * non rende nulla e non blocca la registrazione/login. Quando la chiave c'è, il
 * captcha va anche attivato lato Supabase (Auth → Attack Protection) con il
 * relativo SECRET — quello resta su Supabase, non nel sito.
 */

export const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? "";
export const turnstileAttivo = SITEKEY.length > 0;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function Turnstile({ onToken }: { onToken: (t: string | null) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // tengo l'ultima callback in un ref così l'effetto gira una sola volta
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!turnstileAttivo) return;
    let annullato = false;

    function rendi() {
      if (annullato || !boxRef.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(boxRef.current, {
        sitekey: SITEKEY,
        callback: (token: string) => cb.current(token),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    }

    if (window.turnstile) {
      rendi();
    } else if (!document.querySelector(`script[src^="${SCRIPT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = rendi;
      document.head.appendChild(s);
    } else {
      const iv = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(iv);
          rendi();
        }
      }, 200);
      return () => {
        annullato = true;
        window.clearInterval(iv);
      };
    }

    return () => {
      annullato = true;
    };
  }, []);

  if (!turnstileAttivo) return null;
  return <div ref={boxRef} className="mt-1 min-h-[65px]" />;
}
