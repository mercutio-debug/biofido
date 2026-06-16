// Unisce i due dataset ISTAT (coordinate + provincia/regione) in un unico file
// compatto public/comuni.json: array di [nome, provincia, regione, lat, lon].
// Uso: node scripts/build-comuni.mjs <geo.json> <cities.json>
import fs from "node:fs";

const geo = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const cities = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

const coordByIstat = {};
for (const g of geo) coordByIstat[g.istat] = g;

const out = [];
for (const c of cities) {
  const g = coordByIstat[c.istat];
  if (!g) continue;
  const lat = Math.round(parseFloat(g.lat) * 10000) / 10000;
  const lon = Math.round(parseFloat(g.lng) * 10000) / 10000;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  out.push([c.comune, c.provincia, c.regione, lat, lon]);
}
out.sort((a, b) => a[0].localeCompare(b[0], "it"));

fs.writeFileSync("public/comuni.json", JSON.stringify(out));
console.log(`comuni: ${out.length}`);
