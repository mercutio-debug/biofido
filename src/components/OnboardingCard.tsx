"use client";

import { useEffect, useState } from "react";
import {
  haiOnboarding,
  listaFileOnboarding,
  caricaFileOnboarding,
  eliminaFileOnboarding,
  type FileOnboarding,
} from "@/lib/onboarding";

/**
 * Cornice "Ci pensiamo noi" (onboarding): compare SOLO se l'azienda ha acquistato
 * il servizio. Conferma l'acquisto e permette di caricare listino (excel/word/pdf)
 * e foto: il nostro operatore li userà per costruire la scheda.
 */
export function OnboardingCard() {
  const [attivo, setAttivo] = useState<boolean | null>(null);
  const [files, setFiles] = useState<FileOnboarding[]>([]);
  const [caricando, setCaricando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    haiOnboarding().then((ok) => {
      setAttivo(ok);
      if (ok) listaFileOnboarding().then(setFiles);
    });
  }, []);

  if (attivo !== true) return null; // non acquistato → niente cornice

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []);
    if (!lista.length) return;
    setCaricando(true);
    setMsg(null);
    try {
      for (const f of lista) {
        const nuovo = await caricaFileOnboarding(f);
        setFiles((prev) => [nuovo, ...prev]);
      }
      setMsg("Caricato ✓ — grazie! Ci pensiamo noi.");
    } catch (err) {
      setMsg("Errore: " + (err as Error).message);
    } finally {
      setCaricando(false);
      e.target.value = "";
    }
  }

  async function rimuovi(id: string) {
    if (!confirm("Rimuovere questo file?")) return;
    await eliminaFileOnboarding(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <section className="card mt-6 border-2 border-badge-yellow bg-[#fffbe9] p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-badge-yellow px-2 py-0.5 text-[11px] font-bold text-[#7a1f00]">
          ✅ SERVIZIO ACQUISTATO CON SUCCESSO
        </span>
        <h2 className="font-display text-2xl text-green-800">«Ci pensiamo noi» — il tuo negozio chiavi in mano</h2>
      </div>
      <p className="mt-2 text-sm text-green-900/80">
        Carica nella cornice qui sotto il tuo materiale per costruire il tuo shop —
        formati <strong>.pdf .xls .jpg .png</strong> ecc.: <strong>listino</strong>,
        <strong> descrizione prodotti</strong> e <strong>immagini</strong>. Al resto
        pensiamo noi e costruiamo la tua scheda. Puoi aggiungere file quando vuoi.
      </p>

      <label className="btn-lime mt-4 inline-flex cursor-pointer">
        {caricando ? "Carico…" : "📎 Carica listino o foto"}
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
          className="hidden"
          onChange={onFile}
          disabled={caricando}
        />
      </label>
      {msg && <p className="mt-2 text-sm font-semibold text-green-700">{msg}</p>}

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#e3eed7] bg-white p-2 text-sm"
            >
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-semibold text-green-700 hover:underline"
              >
                📄 {f.nome}
              </a>
              <button
                type="button"
                onClick={() => rimuovi(f.id)}
                className="shrink-0 text-xs font-bold text-traffic-red hover:underline"
              >
                ✕ rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
