import type { NextConfig } from "next";

// Su GitHub Pages il sito è servito da una sottocartella (/eco-visa), quindi
// serve un basePath. Su Hostinger invece è servito dalla radice del dominio,
// quindi nessun basePath. La variabile GITHUB_PAGES distingue i due build.
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = "biofido";

const nextConfig: NextConfig = {
  // Esporta il sito come file statici (cartella out/) per hosting condiviso (Hostinger).
  output: "export",
  // L'ottimizzazione immagini di Next richiede un server: disattivata per l'export statico.
  images: { unoptimized: true },
  // URL con slash finale -> Hostinger serve le cartelle con index.html senza errori 404.
  trailingSlash: true,
  // Prefisso solo per il build GitHub Pages (sottocartella /eco-visa).
  basePath: isGitHubPages ? `/${repoName}` : undefined,
  assetPrefix: isGitHubPages ? `/${repoName}/` : undefined,
  // Espone il basePath al client: serve per gli asset in public/ (es. immagini),
  // perché next/image NON antepone il basePath ai percorsi di public/.
  // Vuoto su Hostinger (sito a root), "/eco-visa" sul build GitHub Pages.
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? `/${repoName}` : "",
    // id di questa build: l'app lo confronta con public/version.json per
    // accorgersi di una versione nuova e auto-aggiornarsi (vedi UpdateChecker).
    NEXT_PUBLIC_BUILD_ID: process.env.GITHUB_SHA ?? "dev",
  },
};

export default nextConfig;
