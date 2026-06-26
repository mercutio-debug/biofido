import { SEMAFORO, type Giudizio } from "@/lib/impronta";

/**
 * Legenda del semaforo di sostenibilità: una scheda d'esempio per ogni tonalità,
 * con la spiegazione di cosa determina quel colore. Stesso criterio di ECO-VISA
 * (è ciò che distingue i nostri portali). Mostrata sotto la mappa di BioFido.
 */
const VOCI: { level: Giudizio; criterio: string }[] = [
  { level: "super_green", criterio: "Tutte le materie prime a km0 (entro 70 km). Es. un olio con olive dello stesso comune." },
  { level: "verde", criterio: "Materie prime molto vicine, entro ~200 km. Filiera corta del territorio." },
  {
    level: "verde_chiaro",
    criterio:
      "Ingredienti entro l'Italia (≤ 1000 km). Per essere verde NON serve avere tutto verde: vanno bene dei gialli, purché non superino la metà.",
  },
  { level: "giallo_chiaro", criterio: "Diverse materie prime oltre i 1000 km, ma ancora entro i confini italiani." },
  { level: "giallo_scuro", criterio: "Materie prime oltre i 1000 km e fuori dall'Italia (Europa vicina). Pesa più del giallo chiaro." },
  { level: "rosso_chiaro", criterio: "Materie prime da oltre 2000 km, ma ancora in Europa." },
  { level: "rosso_scuro", criterio: "Materie prime da fuori Europa: America o Africa." },
  {
    level: "rosso_scurissimo",
    criterio:
      "Materie prime dall'Asia: la filiera più lunga. Anche un solo ingrediente così impedisce il verde (al massimo giallo scuro).",
  },
];

export function LegendaSemaforo() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {VOCI.map((v) => {
        const sem = SEMAFORO[v.level];
        return (
          <div key={v.level} className="card flex flex-col gap-2 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
              Esempio semaforo {sem.label}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-5 w-5 flex-none rounded-full"
                style={{ background: sem.colore, boxShadow: `0 0 10px ${sem.colore}` }}
              />
              <span className="font-display text-lg" style={{ color: sem.colore }}>
                {sem.label}
              </span>
            </div>
            <p className="text-sm text-green-900/75">{v.criterio}</p>
          </div>
        );
      })}
    </div>
  );
}
