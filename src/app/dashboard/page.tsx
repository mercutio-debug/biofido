"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { computeFootprint } from "@/lib/footprint";
import { Semaforo } from "@/components/Semaforo";

type Azienda = {
  id: string;
  nome: string;
  piva: string | null;
  citta_sede: string | null;
  sito_web: string | null;
};
type Stabilimento = { id: string; nome: string | null; citta: string };
type Ingrediente = { id?: string; nome: string; origine: string };
type Prodotto = {
  id: string;
  nome: string;
  categoria: string | null;
  stabilimento_citta: string;
  ingredienti: Ingrediente[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [azienda, setAzienda] = useState<Azienda | null>(null);
  const [stabilimenti, setStabilimenti] = useState<Stabilimento[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);

  // ---- caricamento dati ----
  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: az } = await supabase.from("aziende").select("*").limit(1);
    const a = (az?.[0] as Azienda) ?? null;
    setAzienda(a);
    if (a) {
      const { data: st } = await supabase
        .from("stabilimenti")
        .select("*")
        .eq("azienda_id", a.id)
        .order("created_at");
      setStabilimenti((st as Stabilimento[]) ?? []);

      const { data: pr } = await supabase
        .from("prodotti")
        .select("*")
        .eq("azienda_id", a.id)
        .order("created_at");
      const prods = (pr as Omit<Prodotto, "ingredienti">[]) ?? [];
      const withIngr: Prodotto[] = [];
      for (const p of prods) {
        const { data: ing } = await supabase
          .from("ingredienti")
          .select("*")
          .eq("prodotto_id", p.id)
          .order("created_at");
        withIngr.push({ ...p, ingredienti: (ing as Ingrediente[]) ?? [] });
      }
      setProdotti(withIngr);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/accedi");
      return;
    }
    loadAll();
  }, [authLoading, user, router, loadAll]);

  if (authLoading || loading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-green-900/70">Caricamento…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
            Area aziende
          </div>
          <h1 className="title-pangea text-3xl text-green-700 md:text-4xl">
            La tua dashboard
          </h1>
        </div>
        <button
          className="btn-ghost text-sm"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
        >
          Esci
        </button>
      </div>

      <AnagraficaCard
        azienda={azienda}
        initialNome={(user?.user_metadata as { nome?: string })?.nome}
        onSaved={loadAll}
      />

      {azienda && (
        <>
          <StabilimentiCard
            aziendaId={azienda.id}
            stabilimenti={stabilimenti}
            onChange={loadAll}
          />
          <ProdottiCard
            aziendaId={azienda.id}
            stabilimenti={stabilimenti}
            prodotti={prodotti}
            onChange={loadAll}
          />
        </>
      )}
    </div>
  );
}

/* ------------------- ANAGRAFICA AZIENDA ------------------- */
function AnagraficaCard({
  azienda,
  initialNome,
  onSaved,
}: {
  azienda: Azienda | null;
  initialNome?: string;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(azienda?.nome ?? initialNome ?? "");
  const [piva, setPiva] = useState(azienda?.piva ?? "");
  const [citta, setCitta] = useState(azienda?.citta_sede ?? "");
  const [sito, setSito] = useState(azienda?.sito_web ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setNome(azienda?.nome ?? initialNome ?? "");
    setPiva(azienda?.piva ?? "");
    setCitta(azienda?.citta_sede ?? "");
    setSito(azienda?.sito_web ?? "");
  }, [azienda, initialNome]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const payload = {
      nome,
      piva: piva || null,
      citta_sede: citta || null,
      sito_web: sito || null,
    };
    let error;
    if (azienda) {
      ({ error } = await supabase.from("aziende").update(payload).eq("id", azienda.id));
    } else {
      ({ error } = await supabase.from("aziende").insert(payload));
    }
    setSaving(false);
    if (error) setMsg("Errore: " + error.message);
    else {
      setMsg("Salvato ✓");
      onSaved();
    }
  }

  return (
    <section className="card mt-8 p-6">
      <h2 className="font-display text-2xl text-green-800">Scheda anagrafica</h2>
      <p className="mt-1 text-sm text-green-900/70">
        I dati della tua azienda. La sede non incide sul calcolo CO₂ (conta lo
        stabilimento di produzione).
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label">Nome azienda *</span>
          <input className="field mt-1" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Partita IVA</span>
          <input className="field mt-1" value={piva} onChange={(e) => setPiva(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Città sede</span>
          <input className="field mt-1" value={citta} onChange={(e) => setCitta(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Sito web</span>
          <input className="field mt-1" value={sito} onChange={(e) => setSito(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-lime" onClick={save} disabled={saving || !nome}>
          {saving ? "Salvataggio…" : azienda ? "Aggiorna dati" : "Salva azienda"}
        </button>
        {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
      </div>
    </section>
  );
}

/* ------------------- STABILIMENTI ------------------- */
function StabilimentiCard({
  aziendaId,
  stabilimenti,
  onChange,
}: {
  aziendaId: string;
  stabilimenti: Stabilimento[];
  onChange: () => void;
}) {
  const [nome, setNome] = useState("");
  const [citta, setCitta] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!citta.trim()) return;
    setSaving(true);
    await supabase
      .from("stabilimenti")
      .insert({ azienda_id: aziendaId, nome: nome || null, citta });
    setSaving(false);
    setNome("");
    setCitta("");
    onChange();
  }
  async function remove(id: string) {
    await supabase.from("stabilimenti").delete().eq("id", id);
    onChange();
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">Stabilimenti di produzione</h2>
      <p className="mt-1 text-sm text-green-900/70">
        La città dello stabilimento è il punto da cui si misura la distanza delle
        materie prime.
      </p>

      {stabilimenti.length > 0 && (
        <ul className="mt-4 space-y-2">
          {stabilimenti.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-[#e3eed7] bg-white px-4 py-2"
            >
              <span className="text-green-900">
                <strong>{s.citta}</strong>
                {s.nome ? ` — ${s.nome}` : ""}
              </span>
              <button
                className="text-xs font-bold text-traffic-red hover:underline"
                onClick={() => remove(s.id)}
              >
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="label">Città dello stabilimento *</span>
          <input
            className="field mt-1"
            value={citta}
            onChange={(e) => setCitta(e.target.value)}
            placeholder="Es. Cuneo"
          />
        </label>
        <label className="block">
          <span className="label">Nome (facoltativo)</span>
          <input
            className="field mt-1"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Stabilimento principale"
          />
        </label>
        <button className="btn-lime" onClick={add} disabled={saving || !citta}>
          Aggiungi
        </button>
      </div>
    </section>
  );
}

/* ------------------- PRODOTTI ------------------- */
function ProdottiCard({
  aziendaId,
  stabilimenti,
  prodotti,
  onChange,
}: {
  aziendaId: string;
  stabilimenti: Stabilimento[];
  prodotti: Prodotto[];
  onChange: () => void;
}) {
  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">I tuoi prodotti</h2>

      {prodotti.length > 0 && (
        <ul className="mt-4 space-y-3">
          {prodotti.map((p) => {
            const fp = computeFootprint(
              p.stabilimento_citta,
              p.ingredienti.map((i) => ({ name: i.nome, origin: i.origine }))
            );
            return (
              <li key={p.id} className="rounded-2xl border border-[#e3eed7] bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-xl text-green-800">{p.nome}</div>
                    <div className="text-xs text-green-900/60">
                      {p.categoria ? p.categoria + " · " : ""}prodotto a {p.stabilimento_citta} ·{" "}
                      {p.ingredienti.length} materie prime
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Semaforo level={fp.level} size="sm" />
                    <div className="text-right">
                      <div className="font-display text-lg text-green-800">
                        {fp.totalCo2Kg.toLocaleString("it-IT")} kg
                      </div>
                      <div className="text-[11px] text-green-900/60">CO₂ trasporto</div>
                    </div>
                    <button
                      className="text-xs font-bold text-traffic-red hover:underline"
                      onClick={async () => {
                        await supabase.from("prodotti").delete().eq("id", p.id);
                        onChange();
                      }}
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NuovoProdotto
        aziendaId={aziendaId}
        stabilimenti={stabilimenti}
        onSaved={onChange}
      />
    </section>
  );
}

function NuovoProdotto({
  aziendaId,
  stabilimenti,
  onSaved,
}: {
  aziendaId: string;
  stabilimenti: Stabilimento[];
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [stab, setStab] = useState(stabilimenti[0]?.citta ?? "");
  const [ingredienti, setIngredienti] = useState<Ingrediente[]>([
    { nome: "", origine: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!stab && stabilimenti[0]) setStab(stabilimenti[0].citta);
  }, [stabilimenti, stab]);

  // calcolo CO2 live
  const fp = useMemo(
    () =>
      computeFootprint(
        stab,
        ingredienti
          .filter((i) => i.nome && i.origine)
          .map((i) => ({ name: i.nome, origin: i.origine }))
      ),
    [stab, ingredienti]
  );

  function setIng(i: number, field: keyof Ingrediente, value: string) {
    setIngredienti((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
  }
  function addRow() {
    setIngredienti((prev) => [...prev, { nome: "", origine: "" }]);
  }
  function removeRow(i: number) {
    setIngredienti((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    const validIngr = ingredienti.filter((i) => i.nome.trim() && i.origine.trim());
    if (!nome.trim() || !stab.trim() || validIngr.length === 0) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("prodotti")
      .insert({
        azienda_id: aziendaId,
        nome,
        categoria: categoria || null,
        stabilimento_citta: stab,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      alert("Errore nel salvare il prodotto: " + (error?.message ?? ""));
      return;
    }
    const rows = validIngr.map((i) => ({
      prodotto_id: data.id,
      nome: i.nome,
      origine: i.origine,
    }));
    await supabase.from("ingredienti").insert(rows);
    setSaving(false);
    setNome("");
    setCategoria("");
    setIngredienti([{ nome: "", origine: "" }]);
    onSaved();
  }

  const hasStab = stabilimenti.length > 0;

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-[#cfe3b4] bg-leaf/40 p-5">
      <h3 className="font-display text-xl text-green-800">Aggiungi un prodotto</h3>
      {!hasStab && (
        <p className="mt-2 text-sm font-semibold text-traffic-red">
          Aggiungi prima almeno uno stabilimento di produzione qui sopra.
        </p>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="label">Nome prodotto *</span>
          <input className="field mt-1" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Categoria</span>
          <input
            className="field mt-1"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Es. Biscotti"
          />
        </label>
        <label className="block">
          <span className="label">Stabilimento *</span>
          <select className="field mt-1" value={stab} onChange={(e) => setStab(e.target.value)}>
            {stabilimenti.map((s) => (
              <option key={s.id} value={s.citta}>
                {s.citta}
                {s.nome ? ` — ${s.nome}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <span className="label">Ingredienti e loro origine</span>
        <div className="mt-2 space-y-2">
          {ingredienti.map((row, i) => {
            const res = fp.ingredients.find((r) => r.name === row.nome);
            const notFound =
              row.origine.trim() !== "" &&
              row.nome.trim() !== "" &&
              !!res &&
              !res.resolved;
            return (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <input
                  className="field"
                  value={row.nome}
                  onChange={(e) => setIng(i, "nome", e.target.value)}
                  placeholder="Materia prima (es. Farina di farro)"
                />
                <input
                  className="field"
                  value={row.origine}
                  onChange={(e) => setIng(i, "origine", e.target.value)}
                  placeholder="Origine (es. Siena)"
                />
                <div className="flex items-center gap-2">
                  {notFound && (
                    <span className="text-xs text-traffic-red">località ?</span>
                  )}
                  {ingredienti.length > 1 && (
                    <button
                      className="text-xs font-bold text-traffic-red hover:underline"
                      onClick={() => removeRow(i)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn-ghost mt-2 text-sm" onClick={addRow}>
          + Aggiungi materia prima
        </button>
      </div>

      {/* anteprima CO2 live */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4">
        <div className="flex items-center gap-3">
          <Semaforo level={fp.level} score={fp.score} />
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-green-800">
            {fp.totalCo2Kg.toLocaleString("it-IT")} kg
          </div>
          <div className="text-xs text-green-900/60">
            CO₂ di trasporto stimata · {fp.totalKm.toLocaleString("it-IT")} km
          </div>
        </div>
      </div>

      <button
        className="btn-lime mt-4"
        onClick={save}
        disabled={saving || !hasStab || !nome.trim()}
      >
        {saving ? "Salvataggio…" : "Salva prodotto"}
      </button>
    </div>
  );
}
