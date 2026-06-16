"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    setMsgs(await listMessages(prenotazioneId));
    setLoading(false);
  }, [prenotazioneId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!testo.trim()) return;
    setSending(true);
    const { error } = await sendMessage(prenotazioneId, mittente, testo.trim());
    setSending(false);
    if (!error) {
      setTesto("");
      load();
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[#e3eed7] bg-leaf/40 p-3">
      <div className="max-h-52 space-y-2 overflow-y-auto">
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
