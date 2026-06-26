"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminListCompanies, adminSetPlan, adminResyncBiofido, type Company } from "@/lib/admin";
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

/** nome visualizzato di un'azienda (per elenco + ordinamento) */
function nomeOf(c: Company): string {
  return (
    (c.azienda?.nome as string) ||
    (c.business?.name as string) ||
    c.nome ||
    c.email ||
    "(senza nome)"
  );
}

/** cliente o azienda: dal metadato `tipo`; se manca (vecchi account) lo deduco
 *  da presenza di profilo/scheda/dati fiscali o piano a pagamento. */
function tipoOf(c: Company): "cliente" | "azienda" {
  if (c.tipo) return c.tipo === "cliente" ? "cliente" : "azienda";
  if (c.azienda || c.business || c.fatturazione || c.bio || c.plan !== "free") return "azienda";
  return "cliente";
}

/** Tabella "tipo foglio": una riga per campo, etichetta a sinistra, valore a destra. */
function Tabella({ obj }: { obj: Record<string, unknown> | null }) {
  if (!obj) return <p className="px-3 py-2 text-sm text-green-900/45">— non compilato —</p>;
  const entries = Object.entries(obj).filter(
    ([k, v]) => !SALTA.has(k) && v !== null && v !== "" && v !== undefined,
  );
  if (entries.length === 0)
    return <p className="px-3 py-2 text-sm text-green-900/45">— non compilato —</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b border-[#eef3e6] last:border-0">
            <td className="w-1/3 bg-leaf/30 px-3 py-1.5 align-top font-semibold text-green-900/60">
              {ETICHETTE[k] ?? k}
            </td>
            <td className="px-3 py-1.5 align-top text-green-900/90 break-words">
              {typeof v === "boolean" ? (v ? "Sì" : "No") : String(v)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
  const [onbFiles, setOnbFiles] = useState<Record<string, FileOnb[]>>({});
  const [onbStato, setOnbStato] = useState<Record<string, { stato: string; updated_at: string }>>({});
  const [apertaId, setApertaId] = useState<string | null>(null); // scheda aperta
  // "visto" dall'admin: quando richiude una scheda, la sua notifica si spegne
  const [visto, setVisto] = useState<Record<string, number>>({});

  // carica i timestamp "visto" salvati localmente
  useEffect(() => {
    try {
      setVisto(JSON.parse(localStorage.getItem("admin_visto") || "{}"));
    } catch {
      /* ignore */
    }
  }, []);

  // segna una scheda come vista (notifica spenta) alla chiusura
  function segnaVisto(userId: string) {
    setVisto((v) => {
      const next = { ...v, [userId]: Date.now() };
      try {
        localStorage.setItem("admin_visto", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await adminListCompanies();
    if (r.error) setError(r.error);
    else setCompanies(r.companies ?? []);
    const { data: fls } = await supabase
      .from("onboarding_files")
      .select("owner, id, nome, url, created_at")
      .order("created_at", { ascending: false });
    const grp: Record<string, FileOnb[]> = {};
    for (const f of (fls as ({ owner: string } & FileOnb)[]) ?? []) {
      (grp[f.owner] ??= []).push({ id: f.id, nome: f.nome, url: f.url, created_at: f.created_at });
    }
    setOnbFiles(grp);
    // stato onboarding (per il pallino "in attesa di verifica")
    const { data: st } = await supabase
      .from("onboarding_stato")
      .select("owner, stato, updated_at");
    const sm: Record<string, { stato: string; updated_at: string }> = {};
    for (const r of (st as { owner: string; stato: string; updated_at: string }[]) ?? []) {
      sm[r.owner] = { stato: r.stato, updated_at: r.updated_at };
    }
    setOnbStato(sm);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // elenco filtrato + ORDINATO ALFABETICAMENTE
  const elenco = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = !t
      ? companies
      : companies.filter((c) =>
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
    return [...base].sort((a, b) =>
      nomeOf(a).localeCompare(nomeOf(b), "it", { sensitivity: "base" }),
    );
  }, [companies, q]);

  const aperta = companies.find((c) => c.userId === apertaId) ?? null;

  // notifiche per azienda: c'è qualcosa da controllare (documenti caricati o
  // onboarding "inviato") più recente dell'ultima volta che ho aperto la scheda.
  const notifiche = useMemo(() => {
    const m: Record<string, { mostra: boolean; count: number }> = {};
    for (const c of companies) {
      const files = onbFiles[c.userId] ?? [];
      const st = onbStato[c.userId];
      const pending = files.length > 0 || st?.stato === "inviato";
      if (!pending) {
        m[c.userId] = { mostra: false, count: 0 };
        continue;
      }
      const times: number[] = [];
      if (files[0]) times.push(new Date(files[0].created_at).getTime());
      if (st?.updated_at) times.push(new Date(st.updated_at).getTime());
      const latest = times.length ? Math.max(...times) : 0;
      m[c.userId] = { mostra: latest > (visto[c.userId] ?? 0), count: files.length };
    }
    return m;
  }, [companies, onbFiles, onbStato, visto]);

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
            {companies.length} account · {conProfilo} con scheda compilata.
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-sm" disabled={loading}>
          {loading ? "Carico…" : "↻ Aggiorna"}
        </button>
      </div>

      {msg && (
        <p className="mt-3 rounded-lg bg-leaf p-2 text-sm font-semibold text-green-700">{msg}</p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-semibold text-traffic-red">
          {error}
        </p>
      )}

      {/* ====== DETTAGLIO (scheda aperta) ====== */}
      {aperta ? (
        <SchedaDettaglio
          c={aperta}
          files={onbFiles[aperta.userId] ?? []}
          piano={sel[aperta.userId] ?? aperta.plan}
          busy={busy === aperta.userId}
          onPiano={(p) => setSel((s) => ({ ...s, [aperta.userId]: p }))}
          onAssegna={() => assegna(aperta)}
          onIndietro={() => {
            segnaVisto(aperta.userId); // spegne la notifica alla chiusura
            setApertaId(null);
          }}
          onAdmin={(t) => setMsg(t)}
        />
      ) : (
        <>
          {/* ====== ELENCO ALFABETICO ====== */}
          <input
            className="field mt-4"
            placeholder="Cerca per nome, email, P.IVA…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {loading ? (
            <p className="mt-6 text-sm text-green-900/60">Caricamento elenco…</p>
          ) : elenco.length === 0 ? (
            <p className="mt-6 text-sm text-green-900/60">Nessun account trovato.</p>
          ) : (
            <div className="mt-5 space-y-6">
              <TabellaNomi
                titolo="Clienti"
                lista={elenco.filter((c) => tipoOf(c) === "cliente")}
                notifiche={notifiche}
                onApri={(id) => {
                  setApertaId(id);
                  setMsg(null);
                }}
              />
              <TabellaNomi
                titolo="Aziende"
                lista={elenco.filter((c) => tipoOf(c) === "azienda")}
                notifiche={notifiche}
                onApri={(id) => {
                  setApertaId(id);
                  setMsg(null);
                }}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ====================== TABELLA NOMI (elenco) ====================== */
function TabellaNomi({
  titolo,
  lista,
  notifiche,
  onApri,
}: {
  titolo: string;
  lista: Company[];
  notifiche: Record<string, { mostra: boolean; count: number }>;
  onApri: (id: string) => void;
}) {
  const daVedere = lista.filter((c) => notifiche[c.userId]?.mostra).length;
  return (
    <div className="overflow-hidden rounded-xl border border-[#e3eed7]">
      <div className="flex items-center justify-between bg-leaf/50 px-4 py-2">
        <span className="flex items-center gap-2 font-display text-lg text-green-800">
          {titolo}
          {daVedere > 0 && (
            <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-traffic-red px-2 py-0.5 text-[11px] font-bold text-white">
              🔔 {daVedere}
            </span>
          )}
        </span>
        <span className="text-xs font-bold text-green-900/55">{lista.length}</span>
      </div>
      {lista.length === 0 ? (
        <p className="px-4 py-3 text-sm text-green-900/45">— nessuno —</p>
      ) : (
        lista.map((c) => (
          <button
            key={c.userId}
            type="button"
            onClick={() => onApri(c.userId)}
            className="flex w-full items-center justify-between gap-3 border-b border-[#eef3e6] px-4 py-3 text-left last:border-0 hover:bg-leaf/30"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold text-green-800">{nomeOf(c)}</span>
              <span className="block truncate text-xs text-green-900/55">
                {c.email}
                {c.emailVerificata ? "" : " · ⚠️ email non confermata"}
              </span>
            </span>
            <span className="flex flex-none items-center gap-2">
              {notifiche[c.userId]?.mostra && (
                <span
                  className="inline-flex animate-pulse items-center gap-1 rounded-full bg-traffic-red px-2 py-0.5 text-[11px] font-bold text-white"
                  title="Da controllare: nuovi documenti / in attesa di verifica"
                >
                  🔔{notifiche[c.userId].count > 0 ? ` ${notifiche[c.userId].count}` : ""}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${BADGE[c.plan]}`}
              >
                {PLAN_MAP[c.plan].label}
              </span>
              <span className="text-green-900/40">›</span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}

/* ====================== SCHEDA DETTAGLIO (foglio) ====================== */
function SchedaDettaglio({
  c,
  files,
  piano,
  busy,
  onPiano,
  onAssegna,
  onIndietro,
  onAdmin,
}: {
  c: Company;
  files: FileOnb[];
  piano: Plan;
  busy: boolean;
  onPiano: (p: Plan) => void;
  onAssegna: () => void;
  onIndietro: () => void;
  onAdmin: (msg: string) => void;
}) {
  const imgAz = (c.azienda as Record<string, unknown> | null)?.immagine as string | undefined;
  const imgBz = (c.business as Record<string, unknown> | null)?.immagine as string | undefined;

  const [resyncing, setResyncing] = useState(false);
  async function resyncBiofido() {
    setResyncing(true);
    const r = await adminResyncBiofido(c.userId, (c.azienda as { id?: string } | null)?.id);
    setResyncing(false);
    onAdmin(
      r.error
        ? `Re-sync BioFido non riuscito: ${r.error}`
        : `✅ Scheda BioFido ri-sincronizzata (${r.prodotti ?? 0} prodotti). Semaforo e carrello ora allineati.`,
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onIndietro} className="btn-ghost text-sm">
          ← Torna all&apos;elenco
        </button>
        {c.tipo !== "cliente" && (
          <button
            type="button"
            onClick={resyncBiofido}
            disabled={resyncing}
            className="btn-ghost text-sm"
            title="Ricopia prodotti, ingredienti (semaforo) e dati carrello su BioFido"
          >
            {resyncing ? "Ri-sincronizzo…" : "🔄 Re-sincronizza BioFido"}
          </button>
        )}
      </div>

      {/* intestazione */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl text-green-800">{nomeOf(c)}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${BADGE[c.plan]}`}>
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
            {c.planStatus ? ` · stato piano: ${c.planStatus}` : ""}
          </div>
        </div>
        {/* assegna piano */}
        <div className="flex flex-none items-center gap-2">
          <select
            className="field !w-auto py-1.5 text-sm"
            value={piano}
            onChange={(e) => onPiano(e.target.value as Plan)}
          >
            {PIANI.map((p) => (
              <option key={p} value={p}>
                {PLAN_MAP[p].label}
              </option>
            ))}
          </select>
          <button className="btn-lime text-sm" onClick={onAssegna} disabled={busy || piano === c.plan}>
            {busy ? "…" : piano === c.plan ? "Attuale" : "Assegna"}
          </button>
        </div>
      </div>

      {/* dati raggruppati per tipo (foglio) */}
      <div className="mt-4 space-y-4">
        <Gruppo titolo="Anagrafica">
          <Tabella obj={c.azienda} />
        </Gruppo>
        <Gruppo titolo="Dati di fatturazione">
          <Tabella obj={c.fatturazione} />
        </Gruppo>
        <Gruppo titolo="Certificazione bio">
          <Tabella obj={c.bio} />
        </Gruppo>
        <Gruppo titolo="Scheda BioFido">
          <Tabella obj={c.business} />
        </Gruppo>

        <Gruppo titolo="Prodotti">
          <div className="flex flex-wrap gap-4 px-3 py-2 text-sm font-semibold text-green-900/70">
            <span>🛒 ECO-VISA: {c.prodottiEcovisa}</span>
            <span>📦 BioFido: {c.prodottiBiofido}</span>
          </div>
        </Gruppo>

        {(imgAz || imgBz) && (
          <Gruppo titolo="Immagini (controllo contenuti)">
            <div className="flex flex-wrap gap-2 px-3 py-2">
              {imgAz && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgAz} alt="copertina azienda" className="h-28 w-28 rounded-lg border border-[#e3eed7] object-cover" />
              )}
              {imgBz && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgBz} alt="copertina BioFido" className="h-28 w-28 rounded-lg border border-[#e3eed7] object-cover" />
              )}
            </div>
          </Gruppo>
        )}

        <Gruppo titolo={`Documenti onboarding (${files.length})`}>
          {files.length === 0 ? (
            <p className="px-3 py-2 text-sm text-green-900/45">— nessun documento —</p>
          ) : (
            <ul className="px-3 py-2">
              {files.map((f) => (
                <li key={f.id} className="text-sm">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 hover:underline">
                    📄 {f.nome}
                  </a>
                  <span className="ml-2 text-[11px] text-green-900/50">
                    {new Date(f.created_at).toLocaleDateString("it-IT")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Gruppo>
      </div>

      {/* azioni onboarding */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Segnalare il negozio come PRONTO? L'azienda riceve mail+notifica e dovrà approvarlo (con manleva) per pubblicarlo.")) return;
            const r = await adminSetStatoOnboarding(c.userId, "pronto");
            onAdmin(r.error ? `Errore: ${r.error}` : `Negozio segnalato come pronto a ${c.email}: deve approvarlo.`);
          }}
          className="rounded-full bg-green-600 px-3 py-1 font-bold text-white hover:bg-green-700"
        >
          🛍️ Negozio pronto (da approvare)
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Segnare l'onboarding come COMPLETATO? L'azienda potrà riacquistarlo per un nuovo giro.")) return;
            const r = await adminSetStatoOnboarding(c.userId, "completato");
            onAdmin(r.error ? `Errore: ${r.error}` : `Onboarding completato per ${c.email}`);
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
            onAdmin(r.error ? `Errore: ${r.error}` : `Integrazioni richieste a ${c.email}`);
          }}
          className="rounded-full border border-traffic-red px-3 py-1 font-bold text-traffic-red hover:bg-red-50"
        >
          📌 Richiedi integrazioni
        </button>
      </div>
    </div>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e3eed7]">
      <div className="bg-leaf/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-800">
        {titolo}
      </div>
      {children}
    </div>
  );
}
