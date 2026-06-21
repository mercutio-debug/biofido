-- FASE A e-commerce — schema di base.
-- Condiviso ECO-VISA / BioFido (DB Supabase unico). Da eseguire una sola volta
-- nell'SQL Editor di Supabase.
--
-- Introduce:
--   1) profiles     → tipo utente (cliente | azienda) + dati del cliente
--   2) ordini       → ordini di PRODOTTI (dal catalogo), con spedizione,
--                     importi ricalcolati lato server e prova dei 3 consensi
--   3) segnalazioni → "Segnala annuncio fraudolento" (notice-and-action DSA)

-- =========================================================================
-- 1) PROFILI UTENTE
-- Distingue chi ordina (cliente) da chi vende (azienda). Per i clienti tiene i
-- dati di contatto e l'indirizzo di spedizione predefinito.
-- =========================================================================
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  tipo           text not null default 'cliente' check (tipo in ('cliente', 'azienda')),
  nome           text,
  cognome        text,
  telefono       text,
  indirizzo      text,
  cap            text,
  citta          text,
  provincia      text,
  paese          text default 'IT',
  codice_fiscale text,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles lettura propria"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles inserimento proprio"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles modifica propria"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Crea automaticamente il profilo alla registrazione, leggendo il tipo
-- (cliente | azienda) dai metadati impostati da supabase.auth.signUp
-- (options.data.tipo). Se assente, default 'cliente'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, tipo)
  values (new.id, coalesce(new.raw_user_meta_data->>'tipo', 'cliente'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- 2) ORDINI DI PRODOTTI
-- owner = venditore (denormalizzato per RLS semplice). cliente_user_id =
-- acquirente registrato (per i prodotti la registrazione è OBBLIGATORIA).
-- totale_cents / commissione_cents sono RICALCOLATI lato server (Edge Function)
-- al pagamento: il client NON è fonte di verità sull'importo.
-- consensi = prova (jsonb) dei 3 flag click-wrap con timestamp.
-- =========================================================================
create table if not exists public.ordini (
  id                    uuid primary key default gen_random_uuid(),
  prodotto_id           uuid not null references public.catalogo (id) on delete restrict,
  owner                 uuid not null references auth.users (id),
  cliente_user_id       uuid not null references auth.users (id),
  -- dati "congelati" al momento dell'ordine
  cliente_nome          text not null,
  cliente_email         text not null,
  cliente_tel           text,
  quantita              integer not null default 1 check (quantita > 0),
  -- consegna
  modalita              text not null default 'spedizione'
                          check (modalita in ('spedizione', 'ritiro')),
  spedizione_indirizzo  text,
  spedizione_cap        text,
  spedizione_citta      text,
  spedizione_prov       text,
  spedizione_paese      text default 'IT',
  -- importi (ricalcolati lato server)
  totale_cents          integer not null default 0 check (totale_cents >= 0),
  commissione_rate      numeric not null default 0,
  commissione_cents     integer not null default 0,
  valuta                text not null default 'eur',
  -- prova dei 3 consensi click-wrap: { termini, venditore, privacy, ts }
  consensi              jsonb,
  -- pagamento Stripe
  stripe_payment_intent text,
  stripe_session_id     text,
  -- stato (copre sia "paga-subito" sia "approva-poi-paga")
  stato                 text not null default 'richiesto'
                          check (stato in ('richiesto','accettato','rifiutato',
                                           'pagato','spedito','consegnato','annullato')),
  note                  text,
  portale               text,
  created_at            timestamptz not null default now()
);

alter table public.ordini enable row level security;

-- Il cliente registrato crea e legge i propri ordini.
create policy "ordini inserimento cliente"
  on public.ordini for insert with check (auth.uid() = cliente_user_id);
create policy "ordini lettura cliente"
  on public.ordini for select using (auth.uid() = cliente_user_id);
-- Il venditore legge e gestisce gli ordini che lo riguardano.
create policy "ordini lettura venditore"
  on public.ordini for select using (auth.uid() = owner);
create policy "ordini aggiornamento venditore"
  on public.ordini for update using (auth.uid() = owner) with check (auth.uid() = owner);
-- Il cliente può aggiornare il proprio ordine (es. annullare finché possibile).
create policy "ordini aggiornamento cliente"
  on public.ordini for update using (auth.uid() = cliente_user_id) with check (auth.uid() = cliente_user_id);

create index if not exists ordini_owner_idx on public.ordini (owner);
create index if not exists ordini_cliente_idx on public.ordini (cliente_user_id);

-- =========================================================================
-- 3) SEGNALAZIONI (Segnala annuncio fraudolento — notice-and-action DSA)
-- Chiunque può segnalare un annuncio del catalogo (anche ospite). Le leggono
-- solo lo staff via service role (nessuna policy di select pubblica).
-- =========================================================================
create table if not exists public.segnalazioni (
  id          uuid primary key default gen_random_uuid(),
  catalogo_id uuid references public.catalogo (id) on delete cascade,
  segnalante  uuid references auth.users (id),
  email       text,
  motivo      text not null default 'frode'
              check (motivo in ('frode', 'illecito', 'contraffazione', 'altro')),
  dettaglio   text,
  portale     text,
  stato       text not null default 'nuova'
              check (stato in ('nuova', 'in_revisione', 'gestita')),
  created_at  timestamptz not null default now()
);

alter table public.segnalazioni enable row level security;

create policy "segnalazioni inserimento aperto"
  on public.segnalazioni for insert with check (true);
