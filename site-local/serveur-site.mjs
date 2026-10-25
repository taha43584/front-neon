// Serveur du VRAI site local : fichiers du build Angular (copie figée dans ./site) + relais /api, /media vers le back.
// Écoute sur toutes les adresses du PC (téléphone sur le même Wi-Fi) ; le pare-feu Windows n'ouvre ce port
// qu'au réseau PRIVÉ. Aucun accès Internet : pas de tunnel, pas de redirection de port sur la box.
// Uniquement des modules fournis avec Node.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SITE_PORT ?? 8080);
const HOTE = process.env.SITE_HOTE ?? "0.0.0.0";
const BACK_PORT = Number(process.env.BACK_PORT ?? 3100);
const SITE = path.resolve(process.env.SITE_DOSSIER ?? path.join(ICI, "site"));
const VERS_LE_BACK = ["/api/", "/media/", "/manus-storage/"];
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json",
};

function page(res, code, texte) {
  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Elegance Deco</title><body style="font-family:system-ui;padding:24px"><h1 style="font-size:20px">Elegance Deco</h1><p>${texte}</p></body></html>`);
}

// ---------- Compression (A-11) : Brotli si le navigateur l'accepte, sinon gzip — comme Nginx le fera en ligne ----------
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|manifest\+json)|image\/svg)/;
function encodageAccepte(req) {
  const accepte = String(req.headers["accept-encoding"] ?? "");
  return /\bbr\b/.test(accepte) ? "br" : /\bgzip\b/.test(accepte) ? "gzip" : null;
}
/** Fichiers du site compressés une seule fois, gardés en mémoire (clé : chemin + date de modification) */
const cacheCompresse = new Map();
function compresserFichier(fichier, encodage) {
  const cle = `${fichier}|${fs.statSync(fichier).mtimeMs}|${encodage}`;
  if (!cacheCompresse.has(cle)) {
    const brut = fs.readFileSync(fichier);
    cacheCompresse.set(cle, encodage === "br"
      ? zlib.brotliCompressSync(brut, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } })
      : zlib.gzipSync(brut, { level: 9 }));
  }
  return cacheCompresse.get(cle);
}

/** Relais vers le back ; le corps passe en continu (envois de photos et vidéos compris) */
function versLeBack(req, res) {
  const entetes = { ...req.headers, host: `127.0.0.1:${BACK_PORT}`, "x-forwarded-proto": "http" };
  const encodage = encodageAccepte(req);
  const amont = http.request({ host: "127.0.0.1", port: BACK_PORT, method: req.method, path: req.url, headers: entetes }, (reponse) => {
    const type = String(reponse.headers["content-type"] ?? "");
    // Réponses JSON de l'API compressées au passage (rapide : Brotli niveau 4) ; photos et vidéos telles quelles
    if (encodage && COMPRESSIBLE.test(type) && !reponse.headers["content-encoding"]) {
      const { "content-length": _taille, ...entetesReponse } = reponse.headers;
      res.writeHead(reponse.statusCode ?? 502, { ...entetesReponse, "content-encoding": encodage, vary: "Accept-Encoding" });
      reponse.pipe(encodage === "br" ? zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }) : zlib.createGzip()).pipe(res);
      return;
    }
    res.writeHead(reponse.statusCode ?? 502, reponse.headers);
    reponse.pipe(res);
  });
  amont.on("error", () => { if (!res.headersSent) page(res, 502, "Le serveur redémarre… réessayez dans quelques secondes."); else res.end(); });
  req.pipe(amont);
}

/** Fichiers du site ; toute autre adresse affiche index.html (liens directs /produit/…) */
function fichierDuSite(req, res) {
  const index = path.join(SITE, "index.html");
  if (!fs.existsSync(index)) return page(res, 503, "Le site n'est pas encore installé : lancez mettre-a-jour-site.bat.");
  const chemin = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let fichier = path.resolve(SITE, "." + chemin);
  if (!fichier.startsWith(SITE)) return page(res, 400, "Adresse invalide.");
  if (!fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) fichier = index;
  const estIndex = fichier === index;
  // Fichiers SANS empreinte dans le nom (index.html, thème sombre theme-sombre.css) : toujours revalidés
  const nonVersionne = estIndex || path.basename(fichier) === "theme-sombre.css";
  const type = TYPES[path.extname(fichier).toLowerCase()] ?? "application/octet-stream";
  const encodage = COMPRESSIBLE.test(type) ? encodageAccepte(req) : null;
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": nonVersionne ? "no-cache" : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    ...(encodage ? { "Content-Encoding": encodage, Vary: "Accept-Encoding" } : {}),
  });
  if (req.method === "HEAD") return res.end();
  if (encodage) return res.end(compresserFichier(fichier, encodage));
  fs.createReadStream(fichier).pipe(res);
}

http.createServer((req, res) => {
  // Site privé (réseau local) : jamais indexé
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (VERS_LE_BACK.some((prefixe) => req.url.startsWith(prefixe))) return versLeBack(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") return page(res, 405, "Méthode non autorisée.");
  return fichierDuSite(req, res);
}).listen(PORT, HOTE, () => console.log(`[site] Prêt sur http://${HOTE}:${PORT} → back ${BACK_PORT}, fichiers ${SITE}`));
