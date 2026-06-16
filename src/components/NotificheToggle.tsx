"use client";

import { useState } from "react";
import { enablePush, pushConfigured } from "@/lib/push";

/**
 * Pulsante per attivare le notifiche push sul dispositivo corrente.
 * Resta nascosto finché la chiave VAPID pubblica non è configurata.
 */
export function NotificheToggle() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!pushConfigured) return null;

  async function attiva() {
    setBusy(true);
    setMsg(null);
    const { ok, error } = await enablePush();
    setBusy(false);
    setMsg(ok ? "Notifiche push attivate su questo dispositivo ✅" : error ?? "Errore");
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="btn-ghost text-sm" onClick={attiva} disabled={busy}>
        🔔 {busy ? "Attivazione…" : "Attiva le notifiche push"}
      </button>
      {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
    </div>
  );
}
