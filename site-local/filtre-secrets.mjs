// Filtre de la sortie du back : sans serveur d'e-mail, le serveur écrit le code de réinitialisation
// (et, à la création d'un compte par l'admin, le mot de passe) dans sa sortie. Ces blocs vont dans un fichier PRIVÉ,
// jamais dans le journal normal. Sous chaque code de réinitialisation, une ligne « CODE À COPIER » ne contient que
// les 48 caractères à coller dans la page (le token reste valable 1 heure, une seule fois, et tant que le serveur
// n'a pas redémarré).
import fs from "node:fs";

const DEBUT = /SMTP non configuré|resetToken|password:/i;
const TOKEN = /resetToken: '([A-Za-z0-9_-]+)'/;
const VALIDITE_MS = 60 * 60 * 1000;

/**
 * @param ecrire  fonction qui écrit une ligne dans le journal NORMAL
 * @param prive   chemin du fichier privé
 * @param maintenant  horloge (remplaçable pour les essais)
 * @returns fonction à brancher sur stdout / stderr du back
 */
export function creerFiltreSecrets(ecrire, prive, maintenant = () => new Date()) {
  let reste = "";
  let capture = 0;
  let code = null;
  const heure = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const terminerBloc = () => {
    if (code) {
      const fin = new Date(maintenant().getTime() + VALIDITE_MS);
      fs.appendFileSync(prive, `CODE À COPIER (valable jusqu'à ${heure(fin)}, une seule fois, perdu si le site redémarre) : ${code}\n\n`);
    }
    code = null;
    capture = 0;
  };
  return (morceau) => {
    reste += morceau.toString("utf8");
    const lignes = reste.split(/\r?\n/);
    reste = lignes.pop() ?? "";
    for (const ligne of lignes) {
      if (capture > 0 || DEBUT.test(ligne)) {
        if (capture === 0) ecrire("[Email] Information privée détournée vers journaux/prive/codes-mot-de-passe.txt");
        fs.appendFileSync(prive, `${maintenant().toLocaleString("fr-FR")} ${ligne}\n`);
        code = TOKEN.exec(ligne)?.[1] ?? code;
        // Fin du bloc : « } » (objet affiché sur plusieurs lignes) ou ligne unique ; 12 lignes au plus par sécurité
        if (ligne.includes("}") || ++capture >= 12) terminerBloc();
        continue;
      }
      ecrire(ligne);
    }
  };
}
