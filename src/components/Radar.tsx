"use client";

export type RadarPoint = {
  id: string;
  name: string;
  category: string;
  distanceKm: number;
  angle: number; // 0..360, posizione fittizia sulla mappa
};

/**
 * Cerchi concentrici (rosso→giallo→verde) su mappa, come nelle pagine
 * "Spesa km0" e BioFido del PDF. I punti sono posizionati in base alla
 * distanza reale dall'utente (centro).
 */
export function Radar({
  points,
  radiusKm,
  centerLabel,
}: {
  points: RadarPoint[];
  radiusKm: number;
  centerLabel: string;
}) {
  const S = 360;
  const c = S / 2;
  const rings = [1, 0.66, 0.33];
  const ringColors = ["#e2231a", "#f6c416", "#45a82f"];

  return (
    <div className="relative mx-auto" style={{ width: S, maxWidth: "100%" }}>
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full">
        <defs>
          <radialGradient id="radar-bg">
            <stop offset="0" stopColor="#eef6e6" />
            <stop offset="1" stopColor="#dcebc9" />
          </radialGradient>
        </defs>
        <rect width={S} height={S} rx="18" fill="url(#radar-bg)" />
        {/* griglia mappa */}
        <g stroke="#cde0b4" strokeWidth="1">
          {[...Array(7)].map((_, i) => (
            <line key={`v${i}`} x1={(i + 1) * (S / 8)} y1="0" x2={(i + 1) * (S / 8)} y2={S} />
          ))}
          {[...Array(7)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={(i + 1) * (S / 8)} x2={S} y2={(i + 1) * (S / 8)} />
          ))}
        </g>
        {/* anelli concentrici */}
        {rings.map((r, i) => (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={(c - 12) * r}
            fill={ringColors[i]}
            fillOpacity={0.16}
            stroke={ringColors[i]}
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        ))}
        {/* utente al centro */}
        <circle cx={c} cy={c} r="6" fill="#1f4a0c" />
        <circle cx={c} cy={c} r="11" fill="none" stroke="#1f4a0c" strokeOpacity="0.4" />
        {/* punti */}
        {points.map((p) => {
          const rr = Math.min(p.distanceKm / radiusKm, 1) * (c - 16);
          const rad = (p.angle * Math.PI) / 180;
          const x = c + rr * Math.cos(rad);
          const y = c + rr * Math.sin(rad);
          return (
            <g key={p.id}>
              <circle cx={x} cy={y} r="5.5" fill="#2f6f12" stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 text-center text-xs font-semibold text-green-900/70">
        Centro: {centerLabel} · raggio {radiusKm} km
      </div>
    </div>
  );
}
