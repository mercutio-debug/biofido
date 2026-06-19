"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { nearestPlace } from "@/lib/geo";
import { loadBusinesses, type Business } from "@/lib/biofido-data";
import { CATEGORIES, CATEGORY_MAP, PLAN_MAP, rankScore, type CategoryId } from "@/lib/categories";
import { experiencesByOwners } from "@/lib/bookings";
import { ComuneAutocomplete } from "./ComuneAutocomplete";
import { PrenotaModal } from "./PrenotaModal";

// La mappa Leaflet usa `window`: va caricata solo lato browser.
const BioFidoMap = dynamic(() => import("./BioFidoMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl bg-leaf text-green-700">
      Carico la mappa…
    </div>
  ),
});

/** distanza in km tra due coordinate (Haversine), arrotondata. */
function distKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const MAX_RADIUS = 70; // km — limite teorico del "chilometro zero"

export function MapExperience() {
  const [center, setCenter] = useState({ lat: 44.41, lon: 8.93 }); // Genova
  const [label, setLabel] = useState("Genova");
  const [city, setCity] = useState("Genova");
  const [radius, setRadius] = useState(30);
  const [cat, setCat] = useState<"all" | CategoryId>("all");
  const [all, setAll] = useState<Business[]>([]);
  const [source, setSource] = useState<"supabase" | "demo">("demo");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [prenota, setPrenota] = useState<Business | null>(null);

  // carica le attività dal database (o demo) all'avvio
  useEffect(() => {
    loadBusinesses().then(async ({ items, source }) => {
      // in modalità live carico le esperienze prenotabili e le lego ai produttori
      if (source === "supabase") {
        const byOwner = await experiencesByOwners(
          items.map((b) => b.owner).filter((o): o is string => Boolean(o)),
        );
        items = items.map((b) =>
          b.owner && byOwner[b.owner] ? { ...b, experiences: byOwner[b.owner] } : b,
        );
      }
      setAll(items);
      setSource(source);
    });
  }, []);

  function useMyPosition() {
    if (!navigator.geolocation) {
      setGeoMsg("Il tuo browser non supporta la geolocalizzazione.");
      return;
    }
    setGeoMsg("Individuo la tua posizione…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCenter({ lat: latitude, lon: longitude });
        const near = nearestPlace(latitude, longitude);
        setLabel(near?.name ? `Vicino a ${near.name}` : "La tua posizione");
        setGeoMsg(null);
      },
      () => setGeoMsg("Posizione non concessa. Digita la tua città qui sotto."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const results = useMemo(() => {
    return all
      .filter((b) => cat === "all" || b.category === cat)
      .map((b) => ({ ...b, dist: distKm(center.lat, center.lon, b.lat, b.lon) }))
      .filter((b) => b.dist <= radius)
      // Ordinamento "in evidenza": la distanza domina sempre (km0 credibile),
      // ma il piano dà una spinta misurabile (rankScore). A parità di zona un
      // Gold sale sopra un Free; non può però scavalcare chi è molto più vicino.
      .sort((a, b) => rankScore(b.plan, b.dist) - rankScore(a.plan, a.dist));
  }, [all, cat, center, radius]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* CONTROLLI */}
      <div className="card grid gap-4 p-5 md:grid-cols-[auto_1.3fr_1fr] md:items-end">
        <div>
          <span className="label">La tua posizione</span>
          <div className="mt-1 flex flex-col gap-2">
            <button type="button" className="btn-lime justify-center" onClick={useMyPosition}>
              📍 Usa la mia posizione
            </button>
          </div>
        </div>
        <div>
          <span className="label">…oppure scegli la città</span>
          <div className="mt-1">
            <ComuneAutocomplete
              value={city}
              onSelect={(c) => {
                setCity(c.nome);
                setCenter({ lat: c.lat, lon: c.lon });
                setLabel(c.nome);
                setGeoMsg(null);
              }}
              placeholder="Es. Albenga, Genova, Roma…"
            />
          </div>
        </div>
        <div>
          <span className="label">Raggio: {radius} km</span>
          <input
            type="range"
            min={1}
            max={MAX_RADIUS}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--lime-500)]"
          />
          <div className="flex justify-between text-[11px] text-green-900/50">
            <span>1 km</span>
            <span>km 0 · max {MAX_RADIUS} km</span>
          </div>
        </div>
      </div>

      {/* FILTRI CATEGORIA */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat("all")}
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            cat === "all" ? "bg-green-700 text-white" : "bg-leaf text-green-800"
          }`}
        >
          Tutte
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              cat === c.id ? "text-white" : "bg-leaf text-green-800"
            }`}
            style={cat === c.id ? { background: c.color } : undefined}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {geoMsg && (
        <p className="mt-3 rounded-lg bg-leaf px-3 py-2 text-sm font-semibold text-green-700">
          {geoMsg}
        </p>
      )}

      {/* MAPPA + RISULTATI */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden p-0">
          <BioFidoMap center={center} radiusKm={radius} businesses={results} userLabel={label} />
        </div>
        <div>
          <h2 className="font-display text-2xl text-green-800">
            {results.length} attività bio entro {radius} km
          </h2>
          <p className="text-xs text-green-900/50">
            Dati: {source === "supabase" ? "database BioFido (live)" : "demo offline"}
          </p>
          {results.length === 0 ? (
            <p className="mt-3 text-green-900/70">
              Nessuna attività bio in quest&apos;area. Allarga il raggio o cambia città.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {results.map((r) => {
                const c = CATEGORY_MAP[r.category];
                const fotos = (PLAN_MAP[r.plan].showProducts ? r.products ?? [] : [])
                  .map((p) => p.image)
                  .filter((u): u is string => Boolean(u))
                  .slice(0, 3);
                return (
                  <li
                    key={r.id}
                    className={`group relative flex items-center justify-between rounded-xl border px-4 py-3 ${
                      PLAN_MAP[r.plan].featuredEligible
                        ? "border-badge-yellow bg-[#fffbe9]"
                        : "border-[#e3eed7] bg-white"
                    }`}
                  >
                    {fotos.length > 0 && (
                      <div className="pointer-events-none absolute left-2 top-full z-30 mt-1 hidden gap-1 rounded-xl border border-[#e3eed7] bg-white p-1 shadow-lg group-hover:flex">
                        {fotos.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-green-800">
                        <span>{c.emoji}</span>
                        <span className="truncate">{r.name}</span>
                        {r.plan === "gold" && (
                          <span className="rounded-full bg-badge-yellow px-2 text-[10px] font-bold text-[#7a1f00]">
                            ★ In evidenza
                          </span>
                        )}
                        {r.plan === "silver" && (
                          <span className="rounded-full bg-[#c9d3da] px-2 text-[10px] font-bold text-[#33414a]">
                            SILVER
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-green-900/60">
                        {c.label} · {r.city}
                      </div>
                      {r.experiences && r.experiences.length > 0 && PLAN_MAP[r.plan].canSell && (
                        <button
                          type="button"
                          onClick={() => setPrenota(r)}
                          className="mt-2 rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                        >
                          🗓️ Prenota un&apos;esperienza
                        </button>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 shrink-0 text-right"
                    >
                      <div className="font-display text-lg text-lime-500">{r.dist} km</div>
                      <div className="text-[11px] font-semibold text-green-700">🐾 vai</div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {prenota && (
        <PrenotaModal
          business={prenota}
          demo={source !== "supabase"}
          onClose={() => setPrenota(null)}
        />
      )}
    </div>
  );
}
