"use client";

import { useEffect, useState } from "react";
import {
  haiOnboarding,
  listaFileOnboarding,
  caricaFileOnboarding,
  eliminaFileOnboarding,
  getStatoOnboarding,
  confermaCaricamentoCompleto,
  type FileOnboarding,
  type StatoOnboarding,
} from "@/lib/onboarding";

/**
 * Cornice «Ci pensiamo noi» (onboarding): compare solo se acquistato e finché il
 * processo non è "completato". Stati:
 *  - in_corso/integrazioni → l'azienda carica file + può confermare la fine
 *  - inviato → in attesa della verifica del nostro team (sola lettura)
 */
export function OnboardingCard() {
  const [attivo, setAttivo] = useState<boolean | null>(null);
  const [stato, setStato] = useState<StatoOnboarding>("in_corso");
  const [nota, setNota] = useState<string | null>(null);
  const [files, setFiles] = useState<FileOnboarding[]>([]);
  const [caricando, setCaricando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confermando, setConfermando] = useState(false);

  useEffect(() => {
    haiOnboarding().then(async (ok) => {
      if (!ok) {
        setAttivo(false);
        return;
      }
      const s = await getStatoOnboarding();
      setStato(s?.stato ?? "in_corso");
      setNota(s?.nota ?? null);
      // completato → la cornice non serve più (e l'acquisto si riattiva)
      setAttivo(s?.stato !== "completato");
      listaFileOnboarding().then(setFiles);
    });
  }, []);

  if (attivo !== true) return null;

  const inAttesa = stato === "inviato"; // tocca a noi: l'azienda è in sola lettura
  const integrazioni = stato === "integrazioni";

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
      setMsg(
        "Stiamo analizzando il tuo materiale, ti confermiamo che è tutto ok quanto prima! " +
          "(A volte ci sono documenti poco leggibili e dobbiamo verificare che sia tutto a " +
          "posto per aiutarti a creare il tuo bellissimo negozio!)",
      );
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

  async function confermaTutto() {
    if (
      !confirm(
        "Confermi di aver caricato TUTTO il materiale? Avviseremo il nostro team che procederà alla creazione del tuo negozio.",
      )
    )
      return;
    setConfermando(true);
    try {
      await confermaCaricamentoCompleto();
      setStato("inviato");
      alert("Hai completato il caricamento dei tuoi documenti, attendi la verifica del nostro team.");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setConfermando(false);
    }
  }

  return (
    <section className="card mt-6 border-2 border-badge-yellow bg-[#fffbe9] p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-badge-yellow px-2 py-0.5 text-[11px] font-bold text-[#7a1f00]">
          ✅ SERVIZIO ACQUISTATO CON SUCCESSO
        </span>
        <h2 className="font-display text-2xl text-green-800">«Ci pensiamo noi» — il tuo negozio chiavi in mano</h2>
      </div>

      {inAttesa ? (
        /* STATO INVIATO: sola lettura, in attesa del nostro team */
        <div className="mt-3 rounded-xl border border-[#e3eed7] bg-white p-4">
          <p className="font-semibold text-green-800">
            ⏳ Hai completato il caricamento dei tuoi documenti, attendi la verifica del nostro team.
          </p>
          <p className="mt-1 text-sm text-green-900/70">
            Ti avviseremo appena il tuo negozio è pronto (o se ci serve qualche integrazione).
          </p>
        </div>
      ) : (
        <>
          {integrazioni && (
            <div className="mt-3 animate-pulse rounded-xl border-2 border-traffic-red bg-[#fff3f3] p-3 text-sm font-semibold text-traffic-red">
              📌 Il nostro team ha bisogno di alcune integrazioni:
              {nota ? <span className="block font-normal text-green-900/80">{nota}</span> : null}
              <span className="block font-normal text-green-900/70">
                Carica il materiale mancante qui sotto, poi conferma di nuovo.
              </span>
            </div>
          )}
          <p className="mt-2 text-sm text-green-900/80">
            Carica nella cornice qui sotto il tuo materiale per costruire il tuo shop —
            formati <strong>.pdf .xls .jpg .png</strong> ecc.: <strong>listino</strong>,
            <strong> descrizione prodotti</strong> e <strong>immagini</strong>. Al resto
            pensiamo noi. Puoi aggiungere file quando vuoi.
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
          {msg && (
            <p className="mt-2 rounded-lg bg-leaf/60 p-2 text-sm font-semibold text-green-700">{msg}</p>
          )}
        </>
      )}

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
              {!inAttesa && (
                <button
                  type="button"
                  onClick={() => rimuovi(f.id)}
                  className="shrink-0 text-xs font-bold text-traffic-red hover:underline"
                >
                  ✕ rimuovi
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!inAttesa && (
        <button
          type="button"
          onClick={confermaTutto}
          disabled={confermando || files.length === 0}
          className="btn-lime mt-4 w-full justify-center disabled:opacity-50"
        >
          {confermando ? "Invio…" : "✅ Ho caricato tutto il materiale, procedete pure con la creazione del mio negozio"}
        </button>
      )}
    </section>
  );
}
