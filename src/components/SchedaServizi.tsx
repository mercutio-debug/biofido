"use client";

import { useState } from "react";
import type { Plan } from "@/lib/categories";

/**
 * Scheda unica "tutti i servizi" (BioFido): sotto la scelta del piano, mostra
 * in una sola tabella TUTTO ciò che offriamo. I servizi del piano selezionato
 * sono attivi; gli altri restano grigi con l'etichetta (Silver / Gold) che li
 * sblocca — panoramica immediata che invoglia a salire di piano.
 */
const PRIO: Record<Plan, number> = { free: 0, silver: 1, gold: 2 };
const NOME: Record<Plan, string> = { free: "Free", silver: "Silver", gold: "Gold" };

type Servizio = { icona: string; nome: string; descr: string; min: Plan };

const SERVIZI: Servizio[] = [
  { icona: "📍", nome: "Segnaposto sulla mappa", descr: "Ti trovano i consumatori vicino a te (km0).", min: "free" },
  { icona: "📞", nome: "Telefono e categoria visibili", descr: "Chi ti cerca può contattarti.", min: "free" },
  { icona: "📦", nome: "1° prodotto sulla scheda", descr: "Carica il tuo primo prodotto con il semaforo.", min: "free" },
  { icona: "📷", nome: "Foto dei prodotti", descr: "Immagini caricate e alleggerite in automatico.", min: "silver" },
  { icona: "🗂️", nome: "Fino a 10 prodotti", descr: "Pubblica più prodotti sulla tua scheda.", min: "silver" },
  { icona: "📝", nome: "Descrizione, sito web, contatti", descr: "Scheda più ricca e segnaposto più grande.", min: "silver" },
  { icona: "🔍", nome: "Priorità nei risultati della zona", descr: "Sali nelle ricerche vicino a te.", min: "silver" },
  { icona: "📊", nome: "Statistiche base", descr: "Quante visite riceve la tua scheda.", min: "silver" },
  { icona: "➕", nome: "Fino a 100 prodotti", descr: "Sblocca il «+» per caricarne fino a 100.", min: "gold" },
  { icona: "💶", nome: "Prezzi e prodotti/servizi in vendita", descr: "Mostra prezzi e vendi (anche visite e laboratori).", min: "gold" },
  { icona: "🗓️", nome: "Prenotazioni via widget", descr: "I clienti richiedono visite ed esperienze dalla mappa.", min: "gold" },
  { icona: "📈", nome: "Statistiche avanzate", descr: "Andamento nel tempo e area geografica.", min: "gold" },
  { icona: "⭐", nome: "In evidenza sulla mappa", descr: "La tua attività risalta in cima nella zona.", min: "gold" },
];

export function SchedaServizi({ piano }: { piano: Plan; attivo?: Plan }) {
  const [guida, setGuida] = useState(false);
  const incluso = (min: Plan) => PRIO[piano] >= PRIO[min];
  const maxSlot = piano === "free" ? 1 : 10;

  return (
    <section className="card mt-4 p-6">
      <h2 className="font-display text-2xl text-green-800">Tutti i servizi</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Stai vedendo il piano <strong>{NOME[piano]}</strong>: i servizi accesi sono
        inclusi, quelli grigi si sbloccano con Silver o Gold. Cambia piano qui sopra
        per vedere cosa ottieni.
      </p>

      <div className="mt-5 rounded-2xl border border-[#e3eed7] bg-leaf/30 p-4">
        <div className="text-sm font-bold text-green-800">Prodotti pubblicabili</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {Array.from({ length: 10 }).map((_, i) => {
            const on = i < maxSlot;
            return (
              <span
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                  on ? "bg-green-700 text-white" : "bg-[#e7eddf] text-green-900/35"
                }`}
              >
                {i + 1}
              </span>
            );
          })}
          <span
            className={`flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold ${
              piano === "gold" ? "bg-badge-yellow text-green-900" : "bg-[#e7eddf] text-green-900/35"
            }`}
          >
            + fino a 100
            {piano !== "gold" && <span className="font-normal">(Gold)</span>}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-green-900/55">
          Free: 1 prodotto · Silver: 10 · Gold: il «+» per arrivare fino a 100.
        </p>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {SERVIZI.map((s) => {
          const on = incluso(s.min);
          return (
            <li
              key={s.nome}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                on ? "border-green-600/40 bg-white" : "border-[#e3eed7] bg-[#f4f6ef] opacity-70"
              }`}
            >
              <span className={`text-xl ${on ? "" : "grayscale"}`}>{s.icona}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${on ? "text-green-800" : "text-green-900/45"}`}>
                    {s.nome}
                  </span>
                  {on ? (
                    <span className="text-sm text-green-600">✓</span>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        s.min === "gold" ? "bg-badge-yellow text-green-900" : "bg-[#c9d3da] text-[#33414a]"
                      }`}
                    >
                      {NOME[s.min]}
                    </span>
                  )}
                </div>
                <div className={`text-xs ${on ? "text-green-900/65" : "text-green-900/40"}`}>
                  {s.descr}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => setGuida((v) => !v)}
        className="mt-4 text-sm font-semibold text-green-700 hover:underline"
      >
        {guida ? "Nascondi la guida ai piani ▲" : "📖 Cosa ottieni con Free, Silver e Gold? — Guida ▼"}
      </button>

      {guida && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3eed7] p-4">
            <div className="font-display text-xl text-green-800">Free</div>
            <p className="mt-1 text-xs text-green-900/70">Per farti trovare sulla mappa, gratis.</p>
            <ul className="mt-2 space-y-1 text-sm text-green-900/85">
              <li>✓ Segnaposto sulla mappa</li>
              <li>✓ Telefono e categoria</li>
              <li>✓ 1 prodotto con semaforo</li>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-[#c9d3da] p-4">
            <div className="font-display text-xl text-green-800">Silver</div>
            <p className="mt-1 text-xs text-green-900/70">Per una scheda completa e visibile.</p>
            <ul className="mt-2 space-y-1 text-sm text-green-900/85">
              <li>✓ Tutto il Free, più:</li>
              <li>✓ Fino a 10 prodotti, con foto</li>
              <li>✓ Descrizione, sito web, contatti</li>
              <li>✓ Priorità nella zona + statistiche base</li>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-badge-yellow bg-[#fffbe9] p-4">
            <div className="font-display text-xl text-green-800">Gold</div>
            <p className="mt-1 text-xs text-green-900/70">Per vendere e ricevere prenotazioni.</p>
            <ul className="mt-2 space-y-1 text-sm text-green-900/85">
              <li>✓ Tutto il Silver, più:</li>
              <li>✓ Fino a 100 prodotti</li>
              <li>✓ Prezzi e prodotti/servizi in vendita</li>
              <li>✓ Prenotazioni via widget</li>
              <li>✓ Statistiche avanzate</li>
              <li>✓ In evidenza sulla mappa</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
