# Démo en ligne (gratuite) — Cloudflare Tunnel

Pour montrer le site depuis un téléphone (4G) ou n'importe quel ordinateur, **sans hébergeur ni domaine**.
Le site tourne sur ce PC, sur la **base de TEST** avec des données de démonstration (comptes `@elegancedeco.test`).
La base réelle n'est jamais utilisée.

## Lancer

1. Double-cliquer sur **`demo-en-ligne.bat`**.
2. Au premier lancement : choisir le **mot de passe d'entrée** (8 caractères au moins, saisie masquée).
3. Répondre à « Recréer les données de démonstration ? » (Entrée = oui la première fois).
4. Le script affiche le lien `https://….trycloudflare.com`, le copie dans le presse-papiers et l'écrit dans `lien-demo.txt`.
5. Sur le téléphone : ouvrir le lien, identifiant **`demo`**, puis le mot de passe choisi.

Comptes de démo (mot de passe `DemoAngular2026!`) :

| Rôle | E-mail |
|---|---|
| Client | `demo_sarra_ng@elegancedeco.test` |
| Vendeur | `demo_vendeur_alpha_ng@elegancedeco.test` |
| Admin | `demo_admin_ng@elegancedeco.test` |

## Arrêter

Double-cliquer sur **`arreter-demo.bat`**. Il arrête le tunnel, le mot de passe et le serveur de démo.
MySQL reste allumé (vos autres serveurs l'utilisent), sauf si vous répondez « o ».

## Changer le mot de passe

Dans ce dossier : `node definir-mot-de-passe.mjs` (seule une empreinte scrypt est enregistrée dans `.mot-de-passe`, exclu de git).

## Comment ça marche

```
Téléphone ──HTTPS──► https://xxxx.trycloudflare.com (Cloudflare)
                         │ tunnel ouvert depuis ce PC (cloudflared)
                         ▼
        proxy-demo.mjs (127.0.0.1:4300) : mot de passe, noindex, site Angular de production
                         └── /api, /media ──► back de démo (127.0.0.1:3101) ──► MySQL : elegance_deco_test
```

| Fichier | Rôle |
|---|---|
| `demo-en-ligne.bat` / `.ps1` | Lance, dans l'ordre : MySQL, données de démo, build Angular (si besoin), back, proxy, tunnel |
| `arreter-demo.bat` / `.ps1` | Arrête la démo (processus notés au lancement + filet de sécurité par ports) |
| `proxy-demo.mjs` | Mot de passe (comparaison en temps constant, 10 essais puis 10 min de blocage), `X-Robots-Tag: noindex`, `robots.txt`, fichiers Angular, transmission au back avec `X-Forwarded-Proto: https` (cookie de session sécurisé) |
| `definir-mot-de-passe.mjs` | Saisie masquée du mot de passe, empreinte scrypt |
| `donnees-demo.mts` | Données de démonstration (refuse toute base dont le nom ne finit pas par `_test`) |
| `journaux/` | Journaux de chaque service (exclu de git) |

Aucune bibliothèque ajoutée (le proxy n'utilise que Node). Aucun fichier de `back/server/` modifié.

## cloudflared

- Version **2026.10.2**, licence **Apache 2.0**, source officielle : <https://github.com/cloudflare/cloudflared/releases>
- Fichier `cloudflared-windows-amd64.exe` rangé dans `%LOCALAPPDATA%\Programs\cloudflared\cloudflared.exe` (sans droits administrateur).
- Empreinte SHA256 vérifiée : `12c7c887f8aaab779aef1dfa9b60673530a5adb88ecc55dd6df8f56e0b70f199` (identique à celle des notes de version).
- Mise à jour : télécharger la nouvelle version au même endroit et vérifier son empreinte.

## Limites

- **Le lien change à chaque lancement.**
- **Le PC doit rester allumé**, connecté, et **ne pas se mettre en veille** (Paramètres → Système → Alimentation).
- La vitesse dépend de la connexion internet de ce PC (surtout en envoi).
- Cloudflare réserve les « quick tunnels » aux tests : **aucune garantie de disponibilité**, 200 requêtes simultanées au plus.
- Cloudflare ajoute son propre texte au début de `robots.txt` (non modifiable sur un quick tunnel). La protection repose donc sur l'en-tête `noindex` (le nôtre et celui de Cloudflare) **et surtout sur le mot de passe**.
- Visible publiquement **sans** mot de passe : la page « Démo protégée » et `robots.txt`. **Avec** le mot de passe : tout le site de démo. Avec en plus un compte de démo admin, on peut modifier la base de **test**, rien d'autre. Rien d'autre de ce PC n'est exposé (le proxy n'écoute que sur 127.0.0.1).
- Le trafic passe par Cloudflare, qui le déchiffre au passage (comme tout service de ce type).
- Ne fonctionnent pas : l'envoi d'e-mails (« mot de passe oublié ») et l'assistant IA s'il n'est pas configuré.
