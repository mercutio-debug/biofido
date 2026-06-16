// Header CORS condivisi: il sito statico (Hostinger / GitHub Pages) chiama le
// Edge Functions da un'origine diversa, quindi serve abilitare il CORS.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
