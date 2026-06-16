"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { listMessages, sendMessage, type Message, type Mittente } from "@/lib/bookings";

/**
 * Chat in-app legata a una prenotazione. Usata sia dal produttore (mittente
 * "azienda") sia dal cliente (mittente "cliente"): i messaggi propri appaiono a
 * destra, quelli dell'altra parte a sinistra.
 */
export function ChatPrenotazione({
  prenotazioneId,
  mittente,
}: {
  prenotazioneId: string;
  mittente: Mittente;
}) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [testo, setTesto] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // aggiunge un messaggio evitando i doppioni (load + realtime possono
  // entrambi consegnare lo stesso messaggio)
  const addMsg = useCallback((m: Message) => {
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  const load = useCallback(async () => {
    setMsgs(await listMessages(prenotazioneId));
    setLoading(false);
  }, [prenotazioneId]);

  // carico lo storico e mi metto in ascolto dei nuovi messaggi in tempo reale
  useEffect(() => {
    load();
    const channel = supabase
      .channel(`messaggi-${prenotazioneId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messaggi",
          filter: `prenotazione_id=eq.${prenotazioneId}`,
        },
        (payload) => {
          const n = payload.new as {
            id: number | string;
            prenotazione_id: number | string;
            mittente: Mittente;
            testo: string;
            created_at?: string;
          };
          addMsg({
            id: String(n.id),
            prenotazioneId: String(n.prenotazione_id),
            mittente: n.mittente,
            testo: n.testo,
            createdAt: n.created_at,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [prenotazioneId, load, addMsg]);

  // auto-scroll all'ultimo messaggio
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  async function send() {
    if (!testo.trim()) return;
    setSending(true);
    const { error } = await sendMessage(prenotazioneId, mittente, testo.trim());
    setSending(false);
    if (!error) {
      setTesto("");
      // fallback: se il Realtime è lento/non attivo, ricarico comunque
      load();
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[#e3eed7] bg-leaf/40 p-3">
      <div ref={scrollRef} className="max-h-52 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-green-900/50">Carico i messaggi…</p>
        ) : msgs.length === 0 ? (
          <p className="text-xs text-green-900/55">
            Nessun messaggio. Scrivi per iniziare la conversazione.
          </p>
        ) : (
          msgs.map((m) => {
            const mine = m.mittente === mittente;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <span
                  className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                    mine
                      ? "bg-green-700 text-white"
                      : "border border-[#e3eed7] bg-white text-green-900"
                  }`}
                >
                  {m.testo}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="field flex-1"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Scrivi un messaggio…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button className="btn-lime" onClick={send} disabled={sending || !testo.trim()}>
          Invia
        </button>
      </div>
    </div>
  );
}
