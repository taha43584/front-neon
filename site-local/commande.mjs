// Commandes du vrai site local : node commande.mjs etat | arreter [--mysql] | sauvegarder
// Parle au superviseur sur 127.0.0.1:8099 (accessible depuis ce PC seulement).
import http from "node:http";
import readline from "node:readline/promises";

const action = process.argv[2] ?? "etat";

function appel(methode, chemin) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: "127.0.0.1", port: 8099, method: methode, path: chemin, timeout: 300000 }, (res) => {
      let texte = "";
      res.on("data", (d) => { texte += d; });
      res.on("end", () => { try { resolve(JSON.parse(texte)); } catch { resolve(null); } });
    });
    r.on("error", reject);
    r.on("timeout", () => r.destroy(new Error("délai dépassé")));
    r.end();
  });
}

try {
  if (action === "etat") {
    const e = await appel("GET", "/etat");
    console.log(`\nVRAI SITE (base ${e.base}) — en marche\n`);
    for (const s of e.services) console.log(`  ${s.nom.padEnd(6)} : ${s.etat}${s.relances ? ` (relancé ${s.relances} fois)` : ""}`);
    console.log("\nAdresses :");
    for (const a of e.adresses) console.log(`  ${a}`);
    console.log("  (téléphone : sur le même Wi-Fi « Privé » uniquement)");
    console.log(`\nDernière sauvegarde : ${e.sauvegarde.derniere ?? "aucune pour l'instant"}${e.sauvegarde.enCours ? " (une sauvegarde est en cours)" : ""}`);
    if (e.sauvegarde.erreur) console.log(`ÉCHEC DE LA DERNIÈRE SAUVEGARDE : ${e.sauvegarde.erreur}`);
  } else if (action === "arreter") {
    let avecMysql = process.argv.includes("--mysql");
    if (!avecMysql && process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      avecMysql = /^[oy]/i.test(await rl.question("Arrêter aussi MySQL ? (o/N, Entrée = N — les serveurs de test l'utilisent) "));
      rl.close();
    }
    await appel("POST", `/arreter${avecMysql ? "?mysql=1" : ""}`);
    console.log(`Vrai site arrêté${avecMysql ? " (MySQL aussi)" : " (MySQL reste allumé)"}.`);
  } else if (action === "sauvegarder") {
    console.log("Sauvegarde en cours…");
    const s = await appel("POST", "/sauvegarder");
    console.log(s.erreur ? `ÉCHEC : ${s.erreur}` : `Sauvegarde faite : ${s.derniere}`);
  } else {
    console.log("Usage : node commande.mjs etat | arreter [--mysql] | sauvegarder");
  }
} catch {
  console.log(action === "arreter" ? "Le vrai site n'est pas lancé." : "Le vrai site est ARRÊTÉ (lancez demarrer-site.bat).");
}
