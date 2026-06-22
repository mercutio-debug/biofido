-- Preferenze notifiche SMS (funzione GOLD): l'azienda può chiedere un SMS quando
-- riceve un nuovo ordine. Tabella per-utente (owner = venditore), condivisa tra
-- ECO-VISA e BioFido. L'invio vero parte solo quando colleghiamo il fornitore SMS
-- (segreto SMS_API_KEY su Edge Functions): finché manca, il codice è pronto ma
-- l'SMS viene saltato. Il gating Gold è applicato sia in UI sia lato server.

create table if not exists public.sms_preferenze (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  attivo     boolean not null default false,
  numero     text,
  updated_at timestamptz not null default now()
);

alter table public.sms_preferenze enable row level security;

create policy "sms lettura propria"
  on public.sms_preferenze for select using (auth.uid() = user_id);
create policy "sms inserimento proprio"
  on public.sms_preferenze for insert with check (auth.uid() = user_id);
create policy "sms aggiornamento proprio"
  on public.sms_preferenze for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
