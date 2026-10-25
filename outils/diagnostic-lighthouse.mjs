// Diagnostic détaillé d'UNE page (A-11) : causes des décalages (CLS), de l'élément principal lent (LCP),
// ressources bloquantes et plus gros fichiers. Serveur de TEST uniquement.
// Usage : node outils/diagnostic-lighthouse.mjs <adresse complète>
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

// Script injecté dans CHAQUE page par l'antivirus Kaspersky de ce PC (absent chez un visiteur) : exclu des mesures,
// avant comme après, pour une comparaison honnête. Rien d'autre n'est bloqué.
const BLOQUES = ["*kaspersky-labs.com*"];

const url = process.argv[2];
if (!url || /:(8080|3100)\b/.test(url)) { console.error("Usage : node outils/diagnostic-lighthouse.mjs <adresse du serveur de test>"); process.exit(1); }
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-first-run", "--disable-extensions"] });
try {
  const { lhr } = await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error", blockedUrlPatterns: BLOQUES, onlyCategories: ["performance"] });
  const a = lhr.audits;
  const items = (id) => a[id]?.details?.items ?? [];
  console.log(`Performance ${Math.round(lhr.categories.performance.score * 100)} · LCP ${a["largest-contentful-paint"].displayValue} · CLS ${a["cumulative-layout-shift"].displayValue} · TBT ${a["total-blocking-time"].displayValue}`);
  console.log("\n— Décalages de mise en page (layout-shifts) :");
  for (const it of items("layout-shifts").slice(0, 6)) console.log(`  ${it.score?.toFixed(3)}  ${it.node?.snippet?.slice(0, 110)}  causes: ${(it.subItems?.items ?? []).map((s) => s.extra?.value ?? s.cause).join(", ")}`);
  console.log("\n— Élément principal (LCP) et décomposition :");
  for (const it of items("largest-contentful-paint-element")) {
    if (it.items?.[0]?.node) console.log(`  ${it.items[0].node.snippet?.slice(0, 140)}`);
    for (const p of it.items ?? []) if (p.phase) console.log(`  ${p.phase.padEnd(26)} ${Math.round(p.timing)} ms`);
  }
  console.log("\n— Ressources qui bloquent l'affichage :");
  for (const it of items("render-blocking-resources")) console.log(`  ${Math.round(it.wastedMs)} ms  ${it.url}`);
  console.log("\n— Plus gros téléchargements :");
  for (const it of items("total-byte-weight").slice(0, 8)) console.log(`  ${(it.totalBytes / 1024).toFixed(0).padStart(6)} Ko  ${it.url.slice(0, 110)}`);
  console.log("\n— Pistes chiffrées :");
  for (const x of Object.values(a)) if (x.details?.type === "opportunity" && (x.details.overallSavingsMs ?? 0) > 50) console.log(`  ${x.id} : ~${Math.round(x.details.overallSavingsMs)} ms`);
  for (const id of ["unsized-images", "font-display", "uses-responsive-images", "offscreen-images", "unused-javascript", "lcp-lazy-loaded", "prioritize-lcp-image"]) {
    if (a[id] && a[id].score !== null && a[id].score < 1) console.log(`  [${id}] ${a[id].displayValue ?? ""} ${items(id).slice(0, 3).map((i) => (i.url ?? i.node?.snippet ?? "").slice(0, 90)).join(" | ")}`);
  }
} finally {
  await chrome.kill();
}
