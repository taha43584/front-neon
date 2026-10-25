// Remplace JWT_SECRET dans .env par 64 caractères aléatoires, SANS jamais les afficher.
// Effet : tous les comptes sont déconnectés une fois (il suffit de se reconnecter).
// À lancer par vous-même : node nouvelle-cle-session.mjs   (puis redémarrer le site)
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const ENV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "back", ".env");
const texte = fs.readFileSync(ENV, "utf8");
const cle = randomBytes(32).toString("hex"); // 64 caractères
const ligne = `JWT_SECRET=${cle}`;
const nouveau = /^JWT_SECRET=.*$/m.test(texte) ? texte.replace(/^JWT_SECRET=.*$/m, ligne) : `${texte.replace(/\s*$/, "")}\n${ligne}\n`;
// Copie de l'ancien .env HORS du dépôt git (jamais commitée)
const COPIE = path.resolve(path.dirname(ENV), "..", "..", "sauvegardes-db", "env-avant-nouvelle-cle.txt");
fs.mkdirSync(path.dirname(COPIE), { recursive: true });
fs.copyFileSync(ENV, COPIE);
fs.writeFileSync(ENV, nouveau);
console.log("Nouvelle clé de session enregistrée dans .env (64 caractères, non affichée).");
console.log(`Une copie de l'ancien fichier est dans ${COPIE} (hors du dépôt) : supprimez-la quand tout fonctionne.`);
console.log("Redémarrez le site : arreter-site.bat puis demarrer-site.bat. Tous les comptes devront se reconnecter.");
