"use client";

import { useState } from "react";
import { ComuneAutocomplete } from "./ComuneAutocomplete";
import { calcolaImpronta, SEMAFORO } from "@/lib/impronta";
import { caricaImmagineCatalogo } from "@/lib/catalogo";
import { ImportoInput } from "./ImportoInput";
import { PLAN_MAP, type Plan } from "@/lib/categories";
import type { Product, MateriaPrima } from "@/lib/biofido-data";

const CATEGORIE = [
  "Ortaggi e verdura",
  "Frutta",
  "Conserve e sott'oli",
  "Formaggi e latticini",
  "Carni e salumi",
  "Pane e prodotti da forno",
  "Miele e dolci",
  "Vino, olio e bevande",
  "Altro",
];
const CERTIFICAZIONI = [
  "Bio certificato",
  "DOP",
  "IGP",
  "Presidio Slow Food",
  "Vegan",
  "Senza glutine",
];
const UNITA = ["a cassetta", "al kg", "a pezzo", "a confezione", "al litro"];

/**
 * Modulo completo per una scheda prodotto: guida il produttore a inserire tutti
 * i dati e mostra in tempo reale l'impronta di trasporto (distanza materie prime →
 * sede). Salva un oggetto Product nell'elenco prodotti della scheda.
 */
export function ProdottoEditor({
  sede,
  initial,
  onSave,
  onClose,
  ownerId,
  plan,
}: {
  sede: { lat: number; lon: number } | null;
  initial?: Product;
  onSave: (p: Product) => void;
  onClose: () => void;
  /** id utente: serve per salvare la foto nello storage (la RLS richiede l'uid) */
  ownerId: string;
  /** piano corrente: gestisce i blocchi visibili (foto/descrizione da Silver, prezzo/shop solo Gold) */
  plan: Plan;
}) {
  const info = PLAN_MAP[plan] ?? PLAN_MAP.free;
  // foto + descrizione del prodotto: da Silver in su; prezzo + shop: solo Gold.
  const media = info.showDescription;
  const gold = plan === "gold";
  const [name, setName] = useState(initial?.name ?? "");
  // categoria: se quella salvata non è tra le preimpostate, è una categoria
  // personalizzata → mostro "Altro" + il campo libero precompilato.
  const catPreset = CATEGORIE.includes(initial?.category ?? "");
  const [category, setCategory] = useState(
    catPreset ? (initial!.category as string) : initial?.category ? "Altro" : CATEGORIE[0],
  );
  const [categoriaCustom, setCategoriaCustom] = useState(
    catPreset ? "" : initial?.category ?? "",
  );
  const [price, setPrice] = useState(initial?.price ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? UNITA[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [foto2, setFoto2] = useState(initial?.foto2 ?? "");
  const [inShop, setInShop] = useState(initial?.in_shop ?? false);
  const [giacenza, setGiacenza] = useState(
    initial?.giacenza != null ? String(initial.giacenza) : "",
  );
  const [confezione, setConfezione] = useState(initial?.confezione ?? "");
  const [contenuto, setContenuto] = useState(
    initial?.contenuto != null ? String(initial.contenuto) : "",
  );
  const [unitaCont, setUnitaCont] = useState(initial?.unita ?? "");
  const [durata, setDurata] = useState(initial?.durata ?? "");
  const [caricando, setCaricando] = useState(false);
  const [caricando2, setCaricando2] = useState(false);
  const [ingredients, setIngredients] = useState<MateriaPrima[]>(
    initial?.ingredients ?? [{ nome: "", origine: "" }],
  );
  const [certs, setCerts] = useState<string[]>(initial?.certifications ?? []);
  const [mostraSemaforo, setMostraSemaforo] = useState(initial?.mostraSemaforo ?? true);
  // pubblicare questo prodotto anche su ECO-VISA (richiede il semaforo)
  const [pubblicaEcovisa, setPubblicaEcovisa] = useState(initial?.pubblicaEcovisa ?? false);
  // tipo voce: prodotto ordinario oppure servizio extra prenotabile dal cliente
  const [tipoVoce, setTipoVoce] = useState<"prodotto" | "servizio">(
    initial?.prenotabile ? "servizio" : "prodotto",
  );
  const [accetta, setAccetta] = useState<boolean>(initial?.prenotabile ?? false);
  const [err, setErr] = useState<string | null>(null);

  const imp = calcolaImpronta(sede, ingredients);
  const sem = SEMAFORO[imp.level];

  function setIng(i: number, patch: Partial<MateriaPrima>) {
    setIngredients((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function toggleCert(c: string) {
    setCerts((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function salva() {
    if (!name.trim()) {
      setErr("Inserisci il nome del prodotto.");
      return;
    }
    if (tipoVoce === "servizio" && !accetta) {
      setErr("Per rendere il servizio prenotabile, spunta l'accettazione qui sotto.");
      return;
    }
    onSave({
      name: name.trim(),
      category: category === "Altro" && categoriaCustom.trim() ? categoriaCustom.trim() : category,
      // prezzo solo Gold; foto + descrizione da Silver in su; Free = nome + semaforo
      price: gold ? price.trim() || undefined : undefined,
      unit,
      description: media ? description.trim() || undefined : undefined,
      image: media ? image.trim() || undefined : undefined,
      foto2: gold ? foto2.trim() || undefined : undefined,
      ingredients: ingredients.filter((i) => i.nome.trim()),
      certifications: certs,
      mostraSemaforo,
      // su ECO-VISA il semaforo è obbligatorio: senza, il prodotto resta solo su BioFido
      pubblicaEcovisa: mostraSemaforo && pubblicaEcovisa,
      prenotabile: tipoVoce === "servizio" && accetta,
      in_shop: tipoVoce === "prodotto" && gold && inShop,
      giacenza:
        tipoVoce === "prodotto" && gold && inShop && giacenza.trim() !== ""
          ? Math.max(0, Math.floor(Number(giacenza)) || 0)
          : undefined,
      // scorta piena di riferimento per i reminder (metà / un terzo / esaurito)
      giacenza_iniziale:
        tipoVoce === "prodotto" && gold && inShop && giacenza.trim() !== ""
          ? Math.max(0, Math.floor(Number(giacenza)) || 0)
          : undefined,
      confezione: gold ? confezione.trim() || undefined : undefined,
      contenuto: gold && contenuto.trim() !== "" ? Number(contenuto) : undefined,
      unita: gold ? unitaCont.trim() || undefined : undefined,
      durata: tipoVoce === "servizio" ? durata.trim() || undefined : undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-start justify-center overflow-y-auto bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="card my-4 w-full max-w-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl text-green-800">
            {initial ? "Modifica prodotto" : "Nuova scheda prodotto"}
          </h3>
          <button onClick={onClose} aria-label="Chiudi" className="text-2xl leading-none text-green-900/50 hover:text-green-900">
            ×
          </button>
        </div>

        <div className={`mt-4 grid gap-4 ${media ? "md:grid-cols-[130px_1fr]" : ""}`}>
          {/* foto: da Silver in su (Free = solo nome + semaforo) */}
          {media && (
          <div>
            <span className="label">Foto</span>
            <div className="mt-1 flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#cfe3b4] bg-leaf/40 text-green-900/50">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs">Anteprima</span>
              )}
            </div>
            <label className="btn-ghost mt-2 block cursor-pointer text-center text-xs">
              {caricando ? "Carico…" : "📷 Carica foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setCaricando(true);
                  setErr(null);
                  try {
                    setImage(await caricaImmagineCatalogo(ownerId, f));
                  } catch (er) {
                    setErr((er as Error).message);
                  } finally {
                    setCaricando(false);
                  }
                }}
              />
            </label>
            <input
              className="field mt-2 text-xs"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="…oppure incolla un link"
            />
          </div>
          )}

          {/* dati principali */}
          <div className="space-y-3">
            <label className="block">
              <span className="label">Nome del prodotto *</span>
              <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Cassetta ortaggi misti di stagione" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Categoria</span>
                <select className="field mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIE.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {category === "Altro" && (
                  <input
                    className="field mt-2"
                    value={categoriaCustom}
                    onChange={(e) => setCategoriaCustom(e.target.value)}
                    placeholder="Scrivi la tua categoria (es. Spezie, Tisane…)"
                  />
                )}
              </label>
              {gold && (
                <label className="block">
                  <span className="label">Prezzo</span>
                  <div className="mt-1 flex gap-2">
                    <ImportoInput
                      value={price}
                      onChange={setPrice}
                      className="field"
                      placeholder="€ 15,00"
                    />
                    <select className="field w-32" value={unit} onChange={(e) => setUnit(e.target.value)}>
                      {UNITA.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Le ESPERIENZE in azienda prenotabili si caricano dalla sezione dedicata
            "Catalogo & esperienze": qui si caricano solo i PRODOTTI. */}
        {tipoVoce === "servizio" && (
          <div className="mt-2 space-y-3 rounded-xl border border-badge-yellow bg-[#fffef6] p-3">
            <label className="block">
              <span className="label">Durata</span>
              <input
                className="field mt-1"
                value={durata}
                onChange={(e) => setDurata(e.target.value)}
                placeholder="Es. 2 ore, mezza giornata…"
              />
              <span className="mt-1 block text-[11px] text-green-900/55">
                La descrizione estesa e la foto extra dell&apos;attività sono i campi
                «Descrizione» e «Seconda foto» qui sopra.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-[var(--lime-500)]"
                checked={accetta}
                onChange={(e) => setAccetta(e.target.checked)}
              />
              <span className="text-green-900/85">
                <strong>Confermo</strong>: i clienti possono inviare una richiesta e, a
                conferma, pagare online tramite Stripe (BioFido tratterrà la commissione
                del piano).
              </span>
            </label>
          </div>
        )}

        {tipoVoce === "prodotto" && gold && (
          <label className="mt-2 flex items-start gap-2 rounded-xl border-2 border-[#cfe6b0] bg-leaf/50 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-[var(--lime-500)]"
              checked={inShop}
              onChange={(e) => setInShop(e.target.checked)}
            />
            <span className="text-green-900/85">
              <strong>🛒 Rendi questo prodotto ordinabile dallo shop.</strong> Il cliente lo
              ordina e <strong>paga subito online</strong>: ricevi l&apos;ordine già pagato, con i
              dati per fattura e spedizione, pronto da preparare e spedire.
            </span>
          </label>
        )}

        {tipoVoce === "prodotto" && gold && inShop && (
          <label className="mt-2 block">
            <span className="label">📦 Magazzino — quantità disponibile (vuoto = illimitata)</span>
            <input
              type="number"
              min={0}
              className="field mt-1 w-40"
              value={giacenza}
              onChange={(e) => setGiacenza(e.target.value)}
              placeholder="es. 20"
            />
          </label>
        )}

        {media && (
          <label className="mt-3 block">
            <span className="label">Descrizione</span>
            <textarea className="field mt-1" rows={2} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Racconta il prodotto: cos'è, come nasce, stagionalità…" />
            <span className="text-[11px] text-green-900/45">{description.length}/2000</span>
          </label>
        )}

        {/* confezione + contenuto: dettagli di vendita → solo Gold */}
        {tipoVoce === "prodotto" && gold && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="label">Confezione</span>
            <select className="field mt-1" value={confezione} onChange={(e) => setConfezione(e.target.value)}>
              <option value="">—</option>
              {["flacone", "barattolo", "sacchetto", "scatola", "bottiglia", "vasetto", "confezione"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Contenuto</span>
            <input
              type="number"
              min={0}
              step="any"
              className="field mt-1"
              value={contenuto}
              onChange={(e) => setContenuto(e.target.value)}
              placeholder="es. 10"
            />
          </label>
          <label className="block">
            <span className="label">Unità</span>
            <select className="field mt-1" value={unitaCont} onChange={(e) => setUnitaCont(e.target.value)}>
              <option value="">—</option>
              {["gr", "kg", "l", "dl", "ml", "cl", "pz"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        )}

        {gold && (
        <div className="mt-3">
          <span className="label">2ª foto (es. l&apos;etichetta) — opzionale</span>
          <div className="mt-1 flex items-center gap-3">
            {foto2 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto2} alt="" className="h-14 w-14 rounded-lg object-cover" />
            )}
            <label className="btn-ghost cursor-pointer text-xs">
              {caricando2 ? "Carico…" : "📷 Carica 2ª foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setCaricando2(true);
                  setErr(null);
                  try {
                    setFoto2(await caricaImmagineCatalogo(ownerId, f));
                  } catch (er) {
                    setErr((er as Error).message);
                  } finally {
                    setCaricando2(false);
                  }
                }}
              />
            </label>
            {foto2 && (
              <button
                type="button"
                className="text-xs font-semibold text-traffic-red"
                onClick={() => setFoto2("")}
              >
                Rimuovi
              </button>
            )}
          </div>
        </div>
        )}

        {/* materie prime (il semaforo): solo prodotti, i servizi speciali NON hanno semaforo */}
        {tipoVoce === "prodotto" && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="label">Materie prime e loro origine</span>
            <span className="text-xs text-green-900/55">servono per l&apos;impronta km0</span>
          </div>
          <div className="mt-2 space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                <input
                  className="field"
                  value={ing.nome}
                  onChange={(e) => setIng(i, { nome: e.target.value })}
                  placeholder="Materia prima (es. Pomodoro)"
                />
                <ComuneAutocomplete
                  value={ing.origine}
                  placeholder="Origine: gen… → Genova (GE)"
                  onSelect={(c) => setIng(i, { origine: `${c.nome} (${c.prov})`, lat: c.lat, lon: c.lon })}
                />
                <button
                  aria-label="Rimuovi"
                  className="btn-ghost h-9 w-9 justify-center p-0"
                  onClick={() => setIngredients((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="btn-ghost mt-2 text-sm" onClick={() => setIngredients((p) => [...p, { nome: "", origine: "" }])}>
            + Aggiungi materia prima
          </button>
        </div>
        )}

        {/* certificazioni */}
        <div className="mt-4">
          <span className="label">Certificazioni</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {CERTIFICAZIONI.map((c) => {
              const on = certs.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCert(c)}
                  aria-pressed={on}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-green-700 text-white" : "border border-[#cfe0bb] text-green-900/70"}`}
                >
                  {on ? "✓ " : ""}
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* anteprima impronta + flag semaforo: solo prodotti */}
        {tipoVoce === "prodotto" && (
        <>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-leaf p-3">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ background: sem.colore }} />
            <div>
              <div className="text-sm font-semibold text-green-800">Impronta: {sem.testo}</div>
              <div className="text-xs text-green-900/60">
                {sede ? `${imp.conteggio} materie prime geolocalizzate` : "Imposta prima la sede per il calcolo"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg text-green-800">{imp.co2Kg} kg</div>
            <div className="text-xs text-green-900/55">CO₂ trasporto · {imp.totalKm} km</div>
          </div>
        </div>

        {/* flag 1: pubblicare il prodotto col semaforo della filiera */}
        <label className="mt-3 flex items-start gap-2 rounded-xl border border-[#e3eed7] p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-[var(--lime-500)]"
            checked={mostraSemaforo}
            onChange={(e) => {
              const on = e.target.checked;
              setMostraSemaforo(on);
              if (!on) setPubblicaEcovisa(false); // senza semaforo non si pubblica su ECO-VISA
            }}
          />
          <span className="text-green-900/85">
            <strong>Voglio pubblicare questo prodotto con il semaforo della filiera.</strong>{" "}
            Togli la spunta per tenerlo nello shop di BioFido <em>senza</em> semaforo.
          </span>
        </label>

        {/* flag 2: pubblicare anche su ECO-VISA (richiede il semaforo) */}
        <label
          className={`mt-2 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            mostraSemaforo ? "border-[#e3eed7]" : "border-[#eee] bg-[#fafafa] opacity-60"
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-[var(--lime-500)]"
            disabled={!mostraSemaforo}
            checked={mostraSemaforo && pubblicaEcovisa}
            onChange={(e) => setPubblicaEcovisa(e.target.checked)}
          />
          <span className="text-green-900/85">
            <strong>Pubblica anche su ECO-VISA.</strong> Questo prodotto comparirà anche sul
            portale ECO-VISA, col suo semaforo. {mostraSemaforo
              ? "Lascia disattivato per tenerlo solo su BioFido."
              : ""}
          </span>
        </label>
        {!mostraSemaforo && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            🚦 Per pubblicare su <strong>ECO-VISA</strong> serve il <strong>semaforo</strong>{" "}
            (materie prime con la loro origine). Senza, il prodotto resta solo su BioFido.
          </p>
        )}
        </>
        )}

        {err && <p className="mt-3 text-sm font-semibold text-traffic-red">{err}</p>}

        <div className="mt-4 flex gap-3">
          <button className="btn-ghost flex-1 justify-center" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-lime flex-1 justify-center" onClick={salva}>
            Salva prodotto
          </button>
        </div>
      </div>
    </div>
  );
}
