import type { Giudizio, TierIng } from "@/lib/impronta";

/* Semaforo grande a 8 tonalità (gemello di ECO-VISA, mood BioFido): la lampada
   accesa (verde/giallo/rosso) prende il COLORE della tonalità specifica. */
type EcoCat = "verde" | "giallo" | "rosso";
type Meta = { label: string; color: string; lampada: EcoCat; desc: string };

const META: Record<Giudizio, Meta> = {
  super_green: { label: "Super Green", color: "#2e9e0e", lampada: "verde", desc: "Tutte le materie prime sono a km0. Eccellente!" },
  verde: { label: "Verde — sostenibile", color: "#45a82f", lampada: "verde", desc: "Materie prime per lo più molto vicine." },
  verde_chiaro: { label: "Verde chiaro — buono", color: "#7cb342", lampada: "verde", desc: "Filiera corta: qualche ingrediente a media distanza, niente di critico." },
  giallo_chiaro: { label: "Giallo chiaro — migliorabile", color: "#f6c416", lampada: "giallo", desc: "Diverse materie prime oltre i 1000 km, ma entro l'Italia." },
  giallo_scuro: { label: "Giallo scuro", color: "#d99a00", lampada: "giallo", desc: "Materie prime oltre i 1000 km e fuori dall'Italia." },
  rosso_chiaro: { label: "Rosso chiaro — alto impatto", color: "#ef5350", lampada: "rosso", desc: "Materie prime da oltre 2000 km, ma in Europa." },
  rosso_scuro: { label: "Rosso scuro", color: "#c62828", lampada: "rosso", desc: "Materie prime da fuori Europa (America o Africa)." },
  rosso_scurissimo: { label: "Rosso scurissimo — filiera lunghissima", color: "#9c0604", lampada: "rosso", desc: "Materie prime dall'Asia: la filiera più lunga." },
};

const COLORE_TIER: Record<TierIng, string> = {
  super_green: "#2e9e0e",
  verde: "#45a82f",
  verde_chiaro: "#7cb342",
  giallo_chiaro: "#f6c416",
  giallo_scuro: "#d99a00",
  rosso_chiaro: "#ef5350",
  rosso_scuro: "#c62828",
  rosso_scurissimo: "#9c0604",
};

function categoriaDiTier(t: TierIng): EcoCat {
  if (t === "giallo_chiaro" || t === "giallo_scuro") return "giallo";
  if (t === "rosso_chiaro" || t === "rosso_scuro" || t === "rosso_scurissimo") return "rosso";
  return "verde";
}

export function SemaforoGrande({
  level,
  score,
  consigli,
  size = "md",
}: {
  level: Giudizio;
  score?: number;
  consigli?: string[];
  size?: "sm" | "md";
}) {
  const order: EcoCat[] = ["rosso", "giallo", "verde"];
  const lamp = size === "sm" ? 18 : 30;
  const m = META[level];
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#222] p-2" aria-label={`Semaforo ecologico: ${m.label}`}>
        {order.map((l) => {
          const on = l === m.lampada;
          return (
            <span
              key={l}
              style={{
                width: lamp,
                height: lamp,
                borderRadius: "9999px",
                background: on ? m.color : "#3a3a3a",
                boxShadow: on ? `0 0 14px ${m.color}` : "none",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          );
        })}
      </div>

      {size === "md" ? (
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-xl" style={{ color: m.color }}>{m.label}</div>
            {level === "super_green" && (
              <span className="rounded-full bg-[#2e9e0e] px-2 py-0.5 text-[11px] font-bold text-white">🌱 SUPER GREEN · km0</span>
            )}
          </div>
          {typeof score === "number" && (
            <div className="text-sm font-semibold text-green-900/70">Punteggio sostenibilità: {score}/100</div>
          )}
          <p className="mt-0.5 max-w-xs text-xs text-green-900/70">{m.desc}</p>

          {consigli && consigli.length > 0 && (
            <div className="mt-2 space-y-2">
              {consigli.map((c, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-lime-500/40 bg-leaf/40 p-2">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-lime-500 text-sm font-bold text-white">💡</span>
                  <p className="text-xs text-green-900/80">{c}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="font-display text-sm leading-tight" style={{ color: m.color }}>{m.label}</div>
          {level === "super_green" && (
            <span className="mt-0.5 inline-block rounded-full bg-[#2e9e0e] px-1.5 py-0.5 text-[9px] font-bold text-white">🌱 km0</span>
          )}
        </div>
      )}
    </div>
  );
}

/* Mini-semaforo orizzontale di una singola materia prima. */
export function SemaforoIngrediente({ tier }: { tier: TierIng }) {
  const cat = categoriaDiTier(tier);
  const ordine: EcoCat[] = ["verde", "giallo", "rosso"];
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#222] px-1 py-0.5">
        {ordine.map((c) => {
          const on = c === cat;
          return (
            <span
              key={c}
              style={{
                width: 9,
                height: 9,
                borderRadius: "9999px",
                background: on ? COLORE_TIER[tier] : "#3a3a3a",
                boxShadow: on ? `0 0 6px ${COLORE_TIER[tier]}` : "none",
              }}
            />
          );
        })}
      </span>
      {tier === "super_green" && <span className="text-[9px] font-bold text-[#2e9e0e]">km0</span>}
    </span>
  );
}
