"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadMyBusiness,
  elencoBusinessConSlug,
  type Business,
} from "@/lib/biofido-data";
import { listMyExperiences } from "@/lib/bookings";
import { CATEGORY_MAP, PLAN_MAP } from "@/lib/categories";
import { URL_BIOFIDO } from "@/lib/portale";
import { SchedaImpresaModal } from "./SchedaImpresaModal";

/** Segnaposto come appare sulla mappa (stessa stilizzazione di BioFidoMap). */
function MarkerPreview({ business: b }: { business: Business }) {
  const cat = CATEGORY_MAP[b.category];
  const plan = PLAN_MAP[b.plan];
  const size = plan.markerSize;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50% 50% 50% 0",
        transform: "rotate(-45deg)",
        background: cat.color,
        border: "2px solid #fff",
        boxShadow:
          b.plan === "gold"
            ? "0 0 0 3px #f7d417, 0 2px 6px rgba(0,0,0,.4)"
            : "0 2px 6px rgba(0,0,0,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {plan.showIcon && (
        <span style={{ transform: "rotate(45deg)", fontSize: Math.round(size * 0.5) }}>
          {cat.emoji}
        </span>
      )}
    </div>
  );
}

/** Legenda guida: spiega ogni elemento della scheda, plan-aware. */
function Legenda({ business: b }: { business: Business }) {
  const plan = PLAN_MAP[b.plan];
  const voci: { ic: string; t: string; d: string }[] = [
    {
      ic: "📍",
      t: "Segnaposto + nome",
      d:
        b.plan === "gold"
          ? "Sei Gold: segnaposto più grande con icona, in evidenza."
          : b.plan === "silver"
            ? "Silver: segnaposto con icona."
            : "Free: segnaposto base. Sali di piano per risaltare.",
    },
    {
      ic: "📝",
      t: "Descrizione e sito web",
      d: plan.showDescription
        ? "Visibili sulla tua scheda — raccontati e linka il tuo sito."
        : "Si sbloccano dal piano Silver.",
    },
    {
      ic: "🚦",
      t: "Prodotti con prezzo + semaforo",
      d: "Aggiungili in «I tuoi prodotti». Il prezzo lo metti nell'editor; il semaforo della filiera appare se tieni attiva la spunta nel prodotto.",
    },
    {
      ic: "🗓️",
      t: "Esperienze prenotabili",
      d: plan.canSell
        ? "Visite in azienda, laboratori, degustazioni: il cliente le prenota dall'app e paga in anticipo, dopo la tua approvazione."
        : "Si sbloccano dal piano Silver.",
    },
    {
      ic: "🐾",
      t: "Tasto «Raggiungila»",
      d: "Porta il cliente da te con le indicazioni stradali (Google Maps).",
    },
  ];
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-green-700">
        Legenda — come si compone la scheda
      </div>
      <ul className="mt-3 space-y-2">
        {voci.map((v) => (
          <li key={v.t} className="flex gap-3 rounded-xl border border-[#e3eed7] p-3">
            <span className="text-xl">{v.ic}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-green-800">{v.t}</div>
              <div className="text-xs text-green-900/65">{v.d}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-leaf/40 p-3 text-xs text-green-900/70">
        💡 Più compili (foto, descrizione, prezzi, esperienze), più la tua scheda è
        ricca e attira clienti. Salva e premi <strong>Aggiorna</strong> per vedere le
        modifiche qui nell'anteprima.
      </p>
    </div>
  );
}

/**
 * Anteprima della scheda pubblica direttamente in dashboard: mostra il
 * segnaposto come appare sulla mappa, la scheda completa (prodotti con prezzi e
 * semaforo, esperienze con il tasto Prenota) ESATTAMENTE come la vedono i
 * clienti, più una legenda-guida per compilarla facilmente.
 */
export function AnteprimaScheda({ ownerId }: { ownerId: string }) {
  const [b, setB] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginaUrl, setPaginaUrl] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);

  const copia = async () => {
    if (!paginaUrl) return;
    try {
      await navigator.clipboard.writeText(paginaUrl);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 1800);
    } catch {
      /* clipboard non disponibile: l'utente seleziona e copia a mano */
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const biz = await loadMyBusiness(ownerId);
    if (biz) {
      biz.experiences = await listMyExperiences(ownerId);
      // URL pubblico condivisibile: slug identico alla pagina /azienda/[slug]
      try {
        const elenco = await elencoBusinessConSlug();
        const mine = elenco.find((x) => x.id === biz.id);
        setPaginaUrl(mine ? `${URL_BIOFIDO}azienda/${mine.slug}/` : null);
      } catch {
        setPaginaUrl(null);
      }
    } else {
      setPaginaUrl(null);
    }
    setB(biz);
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl text-green-800">
          👁 Anteprima della tua scheda pubblica
        </h2>
        <button onClick={load} className="btn-ghost text-sm" disabled={loading}>
          {loading ? "Carico…" : "↻ Aggiorna"}
        </button>
      </div>
      <p className="mt-1 text-sm text-green-900/70">
        È <strong>esattamente</strong> ciò che vedono i clienti su BioFido. Salva la
        scheda qui sopra, poi premi «Aggiorna» per rivedere le modifiche.
      </p>

      {paginaUrl && (
        <div className="mt-4 rounded-2xl border border-[#cfe6b0] bg-leaf/50 p-4">
          <div className="text-sm font-bold text-green-800">🔗 La tua pagina pubblica</div>
          <p className="mt-0.5 text-xs text-green-900/70">
            Condividila su social, sito, email e carta intestata: è il tuo mini-sito
            su BioFido, con la tua attività e i tuoi prodotti.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={paginaUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-[#d6e6c4] bg-white px-3 py-1.5 text-sm text-green-900"
            />
            <button type="button" onClick={copia} className="btn-lime text-sm">
              {copiato ? "✓ Copiato" : "Copia link"}
            </button>
            <a
              href={paginaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-sm"
            >
              Apri ↗
            </a>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-green-900/60">Carico l&apos;anteprima…</p>
      ) : !b ? (
        <p className="mt-4 rounded-xl bg-leaf/40 p-4 text-sm text-green-900/70">
          Compila e salva la <strong>scheda mappa</strong> qui sopra: poi qui comparirà
          l&apos;anteprima di come appari ai clienti.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_minmax(280px,380px)]">
          <Legenda business={b} />
          <div>
            <div className="rounded-2xl bg-leaf/40 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-green-700">
                Sulla mappa appari così
              </div>
              <div className="mt-3 flex items-center gap-4">
                <MarkerPreview business={b} />
                <span className="text-sm font-semibold text-green-900/80">
                  {b.name} — {CATEGORY_MAP[b.category].label}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-green-700">
                La scheda che si apre al tocco
              </div>
              <SchedaImpresaModal business={b} embedded onPrenota={() => {}} onPrenotaServizio={() => {}} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
