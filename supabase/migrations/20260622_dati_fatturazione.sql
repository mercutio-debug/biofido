-- Dati di fatturazione dell'impresa, necessari per emettere la fattura
-- elettronica (FatturaPA via SdI) quando l'impresa attiva un piano Silver/Gold.
-- Il piano Free non richiede questi dati. I prezzi sono + IVA 22% (B2B).
--
-- Recapito fattura elettronica (regola SdI):
--   • codice_sdi = 7 caratteri  → consegna al codice destinatario
--   • codice_sdi = '0000000' + pec → consegna alla PEC
--   • codice_sdi = '0000000' senza pec → cassetto fiscale del destinatario

create table if not exists public.dati_fatturazione (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  ragione_sociale text not null,
  partita_iva     text not null,
  codice_fiscale  text,
  indirizzo       text,
  cap             text,
  citta           text,
  provincia       text,
  paese           text not null default 'IT',
  -- recapito fattura elettronica
  codice_sdi      text not null default '0000000',
  pec             text,
  email           text,           -- email amministrativa per copia di cortesia
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.dati_fatturazione enable row level security;

-- L'impresa gestisce SOLO i propri dati di fatturazione.
create policy "fatturazione lettura propria"
  on public.dati_fatturazione for select
  using (auth.uid() = user_id);

create policy "fatturazione inserimento proprio"
  on public.dati_fatturazione for insert
  with check (auth.uid() = user_id);

create policy "fatturazione modifica propria"
  on public.dati_fatturazione for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
