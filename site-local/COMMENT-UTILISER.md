# Comment utiliser le vrai site (base réelle)

Le **vrai site** tourne sur ce PC avec la **vraie base** `elegance_deco` et le vrai dossier des photos (`storage/uploads`).
Il sert à remplir la base (comptes, boutiques, produits, photos) avant la mise en ligne.
Il n'est **pas** accessible depuis Internet : seulement depuis ce PC et depuis les appareils du **même Wi-Fi « Privé »**.

## Adresses

| Où | Adresse |
|---|---|
| Sur ce PC | **http://localhost:8080** |
| Sur le téléphone (même Wi-Fi) | **http://192.168.100.95:8080** |

Si le téléphone n'y arrive plus, l'adresse du PC a peut-être changé : lancez `etat-site.bat`, il affiche l'adresse du moment.
Pour qu'elle ne change plus : dans la box, « réservez » l'adresse du PC (bail DHCP fixe).

## Démarrer, arrêter, redémarrer

| Je veux… | Je fais… |
|---|---|
| Qu'il démarre tout seul | C'est déjà en place : un raccourci dans le dossier « Démarrage » le lance, sans fenêtre, à l'ouverture de votre session Windows. Pour l'enlever : Win+R → `shell:startup` → supprimer « Elegance Deco - site local ». Pour le remettre : `installer-demarrage-auto.bat` |
| Le démarrer à la main | `demarrer-site.bat` |
| Savoir s'il marche | `etat-site.bat` (services, adresses, dernière sauvegarde) |
| L'arrêter | `arreter-site.bat` (MySQL reste allumé, sauf si vous répondez « o ») |
| Le redémarrer | `arreter-site.bat` puis `demarrer-site.bat` |
| Mettre à jour le site (nouvelle version Angular) | `mettre-a-jour-site.bat` |

Si un élément plante (MySQL, le serveur ou le site), il **redémarre tout seul** en quelques secondes (attente croissante si cela se répète).
Journaux : `site-local\journaux\` (`superviseur.log`, `back.log`, `site.log`, `mysql.log`).

## Sauvegardes

- **Automatiques**, une fois par jour quand le PC est allumé (2 minutes après le démarrage, puis vérification chaque heure).
- Dossier : **`C:\Users\MSI\Documents\antigravity\sauvegardes-db\`**, un dossier par jour (`AAAA-MM-JJ_HHMM`) :
  `elegance_deco.sql.gz` (la base), `photos.zip` (photos et vidéos), `manifeste.json` (nombres de lignes, empreintes).
- **14 jours** gardés ; les plus anciennes sont supprimées automatiquement.
- Sauvegarde immédiate : `sauvegarder-maintenant.bat`.
- **Tester qu'une sauvegarde est bonne** (sans risque) : `restaurer-sauvegarde.bat`. Il la recharge dans une base temporaire,
  compare tout, affiche « RESTAURATION VÉRIFIÉE », puis efface la base temporaire. Votre vraie base n'est pas touchée.
- Vraie restauration (seulement en cas de vrai problème) : arrêter le site, puis `node restaurer-sauvegarde.mjs NOM --vraie`
  (il demande de taper `RESTAURER LA BASE REELLE` et sauvegarde d'abord l'état actuel).
- Conseil : copiez de temps en temps le dossier `sauvegardes-db` sur une clé USB ou un Google Drive (même disque = même risque).

## Quelle base utilise quoi

| Serveur | Ports | Base | Photos |
|---|---|---|---|
| **Vrai site** (ce dossier) | 8080 (site) · 3100 (serveur) | **elegance_deco (réelle)** | storage/uploads |
| Développement (`npm run dev`, `npm start` dans front) | 3000 · 4200 | elegance_deco_test | storage/uploads-test |
| Tests (`npm test`, serveurs de test) | 3001 · 4201 | elegance_deco_test | storage/uploads-test |
| Démo en ligne (`demo-en-ligne`) | 3101 · 4300 | elegance_deco_test | storage/uploads-test |

Le serveur de développement **refuse de démarrer** si sa base ne se termine pas par `_test` (`back/scripts/dev-base-test.mjs`).
Le vrai site **refuse de démarrer** sur une base de test. Les tests et la démo refusent toute base qui n'est pas `_test`.

## Le téléphone n'arrive pas à ouvrir le site

1. Le téléphone est-il sur le **même Wi-Fi** que le PC (pas en 4G) ?
2. `etat-site.bat` : le site est-il « en marche », et quelle est l'adresse Wi-Fi affichée ?
3. Le Wi-Fi est-il en réseau **Privé** et `configurer-pare-feu.ps1` a-t-il été lancé ? (Paramètres → Réseau → Wi-Fi → propriétés)
4. Ailleurs qu'à la maison (café, autre Wi-Fi « Public »), c'est **normal** que ce soit bloqué.

## Sécurité (à faire une fois, par vous-même)

1. **Pare-feu** : clic droit sur `configurer-pare-feu.ps1` → « Exécuter avec PowerShell » (demande administrateur).
2. **Nouvelle clé de session** : `node nouvelle-cle-session.mjs` (dans ce dossier), puis redémarrer le site.
3. **Mots de passe** des comptes réels : page de connexion → « Mot de passe oublié » → votre e-mail ; le code apparaît dans
   `site-local\journaux\prive\codes-mot-de-passe.txt` (fichier privé, jamais dans git, que l'assistant n'ouvre pas),
   sur la ligne **`CODE À COPIER (valable jusqu'à HH:MM…) : xxxx`** : copiez les 48 caractères de la fin (ou la ligne
   entière : la page enlève le reste toute seule). Le code vaut **1 heure**, **une seule fois**, et il est **perdu si le
   site redémarre**. Choisissez le nouveau mot de passe, puis **effacez ce fichier**.

En HTTP, sur le Wi-Fi, les mots de passe ne sont protégés que par le chiffrement du Wi-Fi : n'utilisez ce site que chez vous.
