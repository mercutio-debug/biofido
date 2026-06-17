import { writeFileSync } from "node:fs";

/**
 * Scrive public/version.json con l'id di questa build (lo stesso che
 * next.config espone al client come NEXT_PUBLIC_BUILD_ID). Così l'app può
 * accorgersi quando è uscita una versione nuova e ricaricarsi da sola,
 * scavalcando la cache vecchia del browser / della PWA installata.
 *
 * Su GitHub Actions usa GITHUB_SHA (cambia ad ogni deploy); in locale "dev".
 */
const id = process.env.GITHUB_SHA ?? "dev";
writeFileSync("public/version.json", JSON.stringify({ build: id }) + "\n");
console.log("[version] build id:", id);
