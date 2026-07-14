"use client";

import { useEffect, useRef, useState } from "react";
import { chiediAssistente, type ChatMsg } from "@/lib/assistente";

/**
 * Assistente virtuale (widget chat) di aiuto/guida. Pulsante flottante che apre
 * una chat; le risposte arrivano da Claude via la edge function `assistente`.
 * Gemello ECO-VISA / BioFido: cambia solo il nome del portale.
 */
export function AssistenteWidget({ portale }: { portale: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nome = portale === "BioFido" ? "BioFido" : "ECO-VISA";
  const saluto = `Ciao! 👋 Sono l'assistente di ${nome}. Posso spiegarti il semaforo della filiera, il KM0, come iscrivere un'attività o come funziona il sito. Cosa ti serve?`;

  // saluto iniziale alla prima apertura
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: saluto }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // auto-scroll in fondo a ogni nuovo messaggio
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function invia() {
    const testo = input.trim();
    if (!testo || loading) return;
    const nuovi: ChatMsg[] = [...messages, { role: "user", content: testo }];
    setMessages(nuovi);
    setInput("");
    setLoading(true);
    const { reply, error } = await chiediAssistente(nuovi, portale);
    setLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: reply || `⚠️ ${error ?? "Non riesco a rispondere ora, riprova tra poco."}`,
      },
    ]);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Apri l'assistente"
          className="fixed bottom-5 left-4 z-[150] flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-2xl shadow-xl ring-4 ring-lime-400/50 transition hover:bg-green-800"
        >
          💬
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 left-4 z-[170] flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-[#e3eed7] bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-green-700 px-4 py-3 text-white">
            <span className="font-display text-lg">🐾 Assistente {nome}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chiudi"
              className="text-xl leading-none hover:opacity-80"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#fcfdfa] p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-green-700 text-white" : "bg-leaf text-green-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-leaf px-3 py-2 text-sm text-green-900/60">
                  sto scrivendo…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              invia();
            }}
            className="flex items-center gap-2 border-t border-[#e3eed7] p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1500}
              placeholder="Scrivi una domanda…"
              className="min-w-0 flex-1 rounded-full border border-[#cfe0bb] px-4 py-2 text-sm text-green-900 outline-none focus:border-green-600"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-lime flex-none !px-4 !py-2 text-sm disabled:opacity-50"
            >
              Invia
            </button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-green-900/45">
            Assistente automatico · può sbagliare, verifica le info importanti.
          </p>
        </div>
      )}
    </>
  );
}
