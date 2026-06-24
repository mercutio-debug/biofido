import { supabase } from "./supabase";
import { listOrdiniRicevutiShop } from "./ordini-shop";
import { listMyBookings } from "./bookings";

/**
 * Conteggio delle cose che ASPETTANO una risposta dell'azienda: ordini shop
 * appena ricevuti (stato "richiesto") e prenotazioni "in attesa". Serve ai
 * badge lampeggianti del menu utente — senza l'approvazione dell'azienda
 * l'ordine/la prenotazione non parte, quindi vanno messi in evidenza.
 */
export type ContatoriSospeso = { ordini: number; prenotazioni: number };

export async function contaInSospeso(): Promise<ContatoriSospeso> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ordini: 0, prenotazioni: 0 };
  const [ord, pren] = await Promise.all([
    listOrdiniRicevutiShop().catch(() => []),
    listMyBookings(user.id).catch(() => []),
  ]);
  return {
    ordini: ord.filter((o) => o.stato === "richiesto").length,
    prenotazioni: pren.filter((b) => b.stato === "in_attesa").length,
  };
}
