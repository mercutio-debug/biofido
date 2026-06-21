-- Sicurezza schema per il flusso di pagamento prenotazioni (Stripe Connect).
-- booking-pay/computeBookingAmount leggono da `prenotazioni`: titolo, prodotto_id,
-- voce_id, ed esperienza_id (che per i SERVIZI extra è null). Garantiamo che le
-- colonne esistano e che esperienza_id sia nullable, così la query non va in
-- errore e il pagamento parte. Tutto idempotente: non rompe nulla se già a posto.

alter table public.prenotazioni add column if not exists titolo text;
alter table public.prenotazioni add column if not exists prodotto_id text;
alter table public.prenotazioni add column if not exists voce_id uuid;

-- i servizi extra del catalogo inseriscono esperienza_id = null
alter table public.prenotazioni alter column esperienza_id drop not null;
