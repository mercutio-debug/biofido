"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SERVIZI_EXTRA } from "@/lib/servizi-extra";
import { supabase } from "@/lib/supabase";
import { getMyExtras, getStatoOnboarding } from "@/lib/onboarding";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Il report di sostenibilità si può richiedere dopo 1 anno dall'iscrizione. */
const REPORT_GIORNI = 365;
const GIORNO_MS = 24 * 60 * 60 * 1000;

/** Con quale abbonamento si sblocca ciascun servizio. */
const REQ: Record<string, string> = {
  onboarding: "Servizio extra acquistabile solo con l'abbonamento Gold",
  report: "Servizio acquistabile con l'abbonamento Silver",
  badge: "Servizio acquistabile con l'abbonamento Silver",
};
/** Piano minimo richiesto da ciascun servizio + etichetta. */
const REQ_RANK: Record<string, number> = { onboarding: 2, report: 1, badge: 1 };
const REQ_LABEL: Record<string, string> = { onboarding: "Gold", report: "Silver", badge: "Silver" };
const PLAN_RANK: Record<string, number> = { free: 0, silver: 1, gold: 2 };

function formatRimanente(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const g = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${g}g ${h}h ${m}m ${s}s`;
}

/**
 * Vetrina dei "servizi extra" (onboarding, report, badge). Ogni card ha un tasto
 * "Guarda la demo". Il REPORT di sostenibilità è speciale: si attiva solo dopo
 * 365 giorni dall'iscrizione, con countdown prima e messaggio di auguri dopo.
 * Usata sia nella pagina pubblica /servizi-extra sia nella dashboard.
 */
export function ServiziExtra({
  showPrices = false,
  plan,
  onAcquista,
}: {
  showPrices?: boolean;
  /** piano dell'azienda loggata (in dashboard): attiva il gating dei servizi.
   *  Se assente (vetrina pubblica), i servizi sono mostrati senza blocco. */
  plan?: string;
  /** se presente (dashboard), i tasti d'acquisto APRONO IL POPUP carrello invece
   *  di navigare a /abbonamenti. Riceve la key del servizio. */
  onAcquista?: (key: string) => void;
}) {
  const planRank = plan != null ? PLAN_RANK[plan] ?? 0 : null;
  const [demo, setDemo] = useState<{ key: string; nome: string } | null>(null);
  // data di iscrizione (created_at dell'utente) per il countdown del report
  const [iscrizione, setIscrizione] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // servizi extra GIÀ acquistati (così non li si compra due volte)
  const [acquistati, setAcquistati] = useState<string[]>([]);
  // stato dell'onboarding: finché non è "completato" non lo si può riacquistare
  const [onbCompletato, setOnbCompletato] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const c = data.user?.created_at;
      if (c) setIscrizione(new Date(c).getTime());
    });
    getMyExtras().then(setAcquistati);
    getStatoOnboarding().then((s) => setOnbCompletato(s?.stato === "completato"));
  }, []);

  // ticker per il countdown live (1s) — attivo solo se serve (utente loggato)
  useEffect(() => {
    if (iscrizione == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iscrizione]);

  // chiusura demo con Esc + messaggio dalla ✕ interna al deck (iframe)
  useEffect(() => {
    if (!demo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDemo(null);
    };
    const onMsg = (e: MessageEvent) => {
      if (e.data === "biofido-close-demo") setDemo(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMsg);
    };
  }, [demo]);

  const reportTarget = iscrizione != null ? iscrizione + REPORT_GIORNI * GIORNO_MS : null;
  const reportSbloccato = reportTarget != null && now >= reportTarget;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {SERVIZI_EXTRA.map((s) => {
          // REPORT: gestione speciale del countdown a 365 giorni
          const isReport = s.key === "report";
          const reportBloccato = isReport && reportTarget != null && !reportSbloccato;
          // GATING per piano: in dashboard (planRank noto) il servizio è bloccato
          // se il piano dell'azienda è inferiore a quello richiesto.
          const reqLabel = REQ_LABEL[s.key] ?? "Silver";
          const planLocked = planRank != null && planRank < (REQ_RANK[s.key] ?? 0);
          // onboarding: "bloccato" finché il giro non è completato (poi riacquistabile);
          // gli altri servizi: bloccati una volta acquistati.
          const giaAcquistato =
            s.key === "onboarding"
              ? acquistati.includes("onboarding") && !onbCompletato
              : acquistati.includes(s.key);
          // tasto azione: in dashboard (onAcquista) apre il popup; in vetrina, link
          const Azione = ({ label }: { label: string }) =>
            onAcquista ? (
              <button
                type="button"
                onClick={() => onAcquista(s.key)}
                className="btn-lime mt-2 justify-center text-sm"
              >
                {label}
              </button>
            ) : (
              <Link href="/abbonamenti" className="btn-lime mt-2 justify-center text-sm">
                {label}
              </Link>
            );
          return (
            <div key={s.key} className={`card flex flex-col p-5 ${planLocked ? "opacity-70" : ""}`}>
              <div className="text-2xl">{s.emoji}</div>
              <h3 className="mt-1 font-display text-xl text-green-800">{s.nome}</h3>
              <p className="mt-2 flex-1 text-sm text-green-900/75">{s.desc}</p>
              {showPrices && <div className="mt-3 font-semibold text-green-800">{s.prezzo}</div>}
              {/* Legenda: con piano noto mostra ATTIVO/BLOCCATO; in vetrina, il requisito */}
              <div
                className={`mt-3 rounded-lg px-3 py-1.5 text-center text-xs font-bold ${
                  giaAcquistato
                    ? "bg-badge-yellow text-[#7a1f00]"
                    : planRank == null
                      ? "bg-leaf/60 text-green-800"
                      : planLocked
                        ? "bg-[#f3dada] text-traffic-red"
                        : "bg-leaf text-green-700"
                }`}
              >
                {giaAcquistato
                  ? "✓ Già acquistato"
                  : planRank == null
                    ? REQ[s.key] ?? "Servizio extra"
                    : planLocked
                      ? `🔒 Disponibile con il piano ${reqLabel}`
                      : `✓ Attivabile col tuo piano`}
              </div>
              <button
                type="button"
                onClick={() => setDemo({ key: s.key, nome: s.nome })}
                className="btn-ghost mt-3 justify-center text-sm"
              >
                ▶ Guarda la demo
              </button>

              {/* Azione: priorità → blocco piano → countdown report → auguri → acquista */}
              {giaAcquistato ? (
                <div className="mt-2 rounded-xl border-2 border-badge-yellow bg-[#fffbe9] p-2 text-center text-xs font-bold text-[#7a1f00]">
                  {s.key === "onboarding"
                    ? "✓ Attivo — carica i tuoi file qui sotto in «Ci pensiamo noi»"
                    : "✓ Servizio già attivo"}
                </div>
              ) : planLocked ? (
                <Azione label={`⬆ Passa al piano ${reqLabel}`} />
              ) : reportBloccato ? (
                <div className="mt-2 rounded-xl border border-[#e3eed7] bg-leaf/40 p-3 text-center">
                  <div className="text-xs font-semibold text-green-900/70">
                    Potrai richiedere il tuo report di sostenibilità tra
                  </div>
                  <div className="mt-1 font-display text-lg tabular-nums text-green-800">
                    {formatRimanente(reportTarget! - now)}
                  </div>
                </div>
              ) : isReport && reportSbloccato ? (
                <>
                  <div className="mt-2 animate-pulse rounded-xl border-2 border-badge-yellow bg-[#fffbe9] p-3 text-center text-xs font-bold text-[#7a1f00]">
                    🎉 È trascorso un anno dalla tua iscrizione, complimenti! Ora puoi
                    richiedere il tuo report di sostenibilità!!
                  </div>
                  <Azione label={`🛒 Richiedi ${s.nome}`} />
                </>
              ) : (
                <Azione label={`🛒 Acquista ${s.nome}`} />
              )}
            </div>
          );
        })}
      </div>

      {showPrices && (
        <p className="mt-3 text-center text-xs text-green-900/55">
          I prezzi sono da intendersi al netto dell&apos;IVA.
        </p>
      )}

      {demo && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label={`Demo ${demo.nome}`}
        >
          <div className="flex items-center justify-between gap-3 bg-[#0e2417] px-4 py-2 text-white">
            <span className="truncate font-display text-sm">{demo.nome} — demo</span>
            <div className="flex items-center gap-2">
              <a
                href={`${BASE}/demo/${demo.key}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/40 px-3 py-1 text-xs font-bold hover:bg-white/10"
              >
                Schermo intero ↗
              </a>
              <button
                type="button"
                onClick={() => setDemo(null)}
                aria-label="Chiudi la demo"
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold hover:bg-white/25"
              >
                ✕ Chiudi
              </button>
            </div>
          </div>
          <iframe
            src={`${BASE}/demo/${demo.key}/`}
            title={`Demo ${demo.nome}`}
            className="min-h-0 w-full flex-1 bg-[#0e2417]"
          />
        </div>
      )}
    </>
  );
}
