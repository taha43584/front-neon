// Compare les audits en échec (catégorie donnée) de deux rapports Lighthouse HTML (A-11).
// Usage : node outils/comparer-audits.mjs <rapport-avant.html> <rapport-après.html> [accessibility|best-practices|seo]
import fs from "node:fs";

const [avant, apres, categorie = "accessibility"] = process.argv.slice(2);
function echecs(fichier) {
  const html = fs.readFileSync(fichier, "utf8");
  const json = JSON.parse(html.match(/window\.__LIGHTHOUSE_JSON__ = (\{.*?\});<\/script>/s)[1]);
  const refs = json.categories[categorie].auditRefs.map((r) => r.id);
  return Object.fromEntries(refs.map((id) => json.audits[id]).filter((a) => a.score !== null && a.score < 1)
    .map((a) => [a.id, `${a.title} — ${(a.details?.items ?? []).slice(0, 3).map((i) => i.node?.snippet?.slice(0, 100) ?? i.url ?? "").join(" | ")}`]));
}
const a = echecs(avant);
const b = echecs(apres);
for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
  const etat = !a[id] ? "NOUVEAU" : !b[id] ? "corrigé" : "inchangé";
  console.log(`${etat.padEnd(9)} ${id} : ${b[id] ?? a[id]}`);
}
