"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createOrdineShop } from "@/lib/ordini-shop";
import {
  getCart,
  setQty,
  removeItem,
  clearGroup,
  type CartItem,
} from "@/lib/carrello";

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
      window.location.href = "/accedi";
      return;
    }
    const articoli = gruppo.map((it) => ({
      prodottoId: it.prodottoId,
      nome: it.nome,
      prezzo: it.prezzo,
      qta: it.qta,
    }));
    const { error } = await createOrdineShop({
      owner,
      aziendaNome: gruppo[0].aziendaNome,
      portale,
      articoli,
    });
    setSending(null);
    if (error) {
      setMsg("Invio non riuscito: " + error);
      return;
    }
    clearGroup(aziendaId);
    refresh();
    setMsg("Ordine inviato! Ti arriverà un messaggio dall'azienda per confermare l'invio.");
    setTimeout(() => setMsg(null), 5000);
  }

  return (
    <>
      {/* pulsante flottante */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri il carrello"
        className="fixed bottom-5 right-5 z-[150] flex items-center gap-2 rounded-full bg-green-700 px-4 py-3 font-bold text-white shadow-lg hover:bg-green-800"
      >
        🛒 <span className="text-sm">Carrello</span>
        {count > 0 && (
          <span className="ml-1 rounded-full bg-lime-400 px-2 text-xs font-bold text-green-900">
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
              Inviando l&apos;ordine, ti arriverà un messaggio dall&apos;azienda per
              confermarti l&apos;invio dei prodotti.
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
