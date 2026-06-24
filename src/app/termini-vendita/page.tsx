export const metadata = {
  title: "Termini di vendita — BioFido",
  description:
    "Condizioni di vendita dei prodotti e dei servizi acquistabili tramite ECO-VISA e BioFido (Ligusto Srl): ruolo della piattaforma, recesso, garanzia, rimborsi e reclami.",
  alternates: { canonical: "https://biofido.it/termini-vendita/" },
};

export default function TerminiVenditaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700 md:text-5xl">
        Termini di vendita
      </h1>
      <p className="mt-3 text-sm text-green-900/60">Ultimo aggiornamento: giugno 2026</p>

      <div className="mt-6 rounded-xl border border-[#e3eed7] bg-leaf p-4 text-sm text-green-900/80">
        Bozza operativa da sottoporre a validazione legale prima dell&apos;attivazione
        delle vendite. Vale per gli acquisti effettuati tramite le piattaforme
        ECO-VISA e BioFido, gestite da Ligusto Srl.
      </div>

      <div className="prose-green mt-8 space-y-6 text-green-900/85">
        <section>
          <h2 className="font-display text-2xl text-green-800">1. Chi siamo e cosa facciamo</h2>
          <p className="mt-2">
            ECO-VISA e BioFido sono piattaforme gestite da <strong>Ligusto Srl</strong> —
            via Roma 71, 17038 Villanova d&apos;Albenga (SV), email{" "}
            <a className="text-green-700 underline" href="mailto:info@ligusto.it">info@ligusto.it</a>.
            La piattaforma mette in contatto i clienti con le <strong>aziende venditrici</strong>{" "}
            iscritte e fornisce gli strumenti tecnici per ordini e pagamenti.
          </p>
          <p className="mt-2">
            <strong>Il contratto di vendita è concluso direttamente fra il Cliente e
            l&apos;Azienda venditrice.</strong> L&apos;Azienda è il <strong>venditore a
            tutti gli effetti di legge</strong> (anche ai fini fiscali e di sicurezza
            dei prodotti). Ligusto Srl agisce come <strong>intermediario tecnico</strong> e
            gestore della piattaforma, e non è parte del contratto di vendita.
            L&apos;identità del venditore (ragione sociale, partita IVA, sede) è sempre
            indicata nella scheda prodotto e nella conferma d&apos;ordine.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">2. Come avviene l&apos;acquisto</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Il Cliente registrato invia un <strong>ordine</strong> dalla scheda del prodotto.</li>
            <li>L&apos;Azienda venditrice <strong>conferma e accetta</strong> l&apos;ordine: con l&apos;accettazione il contratto si perfeziona.</li>
            <li>Il pagamento avviene tramite il fornitore <strong>Stripe</strong>; l&apos;importo è incassato dall&apos;Azienda venditrice, al netto della commissione della piattaforma.</li>
            <li>La consegna avviene tramite <strong>spedizione</strong> all&apos;indirizzo indicato o <strong>ritiro</strong> presso l&apos;Azienda, secondo quanto previsto nella scheda.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">3. Prezzi, pagamenti e fatturazione</h2>
          <p className="mt-2">
            I prezzi sono indicati dall&apos;Azienda venditrice e comprensivi di IVA ove
            dovuta. Eventuali costi di spedizione sono mostrati prima della conferma.
            La <strong>fattura o documento di vendita</strong> è emessa dall&apos;Azienda
            venditrice, unica responsabile degli adempimenti fiscali relativi alla vendita.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">4. Diritto di recesso (14 giorni)</h2>
          <p className="mt-2">
            Se il Cliente è un <strong>consumatore</strong>, ha diritto di recedere
            dall&apos;acquisto <strong>entro 14 giorni</strong> dalla consegna, senza dover
            fornire motivazione (artt. 52 ss. del Codice del Consumo). Il rimborso è
            effettuato entro 14 giorni dal recesso, sullo stesso metodo di pagamento.
          </p>
          <p className="mt-2">
            <strong>Eccezioni (art. 59 Cod. Consumo):</strong> il recesso non si applica,
            tra l&apos;altro, a beni <strong>deperibili</strong> o a rapida scadenza, a beni
            <strong> confezionati su misura o personalizzati</strong>, e a beni
            sigillati non idonei alla restituzione per motivi igienici una volta aperti.
            La gestione del recesso e del relativo rimborso compete all&apos;Azienda venditrice.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">5. Garanzia legale di conformità</h2>
          <p className="mt-2">
            Ai prodotti acquistati da un consumatore si applica la <strong>garanzia legale
            di conformità di 24 mesi</strong> (artt. 128 ss. Cod. Consumo). La garanzia è
            prestata dall&apos;Azienda venditrice, a cui il Cliente può rivolgersi per
            difetti di conformità.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">6. Resi e rimborsi</h2>
          <p className="mt-2">
            Resi e rimborsi sono gestiti dall&apos;Azienda venditrice; la piattaforma ne
            facilita la comunicazione e, ove tecnicamente possibile, l&apos;esecuzione del
            rimborso tramite Stripe. In caso di prodotto non conforme, danneggiato o non
            consegnato, il Cliente può aprire una <strong>contestazione</strong> dal proprio
            account o scrivendo ai contatti indicati al punto 8.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">7. Responsabilità sui prodotti</h2>
          <p className="mt-2">
            L&apos;Azienda venditrice è l&apos;unica responsabile della <strong>conformità,
            sicurezza, etichettatura, indicazione degli allergeni</strong> e — per i
            prodotti alimentari — degli obblighi quale operatore del settore alimentare
            (HACCP, tracciabilità). Ligusto Srl non produce, non confeziona e non vende i
            prodotti, e non risponde delle caratteristiche o della conformità degli stessi.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">8. Reclami e risoluzione delle controversie</h2>
          <p className="mt-2">
            Per assistenza o reclami: <a className="text-green-700 underline" href="mailto:info@ligusto.it">info@ligusto.it</a>.
            Il consumatore può inoltre ricorrere alla piattaforma europea di risoluzione
            online delle controversie (ODR):{" "}
            <a className="text-green-700 underline" href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">9. Limitazione di responsabilità della piattaforma</h2>
          <p className="mt-2">
            Nei limiti consentiti dalla legge, Ligusto Srl risponde esclusivamente del
            corretto funzionamento tecnico della piattaforma e non delle obbligazioni
            nascenti dal contratto di vendita tra Cliente e Azienda, che restano in capo a
            quest&apos;ultima. Resta ferma ogni responsabilità inderogabile prevista a tutela
            del consumatore.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">10. Legge applicabile</h2>
          <p className="mt-2">
            I presenti termini sono regolati dalla legge italiana. Per il consumatore
            resta competente il foro del luogo di residenza o domicilio, se situato in Italia.
          </p>
        </section>
      </div>
    </div>
  );
}
