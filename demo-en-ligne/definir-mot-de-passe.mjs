// Définit (ou change) le mot de passe d'entrée de la démo en ligne.
// La saisie est masquée ; seule une empreinte scrypt est enregistrée dans .mot-de-passe (exclu de git).
// Pour un lancement automatique (tests), la variable DEMO_MOT_DE_PASSE peut le fournir.
import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath } from "node:url";

const FICHIER = path.join(path.dirname(fileURLToPath(import.meta.url)), ".mot-de-passe");

function enregistrer(motDePasse) {
  if (motDePasse.length < 8) {
    console.error("Le mot de passe doit contenir au moins 8 caractères.");
    process.exit(1);
  }
  const sel = randomBytes(16).toString("hex");
  fs.writeFileSync(FICHIER, `scrypt$${sel}$${scryptSync(motDePasse, sel, 32).toString("hex")}\n`, { mode: 0o600 });
  console.log("Mot de passe de la démo enregistré (identifiant : demo).");
}

function saisieMasquee(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const entree = process.stdin;
    entree.setRawMode?.(true);
    entree.resume();
    entree.setEncoding("utf8");
    let texte = "";
    entree.on("data", (touche) => {
      for (const c of touche) {
        if (c === "\r" || c === "\n") {
          entree.setRawMode?.(false);
          entree.pause();
          process.stdout.write("\n");
          return resolve(texte);
        }
        if (c === "\u0003") process.exit(1); // Ctrl+C
        if (c === "\u0008" || c === "\u007f") { if (texte) { texte = texte.slice(0, -1); process.stdout.write("\b \b"); } continue; }
        texte += c;
        process.stdout.write("*");
      }
    });
  });
}

if (process.env.DEMO_MOT_DE_PASSE) {
  enregistrer(process.env.DEMO_MOT_DE_PASSE);
} else {
  const premier = await saisieMasquee("Choisissez le mot de passe de la démo (8 caractères au moins) : ");
  const second = await saisieMasquee("Retapez-le : ");
  if (premier !== second) {
    console.error("Les deux saisies sont différentes.");
    process.exit(1);
  }
  enregistrer(premier);
}
