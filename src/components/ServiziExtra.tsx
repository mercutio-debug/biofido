import { SERVIZI_EXTRA } from "@/lib/servizi-extra";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Vetrina dei "servizi extra" (onboarding, report, badge). Ogni card ha un tasto
 * "Guarda la demo" che apre la presentazione (statica in /demo/<key>/).
 * Usata sia nella pagina pubblica /servizi-extra sia nella dashboard.
 */
export function ServiziExtra({ showPrices = false }: { showPrices?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SERVIZI_EXTRA.map((s) => (
        <div key={s.key} className="card flex flex-col p-5">
          <div className="text-2xl">{s.emoji}</div>
          <h3 className="mt-1 font-display text-xl text-green-800">{s.nome}</h3>
          <p className="mt-2 flex-1 text-sm text-green-900/75">{s.desc}</p>
          {showPrices && (
            <div className="mt-3 font-semibold text-green-800">{s.prezzo}</div>
          )}
          <a
            href={`${BASE}/demo/${s.key}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-lime mt-4 justify-center text-sm"
          >
            ▶ Guarda la demo
          </a>
        </div>
      ))}
    </div>
  );
}
