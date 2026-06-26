// Edge Function "ordine-spedito": l'AZIENDA segna un ordine shop come spedito.
// Effetti: stato → "spedito" + spedito_at; mail di spedizione al CLIENTE;
// notifica all'ADMIN con il tempo di risposta (per le statistiche di servizio).
//
// Sicurezza: solo il PROPRIETARIO dell'ordine può segnarlo spedito. service-role.
// Deploy: npx supabase functions deploy ordine-spedito --project-ref kvpxnxsjiyiixqksinzr

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { emailLayout, esc } from "../_shared/email.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "ECO-VISA & BioFido <noreply@ecovisa.it>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "mauriziocapitelli@yahoo.it";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const post = (to: string, subject: string, html: string, tag: string) =>
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
  }).then(async (r) => {
    if (!r.ok) console.error(`ordine-spedito: Resend (${tag}) ${r.status}: ${await r.text()}`);
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);

    const { ordineId } = await req.json();
    if (!ordineId) return json({ error: "ordineId mancante" }, 400);

    const { data: o } = await admin
      .from("ordini_shop")
      .select(
        "owner, cliente_nome, cliente_email, azienda_nome, articoli, controproposta, indirizzo_spedizione, stato, created_at",
      )
      .eq("id", ordineId)
      .maybeSingle();
    if (!o) return json({ error: "Ordine non trovato" }, 404);
    if (o.owner !== user.id) return json({ error: "Non autorizzato" }, 403);
    if (o.stato !== "pagato") {
      return json({ error: "Solo un ordine pagato può essere segnato come spedito." }, 400);
    }

    const now = new Date();
    await admin
      .from("ordini_shop")
      .update({ stato: "spedito", spedito_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", ordineId);

    const lista = ((o.controproposta ?? o.articoli) ?? []) as {
      nome?: string;
      qta?: number;
    }[];
    const righe = lista.map((a) => `• ${a.nome ?? "(prodotto)"} × ${a.qta ?? 1}`).join("\n");

    // mail di spedizione al CLIENTE
    if (RESEND_API_KEY && o.cliente_email) {
      const html = emailLayout({
        title: "📦 Ordine spedito",
        bodyHtml: `<p style="margin:0 0 12px;">Buone notizie! <strong>${esc(
          o.azienda_nome ?? "L'azienda",
        )}</strong> ha <strong>spedito</strong> il tuo ordine${
          o.indirizzo_spedizione ? ` a: ${esc(o.indirizzo_spedizione)}` : ""
        }:</p>
          <p style="margin:0;white-space:pre-line;">${esc(righe)}</p>
          <p style="margin:12px 0 0;">A presto! 🌱</p>`,
      });
      await post(o.cliente_email, "📦 Il tuo ordine è stato spedito", html, "cliente");
    }

    // notifica all'ADMIN con il tempo di risposta (statistiche)
    if (RESEND_API_KEY) {
      const created = o.created_at ? new Date(o.created_at).getTime() : null;
      const ore = created ? Math.max(0, Math.round((now.getTime() - created) / 3_600_000)) : null;
      const html = emailLayout({
        title: "📦 Ordine spedito",
        bodyHtml: `<p style="margin:0;"><strong>${esc(o.azienda_nome ?? "Azienda")}</strong> ha segnato come spedito un ordine.</p>
          ${ore != null ? `<p style="margin:10px 0 0;"><strong>Tempo di risposta:</strong> ~${ore} ore dall'ordine.</p>` : ""}`,
      });
      await post(ADMIN_EMAIL, "📦 Spedizione (statistica tempi)", html, "admin");
    }

    return json({ ok: true, spedito_at: now.toISOString() });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
