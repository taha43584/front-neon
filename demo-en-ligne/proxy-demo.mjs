// Proxy de la DÉMO EN LIGNE (Cloudflare Tunnel) : mot de passe à l'entrée, noindex, site Angular de production,
// et transmission de /api, /media, /manus-storage au back de démo (base de TEST).
// Uniquement des modules fournis avec Node : aucune bibliothèque ajoutée, aucun fichier de back/ modifié.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.DEMO_PORT ?? 4300);
const BACK_PORT = Number(process.env.BACK_PORT ?? 3101);
const SITE = path.resolve(ICI, "..", "dist", "client-angular", "browser");
const FICHIER_MOT_DE_PASSE = path.join(ICI, ".mot-de-passe");
const IDENTIFIANT = "demo";
const VERS_LE_BACK = ["/api/", "/media/", "/manus-storage/"];
// 10 essais ratés pour une même adresse : blocage 10 minutes
const ESSAIS_MAX = 10;
const BLOCAGE_MS = 10 * 60 * 1000;

if (!fs.existsSync(path.join(SITE, "index.html"))) {
  console.error(`[demo] Build Angular introuvable dans ${SITE} : lancez d'abord « npm run build » dans front.`);
  process.exit(1);
}
if (!fs.existsSync(FICHIER_MOT_DE_PASSE)) {
  console.error("[demo] Aucun mot de passe défini : lancez « node definir-mot-de-passe.mjs ».");
  process.exit(1);
}
// Fichier « scrypt$sel$empreinte » : le mot de passe lui-même n'est jamais enregistré
const [, sel, empreinte] = fs.readFileSync(FICHIER_MOT_DE_PASSE, "utf8").trim().split("$");
const empreinteAttendue = Buffer.from(empreinte, "hex");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json",
};

const echecs = new Map(); // adresse → { nombre, jusqua }

/** Adresse réelle du visiteur : Cloudflare l'ajoute dans CF-Connecting-IP */
function adresseDe(req) {
  return String(req.headers["cf-connecting-ip"] ?? req.socket.remoteAddress ?? "inconnue");
}

function motDePasseCorrect(req) {
  const entete = String(req.headers.authorization ?? "");
  if (!entete.startsWith("Basic ")) return false;
  const texte = Buffer.from(entete.slice(6), "base64").toString("utf8");
  const deuxPoints = texte.indexOf(":");
  if (deuxPoints < 0) return false;
  const identifiant = texte.slice(0, deuxPoints);
  const motDePasse = texte.slice(deuxPoints + 1);
  // Comparaison en temps constant (on ne peut pas deviner le mot de passe en mesurant le temps de réponse)
  const calcule = scryptSync(motDePasse, sel, empreinteAttendue.length);
  return timingSafeEqual(calcule, empreinteAttendue) && identifiant === IDENTIFIANT;
}

function entetesCommuns(res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
}

function refuser(res, code, texte, avecMotDePasse = false) {
  if (avecMotDePasse) res.setHeader("WWW-Authenticate", 'Basic realm="Elegance Deco - demo", charset="UTF-8"');
  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width"><title>Démo protégée</title><body style="font-family:system-ui;padding:24px"><h1 style="font-size:20px">Démo Elegance Deco</h1><p>${texte}</p></body></html>`);
}

/** Transmet la requête telle quelle au back de démo (le corps est relayé en continu : envois de photos compris) */
function versLeBack(req, res) {
  const entetes = { ...req.headers };
  delete entetes.authorization; // le mot de passe de la démo ne part pas vers le back
  entetes.host = `127.0.0.1:${BACK_PORT}`;
  // Le visiteur est en HTTPS (tunnel) : le back pose alors un cookie de session « Secure »
  entetes["x-forwarded-proto"] = req.headers["x-forwarded-proto"] ?? (req.headers["cf-connecting-ip"] ? "https" : "http");
  const amont = http.request({ host: "127.0.0.1", port: BACK_PORT, method: req.method, path: req.url, headers: entetes }, (reponse) => {
    const copie = { ...reponse.headers, "x-robots-tag": "noindex, nofollow, noarchive" };
    res.writeHead(reponse.statusCode ?? 502, copie);
    reponse.pipe(res);
  });
  amont.on("error", () => { if (!res.headersSent) refuser(res, 502, "Le serveur de la démo ne répond pas. Relancez demo-en-ligne.bat."); else res.end(); });
  req.pipe(amont);
}

/** Fichiers du build Angular ; toute autre adresse affiche index.html (liens directs /produit/…) */
function fichierDuSite(req, res) {
  const chemin = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let fichier = path.resolve(SITE, "." + chemin);
  if (!fichier.startsWith(SITE)) return refuser(res, 400, "Adresse invalide.");
  if (!fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) fichier = path.join(SITE, "index.html");
  const extension = path.extname(fichier).toLowerCase();
  const estIndex = path.basename(fichier) === "index.html";
  // Thème sombre (theme-sombre.css) : nom sans empreinte, donc revalidé comme index.html
  const nonVersionne = estIndex || path.basename(fichier) === "theme-sombre.css";
  res.writeHead(200, {
    "Content-Type": TYPES[extension] ?? "application/octet-stream",
    // Fichiers versionnés du build (nom-HASH.js) : cache long ; index.html : toujours relu
    "Cache-Control": nonVersionne ? "no-cache" : "public, max-age=31536000, immutable",
  });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(fichier).pipe(res);
}

const serveur = http.createServer((req, res) => {
  entetesCommuns(res);
  // Les robots lisent robots.txt sans mot de passe : tout est interdit
  if (req.url === "/robots.txt") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("User-agent: *\nDisallow: /\n");
  }
  const adresse = adresseDe(req);
  const etat = echecs.get(adresse);
  if (etat && etat.jusqua > Date.now()) return refuser(res, 429, "Trop d'essais. Réessayez dans quelques minutes.");
  if (!motDePasseCorrect(req)) {
    if (req.headers.authorization) {
      // Après un blocage terminé, le compteur repart de zéro
      const nombre = (etat && etat.jusqua === 0 ? etat.nombre : 0) + 1;
      echecs.set(adresse, { nombre, jusqua: nombre >= ESSAIS_MAX ? Date.now() + BLOCAGE_MS : 0 });
      console.log(`[demo] Mot de passe refusé (${nombre}/${ESSAIS_MAX}) pour ${adresse}`);
    }
    return refuser(res, 401, "Cette démo est protégée par un mot de passe.", true);
  }
  echecs.delete(adresse);
  if (VERS_LE_BACK.some((prefixe) => req.url.startsWith(prefixe))) return versLeBack(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") return refuser(res, 405, "Méthode non autorisée.");
  return fichierDuSite(req, res);
});

// Uniquement sur cet ordinateur : seul cloudflared (local) y accède, pas les autres appareils du réseau
serveur.listen(PORT, "127.0.0.1", () => console.log(`[demo] Proxy prêt sur http://127.0.0.1:${PORT} → back ${BACK_PORT}, site ${SITE}`));
