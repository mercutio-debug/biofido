"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

/**
 * Chip utente in alto a destra. Mentre la sessione è aperta (Supabase la
 * mantiene in localStorage e rinnova i token da solo) mostra l'icona utente e
 * il nome; un menu permette di andare in dashboard, all'area admin e di
 * uscire. Quando non si è loggati, mostra «Accedi» e l'invito a iscriversi.
 */
export function UserMenu() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // chiudi il menu cliccando fuori
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (loading) {
    // placeholder per evitare lo "sfarfallio" del layout durante il check
    return <div className="h-9 w-24 animate-pulse rounded-full bg-leaf/60" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/accedi" className="text-sm font-semibold text-green-800 hover:text-lime-500">
          Accedi
        </Link>
        <Link href="/registrati" className="btn-lime text-xs">
          Iscrivi attività
        </Link>
      </div>
    );
  }

  const nome =
    (user.user_metadata?.nome as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Il mio account";

  async function esci() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex max-w-[200px] items-center gap-2 rounded-full border border-green-700/40 bg-white px-2.5 py-1.5 text-sm font-semibold text-green-800 shadow-sm hover:border-green-700 hover:bg-leaf/50"
      >
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-700 text-white">
          <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden fill="currentColor">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.7-8 6v1h16v-1c0-3.3-3.6-6-8-6Z" />
          </svg>
        </span>
        <span className="truncate">{nome}</span>
        <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden className="flex-none text-green-700/70" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#e3eed7] bg-white py-1 shadow-lg"
        >
          <div className="border-b border-[#eef3e6] px-4 py-2">
            <div className="text-xs text-green-900/55">Connesso come</div>
            <div className="truncate text-sm font-semibold text-green-800">{user.email}</div>
          </div>
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-semibold text-green-800 hover:bg-leaf/50"
          >
            🐾 La mia dashboard
          </Link>
          <Link
            href="/prenotazioni"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-semibold text-green-800 hover:bg-leaf/50"
          >
            📅 Le mie prenotazioni
          </Link>
          <Link
            href="/ordini"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-semibold text-green-800 hover:bg-leaf/50"
          >
            📦 I miei ordini
          </Link>
          <Link
            href="/ordini-ricevuti"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-semibold text-green-800 hover:bg-leaf/50"
          >
            🛒 Ordini ricevuti
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm font-semibold text-green-800 hover:bg-leaf/50"
            >
              🛠️ Area admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={esci}
            className="block w-full px-4 py-2 text-left text-sm font-semibold text-traffic-red hover:bg-red-50"
          >
            ↩ Esci
          </button>
        </div>
      )}
    </div>
  );
}
