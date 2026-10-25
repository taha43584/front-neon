// Mesure Lighthouse « téléphone » (A-11) : réglage mobile par défaut de Lighthouse (écran de téléphone,
// processeur et réseau ralentis), 3 passages par page, on garde le passage MÉDIAN (score de performance).
// Toujours sur le build de production servi par le serveur de TEST (jamais le vrai site).
// Usage : node outils/mesure-lighthouse.mjs <adresse> <étiquette> <chemin1> [chemin2…]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

// Script injecté dans CHAQUE page par l'antivirus Kaspersky de ce PC (absent chez un visiteur) : exclu des mesures,
// avant comme après, pour une comparaison honnête. Rien d'autre n'est bloqué.
const BLOQUES = ["*kaspersky-labs.com*"];

const ICI = path.dirname(fileURLToPath(import.meta.url));
const [base, etiquette, ...chemins] = process.argv.slice(2);
if (!base || !etiquette || !chemins.length) {
  console.error("Usage : node outils/mesure-lighthouse.mjs <adresse> <étiquette> <chemin1> [chemin2…]");
  process.exit(1);
}
if (/:(8080|3100)\b/.test(base)) { console.error("Refus : le vrai site (8080) ne sert jamais aux mesures."); process.exit(1); }
const PASSAGES = Number(process.env.PASSAGES ?? 3);
const SORTIE = path.join(ICI, "rapports-lighthouse", etiquette);
fs.mkdirSync(SORTIE, { recursive: true });

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-first-run", "--disable-extensions"] });
const resume = {};
try {
  for (const chemin of chemins) {
    const passages = [];
    for (let i = 0; i < PASSAGES; i++) {
      const r = await lighthouse(base + chemin, { port: chrome.port, output: "html", logLevel: "error", blockedUrlPatterns: BLOQUES, onlyCategories: ["performance", "accessibility", "best-practices", "seo"] });
      const a = r.lhr.audits;
      passages.push({
        rapport: r.report,
        performance: Math.round(r.lhr.categories.performance.score * 100),
        accessibilite: Math.round(r.lhr.categories.accessibility.score * 100),
        bonnesPratiques: Math.round(r.lhr.categories["best-practices"].score * 100),
        seo: Math.round(r.lhr.categories.seo.score * 100),
        fcp: a["first-contentful-paint"].displayValue, lcp: a["largest-contentful-paint"].displayValue,
        tbt: a["total-blocking-time"].displayValue, cls: a["cumulative-layout-shift"].displayValue, si: a["speed-index"].displayValue,
        lcpElement: a["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.snippet?.slice(0, 120) ?? null,
        pistes: Object.values(a).filter((x) => x.details?.type === "opportunity" && (x.details.overallSavingsMs ?? 0) > 100)
          .map((x) => `${x.id} (~${Math.round(x.details.overallSavingsMs)} ms)`),
      });
    }
    passages.sort((x, y) => x.performance - y.performance);
    const median = passages[Math.floor(passages.length / 2)];
    const nom = chemin === "/" ? "accueil" : chemin.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    fs.writeFileSync(path.join(SORTIE, `${nom}.html`), median.rapport);
    const { rapport, ...chiffres } = median;
    resume[chemin] = { ...chiffres, tousLesPassages: passages.map((p) => p.performance) };
    console.log(`${chemin.padEnd(34)} perf ${median.performance}  (passages ${passages.map((p) => p.performance).join(" / ")})  LCP ${median.lcp}  TBT ${median.tbt}  CLS ${median.cls}`);
  }
} finally {
  await chrome.kill();
}
fs.writeFileSync(path.join(SORTIE, "resume.json"), JSON.stringify(resume, null, 2));
console.log(`\nRapports : ${SORTIE}`);
