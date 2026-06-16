import { supabase } from "./supabase";

/**
 * Attivazione delle notifiche Web Push.
 *
 * Richiede la chiave pubblica VAPID nel client (NEXT_PUBLIC_VAPID_PUBLIC_KEY) e
 * il service worker /sw.js. Finché la chiave non è impostata, il toggle resta
 * nascosto e l'app funziona normalmente.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export const pushConfigured = Boolean(VAPID_PUBLIC);

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Notifiche push non supportate da questo browser." };
  }
  if (!VAPID_PUBLIC) {
    return { ok: false, error: "Notifiche push non ancora configurate." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Accedi per attivare le notifiche." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Permesso per le notifiche negato." };
  }

  const reg = await navigator.serviceWorker.register(`${BASE}/sw.js`);
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  });

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
