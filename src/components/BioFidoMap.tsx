"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CATEGORY_MAP, PLAN_MAP } from "@/lib/categories";
import type { Business } from "@/lib/biofido-data";

export type LatLon = { lat: number; lon: number };

type Props = {
  center: LatLon;
  radiusKm: number;
  businesses: Business[];
  userLabel?: string;
  /** apre la scheda dell'impresa al clic sul segnaposto */
  onSelect?: (b: Business) => void;
};

/**
 * Segnaposto a goccia, con gerarchia visiva per piano:
 *  - FREE  : piccolo, colore categoria, bordo bianco, ombra leggera, niente icona;
 *  - SILVER: più grande, icona categoria, alone ARGENTO;
 *  - GOLD  : il più grande, icona categoria, alone DORATO + badge ★ "in evidenza".
 * Il colore della goccia resta quello della categoria (riconoscibilità immediata).
 */
function markerHtml(b: Business): string {
  const cat = CATEGORY_MAP[b.category];
  const plan = PLAN_MAP[b.plan];
  const size = plan.markerSize;
  const emoji = Math.round(size * 0.46);

  // alone/ombra in base al livello (bordo bianco sempre, per stacco dalla mappa)
  let ring: string;
  let badge = "";
  if (b.plan === "gold") {
    ring =
      "border:2px solid #fff;box-shadow:0 0 0 3px #f7d417,0 0 12px rgba(247,212,23,.6),0 4px 10px rgba(0,0,0,.45);";
    badge =
      `<span style="position:absolute;top:-7px;right:-7px;width:20px;height:20px;border-radius:50%;` +
      `background:#f7d417;color:#7a1f00;font-size:12px;font-weight:900;line-height:1;` +
      `display:flex;align-items:center;justify-content:center;border:2px solid #fff;` +
      `box-shadow:0 1px 3px rgba(0,0,0,.35);z-index:2">★</span>`;
  } else if (b.plan === "silver") {
    ring = "border:2px solid #fff;box-shadow:0 0 0 2px #c9d3da,0 3px 8px rgba(0,0,0,.35);";
  } else {
    ring = "border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3);";
  }

  const inner = plan.showIcon
    ? `<span style="transform:rotate(45deg);font-size:${emoji}px;line-height:1">${cat.emoji}</span>`
    : "";

  return (
    `<div style="position:relative;width:${size}px;height:${size}px">` +
    badge +
    `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;` +
    `transform:rotate(-45deg);background:${cat.color};${ring}` +
    `display:flex;align-items:center;justify-content:center">${inner}</div>` +
    `</div>`
  );
}

export default function BioFidoMap({ center, radiusKm, businesses, userLabel, onSelect }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // init una sola volta
  useEffect(() => {
    if (mapRef.current || !divRef.current) return;
    const map = L.map(divRef.current, { scrollWheelZoom: true }).setView(
      [center.lat, center.lon],
      10
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // aggiorna marcatori, cerchio e vista quando cambiano i dati
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // posizione utente
    const userIcon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#2f6f12;border:3px solid #fff;box-shadow:0 0 0 3px rgba(91,175,56,.5)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([center.lat, center.lon], { icon: userIcon })
      .bindPopup(`<b>${userLabel ?? "La tua posizione"}</b>`)
      .addTo(layer);

    // cerchio del raggio (km -> metri)
    L.circle([center.lat, center.lon], {
      radius: radiusKm * 1000,
      color: "#5baf38",
      weight: 1.5,
      fillColor: "#8cc63f",
      fillOpacity: 0.12,
    }).addTo(layer);

    // attività
    for (const b of businesses) {
      const icon = L.divIcon({
        className: "",
        html: markerHtml(b),
        iconSize: [PLAN_MAP[b.plan].markerSize, PLAN_MAP[b.plan].markerSize],
        iconAnchor: [PLAN_MAP[b.plan].markerSize / 2, PLAN_MAP[b.plan].markerSize],
      });
      const marker = L.marker([b.lat, b.lon], { icon }).addTo(layer);
      marker.on("click", () => onSelect?.(b));
    }

    // inquadra l'area del raggio (bounds del diametro, senza dover aggiungere
    // il cerchio alla mappa)
    const bounds = L.latLng(center.lat, center.lon).toBounds(radiusKm * 2000);
    // includi anche eventuali attività mostrate oltre il raggio (alternative vicine)
    for (const b of businesses) bounds.extend([b.lat, b.lon]);
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
  }, [center.lat, center.lon, radiusKm, businesses, userLabel, onSelect]);

  return <div ref={divRef} className="h-full w-full rounded-2xl" style={{ minHeight: 420 }} />;
}
