/**
 * Ridimensiona e comprime un'immagine PRIMA del caricamento, così le foto delle
 * aziende non appesantiscono storage e server. Riduce il lato più lungo a
 * `maxLato` px e ricomprime in JPEG. Tutto lato client (canvas), costo zero.
 *
 * Esempio: una foto da smartphone (4000×3000, ~5 MB) esce ~1280×960 e ~150 KB.
 */
export async function ridimensionaImmagine(
  file: File,
  maxLato = 1280,
  qualita = 0.82,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, maxLato / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scala));
  const h = Math.max(1, Math.round(bitmap.height * scala));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compressione immagine fallita."))),
      "image/jpeg",
      qualita,
    ),
  );
}

/** Limite di sicurezza sul file scelto, prima ancora di ridimensionare. */
export const MAX_BYTES_INGRESSO = 15 * 1024 * 1024; // 15 MB
