-- =====================================================================
-- Pagamenti sicuri: riferimenti al listino sulle prenotazioni
-- Permette alle edge function booking-pay / mollie-booking-pay di
-- RICALCOLARE l'importo dalla fonte vera (prodotti / catalogo), invece di
-- fidarsi di totale_cents/commissione_cents inviati dal client.
-- Eseguire nel pannello Supabase → SQL Editor (ref kvpxnxsjiyiixqksinzr)
-- Data: 2026-06-21
-- =====================================================================

-- riferimento a un PRODOTTO prenotabile (tabella prodotti)
alter table public.prenotazioni
  add column if not exists prodotto_id uuid
  references public.prodotti(id) on delete set null;

-- riferimento a una VOCE di catalogo / servizio extra (tabella catalogo)
alter table public.prenotazioni
  add column if not exists voce_id uuid
  references public.catalogo(id) on delete set null;
