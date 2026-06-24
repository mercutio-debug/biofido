export const metadata = {
  title: "Condizioni per i venditori — BioFido",
  description:
    "Condizioni che regolano la vendita di prodotti e servizi da parte delle aziende su ECO-VISA e BioFido (Ligusto Srl): obblighi del venditore, manleva, commissioni e responsabilità.",
  alternates: { canonical: "https://biofido.it/condizioni-venditori/" },
};

export default function CondizioniVenditoriPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700 md:text-5xl">
        Condizioni per i venditori
      </h1>
      <p className="mt-3 text-sm text-green-900/60">Ultimo aggiornamento: giugno 2026</p>

      <div className="mt-6 rounded-xl border border-[#e3eed7] bg-leaf p-4 text-sm text-green-900/80">
        Bozza operativa da sottoporre a validazione legale. Regola il rapporto tra
        Ligusto Srl (gestore delle piattaforme ECO-VISA e BioFido) e l&apos;Azienda che
        vende prodotti o servizi tramite la piattaforma. L&apos;Azienda accetta queste
        condizioni attivando la vendita.
      </div>

      <div className="prose-green mt-8 space-y-6 text-green-900/85">
        <section>
          <h2 className="font-display text-2xl text-green-800">1. Oggetto e ruolo delle parti</h2>
          <p className="mt-2">
            Ligusto Srl mette a disposizione dell&apos;Azienda una piattaforma per pubblicare
            e vendere i propri prodotti e servizi. <strong>L&apos;Azienda è il venditore a tutti
            gli effetti</strong> e — per i prodotti alimentari — l&apos;<strong>operatore del
            settore alimentare (OSA)</strong> responsabile. Ligusto Srl è esclusivamente
            intermediario tecnico e gestore della piattaforma, e non assume la qualità di
            venditore, produttore o importatore.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">2. Obblighi dell&apos;Azienda</h2>
          <p className="mt-2">L&apos;Azienda si impegna, sotto la propria esclusiva responsabilità, a:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>vendere prodotti <strong>conformi e sicuri</strong>, leciti e di cui ha la piena disponibilità;</li>
            <li>curare la corretta <strong>etichettatura, indicazione degli allergeni</strong>, ingredienti, scadenze, conservazione, tracciabilità e ogni adempimento <strong>HACCP</strong> e di sicurezza alimentare;</li>
            <li>indicare prezzi, disponibilità, tempi e costi di spedizione <strong>accurati e aggiornati</strong>;</li>
            <li><strong>evadere gli ordini</strong> accettati con tempestività e gestire la spedizione o il ritiro;</li>
            <li>gestire verso il Cliente il <strong>diritto di recesso, la garanzia legale, i resi e i rimborsi</strong> nei termini di legge;</li>
            <li>emettere fattura o documento di vendita e adempiere a <strong>tutti gli obblighi fiscali</strong> relativi alle vendite;</li>
            <li>rispettare le norme a tutela del consumatore, sulla privacy e ogni normativa applicabile ai prodotti offerti.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">3. Identificazione del venditore</h2>
          <p className="mt-2">
            L&apos;Azienda autorizza la pubblicazione dei propri dati identificativi
            (ragione sociale, partita IVA, sede) nella scheda e nella conferma d&apos;ordine,
            come richiesto dalla normativa sui marketplace, affinché il Cliente sappia
            chiaramente con chi conclude il contratto.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">4. Pagamenti e commissioni</h2>
          <p className="mt-2">
            I pagamenti sono gestiti tramite <strong>Stripe Connect</strong>: l&apos;Azienda è
            titolare dell&apos;incasso e accetta i termini di Stripe. Ligusto Srl trattiene una
            <strong> commissione</strong> secondo il piano di abbonamento attivo. Le commissioni
            di Stripe e gli oneri fiscali sulle vendite restano a carico dell&apos;Azienda.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">5. Manleva e indennizzo</h2>
          <p className="mt-2">
            L&apos;Azienda <strong>tiene indenne e manleva Ligusto Srl</strong> (e i suoi
            amministratori, dipendenti e collaboratori) da ogni pretesa, contestazione,
            danno, costo, spesa legale o <strong>sanzione</strong> derivante da:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>vizi, difetti, non conformità o difetto di sicurezza dei prodotti venduti;</li>
            <li>errori o carenze di <strong>etichettatura, allergeni, informazioni obbligatorie</strong> o adempimenti alimentari;</li>
            <li>mancata, ritardata o difettosa evasione degli ordini, spedizione o gestione di recesso/garanzia/rimborsi;</li>
            <li>violazione di norme fiscali, sul consumo, sulla sicurezza o di diritti di terzi (es. marchi, proprietà intellettuale).</li>
          </ul>
          <p className="mt-2">
            La manleva opera nei rapporti tra l&apos;Azienda e Ligusto Srl e non pregiudica i
            diritti inderogabili del consumatore verso il venditore.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">6. Controllo dei contenuti e sospensione</h2>
          <p className="mt-2">
            Ligusto Srl può <strong>sospendere o rimuovere</strong> listini, prodotti o
            account in caso di contenuti illeciti, non conformi, ingannevoli o segnalati,
            in conformità agli obblighi previsti per i servizi di intermediazione online
            (Regolamento UE sui servizi digitali — DSA), senza che ciò costituisca assunzione
            di responsabilità sui prodotti.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">7. Limitazione di responsabilità della piattaforma</h2>
          <p className="mt-2">
            Ligusto Srl risponde unicamente del corretto funzionamento tecnico della
            piattaforma. Non risponde dei rapporti di vendita tra Azienda e Cliente, né di
            mancati guadagni, interruzioni del servizio o fatti imputabili a terzi
            (es. Stripe, corrieri), nei limiti consentiti dalla legge.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">8. Durata e recesso</h2>
          <p className="mt-2">
            Le presenti condizioni restano in vigore finché l&apos;Azienda mantiene attiva la
            vendita. Ciascuna parte può recedere in qualsiasi momento; restano da evadere gli
            ordini già accettati e dovute le obbligazioni già sorte.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">9. Legge applicabile e foro</h2>
          <p className="mt-2">
            Le presenti condizioni sono regolate dalla legge italiana. Per le controversie
            tra Ligusto Srl e l&apos;Azienda (rapporto tra professionisti) è competente in via
            esclusiva il foro di Savona.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-green-800">10. Approvazione specifica delle clausole</h2>
          <p className="mt-2">
            Ai sensi degli artt. 1341 e 1342 c.c., l&apos;Azienda approva specificamente le
            clausole: 4 (Pagamenti e commissioni), <strong>5 (Manleva e indennizzo)</strong>,
            6 (Controllo dei contenuti e sospensione), 7 (Limitazione di responsabilità) e
            9 (Foro esclusivo). L&apos;accettazione è raccolta in fase di attivazione della
            vendita con apposita spunta di approvazione delle clausole sopra elencate.
          </p>
        </section>
      </div>
    </div>
  );
}
