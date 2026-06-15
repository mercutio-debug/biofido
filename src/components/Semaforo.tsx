import type { EcoLevel } from "@/lib/footprint";

const meta: Record<EcoLevel, { label: string; color: string; desc: string }> = {
  verde: {
    label: "Sostenibile",
    color: "var(--traffic-green)",
    desc: "Filiera corta: materie prime a basso impatto di trasporto.",
  },
  giallo: {
    label: "Migliorabile",
    color: "var(--traffic-yellow)",
    desc: "Impatto medio: alcune materie prime arrivano da lontano.",
  },
  rosso: {
    label: "Alto impatto",
    color: "var(--traffic-red)",
    desc: "Trasporti lunghi: l'impronta ecologica è elevata.",
  },
};

export function Semaforo({
  level,
  score,
  size = "md",
}: {
  level: EcoLevel;
  score?: number;
  size?: "sm" | "md";
}) {
  const order: EcoLevel[] = ["rosso", "giallo", "verde"];
  const lamp = size === "sm" ? 18 : 30;
  const m = meta[level];
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex flex-col items-center gap-2 rounded-2xl bg-[#222] p-2"
        aria-label={`Semaforo ecologico: ${m.label}`}
      >
        {order.map((l) => {
          const on = l === level;
          return (
            <span
              key={l}
              className={on ? "pulse-soft" : ""}
              style={{
                width: lamp,
                height: lamp,
                borderRadius: "9999px",
                background: on ? meta[l].color : "#3a3a3a",
                boxShadow: on ? `0 0 14px ${meta[l].color}` : "none",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          );
        })}
      </div>
      {size === "md" && (
        <div>
          <div
            className="font-display text-xl"
            style={{ color: m.color }}
          >
            {m.label}
          </div>
          {typeof score === "number" && (
            <div className="text-sm font-semibold text-green-900/70">
              Punteggio ECO-VISA: {score}/100
            </div>
          )}
          <p className="mt-0.5 max-w-xs text-xs text-green-900/70">{m.desc}</p>
        </div>
      )}
    </div>
  );
}
