# front-neon

Front (Angular 21) du site Elegance Deco, branché sur le back (`../back`).
Explications détaillées pour la soutenance : [EXPLICATIONS.md](EXPLICATIONS.md).

## Installation

Le front utilise le code du back (type `AppRouter`, règles partagées dans `shared/`).
Cloner les deux dépôts côte à côte, le back dans un dossier nommé `back` :

```bash
git clone https://github.com/taha43584/back-neon.git back
git clone https://github.com/taha43584/front-neon.git front
cd back && pnpm install && cd ../front && npm install
```

## Lancer le projet

1. Démarrer le back dans `../back` : `pnpm dev` → http://localhost:3000 (API)
2. Dans ce dossier :

```bash
npm install      # première fois seulement
npm start        # http://localhost:4200 (le proxy envoie /api et /media vers le port 3000)
```

Pour des essais sur la **base de test** : lancer un back sur le port 3001 branché sur `elegance_deco_test`, puis `npm run start:test` (http://localhost:4201).

## Construire

```bash
npm run build    # résultat dans dist/client-angular
```
