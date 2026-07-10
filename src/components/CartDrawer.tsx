"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createOrdineShop, pagaOrdineShop } from "@/lib/ordini-shop";
import { loadAnagraficaCliente, anagraficaClienteCompleta } from "@/lib/clienti";
import {
  loadSpedizioneConfig,
  calcolaSpedizioneCents,
  spedizioneLabel,
  type SpedizioneConfig,
} from "@/lib/spedizione";
import { euroToCents } from "@/lib/prezzo";
import {
  getCart,
  setQty,
  removeItem,
  clearGroup,
  type CartItem,
} from "@/lib/carrello";

const euro = (c: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(c / 100);
const subtotaleGruppo = (g: CartItem[]) =>
  g.reduce((s, it) => s + (euroToCents(it.prezzo) ?? 0) * Math.max(1, it.qta), 0);

/**
 * Carrello e-commerce (Fase B): pulsante flottante + drawer. Raccoglie i
 * prodotti "ordinabili dallo shop" raggruppati per produttore (un cliente può
 * ordinare più prodotti dallo stesso produttore). "Invia l'ordine" recapita la
 * richiesta all'azienda (email + messaggi in dashboard via `contatti`); sarà poi
 * l'azienda a confermare (Fase C) e a gestire il pagamento (Fase D).
 */
export function CartDrawer({ portale }: { portale: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // regola di spedizione per venditore (owner) — per mostrare il totale al cliente
  const [sped, setSped] = useState<Record<string, SpedizioneConfig>>({});

  const refresh = () => setItems(getCart());
  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener("carrello-cambiato", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("carrello-cambiato", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  // col drawer aperto blocco lo scroll della pagina sotto: evita che lo sfondo
  // scorra/si sposti (la "schermata rovinata") quando si apre il carrello.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // carico le tariffe di spedizione dei venditori presenti nel carrello
  useEffect(() => {
    const owners = [...new Set(items.map((i) => i.owner).filter(Boolean))] as string[];
    if (!owners.length) return;
    let vivo = true;
    Promise.all(owners.map(async (o) => [o, await loadSpedizioneConfig(o)] as const)).then(
      (entries) => {
        if (vivo) setSped(Object.fromEntries(entries));
      },
    );
    return () => {
      vivo = false;
    };
  }, [items]);

  const count = items.reduce((n, x) => n + x.qta, 0);
  if (count === 0 && !open) return null;

  const gruppi = new Map<string, CartItem[]>();
  for (const it of items) gruppi.set(it.aziendaId, [...(gruppi.get(it.aziendaId) ?? []), it]);

  async function inviaOrdine(aziendaId: string, gruppo: CartItem[]) {
    const owner = gruppo[0]?.owner;
    if (!owner) {
      setMsg("Questo produttore non è ancora attivo per gli ordini online.");
      return;
    }
    setSending(aziendaId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSending(null);
      window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/accedi?tipo=cliente";
      return;
    }
    // anagrafica cliente obbligatoria: se manca, porto SUBITO al form da completare
    // (più utile del solo messaggio d'errore). Il carrello resta salvato.
    const anag = await loadAnagraficaCliente();
    if (!anagraficaClienteCompleta(anag)) {
      setSending(null);
      window.location.href =
        (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/account#anagrafica-cliente";
      return;
    }
    const articoli = gruppo.map((it) => ({
      prodottoId: it.prodottoId,
      nome: it.nome,
      prezzo: it.prezzo,
      qta: it.qta,
    }));
    const { id, error } = await createOrdineShop({
      owner,
      aziendaNome: gruppo[0].aziendaNome,
      portale,
      articoli,
    });
    if (error || !id) {
      setSending(null);
      setMsg("Ordine non riuscito: " + (error ?? "riprova"));
      return;
    }
    // ordine creato → svuoto SUBITO il carrello di questo produttore: gli articoli
    // sono ora "legati" all'ordine, non devono restare nel carrello per il prossimo.
    clearGroup(aziendaId);
    refresh();
    // Addebito immediato: vai SUBITO a Stripe. In caso di successo pagaOrdineShop
    // reindirizza alla pagina di pagamento (il codice sotto non viene eseguito).
    const pay = await pagaOrdineShop(id);
    setSending(null);
    if (pay.error) {
      setMsg(pay.error);
      return;
    }
  }

  return (
    <>
      {/* pulsante flottante */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri il carrello"
        className="fixed bottom-6 right-4 z-[160] flex items-center gap-2 rounded-full bg-green-700 px-5 py-4 text-base font-bold text-white shadow-xl ring-4 ring-lime-400/60 hover:bg-green-800"
      >
        🛒 <span>Carrello</span>
        {count > 0 && (
          <span className="ml-1 rounded-full bg-lime-400 px-2 py-0.5 text-sm font-bold text-green-900">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[180] flex justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e3eed7] px-5 py-3">
              <h2 className="font-display text-xl text-green-800">Il tuo carrello</h2>
              <button onClick={() => setOpen(false)} aria-label="Chiudi" className="text-2xl text-green-900/50 hover:text-green-900">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <p className="text-sm text-green-900/70">
                  Il carrello è vuoto. Aggiungi i prodotti dalla scheda di un&apos;azienda.
                </p>
              ) : (
                [...gruppi.entries()].map(([aziendaId, gruppo]) => (
                  <div key={aziendaId} className="mb-6 rounded-2xl border border-[#e3eed7] p-4">
                    <div className="font-display text-lg text-green-800">
                      {gruppo[0].aziendaNome}
                    </div>
                    <p className="mt-0.5 text-xs italic text-green-900/65">
                      🌱 Aiuta questa piccola azienda a crescere: prova anche altri suoi prodotti!
                    </p>
                    <ul className="mt-3 space-y-3">
                      {gruppo.map((it) => (
                        <li key={it.prodottoId} className="flex items-center gap-3">
                          {it.immagine && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.immagine} alt="" className="h-12 w-12 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-green-800">{it.nome}</div>
                            {it.prezzo && <div className="text-xs text-green-900/60">{it.prezzo}</div>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setQty(it.prodottoId, it.qta - 1); refresh(); }}
                              className="h-7 w-7 rounded-full border border-[#cfe0bb] text-green-800"
                              aria-label="Meno"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-green-800">{it.qta}</span>
                            <button
                              type="button"
                              disabled={it.giacenza != null && it.qta >= it.giacenza}
                              onClick={() => {
                                const max = it.giacenza ?? Infinity;
                                if (it.qta < max) {
                                  setQty(it.prodottoId, it.qta + 1);
                                  refresh();
                                }
                              }}
                              className="h-7 w-7 rounded-full border border-[#cfe0bb] text-green-800 disabled:opacity-40"
                              aria-label="Più"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => { removeItem(it.prodottoId); refresh(); }}
                            className="text-xs font-semibold text-traffic-red hover:underline"
                          >
                            Rimuovi
                          </button>
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      const sub = subtotaleGruppo(gruppo);
                      const pezzi = gruppo.reduce((n, it) => n + Math.max(1, it.qta), 0);
                      const owner = gruppo[0]?.owner;
                      const spedC = calcolaSpedizioneCents(owner ? sped[owner] : null, sub, pezzi);
                      return (
                        <div className="mt-3 border-t border-[#e3eed7] pt-2 text-sm">
                          <div className="flex justify-between text-green-900/70">
                            <span>Prodotti</span>
                            <span>{euro(sub)}</span>
                          </div>
                          <div className="flex justify-between text-green-900/70">
                            <span>Spedizione</span>
                            <span>{spedizioneLabel(spedC)}</span>
                          </div>
                          <div className="mt-1 flex justify-between font-bold text-green-800">
                            <span>Totale</span>
                            <span>{euro(sub + spedC)}</span>
                          </div>
                        </div>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => inviaOrdine(aziendaId, gruppo)}
                      disabled={sending === aziendaId}
                      className="btn-lime mt-4 w-full justify-center text-sm"
                    >
                      {sending === aziendaId ? "Invio…" : "Ordina da " + gruppo[0].aziendaNome}
                    </button>
                  </div>
                ))
              )}
            </div>

            <p className="border-t border-[#e3eed7] px-5 py-3 text-center text-[11px] text-green-900/55">
              Procedendo vai subito al pagamento sicuro (Stripe). L&apos;azienda
              riceve l&apos;ordine pagato e ti spedisce i prodotti.
            </p>
          </div>
        </div>
      )}

      {msg && (
        <div className="fixed bottom-20 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-green-800 px-5 py-2 text-center text-sm font-bold text-white shadow-lg">
          {msg}
        </div>
      )}
    </>
  );
}
