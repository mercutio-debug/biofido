"use client";

import dynamic from "next/dynamic";

// Wrapper client: la mappa Leaflet va caricata solo lato client (ssr:false).
// Serve perché la scheda pubblica /azienda/[slug] è un server component.
const MappaPosizione = dynamic(() => import("@/components/MappaPosizione"), { ssr: false });

export function MappaPosizioneWrap(props: { lat: number; lon: number; label?: string }) {
  return <MappaPosizione {...props} />;
}
