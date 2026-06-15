"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LocationInput } from "./LocationInput";
import { Semaforo } from "./Semaforo";
import { Radar, type RadarPoint } from "./Radar";
import { deliveryCo2Kg, distanceKm, type EcoLevel } from "@/lib/footprint";

export type AltDTO = {
  slug: string;
  name: string;
  companyName: string;
  plant: string;
  totalCo2Kg: number;
  score: number;
  level: EcoLevel;
};

export type Km0DTO = {
  id: string;
  name: string;
  city: string;
  type: string;
};

const KM0_RADIUS = 70;

export function ProductTools({
  baseCo2Kg,
  alternatives,
  km0,
}: {
  baseCo2Kg: number;
  alternatives: AltDTO[];
  km0: Km0DTO[];
}) {
  const [loc, setLoc] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const altsRanked = useMemo(() => {
    if (!submitted || !loc) return [];
    return alternatives
      .map((a) => {
        const delivery = deliveryCo2Kg(a.plant, loc);
        const total = delivery === null ? a.totalCo2Kg : a.totalCo2Kg + delivery;
        return { ...a, delivery, totalWithDelivery: total };
      })
      .sort((a, b) => a.totalWithDelivery - b.totalWithDelivery);
  }, [submitted, loc, alternatives]);

  const km0Near = useMemo(() => {
    if (!submitted || !loc) return [];
    return km0
      .map((s) => ({ ...s, dist: distanceKm(s.city, loc) }))
      .filter((s) => s.dist !== null && s.dist <= KM0_RADIUS)
      .sort((a, b) => (a.dist! - b.dist!));
  }, [submitted, loc, km0]);

  const radarPoints: RadarPoint[] = km0Near.map((s, i) => ({
    id: s.id,
    name: s.name,
    category: s.type,
    distanceKm: s.dist!,
    angle: (i * 360) / Math.max(km0Near.length, 1) + 25,
  }));

  return (
    <div className="panel-dark mt-8 rounded-2xl p-6 md:p-8">
      <h2 className="font-display text-3xl">Trova alternative più ecologiche</h2>
      <p className="mt-1 max-w-2xl text-[#e6f4d3]">
        Indica dove ti trovi: calcoleremo anche la CO₂ di consegna fino a te e ti
        mostreremo prodotti simili più sostenibili, oltre agli spacci e ai negozi
        diretti entro {KM0_RADIUS} km (Spesa km0).
      </p>

      <div className="mt-5 max-w-xl rounded-xl bg-white/95 p-4">
        <LocationInput value={loc} onChange={setLoc} />
        <button
          type="button"
          className="btn-lime mt-3"
          onClick={() => setSubmitted(true)}
          disabled={!loc}
        >
          🔎 Trova alternative più ecologiche
        </button>
      </div>

      {submitted && loc && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* ALTERNATIVE */}
          <div>
            <h3 className="font-display text-2xl text-white">
              Alternative simili (consegna a {loc})
            </h3>
            {altsRanked.length === 0 ? (
              <p className="mt-2 text-[#e6f4d3]">
                Nessuna alternativa nel catalogo per questa categoria.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {altsRanked.map((a) => {
                  const better = a.totalWithDelivery < baseCo2Kg;
                  return (
                    <li key={a.slug} className="rounded-xl bg-white p-4 text-green-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/prodotti/${a.slug}`}
                            className="font-display text-xl text-green-800 hover:text-lime-500"
                          >
                            {a.name}
                          </Link>
                          <p className="text-sm text-green-900/70">
                            {a.companyName} · {a.plant}
                          </p>
                        </div>
                        <Semaforo level={a.level} size="sm" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <span>
                          Trasporto materie prime:{" "}
                          <strong>{a.totalCo2Kg.toLocaleString("it-IT")} kg</strong>
                        </span>
                        {a.delivery !== null && (
                          <span>
                            Consegna a te:{" "}
                            <strong>{a.delivery.toLocaleString("it-IT")} kg</strong>
                          </span>
                        )}
                        <span
                          className={
                            better ? "font-bold text-traffic-green" : "font-bold text-traffic-red"
                          }
                        >
                          Totale {a.totalWithDelivery.toLocaleString("it-IT")} kg{" "}
                          {better ? "↓ meglio" : "↑ peggio"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* SPESA KM0 */}
          <div>
            <h3 className="font-display text-2xl text-white">
              Spesa km0 · entro {KM0_RADIUS} km da {loc}
            </h3>
            {km0Near.length === 0 ? (
              <p className="mt-2 text-[#e6f4d3]">
                Nessuno spaccio o negozio diretto entro {KM0_RADIUS} km registrato
                per questa categoria.
              </p>
            ) : (
              <>
                <div className="mt-3 rounded-xl bg-white/95 p-3">
                  <Radar points={radarPoints} radiusKm={KM0_RADIUS} centerLabel={loc} />
                </div>
                <ul className="mt-3 space-y-2">
                  {km0Near.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg bg-white/95 px-4 py-2 text-green-900"
                    >
                      <div>
                        <div className="font-semibold text-green-800">{s.name}</div>
                        <div className="text-xs text-green-900/60">
                          {s.type} · {s.city}
                        </div>
                      </div>
                      <span className="font-display text-lg text-lime-500">
                        {s.dist} km
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
