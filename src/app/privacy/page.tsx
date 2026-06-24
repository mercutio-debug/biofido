export const metadata = {
  title: "Privacy e cookie — BioFido",
  description:
    "Informativa sul trattamento dei dati personali e sull'uso dei cookie di BioFido (Ligusto Srl).",
  alternates: { canonical: "https://biofido.it/privacy/" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700 md:text-5xl">
        Informativa privacy e cookie
      </h1>
      <p className="mt-3 text-sm text-green-900/60">Ultimo aggiornamento: giugno 2026</p>

      <div className="prose-green mt-8 space-y-6 text-green-900/85">
        <section>
          <h2 className="font-display text-2xl text-green-800">Titolare del trattamento</h2>
          <p className="mt-2">
            <strong>Ligusto Srl</strong> — via Roma 71, 17038 Villanova d&apos;Albenga (SV).
            Email: <a className="text-green-700 underline" href="mailto:info@ligusto.it">info@ligusto.it</a>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">1. Dati che trattiamo</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Dati di registrazione</strong>: email, password (conservata cifrata), nome dell&apos;azienda.</li>
            <li><strong>Dati aziendali</strong> che inserisci: ragione sociale, partita IVA, sede, contatti, prodotti, eventuale certificazione biologica e dati di fatturazione.</li>
            <li><strong>Dati tecnici</strong>: indirizzo IP, tipo di browser e log di accesso, generati automaticamente per sicurezza e funzionamento.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">2. Finalità e basi giuridiche</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Erogazione del servizio (account, pubblicazione della scheda sulla mappa, prenotazioni) — <em>esecuzione del contratto</em>.</li>
            <li>Fatturazione degli abbonamenti e adempimenti fiscali — <em>obbligo di legge</em>.</li>
            <li>Sicurezza e prevenzione degli abusi (es. protezione anti-bot) — <em>legittimo interesse</em>.</li>
            <li>Comunicazioni di servizio relative al tuo account.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">3. Destinatari e responsabili</h2>
          <p className="mt-2">
            I dati sono trattati su infrastrutture di fornitori che agiscono come responsabili del
            trattamento: <strong>Supabase</strong> (database e autenticazione), <strong>Stripe</strong> (pagamenti),
            <strong> Cloudflare Turnstile</strong> (protezione anti-bot), <strong>OpenStreetMap</strong> (mappe),
            <strong> Aruba</strong> (email e fatturazione elettronica). Non vendiamo i tuoi dati a terzi.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">4. Trasferimenti extra-UE</h2>
          <p className="mt-2">
            Alcuni fornitori possono trattare dati al di fuori dell&apos;Unione Europea, con garanzie
            adeguate (es. clausole contrattuali standard della Commissione UE).
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">5. Conservazione</h2>
          <p className="mt-2">
            Conserviamo i dati per il tempo necessario all&apos;erogazione del servizio e agli obblighi
            di legge (ad esempio le fatture per 10 anni). Alla cancellazione dell&apos;account i dati non
            più necessari vengono rimossi.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">6. I tuoi diritti</h2>
          <p className="mt-2">
            Puoi esercitare i diritti di accesso, rettifica, cancellazione, limitazione, opposizione e
            portabilità scrivendo a <a className="text-green-700 underline" href="mailto:info@ligusto.it">info@ligusto.it</a>.
            Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">7. Cookie</h2>
          <p className="mt-2">
            Il sito utilizza <strong>cookie e tecnologie tecniche</strong> necessari al funzionamento:
            la sessione di accesso, le preferenze di accessibilità e la memorizzazione del consenso ai
            cookie. <strong>Non utilizziamo cookie di profilazione pubblicitaria.</strong> Le mappe
            (OpenStreetMap) e la protezione anti-bot (Cloudflare) possono impostare cookie tecnici di
            terze parti. Puoi gestire o eliminare i cookie dalle impostazioni del tuo browser.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">8. Modifiche</h2>
          <p className="mt-2">
            Possiamo aggiornare questa informativa: la versione vigente è sempre pubblicata su questa pagina.
          </p>
        </section>
      </div>
    </div>
  );
}
