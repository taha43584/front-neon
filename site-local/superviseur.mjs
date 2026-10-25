// SUPERVISEUR du vrai site local (base RÉELLE elegance_deco) : lance, surveille et relance MySQL, le back et le site,
// et fait la sauvegarde quotidienne. Uniquement des modules fournis avec Node (aucune bibliothèque ajoutée).
// Lancé au démarrage de la session Windows (raccourci dans « Démarrage ») ou par demarrer-site.bat.
// Commandes : 127.0.0.1:8099 (GET /etat, POST /arreter, POST /sauvegarder) — utilisées par etat-site / arreter-site.
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BACK, DOSSIER_PHOTOS, adresseBaseReelle, derniereSauvegarde, faireSauvegarde } from "./sauvegarde.mjs";
import { creerFiltreSecrets } from "./filtre-secrets.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PORT_SITE = 8080;
const PORT_BACK = 3100;
const PORT_MYSQL = 3306;
const PORT_CONTROLE = 8099;
const MYSQL_BIN = "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin";
const DOSSIER_DONNEES_MYSQL = path.join(os.homedir(), "mysql_data");
const JOURNAUX = path.join(ICI, "journaux");
const PRIVE = path.join(JOURNAUX, "prive");
const ATTENTES = [1, 2, 5, 10, 30, 60]; // secondes avant une relance (croissantes)
fs.mkdirSync(PRIVE, { recursive: true });

// ---------- Journaux avec rotation (5 Mo, 3 anciens gardés) ----------
function journal(nom) {
  const fichier = path.join(JOURNAUX, `${nom}.log`);
  return (texte) => {
    try {
      if (fs.existsSync(fichier) && fs.statSync(fichier).size > 5 * 1024 * 1024) {
        for (let i = 3; i >= 1; i--) { const a = `${fichier}.${i}`; if (fs.existsSync(a)) i === 3 ? fs.rmSync(a) : fs.renameSync(a, `${fichier}.${i + 1}`); }
        fs.renameSync(fichier, `${fichier}.1`);
      }
      fs.appendFileSync(fichier, `${new Date().toISOString()} ${texte}\n`);
    } catch { /* un journal plein ne doit jamais arrêter le site */ }
  };
}
const log = journal("superviseur");

// Base RÉELLE (refus si .env vise une base de test : le vrai site n'utilise jamais elegance_deco_test)
let URL_REELLE;
try { URL_REELLE = adresseBaseReelle(); } catch (e) { log(`ARRÊT : ${e.message}`); console.error(e.message); process.exit(1); }

const tcpOuvert = (port) => new Promise((resolve) => {
  const s = net.connect(port, "127.0.0.1");
  s.setTimeout(2000, () => { s.destroy(); resolve(false); });
  s.on("connect", () => { s.destroy(); resolve(true); });
  s.on("error", () => resolve(false));
});
const httpOk = (url) => new Promise((resolve) => {
  const r = http.get(url, { timeout: 8000 }, (res) => { res.resume(); resolve((res.statusCode ?? 500) < 500); });
  r.on("timeout", () => { r.destroy(); resolve(false); });
  r.on("error", () => resolve(false));
});
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Journal du back, avec DÉTOURNEMENT des secrets vers journaux/prive/ (voir filtre-secrets.mjs) */
function sortieFiltree(nom) {
  return creerFiltreSecrets(journal(nom), path.join(PRIVE, "codes-mot-de-passe.txt"));
}

// ---------- Un service surveillé : relancé s'il s'arrête ou ne répond plus ----------
class Service {
  constructor(nom, { lancer, sante, avant }) {
    Object.assign(this, { nom, lancer, sante, avant, processus: null, etat: "arrêté", relances: 0, echecsSante: 0, depuis: null, arret: false, rang: 0 });
  }
  async demarrer() {
    if (this.arret) return;
    if (this.avant && !(await this.avant())) { setTimeout(() => this.demarrer(), 5000); return; }
    this.etat = "démarrage";
    this.processus = this.lancer();
    this.depuis = Date.now();
    log(`${this.nom} : lancé (processus ${this.processus.pid})`);
    this.processus.on("exit", (code) => {
      this.processus = null;
      if (this.arret) { this.etat = "arrêté"; return; }
      // Stable depuis 5 minutes : l'attente avant relance repart du début
      if (Date.now() - this.depuis > 5 * 60 * 1000) this.rang = 0;
      const attente = ATTENTES[Math.min(this.rang++, ATTENTES.length - 1)];
      this.etat = `relance dans ${attente} s`;
      this.relances++;
      log(`${this.nom} : arrêté (code ${code}) → relance dans ${attente} s`);
      setTimeout(() => this.demarrer(), attente * 1000);
    });
  }
  async verifier() {
    if (this.arret || !this.processus) return;
    if (await this.sante()) { this.echecsSante = 0; this.etat = "en marche"; return; }
    if (this.etat === "démarrage" && Date.now() - this.depuis < 120000) return; // laisse le temps de démarrer
    if (++this.echecsSante >= 3) {
      log(`${this.nom} : ne répond plus (3 vérifications) → redémarrage`);
      this.echecsSante = 0;
      this.processus?.kill();
    }
  }
  arreter() {
    this.arret = true;
    if (this.processus) this.processus.kill();
  }
}

// MySQL : si un MySQL tourne déjà (lancé par quelqu'un d'autre), on le surveille sans le relancer nous-mêmes
let mysqlExterne = false;
const mysqlService = new Service("MySQL", {
  lancer: () => {
    const p = spawn(path.join(MYSQL_BIN, "mysqld.exe"), [`--datadir=${DOSSIER_DONNEES_MYSQL}`, `--port=${PORT_MYSQL}`, "--bind-address=127.0.0.1", "--mysqlx-bind-address=127.0.0.1", "--console"], { windowsHide: true });
    const ecrire = journal("mysql");
    p.stdout.on("data", (d) => ecrire(d.toString().trim()));
    p.stderr.on("data", (d) => ecrire(d.toString().trim()));
    return p;
  },
  sante: () => tcpOuvert(PORT_MYSQL),
});
const backService = new Service("Back", {
  avant: async () => {
    if (!(await tcpOuvert(PORT_MYSQL))) return false;
    // Port déjà pris par un autre programme : le serveur partirait sur un autre port, on attend
    if (await tcpOuvert(PORT_BACK)) { log(`Back : port ${PORT_BACK} déjà utilisé par un autre programme, nouvel essai dans 5 s`); return false; }
    return true;
  },
  lancer: () => {
    const p = spawn(process.execPath, ["--import", "tsx", "server/_core/index.ts"], {
      cwd: BACK, windowsHide: true,
      env: { ...process.env, NODE_ENV: "production", PORT: String(PORT_BACK), DATABASE_URL: URL_REELLE, UPLOAD_DIR: DOSSIER_PHOTOS },
    });
    const filtre = sortieFiltree("back");
    p.stdout.on("data", filtre);
    p.stderr.on("data", filtre);
    return p;
  },
  sante: () => httpOk(`http://127.0.0.1:${PORT_BACK}/api/trpc/catalog.settings`),
});
const siteService = new Service("Site", {
  lancer: () => {
    const p = spawn(process.execPath, [path.join(ICI, "serveur-site.mjs")], {
      cwd: ICI, windowsHide: true, env: { ...process.env, SITE_PORT: String(PORT_SITE), BACK_PORT: String(PORT_BACK) },
    });
    const ecrire = journal("site");
    p.stdout.on("data", (d) => ecrire(d.toString().trim()));
    p.stderr.on("data", (d) => ecrire(d.toString().trim()));
    return p;
  },
  sante: () => httpOk(`http://127.0.0.1:${PORT_SITE}/robots.txt`),
});

// ---------- Sauvegarde quotidienne ----------
const etatSauvegarde = { derniere: derniereSauvegarde()?.nom ?? null, erreur: null, enCours: false };
async function sauvegarderSiBesoin(force = false) {
  if (etatSauvegarde.enCours) return;
  const derniere = etatSauvegarde.derniere;
  const jourDerniere = derniere ? derniere.slice(0, 10) : null;
  const jourLocal = new Date().toLocaleDateString("sv-SE"); // AAAA-MM-JJ, heure locale
  if (!force && jourDerniere === jourLocal) return;
  if (!(await tcpOuvert(PORT_MYSQL))) return;
  etatSauvegarde.enCours = true;
  try {
    const r = await faireSauvegarde(URL_REELLE);
    etatSauvegarde.derniere = r.nom;
    etatSauvegarde.erreur = null;
    log(`Sauvegarde ${r.nom} : ${r.photos.nombre} photos/vidéos, ${(r.sql.octets / 1024).toFixed(0)} Ko de base${r.supprimees.length ? ` ; anciennes supprimées : ${r.supprimees.join(", ")}` : ""}`);
  } catch (e) {
    etatSauvegarde.erreur = `${new Date().toLocaleString("fr-FR")} : ${e.message}`;
    log(`ÉCHEC de la sauvegarde : ${e.message}`);
  } finally {
    etatSauvegarde.enCours = false;
  }
}

function adresses() {
  const liste = [`http://localhost:${PORT_SITE}`];
  for (const [nom, cartes] of Object.entries(os.networkInterfaces())) {
    for (const c of cartes ?? []) if (c.family === "IPv4" && !c.internal) liste.push(`http://${c.address}:${PORT_SITE}  (${nom})`);
  }
  return liste;
}

// ---------- Commandes locales (instance unique) ----------
async function toutArreter(avecMysql) {
  log(`Arrêt demandé${avecMysql ? " (avec MySQL)" : ""}`);
  siteService.arreter();
  backService.arreter();
  // MySQL n'est jamais arrêté brutalement : il reste allumé (serveurs de test), sauf arrêt propre demandé
  mysqlService.arret = true;
  if (avecMysql) {
    await new Promise((resolve) => spawn(path.join(MYSQL_BIN, "mysqladmin.exe"), ["-u", "root", "--host=127.0.0.1", "shutdown"], { windowsHide: true }).on("close", resolve));
    log("MySQL arrêté proprement");
  }
  await pause(500);
  process.exit(0);
}
const controle = http.createServer(async (req, res) => {
  const repondre = (objet) => { res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(objet, null, 2)); };
  if (req.method === "GET" && req.url === "/etat") {
    return repondre({
      base: new URL(URL_REELLE).pathname.slice(1), adresses: adresses(),
      services: [mysqlService, backService, siteService].map((s) => ({ nom: s.nom, etat: s.nom === "MySQL" && mysqlExterne ? "en marche (lancé hors du superviseur)" : s.etat, processus: s.processus?.pid ?? null, relances: s.relances })),
      sauvegarde: etatSauvegarde,
    });
  }
  if (req.method === "POST" && req.url?.startsWith("/arreter")) { repondre({ arret: true }); return toutArreter(req.url.includes("mysql=1")); }
  if (req.method === "POST" && req.url === "/sauvegarder") { await sauvegarderSiBesoin(true); return repondre(etatSauvegarde); }
  res.writeHead(404); res.end();
});
controle.on("error", (e) => {
  if (e.code === "EADDRINUSE") { console.log("Le site est déjà lancé."); process.exit(0); }
  throw e;
});

controle.listen(PORT_CONTROLE, "127.0.0.1", async () => {
  log(`Superviseur démarré (processus ${process.pid}) — base ${new URL(URL_REELLE).pathname.slice(1)}`);
  if (await tcpOuvert(PORT_MYSQL)) {
    mysqlExterne = true;
    log("MySQL tourne déjà : surveillé, relancé par le superviseur seulement s'il s'arrête");
  } else {
    await mysqlService.demarrer();
  }
  await backService.demarrer();
  await siteService.demarrer();
  // Surveillance : MySQL toutes les 15 s, back et site toutes les 30 s
  setInterval(async () => {
    if (mysqlExterne && !(await tcpOuvert(PORT_MYSQL))) {
      mysqlExterne = false;
      log("MySQL (lancé hors du superviseur) s'est arrêté → le superviseur le relance");
      await mysqlService.demarrer();
    } else if (!mysqlExterne) await mysqlService.verifier();
  }, 15000);
  setInterval(() => { void backService.verifier(); void siteService.verifier(); }, 30000);
  // Sauvegarde : 2 minutes après le démarrage si aucune aujourd'hui, puis vérification chaque heure
  setTimeout(() => void sauvegarderSiBesoin(), 2 * 60 * 1000);
  setInterval(() => void sauvegarderSiBesoin(), 60 * 60 * 1000);
});

process.on("SIGINT", () => void toutArreter(false));
process.on("SIGTERM", () => void toutArreter(false));
