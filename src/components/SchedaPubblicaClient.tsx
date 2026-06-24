"use client";

import { useState } from "react";
import type { Business, Product } from "@/lib/biofido-data";
import { SchedaImpresaModal } from "./SchedaImpresaModal";
import { PrenotaModal } from "./PrenotaModal";
import { RichiestaServizioModal } from "./RichiestaServizioModal";
import { ContattaAziendaModal } from "./ContattaAziendaModal";

/**
 * Scheda azienda RICCA e interattiva per la pagina pubblica /azienda/[slug]
 * (desktop/browser). Riusa `SchedaImpresaModal` in modalità `embedded` (inline,
 * senza overlay), così sulla pagina si leggono prodotti e servizi (descrizioni
 * complete) e si può prenotare/ordinare — come nell'app, ma con URL proprio.
 */
export function SchedaPubblicaClient({
  business,
  demo,
}: {
  business: Business;
  demo: boolean;
}) {
  const [prenota, setPrenota] = useState<Business | null>(null);
  const [prenotaServizio, setPrenotaServizio] = useState<{ business: Business; servizio: Product } | null>(null);
  const [contatta, setContatta] = useState<Business | null>(null);

  return (
    <>
      <SchedaImpresaModal
        business={business}
        embedded
        onClose={() => {}}
        onPrenota={(b) => setPrenota(b)}
        onPrenotaServizio={(b, s) => setPrenotaServizio({ business: b, servizio: s })}
        onContatta={(b) => setContatta(b)}
      />

      {prenota && (
        <PrenotaModal business={prenota} demo={demo} onClose={() => setPrenota(null)} />
      )}
      {prenotaServizio && (
        <RichiestaServizioModal
          business={prenotaServizio.business}
          servizio={prenotaServizio.servizio}
          demo={demo}
          onClose={() => setPrenotaServizio(null)}
        />
      )}
      {contatta && (
        <ContattaAziendaModal business={contatta} onClose={() => setContatta(null)} />
      )}
    </>
  );
}
