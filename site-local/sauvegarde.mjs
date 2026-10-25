// Sauvegarde de la base RÉELLE et du dossier des photos / vidéos (utilisée par le superviseur, une fois par jour).
// Dossier daté : sauvegardes-db\AAAA-MM-JJ_HHMM\ { elegance_deco.sql.gz, photos.zip, manifeste.json }
// Écrit d'abord dans « …en-cours », renommé seulement si tout est vérifié. 14 jours gardés.
// Lancement manuel : node sauvegarde.mjs
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createGzip } from "node:zlib";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
/** Dossier du back : .env, storage/ et node_modules (mysql2) */
export const BACK = path.resolve(ICI, "..", "..", "back");
/** Sauvegardes HORS du dépôt git (à côté du dossier du projet) */
export const DOSSIER_SAUVEGARDES = path.resolve(BACK, "..", "..", "sauvegardes-db");
export const DOSSIER_PHOTOS = path.join(BACK, "storage", "uploads");
export const JOURS_GARDES = 14;
const MYSQL_BIN = "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin";
const TAR = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
const NOM_DOSSIER = /^\d{4}-\d{2}-\d{2}_\d{4}$/;
const mysql = createRequire(path.join(BACK, "package.json"))("mysql2/promise");

/** Adresse de la base RÉELLE, lue dans .env ; refus si c'est une base de test */
export function adresseBaseReelle() {
  const texte = fs.readFileSync(path.join(BACK, ".env"), "utf8");
  const ligne = texte.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  if (!ligne) throw new Error("DATABASE_URL est absente de .env");
  const url = ligne.slice("DATABASE_URL=".length).trim();
  if (new URL(url).pathname.replace(/^\//, "").endsWith("_test")) throw new Error("DATABASE_URL vise une base de test : le vrai site ne l'utilise pas");
  return url;
}

function horodatage(date = new Date()) {
  const d = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${d(date.getMonth() + 1)}-${d(date.getDate())}_${d(date.getHours())}${d(date.getMinutes())}`;
}
const empreinte = (fichier) => createHash("sha256").update(fs.readFileSync(fichier)).digest("hex");

function fichiersDe(dossier) {
  if (!fs.existsSync(dossier)) return [];
  return fs.readdirSync(dossier, { withFileTypes: true, recursive: true }).filter((e) => e.isFile()).map((e) => path.join(e.parentPath ?? e.path, e.name));
}

function executer(commande, args, options = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(commande, args, { windowsHide: true, ...options });
    let erreurs = "";
    let sortie = "";
    p.stderr?.on("data", (d) => { erreurs += d; });
    if (!options.stdio) p.stdout?.on("data", (d) => { sortie += d; });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(sortie) : reject(new Error(`${path.basename(commande)} : code ${code} ${erreurs.trim().slice(0, 300)}`))));
  });
}

/** mysqldump compressé à la volée ; vérifie « Dump completed » à la fin du texte */
function dumpCompresse(url, fichier) {
  const u = new URL(url);
  const args = ["--host", u.hostname === "localhost" ? "127.0.0.1" : u.hostname, "--port", u.port || "3306", "-u", decodeURIComponent(u.username || "root"),
    "--single-transaction", "--routines", "--triggers", "--default-character-set=utf8mb4", u.pathname.replace(/^\//, "")];
  return new Promise((resolve, reject) => {
    const p = spawn(path.join(MYSQL_BIN, "mysqldump.exe"), args, { windowsHide: true, env: { ...process.env, MYSQL_PWD: decodeURIComponent(u.password) } });
    let fin = "";
    let erreurs = "";
    const sortie = fs.createWriteStream(fichier);
    p.stdout.on("data", (d) => { fin = (fin + d.toString("utf8")).slice(-300); });
    p.stderr.on("data", (d) => { erreurs += d; });
    p.stdout.pipe(createGzip({ level: 9 })).pipe(sortie);
    p.on("error", reject);
    p.on("close", (code) => sortie.on("close", () => {
      if (code !== 0) return reject(new Error(`mysqldump : code ${code} ${erreurs.trim().slice(0, 300)}`));
      if (!fin.includes("Dump completed")) return reject(new Error("mysqldump : fin du fichier incomplète"));
      resolve();
    }));
  });
}

/** Nombre exact de lignes de chaque table */
export async function compterLignes(url) {
  const c = await mysql.createConnection(url);
  try {
    const [tables] = await c.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
    const lignes = {};
    for (const { t } of tables) lignes[t] = Number((await c.query(`SELECT COUNT(*) AS n FROM \`${t}\``))[0][0].n);
    return lignes;
  } finally {
    await c.end();
  }
}

export function listeSauvegardes() {
  if (!fs.existsSync(DOSSIER_SAUVEGARDES)) return [];
  return fs.readdirSync(DOSSIER_SAUVEGARDES).filter((n) => NOM_DOSSIER.test(n) && fs.existsSync(path.join(DOSSIER_SAUVEGARDES, n, "manifeste.json"))).sort();
}

export function derniereSauvegarde() {
  const nom = listeSauvegardes().at(-1);
  return nom ? { nom, ...JSON.parse(fs.readFileSync(path.join(DOSSIER_SAUVEGARDES, nom, "manifeste.json"), "utf8")) } : null;
}

/** Supprime les sauvegardes de plus de 14 jours (seulement les dossiers au format daté) */
export function nettoyerAnciennes(maintenant = new Date()) {
  const limite = new Date(maintenant.getTime() - JOURS_GARDES * 24 * 60 * 60 * 1000);
  const supprimees = [];
  for (const nom of fs.existsSync(DOSSIER_SAUVEGARDES) ? fs.readdirSync(DOSSIER_SAUVEGARDES) : []) {
    const m = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\.en-cours)?$/.exec(nom);
    if (!m) continue;
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
    if (date < limite || m[6]) {
      fs.rmSync(path.join(DOSSIER_SAUVEGARDES, nom), { recursive: true, force: true });
      supprimees.push(nom);
    }
  }
  return supprimees;
}

export async function faireSauvegarde(url = adresseBaseReelle()) {
  const nom = horodatage();
  const final = path.join(DOSSIER_SAUVEGARDES, nom);
  const encours = `${final}.en-cours`;
  fs.mkdirSync(encours, { recursive: true });
  try {
    const base = new URL(url).pathname.replace(/^\//, "");
    const fichierSql = path.join(encours, `${base}.sql.gz`);
    const lignesAvant = await compterLignes(url);
    await dumpCompresse(url, fichierSql);

    // Photos et vidéos : archive zip (tar.exe intégré à Windows), puis relecture de la liste
    const photos = fichiersDe(DOSSIER_PHOTOS);
    const fichierZip = path.join(encours, "photos.zip");
    await executer(TAR, ["-a", "-c", "-f", fichierZip, "-C", path.dirname(DOSSIER_PHOTOS), path.basename(DOSSIER_PHOTOS)]);
    const listeZip = (await executer(TAR, ["-t", "-f", fichierZip])).split(/\r?\n/).filter((l) => l && !l.endsWith("/"));
    if (listeZip.length !== photos.length) throw new Error(`archive des photos incomplète (${listeZip.length} fichiers au lieu de ${photos.length})`);

    const manifeste = {
      date: new Date().toISOString(), base, lignes: lignesAvant,
      sql: { fichier: path.basename(fichierSql), octets: fs.statSync(fichierSql).size, sha256: empreinte(fichierSql) },
      photos: {
        fichier: "photos.zip", octets: fs.statSync(fichierZip).size, sha256: empreinte(fichierZip), nombre: photos.length,
        fichiers: Object.fromEntries(photos.map((f) => [path.relative(DOSSIER_PHOTOS, f).replaceAll("\\", "/"), empreinte(f)])),
      },
    };
    fs.writeFileSync(path.join(encours, "manifeste.json"), JSON.stringify(manifeste, null, 2));
    fs.renameSync(encours, final);
    return { nom, ...manifeste, supprimees: nettoyerAnciennes() };
  } catch (error) {
    fs.rmSync(encours, { recursive: true, force: true });
    throw error;
  }
}

// Lancement manuel
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const r = await faireSauvegarde();
    console.log(`Sauvegarde ${r.nom} : ${Object.values(r.lignes).reduce((a, b) => a + b, 0)} lignes, ${r.photos.nombre} photos/vidéos, ${(r.sql.octets / 1024).toFixed(0)} Ko + ${(r.photos.octets / 1024).toFixed(0)} Ko.`);
    if (r.supprimees.length) console.log("Anciennes sauvegardes supprimées :", r.supprimees.join(", "));
    process.exit(0);
  } catch (error) {
    console.error("ÉCHEC de la sauvegarde :", error.message);
    process.exit(1);
  }
}
