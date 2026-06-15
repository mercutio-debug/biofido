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
};

/** Segnaposto HTML personalizzato: dimensione per piano, icona per categoria. */
function markerHtml(b: Business): string {
  const cat = CATEGORY_MAP[b.category];
  const plan = PLAN_MAP[b.plan];
  const size = plan.markerSize;
  const ring = b.plan === "gold" ? "box-shadow:0 0 0 3px #f7d417,0 2px 6px rgba(0,0,0,.4);" : "box-shadow:0 2px 6px rgba(0,0,0,.35);";
  const inner = plan.showIcon
    ? `<span style="font-size:${Math.round(size * 0.5)}px;line-height:1">${cat.emoji}</span>`
    : "";
  return `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${cat.color};border:2px solid #fff;${ring}
      display:flex;align-items:center;justify-content:center">
      <span style="transform:rotate(45deg)">${inner}</span></div>`;
}

function popupHtml(b: Business): string {
  const cat = CATEGORY_MAP[b.category];
  const plan = PLAN_MAP[b.plan];
  const planBadge =
    b.plan === "gold"
      ? `<span style="background:#f7d417;color:#7a1f00;font-weight:700;border-radius:999px;padding:1px 8px;font-size:11px">★ GOLD</span>`
      : b.plan === "silver"
      ? `<span style="background:#c9d3da;color:#33414a;font-weight:700;border-radius:999px;padding:1px 8px;font-size:11px">SILVER</span>`
      : "";
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`;
  let html = `<div style="min-width:180px;font-family:system-ui,sans-serif">
    <div style="font-weight:700;color:#2f6f12;font-size:15px">${b.name} ${planBadge}</div>
    <div style="color:#5a6b50;font-size:12px;margin-top:2px">${cat.emoji} ${cat.label} · ${b.city}</div>`;
  if (b.address) html += `<div style="color:#5a6b50;font-size:12px">${b.address}</div>`;
  // descrizione: solo Silver/Gold
  if (b.description && b.plan !== "free")
    html += `<div style="margin-top:6px;font-size:12px;color:#33414a">${b.description}</div>`;
  // prodotti con prezzi: solo Gold
  if (plan.showProducts && b.products && b.products.length) {
    html += `<div style="margin-top:6px;border-top:1px solid #e3eed7;padding-top:6px">
      <div style="font-size:11px;font-weight:700;color:#2f6f12;text-transform:uppercase">Prodotti</div>`;
    for (const p of b.products)
      html += `<div style="display:flex;justify-content:space-between;font-size:12px;gap:8px">
        <span>${p.name}</span><span style="font-weight:600">${p.price ?? ""}</span></div>`;
    html += `</div>`;
  }
  html += `<a href="${dir}" target="_blank" rel="noopener"
      style="display:inline-block;margin-top:8px;background:#5baf38;color:#143306;font-weight:700;
      border-radius:999px;padding:5px 12px;font-size:12px;text-decoration:none">🐾 Raggiungila</a>`;
  html += `</div>`;
  return html;
}

export default function BioFidoMap({ center, radiusKm, businesses, userLabel }: Props) {
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
      L.marker([b.lat, b.lon], { icon }).bindPopup(popupHtml(b)).addTo(layer);
    }

    // inquadra l'area del raggio (bounds del diametro, senza dover aggiungere
    // il cerchio alla mappa)
    const bounds = L.latLng(center.lat, center.lon).toBounds(radiusKm * 2000);
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
  }, [center.lat, center.lon, radiusKm, businesses, userLabel]);

  return <div ref={divRef} className="h-full w-full rounded-2xl" style={{ minHeight: 420 }} />;
}
