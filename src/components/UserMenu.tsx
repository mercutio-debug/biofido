"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { contaInSospeso } from "@/lib/contatori";

/* Icone monocrome a linea (currentColor), stile pulito tipo Hostinger/Claude. */
const ICO: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  chat: <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1.3-4.5A8 8 0 1 1 21 12z" />,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l2.4 12h11l2-8H6" /></>,
  calcheck: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4M9 15l2 2 4-4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  card: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10.5h18" /></>,
  pin: <><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  shield: <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />,
  cert: <><circle cx="12" cy="9" r="5.5" /><path d="M9.5 9l2 2 3.5-3.5" /><path d="M8 13l-1.5 7 5.5-3 5.5 3L16 13" /></>,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

function Ico({ k }: { k: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-none">
      {ICO[k]}
    </svg>
  );
}

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto inline-flex min-w-[20px] animate-pulse items-center justify-center rounded-full bg-traffic-red px-1.5 text-[11px] font-bold leading-5 text-white">
      {n}
    </span>
  );
}

/**
 * Menù utente in alto a destra (modello Hostinger/Claude): si apre dal simbolo
 * dell'utente e mostra le funzioni master con icone monocrome a linea, pulite.
 */
export function UserMenu() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [conte, setConte] = useState({ ordini: 0, prenotazioni: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!user) {
      setConte({ ordini: 0, prenotazioni: 0 });
      return;
    }
    let vivo = true;
    const aggiorna = () => contaInSospeso().then((c) => vivo && setConte(c));
    aggiorna();
    const t = setInterval(aggiorna, 60000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [user]);
  const totSospeso = conte.ordini + conte.prenotazioni;

  if (loading) {
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
        <Link
          href="/registrati?tipo=cliente"
          className="rounded-full border border-green-700/40 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-leaf"
        >
          Cliente
        </Link>
      </div>
    );
  }

  const nome =
    (user.user_metadata?.nome as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Il mio account";
  const isCliente = (user.user_metadata as { tipo?: string } | undefined)?.tipo === "cliente";

  async function esci() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
  }

  // apre un pannello della dashboard senza ricaricare, se già in dashboard
  function vaiPannello(e: React.MouseEvent, id: string) {
    setOpen(false);
    if (window.location.pathname.replace(/\/+$/, "").endsWith("/dashboard")) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("dash:goto", { detail: id }));
      window.history.replaceState(null, "", `?p=${id}`);
    }
  }

  const base =
    "flex items-center gap-3 px-4 py-2.5 text-[14px] text-green-900 transition hover:bg-[#f3f9ee]";
  const iconMuted = "text-green-800/50";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex max-w-[200px] items-center gap-2 rounded-full border border-green-700/30 bg-white px-2.5 py-1.5 text-sm font-semibold text-green-800 shadow-sm hover:border-green-700 hover:bg-leaf/40"
      >
        {totSospeso > 0 && (
          <span
            aria-label={`${totSospeso} in attesa`}
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] animate-pulse items-center justify-center rounded-full bg-traffic-red px-1 text-[10px] font-bold text-white ring-2 ring-white"
          >
            {totSospeso}
          </span>
        )}
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-green-700 text-white">
          <Ico k="user" />
        </span>
        <span className="truncate">{nome}</span>
        <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden className="flex-none text-green-700/70" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[#e7ece0] bg-white py-1.5 shadow-xl"
        >
          {/* intestazione: nome + email */}
          <div className="px-4 pb-2.5 pt-2">
            <div className="truncate text-[15px] font-semibold text-green-900">{nome}</div>
            <div className="truncate text-[13px] text-green-900/55">{user.email}</div>
          </div>
          <div className="border-t border-[#eef3e6]" />

          {/* navigazione attività (solo aziende) */}
          {!isCliente && (
            <>
              <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)} className={base}>
                <span className={iconMuted}><Ico k="dashboard" /></span>
                <span className="flex-1 truncate">La mia dashboard</span>
              </Link>
              <Link href="/dashboard?p=msg" role="menuitem" onClick={(e) => vaiPannello(e, "msg")} className={base}>
                <span className={iconMuted}><Ico k="chat" /></span>
                <span className="flex-1 truncate">Messaggi</span>
              </Link>
              <Link href="/ordini-ricevuti" role="menuitem" onClick={() => setOpen(false)} className={base}>
                <span className={iconMuted}><Ico k="cart" /></span>
                <span className="flex-1 truncate">Ordini ricevuti</span>
                <Badge n={conte.ordini} />
              </Link>
              <Link href="/dashboard?p=pren" role="menuitem" onClick={(e) => vaiPannello(e, "pren")} className={base}>
                <span className={iconMuted}><Ico k="calcheck" /></span>
                <span className="flex-1 truncate">Prenotazioni ricevute</span>
                <Badge n={conte.prenotazioni} />
              </Link>
            </>
          )}
          <Link href="/ordini" role="menuitem" onClick={() => setOpen(false)} className={base}>
            <span className={iconMuted}><Ico k="box" /></span>
            <span className="flex-1 truncate">I miei ordini</span>
          </Link>
          <Link href="/account#fatture-ricevute" role="menuitem" onClick={() => setOpen(false)} className={base}>
            <span className={iconMuted}><Ico k="card" /></span>
            <span className="flex-1 truncate">Fatture ricevute</span>
          </Link>
          <Link href="/prenotazioni" role="menuitem" onClick={() => setOpen(false)} className={base}>
            <span className={iconMuted}><Ico k="calendar" /></span>
            <span className="flex-1 truncate">Le mie prenotazioni</span>
          </Link>

          <div className="my-1 border-t border-[#eef3e6]" />

          {/* account */}
          <Link href="/account" role="menuitem" onClick={() => setOpen(false)} className={base}>
            <span className={iconMuted}><Ico k="user" /></span>
            <span className="flex-1 truncate">Credenziali di accesso</span>
          </Link>
          {!isCliente && (
            <Link href="/dashboard?p=bio" role="menuitem" onClick={(e) => vaiPannello(e, "bio")} className={base}>
              <span className={iconMuted}><Ico k="cert" /></span>
              <span className="flex-1 truncate">La mia certificazione bio</span>
            </Link>
          )}
          {[
            // «Anagrafica» per entrambi: il cliente va alla sua scheda dati, l'azienda ai dati fiscali
            isCliente
              ? { href: "/account#anagrafica-cliente", icon: "card", label: "Anagrafica" }
              : { href: "/account#fatturazione", icon: "card", label: "Anagrafica" },
            // geolocalizzazione: solo aziende (i clienti non hanno una sede da mostrare in mappa)
            ...(!isCliente
              ? [{ href: "/account#geolocalizzazione", icon: "pin", label: "Geolocalizzazione" }]
              : []),
            { href: "/account#notifiche", icon: "bell", label: "Notifiche" },
            { href: "/account#privacy", icon: "shield", label: "Termini e privacy" },
          ].map((a) => (
            <Link key={a.href} href={a.href} role="menuitem" onClick={() => setOpen(false)} className={base}>
              <span className={iconMuted}><Ico k={a.icon} /></span>
              <span className="flex-1 truncate">{a.label}</span>
            </Link>
          ))}

          {isAdmin && (
            <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className={base}>
              <span className={iconMuted}><Ico k="settings" /></span>
              <span className="flex-1 truncate">Area admin</span>
            </Link>
          )}

          <div className="my-1 border-t border-[#eef3e6]" />

          <Link
            href="/account#elimina"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-traffic-red transition hover:bg-red-50"
          >
            <span className="text-traffic-red/70"><Ico k="trash" /></span>
            <span className="flex-1 truncate">Elimina account</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={esci}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] font-semibold text-traffic-red transition hover:bg-red-50"
          >
            <span className="text-traffic-red/70"><Ico k="logout" /></span>
            <span className="flex-1 truncate">Esci</span>
          </button>
        </div>
      )}
    </div>
  );
}
