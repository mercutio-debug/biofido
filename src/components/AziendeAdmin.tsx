"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminListCompanies, adminSetPlan, type Company } from "@/lib/admin";
import { adminSetStatoOnboarding } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { PLAN_MAP, type Plan } from "@/lib/categories";

type FileOnb = { id: string; nome: string; url: string; created_at: string };

const PIANI: Plan[] = ["free", "silver", "gold"];

const ETICHETTE: Record<string, string> = {
  nome: "Nome",
  piva: "Partita IVA",
  codice_fiscale: "Codice fiscale",
  citta_sede: "Città sede",
  sito_web: "Sito web",
  ragione_sociale: "Ragione sociale",
  partita_iva: "Partita IVA",
  indirizzo: "Indirizzo",
  cap: "CAP",
  citta: "Città",
  provincia: "Provincia",
  paese: "Paese",
  codice_sdi: "Codice SDI",
  pec: "PEC",
  email: "Email fatturazione",
  is_bio: "Biologica",
  ente_certificatore: "Ente certificatore",
  numero_certificazione: "N° certificazione",
  autocertificato: "Autocertificato",
  name: "Nome attività",
  category: "Categoria",
  city: "Città",
  address: "Indirizzo",
  description: "Descrizione",
  website: "Sito web",
  phone: "Telefono",
  plan: "Piano scheda",
};

// campi tecnici da non mostrare (id interni, owner, timestamp, coordinate)
const SALTA = new Set([
  "id", "owner", "user_id", "created_at", "updated_at", "lat", "lon", "products",
]);

function Campi({ obj }: { obj: Record<string, unknown> | null }) {
  if (!obj) return <p className="text-sm text-green-900/45">— non compilato —</p>;
  const entries = Object.entries(obj).filter(
    ([k, v]) => !SALTA.has(k) && v !== null && v !== "" && v !== undefined,
  );
  if (entries.length === 0) return <p className="text-sm text-green-900/45">— non compilato —</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2 text-sm">
          <dt className="font-semibold text-green-900/55">{ETICHETTE[k] ?? k}:</dt>
          <dd className="break-words text-green-900/90">
            {typeof v === "boolean" ? (v ? "Sì" : "No") : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const BADGE: Record<Plan, string> = {
  free: "bg-[#e7eddf] text-green-900/70",
  silver: "bg-[#c9d3da] text-[#33414a]",
  gold: "bg-badge-yellow text-green-900",
};

export function AziendeAdmin() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<string, Plan>>({});
  // file onboarding caricati dalle aziende, raggruppati per owner (admin RLS)
  const [onbFiles, setOnbFiles] = useState<Record<string, FileOnb[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await adminListCompanies();
    if (r.error) setError(r.error);
    else setCompanies(r.companies ?? []);
    // documenti onboarding (admin può leggerli tutti via RLS)
    const { data: fls } = await supabase
      .from("onboarding_files")
      .select("owner, id, nome, url, created_at")
      .order("created_at", { ascending: false });
    const grp: Record<string, FileOnb[]> = {};
    for (const f of (fls as ({ owner: string } & FileOnb)[]) ?? []) {
      (grp[f.owner] ??= []).push({ id: f.id, nome: f.nome, url: f.url, created_at: f.created_at });
    }
    setOnbFiles(grp);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtrate = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return companies;
    return companies.filter((c) =>
      [
        c.email,
        c.nome,
        c.azienda?.nome,
        c.fatturazione?.ragione_sociale,
        c.fatturazione?.partita_iva,
        c.business?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t),
    );
  }, [companies, q]);

  async function assegna(c: Company) {
    if (!c.email) {
      setMsg("Questa azienda non ha un'email valida.");
      return;
    }
    const piano = sel[c.userId] ?? c.plan;
    setBusy(c.userId);
    setMsg(null);
    const r = await adminSetPlan(c.email, piano);
    setBusy(null);
    if (r.error) {
      setMsg(`Errore: ${r.error}`);
      return;
    }
    setMsg(`Piano ${PLAN_MAP[piano].label} assegnato a ${c.email} ✓`);
    load();
  }

  const conProfilo = companies.filter((c) => c.azienda || c.business).length;

  return (
    <section className="card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-green-800">Aziende iscritte</h2>
          <p className="text-sm text-green-900/70">
            {companies.length} account · {conProfilo} con scheda compilata. Assegna o
            regala un piano direttamente da qui.
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-sm" disabled={loading}>
          {loading ? "Carico…" : "↻ Aggiorna"}
        </button>
      </div>

      <input
        className="field mt-4"
        placeholder="Cerca per nome, email, P.IVA…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {msg && (
        <p className="mt-3 rounded-lg bg-leaf p-2 text-sm font-semibold text-green-700">{msg}</p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-semibold text-traffic-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-green-900/60">Caricamento elenco…</p>
      ) : filtrate.length === 0 ? (
        <p className="mt-6 text-sm text-green-900/60">Nessuna azienda trovata.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {filtrate.map((c) => {
            const titolo =
              (c.azienda?.nome as string) ||
              (c.business?.name as string) ||
              c.nome ||
              c.email ||
              "(senza nome)";
            const piano = sel[c.userId] ?? c.plan;
            return (
              <div
                key={c.userId}
                id={`onb-${c.userId}`}
                className="scroll-mt-20 rounded-2xl border border-[#e3eed7] bg-white p-5"
              >
                {/* intestazione */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display text-xl text-green-800">{titolo}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${BADGE[c.plan]}`}
                      >
                        {PLAN_MAP[c.plan].label}
                      </span>
                      {c.planStatus === "active_admin" && (
                        <span className="text-[11px] font-semibold text-green-700">🎁 omaggio</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-green-900/70">
                      {c.email}
                      {c.emailVerificata ? "" : " · ⚠️ email non confermata"}
                    </div>
                    <div className="text-xs text-green-900/50">
                      Iscritto il {c.createdAt ? new Date(c.createdAt).toLocaleDateString("it-IT") : "—"}
                      {c.vuoleBiofido ? " · vuole anche BioFido" : ""}
                    </div>
                  </div>

                  {/* assegna piano */}
                  <div className="flex flex-none items-center gap-2">
                    <select
                      className="field !w-auto py-1.5 text-sm"
                      value={piano}
                      onChange={(e) =>
                        setSel((s) => ({ ...s, [c.userId]: e.target.value as Plan }))
                      }
                    >
                      {PIANI.map((p) => (
                        <option key={p} value={p}>
                          {PLAN_MAP[p].label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-lime text-sm"
                      onClick={() => assegna(c)}
                      disabled={busy === c.userId || piano === c.plan}
                    >
                      {busy === c.userId ? "…" : piano === c.plan ? "Attuale" : "Assegna"}
                    </button>
                  </div>
                </div>

                {/* dati */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-leaf/30 p-3">
                    <div className="label mb-1">Anagrafica</div>
                    <Campi obj={c.azienda} />
                  </div>
                  <div className="rounded-xl bg-leaf/30 p-3">
                    <div className="label mb-1">Fatturazione</div>
                    <Campi obj={c.fatturazione} />
                  </div>
                  <div className="rounded-xl bg-leaf/30 p-3">
                    <div className="label mb-1">Certificazione bio</div>
                    <Campi obj={c.bio} />
                  </div>
                  <div className="rounded-xl bg-leaf/30 p-3">
                    <div className="label mb-1">Scheda BioFido</div>
                    <Campi obj={c.business} />
                  </div>
                </div>

                {/* Immagini di copertina: controllo contenuti (inappropriati) */}
                {(() => {
                  const imgAz = (c.azienda as Record<string, unknown> | null)?.immagine as string | undefined;
                  const imgBz = (c.business as Record<string, unknown> | null)?.immagine as string | undefined;
                  if (!imgAz && !imgBz) return null;
                  return (
                    <div className="mt-3">
                      <div className="label mb-1">Immagini (controllo contenuti)</div>
                      <div className="flex flex-wrap gap-2">
                        {imgAz && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={String(imgAz)} alt="copertina azienda" className="h-24 w-24 rounded-lg border border-[#e3eed7] object-cover" />
                        )}
                        {imgBz && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={String(imgBz)} alt="copertina BioFido" className="h-24 w-24 rounded-lg border border-[#e3eed7] object-cover" />
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-green-900/60">
                  <span>🛒 Prodotti ECO-VISA: {c.prodottiEcovisa}</span>
                  <span>📦 Prodotti BioFido: {c.prodottiBiofido}</span>
                  {c.planStatus && <span>Stato piano: {c.planStatus}</span>}
                </div>

                {/* Documenti onboarding caricati dall'azienda (listino/foto) */}
                {(onbFiles[c.userId]?.length ?? 0) > 0 && (
                  <div className="mt-3 rounded-xl border border-badge-yellow bg-[#fffbe9] p-3">
                    <div className="label mb-1">
                      📎 Documenti onboarding ({onbFiles[c.userId].length})
                    </div>
                    <ul className="space-y-1">
                      {onbFiles[c.userId].map((f) => (
                        <li key={f.id} className="text-sm">
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-green-700 hover:underline"
                          >
                            📄 {f.nome}
                          </a>
                          <span className="ml-2 text-[11px] text-green-900/50">
                            {new Date(f.created_at).toLocaleDateString("it-IT")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Onboarding «Ci pensiamo noi»: chiusura / richiesta integrazioni */}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Segnare l'onboarding come COMPLETATO? L'azienda potrà riacquistarlo per un nuovo giro.")) return;
                      const r = await adminSetStatoOnboarding(c.userId, "completato");
                      setMsg(r.error ? `Errore: ${r.error}` : `Onboarding completato per ${c.email}`);
                    }}
                    className="rounded-full bg-green-700 px-3 py-1 font-bold text-white hover:bg-green-800"
                  >
                    ✅ Onboarding completato
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const n = prompt("Cosa serve all'azienda? (le verrà inviato via mail + notifica + mostrato nella sua cornice)");
                      if (!n) return;
                      const r = await adminSetStatoOnboarding(c.userId, "integrazioni", n);
                      setMsg(r.error ? `Errore: ${r.error}` : `Integrazioni richieste a ${c.email}`);
                    }}
                    className="rounded-full border border-traffic-red px-3 py-1 font-bold text-traffic-red hover:bg-red-50"
                  >
                    📌 Richiedi integrazioni
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
