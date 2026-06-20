-- Statistica per-prodotto (Gold): quale prodotto è stato aperto.
-- Aggiunge la colonna prodotto_id alle visite (null = visita generica alla scheda).
alter table public.biofido_visite add column if not exists prodotto_id text;

create index if not exists idx_biofido_visite_prodotto
  on public.biofido_visite (owner, prodotto_id);
