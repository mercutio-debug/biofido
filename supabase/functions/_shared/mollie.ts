// Helper per chiamare l'API Mollie con la chiave della piattaforma.
const API = "https://api.mollie.com/v2";

export async function mollie(
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${Deno.env.get("MOLLIE_API_KEY")!}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as { detail?: string })?.detail || `Mollie error ${res.status}`,
    );
  }
  return data;
}

/** importo Mollie nel formato richiesto (valore stringa con 2 decimali). */
export const eur = (value: number) => ({
  currency: "EUR",
  value: value.toFixed(2),
});

/** prezzi dei piani (devono coincidere con PLAN_MAP nel frontend). */
export const PLAN_PRICE: Record<string, { monthly: number; annual: number }> = {
  silver: { monthly: 9, annual: 90 },
  gold: { monthly: 24, annual: 240 },
};
