-- Motore prenotazioni BioFido (MVP: richiesta da confermare, nessun pagamento
-- online). La commissione viene calcolata e registrata al momento della
-- richiesta: quando attiveremo Stripe Connect il dato sarà già lì.

-- Esperienze prenotabili (visite, degustazioni, corsi) di un produttore.
create table if not exists public.esperienze (
  id           bigint generated always as identity primary key,
  owner        uuid not null references auth.users (id) on delete cascade,
  titolo       text not null,
  descrizione  text,
  prezzo_cents integer not null default 0 check (prezzo_cents >= 0),
  durata_min   integer,
  max_persone  integer not null default 10 check (max_persone > 0),
  attiva       boolean not null default true,
  created_at   timestamptz default now()
);

alter table public.esperienze enable row level security;

-- Lettura pubblica: le esperienze sono visibili a chi vuole prenotare.
create policy "esperienze lettura pubblica"
  on public.esperienze for select using (true);
-- Ogni produttore gestisce solo le proprie esperienze.
create policy "esperienze gestione propria"
  on public.esperienze for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

-- Richieste di prenotazione. owner è denormalizzato (il produttore) per una
-- RLS semplice. totale/commissione sono calcolati dal client al momento.
create table if not exists public.prenotazioni (
  id                bigint generated always as identity primary key,
  esperienza_id     bigint not null references public.esperienze (id) on delete cascade,
  owner             uuid not null references auth.users (id),
  cliente_nome      text not null,
  cliente_email     text not null,
  cliente_tel       text,
  data_richiesta    date not null,
  persone           integer not null default 1 check (persone > 0),
  note              text,
  totale_cents      integer not null default 0,
  commissione_rate  numeric not null default 0,
  commissione_cents integer not null default 0,
  stato             text not null default 'in_attesa'
                      check (stato in ('in_attesa', 'confermata', 'rifiutata', 'annullata')),
  created_at        timestamptz default now()
);

alter table public.prenotazioni enable row level security;

-- Chiunque può inviare una richiesta (è un contatto/lead per il produttore).
create policy "prenotazioni inserimento aperto"
  on public.prenotazioni for insert with check (true);
-- Solo il produttore legge e gestisce le richieste che lo riguardano.
create policy "prenotazioni lettura propria"
  on public.prenotazioni for select using (auth.uid() = owner);
create policy "prenotazioni aggiornamento proprio"
  on public.prenotazioni for update
  using (auth.uid() = owner) with check (auth.uid() = owner);
