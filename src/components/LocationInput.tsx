"use client";

import { useState } from "react";
import { nearestPlace, geocode } from "@/lib/geo";

export function LocationInput({
  value,
  onChange,
  placeholder = "La tua città (es. Roma)",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function useMyPosition() {
    setErr(null);
    if (!("geolocation" in navigator)) {
      setErr("Geolocalizzazione non disponibile nel browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const near = nearestPlace(pos.coords.latitude, pos.coords.longitude);
        onChange(near.name);
        setLoading(false);
      },
      () => {
        setErr("Permesso negato: digita la tua città manualmente.");
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }

  const known = value ? !!geocode(value) : true;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="field"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="btn-ghost whitespace-nowrap" onClick={useMyPosition}>
          {loading ? "..." : "📍 Usa la mia posizione"}
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-traffic-red">{err}</p>}
      {value && !known && (
        <p className="mt-1 text-xs text-traffic-red">
          Località non riconosciuta dal geolocalizzatore demo. Prova con un
          capoluogo (es. Roma, Genova, Milano…).
        </p>
      )}
    </div>
  );
}
