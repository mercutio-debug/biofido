// Effetti collaterali di un ORDINE SHOP pagato: avviso all'AZIENDA del nuovo ordine
// (+ conferma al cliente + notifica admin + push) e scarico magazzino con avvisi scorta.
//
// Condiviso tra `stripe-webhook` (se/quando il webhook consegna) e `verify-ordine-shop`
// (il percorso affidabile, che usa la stessa chiave del pagamento). L'IDEMPOTENZA è del
// chiamante: rivendica il flag `ordini_shop.elaborato` (update atomico) e chiama queste
// funzioni SOLO se ha vinto la rivendicazione → gli effetti avvengono una volta sola.
//
// Nota: l'SMS Gold è uno stub no-op finché il fornitore non è collegato → qui è omesso.

import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { emailLayout, esc } from "./email.ts";
import { sendPush } from "./push.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "ECO-VISA & BioFido <noreply@ecovisa.it>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "mauriziocapitelli@yahoo.it";
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

/** Ordine SHOP pagato: avvisa l'AZIENDA del nuovo ordine già pagato, manda la
 *  conferma al CLIENTE e la notifica all'ADMIN (+ push all'azienda). */
export async function avvisaOrdineShop(admin: SupabaseClient, ordineId: string) {
  if (!RESEND_API_KEY) {
    console.error("ordine-side-effects: RESEND_API_KEY mancante — email ordine shop saltata");
    return;
  }
  const { data: o } = await admin
    .from("ordini_shop")
    .select(
      "owner, cliente_nome, cliente_email, azienda_nome, articoli, controproposta, portale, indirizzo_spedizione, telefono, codice_fiscale, cliente_ragione_sociale, cliente_piva, totale_cents",
    )
    .eq("id", ordineId)
    .maybeSingle();
  if (!o) return;

  const lista = ((o.controproposta ?? o.articoli) ?? []) as {
    nome?: string;
    prezzo?: string;
    qta?: number;
  }[];
  const righe = lista
    .map((a) => `• ${a.nome ?? "(prodotto)"} × ${a.qta ?? 1}${a.prezzo ? ` — ${a.prezzo}` : ""}`)
    .join("\n");
  const importo =
    o.totale_cents != null
      ? (Number(o.totale_cents) / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })
      : null;
  const spediz = o.indirizzo_spedizione
    ? `${esc(o.indirizzo_spedizione)}${o.telefono ? ` · tel. ${esc(o.telefono)}` : ""}`
    : "—";
  const post = (to: string, subject: string, html: string, tag: string) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
    }).then(async (r) => {
      if (!r.ok) console.error(`ordine-side-effects: Resend (${tag}) ${r.status}: ${await r.text()}`);
    });

  // riga fattura elettronica: se azienda mostra ragione sociale + P.IVA + CF azienda
  const rigaAzienda = o.cliente_piva
    ? `${esc(o.cliente_ragione_sociale ?? "Azienda")} — P.IVA ${esc(o.cliente_piva)}<br/>`
    : "";
  const etichCf = o.cliente_piva ? "CF azienda" : "Cod. fiscale";

  // blocco "dati per fattura + spedizione" (riusato in azienda e admin)
  const datiCliente = `<div style="border-top:1px solid #e3eed7;margin:14px 0;"></div>
    <p style="margin:0 0 4px;"><strong>Dati cliente (per fattura e spedizione):</strong></p>
    <p style="margin:0;">
      ${esc(o.cliente_nome ?? "—")}<br/>
      ${esc(o.cliente_email ?? "—")}<br/>
      ${rigaAzienda}${etichCf}: ${o.codice_fiscale ? esc(o.codice_fiscale) : "—"}<br/>
      Spedire a: ${spediz}
    </p>${importo ? `<p style="margin:10px 0 0;"><strong>Incassato:</strong> ${esc(importo)}</p>` : ""}`;

  // mail all'AZIENDA: ordine già pagato, dati per fattura + dove spedire
  const { data: u } = await admin.auth.admin.getUserById(o.owner);
  const toAzienda = u?.user?.email;
  if (toAzienda) {
    const html = emailLayout({
      title: "🛒 Nuovo ordine pagato",
      bodyHtml: `<p style="margin:0 0 12px;">Hai ricevuto un ordine <strong>già pagato</strong>${
        o.portale ? ` · ${esc(o.portale)}` : ""
      }. Emetti fattura, prepara e <strong>spedisci</strong>:</p>
        <p style="margin:0;white-space:pre-line;">${esc(righe)}</p>
        ${datiCliente}`,
      ctaLabel: SITE_URL ? "Vai agli ordini ricevuti" : undefined,
      ctaUrl: SITE_URL ? `${SITE_URL}/dashboard/` : undefined,
      footerNote: "Quando spedisci, premi “Ordine spedito” negli Ordini ricevuti: avvisa il cliente.",
    });
    await post(toAzienda, "🛒 Nuovo ordine pagato — da spedire", html, "azienda");
  }

  // mail di conferma al CLIENTE
  if (o.cliente_email) {
    const html = emailLayout({
      title: "✅ Ordine confermato",
      bodyHtml: `<p style="margin:0 0 12px;">Grazie! Il tuo ordine a
        <strong>${esc(o.azienda_nome ?? "l'azienda")}</strong> è stato <strong>pagato</strong>${
        importo ? ` (${esc(importo)})` : ""
      }:</p>
        <p style="margin:0;white-space:pre-line;">${esc(righe)}</p>
        <p style="margin:12px 0 0;">Sarà l'azienda a spedirti i prodotti${
          o.indirizzo_spedizione ? ` a: ${esc(o.indirizzo_spedizione)}` : ""
        }. Ti avviseremo alla spedizione.</p>`,
    });
    await post(o.cliente_email, "✅ Il tuo ordine è confermato", html, "cliente");
  }

  // notifica all'ADMIN (riepilogo ordine)
  const htmlAdmin = emailLayout({
    title: "🛒 Nuovo ordine sullo shop",
    bodyHtml: `<p style="margin:0 0 8px;"><strong>${esc(o.azienda_nome ?? "Azienda")}</strong>${
      o.portale ? ` · ${esc(o.portale)}` : ""
    }${importo ? ` · ${esc(importo)}` : ""}</p>
      <p style="margin:0;white-space:pre-line;">${esc(righe)}</p>
      ${datiCliente}`,
  });
  await post(ADMIN_EMAIL, "🛒 Nuovo ordine shop", htmlAdmin, "admin");

  // notifica PUSH all'azienda (best-effort)
  await sendPush(o.owner, {
    title: "🛒 Nuovo ordine pagato",
    body: `${o.cliente_nome ?? "Un cliente"} ha ordinato${importo ? ` (${importo})` : ""}. Prepara e spedisci.`,
    url: SITE_URL ? `${SITE_URL}/dashboard/` : undefined,
  });
}

type ArtMag = { prodottoId?: string; qta?: number; nome?: string };
type Livello = "meta" | "terzo" | "esaurito";
type AvvisoScorta = { nome: string; giacenza: number; livello: Livello };

/** Livello del reminder al passaggio da `prev` a `g`, rispetto alla scorta piena
 *  `iniziale`: scatta SOLO quando si attraversa la soglia (metà, un terzo, zero). */
function livelloScorta(prev: number, g: number, iniziale: number): Livello | null {
  if (g <= 0) return "esaurito";
  if (!iniziale || iniziale <= 0) return null;
  const terzo = Math.ceil(iniziale / 3);
  const meta = Math.ceil(iniziale / 2);
  if (prev > terzo && g <= terzo) return "terzo";
  if (prev > meta && g <= meta) return "meta";
  return null;
}

/** Fase E magazzino: alla vendita scala la giacenza dei prodotti.
 *  ECO-VISA → tabella `prodotti`; BioFido → JSON `products` su biofido_businesses.
 *  Avvisa l'azienda quando la scorta scende a metà / un terzo / esaurito. */
export async function scalaMagazzino(
  admin: SupabaseClient,
  ord: {
    owner: string;
    portale: string | null;
    articoli: ArtMag[] | null;
    controproposta: ArtMag[] | null;
  },
): Promise<void> {
  const items =
    ord.controproposta && ord.controproposta.length ? ord.controproposta : ord.articoli ?? [];
  if (!items.length) return;
  const avvisi: AvvisoScorta[] = [];
  try {
    if (ord.portale === "BioFido") {
      const { data: biz } = await admin
        .from("biofido_businesses")
        .select("id, products")
        .eq("owner", ord.owner)
        .maybeSingle();
      const prods =
        (biz?.products as
          | { id?: string; name?: string; giacenza?: number; giacenza_iniziale?: number }[]
          | null) ?? null;
      if (biz && prods) {
        let changed = false;
        const next = prods.map((p) => {
          const art = items.find((a) => a.prodottoId && a.prodottoId === p.id);
          if (art && typeof p.giacenza === "number") {
            changed = true;
            const g = Math.max(0, p.giacenza - (art.qta || 0));
            const liv = livelloScorta(p.giacenza, g, p.giacenza_iniziale ?? p.giacenza);
            if (liv) avvisi.push({ nome: p.name ?? "(prodotto)", giacenza: g, livello: liv });
            return { ...p, giacenza: g };
          }
          return p;
        });
        if (changed) await admin.from("biofido_businesses").update({ products: next }).eq("id", biz.id);
      }
    } else {
      for (const a of items) {
        if (!a.prodottoId) continue;
        const { data: pr } = await admin
          .from("prodotti")
          .select("giacenza, giacenza_iniziale, nome")
          .eq("id", a.prodottoId)
          .maybeSingle();
        const row = pr as { giacenza?: number | null; giacenza_iniziale?: number | null; nome?: string } | null;
        if (typeof row?.giacenza === "number") {
          const g = Math.max(0, row.giacenza - (a.qta || 0));
          await admin.from("prodotti").update({ giacenza: g }).eq("id", a.prodottoId);
          const liv = livelloScorta(row.giacenza, g, row.giacenza_iniziale ?? row.giacenza);
          if (liv) avvisi.push({ nome: row.nome ?? "(prodotto)", giacenza: g, livello: liv });
        }
      }
      // Se questi prodotti sono lo SPECCHIO di una scheda nata su BioFido, scalo
      // anche la fonte (biofido_businesses, per nome): magazzino sincronizzato.
      const { data: bizM } = await admin
        .from("biofido_businesses")
        .select("id, products")
        .eq("owner", ord.owner)
        .maybeSingle();
      const prodsM =
        (bizM?.products as { name?: string; giacenza?: number }[] | null) ?? null;
      if (bizM && prodsM) {
        let changed = false;
        const next = prodsM.map((p) => {
          const art = items.find((a) => a.nome && p.name && a.nome === p.name);
          if (art && typeof p.giacenza === "number") {
            changed = true;
            return { ...p, giacenza: Math.max(0, p.giacenza - (art.qta || 0)) };
          }
          return p;
        });
        if (changed) await admin.from("biofido_businesses").update({ products: next }).eq("id", bizM.id);
      }
    }
    if (avvisi.length) await avvisaScorte(admin, ord.owner, avvisi);
  } catch (e) {
    console.error("ordine-side-effects: scalaMagazzino errore:", (e as Error).message);
  }
}

/** Avvisa l'azienda (email + push) quando un prodotto è in esaurimento o esaurito. */
async function avvisaScorte(admin: SupabaseClient, owner: string, avvisi: AvvisoScorta[]): Promise<void> {
  const etich = (l: Livello) =>
    l === "esaurito" ? "ESAURITO" : l === "terzo" ? "sotto 1/3" : "sotto metà";
  const esauriti = avvisi.some((a) => a.livello === "esaurito");
  const terzi = avvisi.some((a) => a.livello === "terzo");
  const righe = avvisi
    .map((a) => `• ${a.nome}: ${a.livello === "esaurito" ? "ESAURITO" : `rimaste ${a.giacenza}`} (${etich(a.livello)})`)
    .join("\n");
  const titolo = esauriti
    ? "⚠️ Prodotti esauriti"
    : terzi
    ? "📉 Scorte sotto un terzo"
    : "📉 Scorte sotto metà";

  if (RESEND_API_KEY) {
    const { data } = await admin.auth.admin.getUserById(owner);
    const to = data?.user?.email ?? null;
    if (to) {
      const html = emailLayout({
        title: titolo,
        bodyHtml: `<p style="margin:0 0 12px;">Le scorte di questi prodotti stanno calando — rifornisci o aggiorna il magazzino:</p>
          <p style="margin:0;white-space:pre-line;">${esc(righe)}</p>`,
        ctaLabel: SITE_URL ? "Aggiorna il magazzino" : undefined,
        ctaUrl: SITE_URL ? `${SITE_URL}/dashboard/` : undefined,
        footerNote: "I clienti non possono ordinare oltre la giacenza disponibile: evita che il negozio resti vuoto.",
      });
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: NOTIFY_FROM, to, subject: titolo, html }),
      });
      if (!r.ok) console.error(`ordine-side-effects: Resend scorte ${r.status}: ${await r.text()}`);
    }
  }

  await sendPush(owner, {
    title: titolo,
    body: avvisi.map((a) => `${a.nome}: ${etich(a.livello)}`).join(" · "),
    url: SITE_URL ? `${SITE_URL}/dashboard/` : undefined,
  });
}
