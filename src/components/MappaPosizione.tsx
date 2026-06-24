"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Mini-mappa SOLA LETTURA: mostra un segnaposto sulla posizione dell'azienda.
 * Usata nella scheda pubblica /azienda/[slug] per far vedere dove si trova.
 */
export default function MappaPosizione({
  lat,
  lon,
  label,
}: {
  lat: number;
  lon: number;
  label?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (mapRef.current || !divRef.current) return;
    const map = L.map(divRef.current, { scrollWheelZoom: false }).setView([lat, lon], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:#5baf38;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });
    const marker = L.marker([lat, lon], { icon }).addTo(map);
    if (label) marker.bindPopup(label);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={divRef} className="h-64 w-full rounded-2xl" />;
}
