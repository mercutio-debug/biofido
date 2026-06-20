import Link from "next/link";

/**
 * Pagina di atterraggio dopo aver cliccato il link di conferma email.
 * Supabase ha già validato l'indirizzo prima del redirect qui: questa pagina
 * mostra solo un messaggio di benvenuto chiaro (al posto dell'errore "localhost"
 * che compariva quando il redirect non era configurato).
 */
export default function BenvenutoPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="text-6xl">🐾</div>
      <h1 className="title-pangea mt-4 text-4xl text-green-700">Email confermata!</h1>
      <p className="mt-4 rounded-2xl bg-leaf p-5 text-green-900/85">
        La tua mail è stata validata, <strong>benvenuto a bordo!</strong> Torna sul
        portale e inserisci le tue credenziali per accedere.
      </p>
      <Link href="/accedi" className="btn-lime mt-6 inline-block">
        Vai all&apos;accesso →
      </Link>
    </div>
  );
}
