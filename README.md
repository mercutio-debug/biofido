# 🐾 BioFido — il segugio del biologico

BioFido trova sulla mappa i **produttori, i negozi e le attività biologiche
vicino alla tua posizione**, entro il raggio che scegli (fino a **70 km**, il
limite teorico del concetto di *chilometro zero*), e ti aiuta a raggiungerli.

Fa parte del progetto **Pangea Etico** e condivide il database con
[ECO-VISA](../eco-visa).

## Funzioni (v1)

- 🗺️ **Mappa interattiva** (OpenStreetMap + Leaflet, gratuita).
- 📍 **Geolocalizzazione** del browser oppure ricerca per città.
- 🎚️ **Raggio regolabile** da 1 a 70 km.
- 🏷️ **Categorie**: azienda agricola, negozio bio, ristorante/agriturismo, artigiano.
- ⭐ **Piani di iscrizione** che cambiano il segnaposto sulla mappa:
  - **Gratuito** — pallino base con il colore della categoria.
  - **Silver** — segnaposto medio con l'icona della categoria + descrizione.
  - **Gold** — segnaposto grande con anello dorato + foto/prezzi dei prodotti.
- 🐾 **"Raggiungila"** — apre le indicazioni stradali verso l'attività.
- ☁️ Dati dal **database Supabase condiviso**; se la tabella non è pronta usa
  dati **demo** offline, così l'app è sempre navigabile.

## Avvio in locale

```bash
npm install      # installa le dipendenze
npm run dev      # avvia su http://localhost:3000
```

Serve un file `.env.local` con le chiavi Supabase (non versionato):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Pubblicazione

Il sito è un **export statico** (`output: "export"`). Ad ogni `push` sul branch
`main`, il workflow `.github/workflows/pages.yml` lo compila e lo pubblica su
**GitHub Pages**. Imposta nelle *Settings → Secrets and variables → Actions* del
repo i due segreti `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Database (per passare da demo a live)

Le attività vengono lette dalla tabella `biofido_businesses`. Per crearla,
incolla questo SQL nell'editor SQL di Supabase:

```sql
create table if not exists public.biofido_businesses (
  id          bigint generated always as identity primary key,
  owner       uuid references auth.users (id),
  name        text not null,
  category    text not null check (category in ('agricola','negozio','ristorante','artigiano')),
  plan        text not null default 'free' check (plan in ('free','silver','gold')),
  lat         double precision not null,
  lon         double precision not null,
  city        text not null,
  address     text,
  description text,
  website     text,
  phone       text,
  products    jsonb,
  created_at  timestamptz default now()
);

-- Lettura pubblica (la mappa è visibile a tutti)
alter table public.biofido_businesses enable row level security;
create policy "lettura pubblica" on public.biofido_businesses for select using (true);
-- Ogni azienda gestisce solo la propria scheda
create policy "modifica propria" on public.biofido_businesses
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
```

## Prossimi passi

- Pannello azienda per gestire la propria scheda (posizione, categoria, piano, prodotti).
- Pagamenti per i piani Silver/Gold.
- Reverse-geocoding reale (Nominatim) per indirizzi precisi.
