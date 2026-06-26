// Helper condiviso: invio Web Push a un utente (per user_id), riusando le
// iscrizioni in `push_subscriptions` e le chiavi VAPID. Best-effort: se VAPID
// non è configurato o l'utente non ha iscrizioni, non fa nulla e non lancia.
//
// SEGRETI: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (gli stessi di notify).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@biofido.it";
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export async function sendPush(
  userId: string | null | undefined,
  n: { title: string; body: string; url?: string },
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !userId) return;
  try {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);
    const body = JSON.stringify({
      title: n.title,
      body: n.body,
      url: n.url ?? (SITE_URL ? `${SITE_URL}/dashboard/` : "/"),
      icon: SITE_URL ? `${SITE_URL}/brand/icon-192.png` : undefined,
    });
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }
  } catch (e) {
    console.error("sendPush errore:", (e as Error).message);
  }
}
