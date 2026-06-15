# ECO-VISA — Prompt del progetto

> Brief riutilizzabile per (ri)generare il sito. Copialo e incollalo come
> richiesta a un assistente AI per ricreare o estendere il progetto.

---

## Obiettivo

Crea un sito internet **moderno** in **Next.js** chiamato **ECO-VISA**, basato
sul calcolo dell'**impronta ecologica delle materie prime** che compongono un
prodotto. È rivolto alle **aziende** che vogliono mostrare quanto le materie
prime utilizzate siano sostenibili: più una materia prima arriva da lontano,
peggiore è il punteggio.

## Stile e design

Usa colori, impostazioni e struttura delle **pagine 6, 7 e 8** del PDF
`PANGEA_ETICO_PROGETTO_CAPITELLI_M-compressed(2).pdf`:
- palette verde — verde scuro `#327413`, verde medio `#639e26`, verde lime
  `#5baf38`/`#8cc63f`;
- titoli in carattere condensato/corsivo (tipo Anton), maiuscolo verde;
- sfondo chiaro con pattern a puntini "mappa-mondo"; pannelli verde scuro per i
  box di calcolo; bottoni lime arrotondati;
- semaforo a tre luci (verde/giallo/rosso) e grafica a **cerchi concentrici**
  (rosso→giallo→verde) su mappa per i servizi geolocalizzati.

## Modello di calcolo

1. Si parte dallo **stabilimento di produzione** del prodotto.
2. Per ogni ingrediente si indica la **località d'origine**; un geolocalizzatore
   calcola in automatico i **km** dall'origine allo stabilimento (solo il nome
   della località, es. Siena → Cuneo ≈ 200 km).
3. CO₂ di trasporto:
   - materie prime **europee**: camion = **800 g CO₂/km**;
   - materie prime **extra-UE**: nave = **30 g CO₂/km** (tratta marittima fino al
     porto) **+ camion** dal porto di sbarco allo stabilimento.
4. La somma diventa un **semaforo**: verde (sostenibile), giallo (migliorabile),
   rosso (alto impatto).

## Funzionalità

- **Scheda azienda + prodotto**: dati del produttore e stabilimento di
  produzione (obbligatorio, è la base dei calcoli).
- **Scheda prodotto pubblica** (consultabile da tutti): elenco ingredienti con
  origine/km/CO₂, dati produttore e semaforo finale.
- **"Trova alternative più ecologiche"**: in base alla **posizione dell'utente**,
  suggerisce prodotti simili con punteggio migliore, calcolando anche la CO₂ di
  consegna dallo stabilimento all'utente.
- **Spesa km0** (rif. pag. 8): indica stabilimenti diretti al pubblico / negozi
  aziendali di quel tipo di prodotto entro **70 km** dall'utente (hub diffuso di
  produttori e commercianti locali).
- **BioFido**: ricerca geolocalizzata dei **soli produttori biologici** intorno
  all'utente (raggio scelto) con categoria merceologica; collegabile a Google
  Maps. Grafica: cane supereroe con badge a scudo "Bio" (logo `bio fido logo.jpg`).

## Esempio di riferimento

Prodotto: **"Biscotti al farro di zia Pina"**, prodotti a **Cuneo**. Ingredienti:
1. Farina di farro — Siena (Toscana)
2. Zucchero di canna — Brasile
3. Burro — Romania
4. Olio extravergine d'oliva — Bari (Puglia)

Risultato atteso: trasporto complessivo elevato → **CO₂ ≈ 3000 kg**, semaforo
**giallo**. Cliccando "trova alternative" da Roma, il sistema mostra prodotti
simili più ecologici e i negozi km0 entro 70 km.

## Stack tecnico

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Geolocalizzatore offline (dizionario località + formula di Haversine) in
  `src/lib/geo.ts`, sostituibile con Google Maps / OpenStreetMap.
- Motore di calcolo in `src/lib/footprint.ts`; dati seed in `src/lib/data.ts`.

## Avvio

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build di produzione
```
