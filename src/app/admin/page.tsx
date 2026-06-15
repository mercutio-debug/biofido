"use client";

import { useCallback, useEffect, useState } from "react";
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
type Stab = { id: string; azienda_id: string; nome: string | null; citta: string };
type Prod = {
  id: string;
  azienda_id: string;
  nome: string;
  categoria: string | null;
  stabilimento_citta: string;
};
type Ingr = { id: string; prodotto_id: string; nome: string; origine: string };

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [stab, setStab] = useState<Stab[]>([]);
  const [prod, setProd] = useState<Prod[]>([]);
  const [ingr, setIngr] = useState<Ingr[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, p, i] = await Promise.all([
      supabase.from("aziende").select("*").order("created_at"),
      supabase.from("stabilimenti").select("*"),
      supabase.from("prodotti").select("*").order("created_at"),
      supabase.from("ingredienti").select("*"),
    ]);
    setAziende((a.data as Azienda[]) ?? []);
    setStab((s.data as Stab[]) ?? []);
    setProd((p.data as Prod[]) ?? []);
    setIngr((i.data as Ingr[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/accedi");
      return;
    }
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, user, isAdmin, router, load]);

  if (authLoading || loading) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-green-900/70">Caricamento…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="title-pangea text-3xl text-green-700">Area amministratore</h1>
        <p className="mt-3 text-traffic-red font-semibold">
          Accesso riservato all&apos;amministratore.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
            Amministratore
          </div>
          <h1 className="title-pangea text-3xl text-green-700 md:text-4xl">
            Tutte le aziende e i prodotti
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

      <div className="mt-4 flex gap-6 text-sm font-semibold text-green-900/70">
        <span>{aziende.length} aziende</span>
        <span>{prod.length} prodotti</span>
        <span>{stab.length} stabilimenti</span>
      </div>

      {aziende.length === 0 && (
        <p className="mt-8 text-green-900/70">Nessuna azienda registrata finora.</p>
      )}

      <div className="mt-8 space-y-6">
        {aziende.map((a) => {
          const aStab = stab.filter((s) => s.azienda_id === a.id);
          const aProd = prod.filter((p) => p.azienda_id === a.id);
          return (
            <section key={a.id} className="card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl text-green-800">{a.nome}</h2>
                <div className="text-xs text-green-900/60">
                  {a.piva ? `P.IVA ${a.piva} · ` : ""}
                  {a.citta_sede ? `sede ${a.citta_sede}` : ""}
                  {a.sito_web ? ` · ${a.sito_web}` : ""}
                </div>
              </div>

              <div className="mt-1 text-xs text-green-900/60">
                Stabilimenti: {aStab.map((s) => s.citta).join(", ") || "—"}
              </div>

              {aProd.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {aProd.map((p) => {
                    const pIngr = ingr
                      .filter((x) => x.prodotto_id === p.id)
                      .map((x) => ({ name: x.nome, origin: x.origine }));
                    const fp = computeFootprint(p.stabilimento_citta, pIngr);
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-[#e3eed7] bg-white px-4 py-3"
                      >
                        <div>
                          <div className="font-semibold text-green-800">{p.nome}</div>
                          <div className="text-xs text-green-900/60">
                            {p.categoria ? p.categoria + " · " : ""}
                            {p.stabilimento_citta} · {pIngr.length} materie prime:{" "}
                            {pIngr.map((i) => `${i.name} (${i.origin})`).join(", ")}
                          </div>
                        </div>
                        <div className="flex flex-none items-center gap-3">
                          <Semaforo level={fp.level} size="sm" />
                          <div className="text-right">
                            <div className="font-display text-lg text-green-800">
                              {fp.totalCo2Kg.toLocaleString("it-IT")} kg
                            </div>
                            <div className="text-[11px] text-green-900/60">CO₂</div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-green-900/60">Nessun prodotto caricato.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
