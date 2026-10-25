// Restauration d'une sauvegarde.
// Par défaut (SANS RISQUE) : rechargée dans une base TEMPORAIRE « elegance_deco_restauration » + photos extraites dans un
// dossier temporaire ; comparaison avec le manifeste (lignes de chaque table, empreintes de chaque fichier), puis
// suppression de la base et du dossier temporaires. La base réelle n'est pas touchée.
// --vraie : restaure DANS la base réelle et storage/uploads (vrai problème uniquement) : site arrêté obligatoire,
// phrase de confirmation, sauvegarde de l'état actuel d'abord.
// Usage : node restaurer-sauvegarde.mjs [AAAA-MM-JJ_HHMM] [--vraie]
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import readline from "node:readline/promises";
import { spawn } from "node:child_process";
import { createGunzip } from "node:zlib";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { DOSSIER_PHOTOS, DOSSIER_SAUVEGARDES, BACK, adresseBaseReelle, compterLignes, faireSauvegarde, listeSauvegardes } from "./sauvegarde.mjs";

const MYSQL_BIN = "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin";
const TAR = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
const BASE_TEMPORAIRE = "elegance_deco_restauration";
const PHRASE = "RESTAURER LA BASE REELLE";
const mysql = createRequire(path.join(BACK, "package.json"))("mysql2/promise");
const empreinte = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");

const args = process.argv.slice(2);
const vraie = args.includes("--vraie");
const nom = args.find((a) => !a.startsWith("--")) ?? listeSauvegardes().at(-1);
if (!nom) { console.error("Aucune sauvegarde trouvée dans", DOSSIER_SAUVEGARDES); process.exit(1); }
const dossier = path.join(DOSSIER_SAUVEGARDES, nom);
const manifeste = JSON.parse(fs.readFileSync(path.join(dossier, "manifeste.json"), "utf8"));
const urlReelle = adresseBaseReelle();

function avecBase(url, base) {
  const u = new URL(url);
  u.pathname = `/${base}`;
  return u.toString();
}
function serveur(url) {
  const u = new URL(url);
  u.pathname = "/";
  return u.toString();
}
/** Recharge le .sql.gz dans une base, par le client mysql (flux décompressé à la volée) */
function recharger(url, fichierSql) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const p = spawn(path.join(MYSQL_BIN, "mysql.exe"), ["--host", u.hostname === "localhost" ? "127.0.0.1" : u.hostname, "--port", u.port || "3306", "-u", decodeURIComponent(u.username || "root"), "--default-character-set=utf8mb4", u.pathname.replace(/^\//, "")],
      { windowsHide: true, env: { ...process.env, MYSQL_PWD: decodeURIComponent(u.password) } });
    let erreurs = "";
    p.stderr.on("data", (d) => { erreurs += d; });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`mysql : code ${code} ${erreurs.trim().slice(0, 300)}`))));
    fs.createReadStream(fichierSql).pipe(createGunzip()).pipe(p.stdin);
  });
}
function extraire(zip, destination) {
  return new Promise((resolve, reject) => {
    const p = spawn(TAR, ["-x", "-f", zip, "-C", destination], { windowsHide: true });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`tar : code ${code}`))));
  });
}
const portOuvert = (port) => new Promise((resolve) => { const s = net.connect(port, "127.0.0.1"); s.on("connect", () => { s.destroy(); resolve(true); }); s.on("error", () => resolve(false)); });

console.log(`Sauvegarde : ${nom} (${manifeste.date})`);
// 1. Les archives n'ont pas été abîmées
const sql = path.join(dossier, manifeste.sql.fichier);
const zip = path.join(dossier, manifeste.photos.fichier);
if (empreinte(sql) !== manifeste.sql.sha256) { console.error("ÉCHEC : le fichier SQL ne correspond pas au manifeste."); process.exit(1); }
if (empreinte(zip) !== manifeste.photos.sha256) { console.error("ÉCHEC : l'archive des photos ne correspond pas au manifeste."); process.exit(1); }
console.log("Empreintes des archives : conformes.");

if (!vraie) {
  // ---------- Test de restauration (base et dossier temporaires) ----------
  const urlTemp = avecBase(urlReelle, BASE_TEMPORAIRE);
  const dossierTemp = fs.mkdtempSync(path.join(os.tmpdir(), "restauration-photos-"));
  const c = await mysql.createConnection(serveur(urlReelle));
  let ok = true;
  try {
    await c.query(`DROP DATABASE IF EXISTS \`${BASE_TEMPORAIRE}\``);
    await c.query(`CREATE DATABASE \`${BASE_TEMPORAIRE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await recharger(urlTemp, sql);
    const lignes = await compterLignes(urlTemp);
    for (const [table, attendu] of Object.entries(manifeste.lignes)) {
      const trouve = lignes[table];
      if (trouve !== attendu) { ok = false; console.error(`  Table ${table} : ${trouve} lignes au lieu de ${attendu}`); }
    }
    console.log(`Base : ${Object.keys(manifeste.lignes).length} tables, ${Object.values(lignes).reduce((a, b) => a + b, 0)} lignes rechargées${ok ? ", conformes au manifeste" : ""}.`);

    await extraire(zip, dossierTemp);
    const racinePhotos = path.join(dossierTemp, path.basename(DOSSIER_PHOTOS));
    let photosOk = 0;
    for (const [relatif, attendue] of Object.entries(manifeste.photos.fichiers)) {
      const f = path.join(racinePhotos, relatif);
      if (fs.existsSync(f) && empreinte(f) === attendue) photosOk++;
      else { ok = false; console.error(`  Photo manquante ou différente : ${relatif}`); }
    }
    console.log(`Photos et vidéos : ${photosOk} / ${manifeste.photos.nombre} identiques.`);
  } finally {
    await c.query(`DROP DATABASE IF EXISTS \`${BASE_TEMPORAIRE}\``).catch(() => undefined);
    await c.end();
    fs.rmSync(dossierTemp, { recursive: true, force: true });
  }
  console.log(ok ? "\nRESTAURATION VÉRIFIÉE (base et dossier temporaires supprimés ; base réelle non touchée)." : "\nÉCHEC de la vérification.");
  process.exit(ok ? 0 : 1);
}

// ---------- Vraie restauration ----------
if (await portOuvert(3100)) { console.error("Arrêtez d'abord le site (arreter-site.bat)."); process.exit(1); }
console.log(`\nATTENTION : la base réelle et le dossier des photos vont être remplacés par la sauvegarde ${nom}.`);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const reponse = await rl.question(`Pour confirmer, tapez exactement : ${PHRASE}\n> `);
rl.close();
if (reponse.trim() !== PHRASE) { console.log("Annulé : rien n'a été modifié."); process.exit(1); }
console.log("Sauvegarde de l'état actuel avant restauration…");
const avant = await faireSauvegarde(urlReelle);
console.log(`État actuel sauvegardé : ${avant.nom}`);
await recharger(urlReelle, sql);
const dossierTemp = fs.mkdtempSync(path.join(os.tmpdir(), "restauration-photos-"));
await extraire(zip, dossierTemp);
fs.cpSync(path.join(dossierTemp, path.basename(DOSSIER_PHOTOS)), DOSSIER_PHOTOS, { recursive: true, force: true });
fs.rmSync(dossierTemp, { recursive: true, force: true });
console.log(`Restauration terminée depuis ${nom}. Relancez le site (demarrer-site.bat).`);
process.exit(0);
