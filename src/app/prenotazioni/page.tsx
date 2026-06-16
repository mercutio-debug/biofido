"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import {
  listBookingsForCustomer,
  euroCents,
  STATO_LABEL,
  type Booking,
  type BookingStatus,
} from "@/lib/bookings";
import { ChatPrenotazione } from "@/components/ChatPrenotazione";
import { NotificheToggle } from "@/components/NotificheToggle";

export default function PrenotazioniPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    setItems(await listBookingsForCustomer(uid));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/accedi");
      return;
    }
    load(user.id);
  }, [authLoading, user, router, load]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-green-900/70">Caricamento…</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
        Area cliente
      </div>
      <h1 className="title-pangea text-3xl text-green-700 md:text-4xl">
        Le mie prenotazioni
      </h1>

      <NotificheToggle />

      {items.length === 0 ? (
        <p className="mt-6 text-green-900/70">
          Non hai ancora prenotazioni. Trova un&apos;esperienza sulla{" "}
          <Link href="/" className="font-bold text-green-700 hover:text-lime-500">
            mappa
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((b) => (
            <li key={b.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-green-800">
                    {b.titolo ?? "Esperienza"} · {b.persone} persone
                  </div>
                  <div className="text-xs text-green-900/60">
                    Data richiesta: {b.dataRichiesta}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-green-800">
                    {euroCents(b.totaleCents)}
                  </div>
                  <StatoBadge stato={b.stato} />
                </div>
              </div>
              <button
                className="mt-3 rounded-full border border-green-600 px-3 py-1 text-xs font-bold text-green-700"
                onClick={() => setChatOpen(chatOpen === b.id ? null : b.id)}
              >
                💬 Messaggi con il produttore
              </button>
              {chatOpen === b.id && (
                <ChatPrenotazione prenotazioneId={b.id} mittente="cliente" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatoBadge({ stato }: { stato: BookingStatus }) {
  const color =
    stato === "confermata"
      ? "bg-traffic-green text-white"
      : stato === "rifiutata" || stato === "annullata"
      ? "bg-[#c9d3da] text-[#33414a]"
      : "bg-badge-yellow text-green-900";
  return (
    <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>
      {STATO_LABEL[stato]}
    </span>
  );
}
