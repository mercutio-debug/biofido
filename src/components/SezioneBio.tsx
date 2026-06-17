"use client";

import { useEffect, useState } from "react";
import {
  ENTI_CERTIFICATORI,
  BIO_VUOTO,
  type DatiBio,
  caricaDatiBio,
  salvaDatiBio,
  bioValido,
} from "@/lib/bio";
import { SOLO_BIO, PORTALE, URL_BIOFIDO } from "@/lib/portale";

/**
 * Parte 2 della scheda di iscrizione: «Sei un'azienda biologica?».
 * Logica identica sui due portali, interfaccia differenziata:
 *  - BioFido (SOLO_BIO): l'azienda DEVE essere bio certificata → niente flag,
 *    si chiede subito ente + numero + autocertificazione.
 *  - ECO-VISA: flag opzionale; se l'azienda è bio compaiono i campi della
 *    certificazione e la proposta di iscriversi anche a BioFido.
 */
export function SezioneBio({
  ownerId,
  onValid,
}: {
  ownerId: string;
  onValid?: (valido: boolean) => void;
}) {
  const [d, setD] = useState<DatiBio>({ ...BIO_VUOTO, is_bio: SOLO_BIO });
  const [usaAltro, setUsaAltro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    caricaDatiBio().then((dati) => {
      if (dati) {
        setD({ ...BIO_VUOTO, ...dati, is_bio: SOLO_BIO ? true : dati.is_bio });
        const lista = ENTI_CERTIFICATORI as readonly string[];
        if (dati.ente_certificatore && !lista.includes(dati.ente_certificatore)) {
          setUsaAltro(true);
        }
        setSalvato(true);
      } else if (SOLO_BIO) {
        setD((p) => ({ ...p, is_bio: true }));
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    onValid?.(salvato && bioValido(d));
  }, [salvato, d, onValid]);

  function set<K extends keyof DatiBio>(k: K, v: DatiBio[K]) {
    setD((p) => ({ ...p, [k]: v }));
    setSalvato(false);
  }

  async function salva() {
    setSaving(true);
    setMsg(null);
    try {
      await salvaDatiBio(ownerId, d);
      setSalvato(true);
      setMsg("Certificazione salvata ✅");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="card mt-6 p-6 text-sm text-green-900/60">
        Carico i dati di certificazione…
      </section>
    );
  }

  const enteDropdown = usaAltro ? "Altro" : d.ente_certificatore;

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">
        {SOLO_BIO ? "La tua certificazione biologica" : "Sei un'azienda biologica?"}
      </h2>

      {SOLO_BIO ? (
        <p className="mt-1 rounded-xl bg-leaf px-4 py-3 text-sm font-semibold text-green-800">
          BioFido è riservato alle <strong>aziende biologiche certificate</strong>.
          Indica il tuo organismo di controllo e il numero di certificazione.
        </p>
      ) : (
        <p className="mt-1 text-sm text-green-900/70">
          Puoi iscriverti come azienda convenzionale o biologica. Se sei bio
          certificata, dichiaralo qui: comparirai con il riconoscimento adeguato.
        </p>
      )}

      {/* Flag bio: su ECO-VISA è una scelta; su BioFido è dato per scontato */}
      {!SOLO_BIO && (
        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--lime-500)]"
            checked={d.is_bio}
            onChange={(e) => set("is_bio", e.target.checked)}
          />
          <span className="font-semibold text-green-800">
            Sì, sono un&apos;azienda biologica certificata
          </span>
        </label>
      )}

      {d.is_bio && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="label">Ente certificatore</span>
            <select
              className="field mt-1"
              value={enteDropdown}
              onChange={(e) => {
                if (e.target.value === "Altro") {
                  setUsaAltro(true);
                  set("ente_certificatore", "");
                } else {
                  setUsaAltro(false);
                  set("ente_certificatore", e.target.value);
                }
              }}
            >
              <option value="">— seleziona —</option>
              {ENTI_CERTIFICATORI.map((ente) => (
                <option key={ente} value={ente}>
                  {ente}
                </option>
              ))}
            </select>
            {usaAltro && (
              <input
                className="field mt-2"
                placeholder="Nome dell'organismo di controllo"
                value={d.ente_certificatore}
                onChange={(e) => set("ente_certificatore", e.target.value)}
              />
            )}
          </label>

          <label className="block">
            <span className="label">Numero di certificazione</span>
            <input
              className="field mt-1"
              value={d.numero_certificazione}
              placeholder="Codice operatore / n. certificato"
              onChange={(e) => set("numero_certificazione", e.target.value)}
            />
          </label>
        </div>
      )}

      {d.is_bio && (
        <label className="mt-4 flex items-start gap-3 rounded-xl bg-leaf/50 p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-[var(--lime-500)]"
            checked={d.autocertificato}
            onChange={(e) => set("autocertificato", e.target.checked)}
          />
          <span className="text-sm text-green-900/90">
            Autocertifico, sotto la mia responsabilità, di essere in possesso di
            certificazione biologica valida.
          </span>
        </label>
      )}

      {/* Proposta di iscrizione incrociata: solo da ECO-VISA, solo se bio */}
      {PORTALE === "ecovisa" && d.is_bio && (
        <div className="mt-4 rounded-xl border-2 border-badge-yellow bg-[#fffbe9] p-4">
          <div className="font-semibold text-green-800">
            🐾 Sei un&apos;azienda bio: ti va di iscriverti anche a BioFido?
          </div>
          <p className="mt-1 text-sm text-green-900/70">
            BioFido ti fa trovare sulla mappa del biologico a chilometro zero
            vicino ai consumatori. Stesso account, stesso abbonamento.
          </p>
          <a
            href={URL_BIOFIDO}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-lime mt-3 inline-block text-sm"
          >
            Scopri BioFido →
          </a>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          className="btn-lime"
          onClick={salva}
          disabled={saving || !bioValido(d)}
        >
          {saving ? "Salvo…" : salvato ? "Dati salvati ✅" : "Salva"}
        </button>
        {d.is_bio && !bioValido(d) && (
          <span className="text-xs text-green-900/55">
            Seleziona l&apos;ente, il numero e spunta l&apos;autocertificazione.
          </span>
        )}
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-green-700">{msg}</p>}
    </section>
  );
}
