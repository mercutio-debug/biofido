export const metadata = {
  title: "Elimina account e dati — BioFido",
  description:
    "Come richiedere la cancellazione del tuo account e dei tuoi dati personali su BioFido (Ligusto Srl): cosa viene eliminato, cosa viene conservato per obblighi di legge e come fare richiesta.",
  alternates: { canonical: "https://biofido.it/elimina-account/" },
};

export default function EliminaAccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700 md:text-5xl">
        Elimina account e dati
      </h1>
      <p className="mt-3 text-sm text-green-900/60">Ultimo aggiornamento: giugno 2026</p>

      <div className="prose-green mt-8 space-y-6 text-green-900/85">
        <p>
          Il tuo account è unico per <strong>BioFido</strong> ed <strong>ECO-VISA</strong>
          {" "}(gestiti da <strong>Ligusto Srl</strong>). Puoi richiedere in qualsiasi
          momento la cancellazione del tuo account e dei dati personali associati.
        </p>

        <h2 className="font-display text-2xl text-green-800">Come richiedere la cancellazione</h2>
        <p>
          Scrivi una email a{" "}
          <a className="text-green-700 underline" href="mailto:info@ligusto.it">
            info@ligusto.it
          </a>{" "}
          dall&apos;indirizzo con cui ti sei registrato, indicando come oggetto
          «Cancellazione account». Daremo seguito alla richiesta entro <strong>30 giorni</strong>.
        </p>

        <h2 className="font-display text-2xl text-green-800">Cosa viene eliminato</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>l&apos;account di accesso (email e credenziali);</li>
          <li>la scheda anagrafica, i dati di fatturazione e la certificazione bio;</li>
          <li>la scheda pubblica, i prodotti, le foto e i documenti caricati;</li>
          <li>i messaggi e le preferenze di notifica.</li>
        </ul>

        <h2 className="font-display text-2xl text-green-800">Cosa viene conservato (obblighi di legge)</h2>
        <p>
          Alcuni dati vengono conservati per il periodo previsto dalla legge anche dopo la
          cancellazione: in particolare i <strong>documenti contabili e fiscali</strong>
          {" "}(fatture, ricevute di pagamento) per <strong>10 anni</strong>, come richiesto
          dalla normativa fiscale italiana. Questi dati non vengono usati per altre finalità.
        </p>

        <h2 className="font-display text-2xl text-green-800">Pagamenti</h2>
        <p>
          I dati delle transazioni gestite tramite <strong>Stripe</strong> sono trattati dal
          fornitore di pagamento secondo le sue norme; la cancellazione dell&apos;account su
          BioFido non incide sugli obblighi di conservazione contabile sopra indicati.
        </p>

        <p className="text-sm text-green-900/60">
          Per qualsiasi dubbio sul trattamento dei tuoi dati, consulta l&apos;
          <a className="text-green-700 underline" href="/privacy/">informativa privacy</a>{" "}
          o scrivi a info@ligusto.it.
        </p>
      </div>
    </div>
  );
}
