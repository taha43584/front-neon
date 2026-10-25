# Mise en ligne sur Dokploy — elegance.rjdeco.com

Trois services dans un même projet Dokploy :

| Service | Source | Port interne | Adresse publique |
|---|---|---|---|
| MySQL 8.4 | base Dokploy | 3306 | aucune (réseau interne seulement) |
| back | `taha43584/back-neon`, Dockerfile | 3000 | `elegance.rjdeco.com/api`, `/media`, `/manus-storage` |
| front | `taha43584/front-neon`, Dockerfile | 80 | `elegance.rjdeco.com` |

Le front et le back partagent le même domaine. Traefik (le routeur de Dokploy) envoie `/api`, `/media` et
`/manus-storage` au back, et tout le reste au front. Comme tout est sur la même adresse, le cookie de
connexion fonctionne sans réglage supplémentaire.

---

## 1. DNS (à faire en premier)

Chez le fournisseur du domaine `rjdeco.com`, ajoutez :

| Type | Nom | Valeur |
|---|---|---|
| A | `elegance` | adresse IP du VPS |

Vérifiez avec `ping elegance.rjdeco.com` : l'IP du VPS doit répondre. Cela peut prendre de quelques minutes à
quelques heures. Le certificat HTTPS ne peut être créé qu'une fois le DNS en place.

Si le domaine est chez Cloudflare : laissez le nuage **gris** (DNS only) pendant la création du certificat.

## 2. Projet

Dokploy → **Projects** → **Create Project** → nom `elegance`.

## 3. Base de données MySQL

Dans le projet : **Create Service** → **Database** → **MySQL**.

| Champ | Valeur |
|---|---|
| Name | `elegance-db` |
| Database Name | `elegance_deco` |
| Database User | `elegance` |
| Database Password | mot de passe solide, **lettres et chiffres seulement** (`@ : / #` casseraient l'adresse de connexion) |
| Root Password | autre mot de passe solide, lettres et chiffres |
| Docker Image | `mysql:8.4` (même version que sur le PC) |

**Create**, puis **Deploy**. Dans l'onglet de la base, notez l'**Internal Connection URL**. Elle ressemble à :

```
mysql://elegance:MOTDEPASSE@elegance-db-xxxxxx:3306/elegance_deco
```

N'ouvrez pas de port externe : seul le back doit pouvoir joindre la base.

## 4. Récupérer les vraies données (sinon passez à l'étape 5 : la base sera créée vide)

À faire **avant** de déployer le back.

**Sur le PC Windows**, lancez `front\site-local\sauvegarder-maintenant.bat`. La sauvegarde est créée dans
`sauvegardes-db\AAAA-MM-JJ_HHMM\` (à côté du dossier du projet), avec `elegance_deco.sql.gz` et `photos.zip`.

Envoyez ce dossier sur le VPS (PowerShell) :

```powershell
scp -r "C:\chemin\vers\sauvegardes-db\AAAA-MM-JJ_HHMM" root@IP_DU_VPS:/root/import
```

**Sur le VPS** (`ssh root@IP_DU_VPS`), importez la base :

```bash
cd /root/import
DB=$(docker ps -qf name=elegance-db)          # le début du nom de la base dans Dokploy
gunzip -c elegance_deco.sql.gz | docker exec -i -e MYSQL_PWD='ROOT_PASSWORD' $DB \
  mysql -uroot --default-character-set=utf8mb4 elegance_deco
```

Les photos sont copiées à l'étape 6, une fois le back créé.

## 5. Back

Dans le projet : **Create Service** → **Application** → nom `elegance-back`.

**Source** : Provider **Git**, URL `https://github.com/taha43584/back-neon.git`, branche `main`.
Ou provider **GitHub**, si le compte GitHub est relié à Dokploy (cela permet le déploiement automatique).

**Build Type** : **Dockerfile** (chemin `Dockerfile`).

**Environment** :

```env
DATABASE_URL=mysql://elegance:MOTDEPASSE@elegance-db-xxxxxx:3306/elegance_deco
JWT_SECRET=           # 64 caractères aléatoires : openssl rand -hex 32
# Base vide seulement : compte administrateur créé au premier démarrage
ADMIN_EMAIL=admin@rjdeco.com
ADMIN_PASSWORD=
# E-mails (facultatif ; sans SMTP, les e-mails sont seulement écrits dans les journaux)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=Elegance Deco <no-reply@rjdeco.com>
```

`NODE_ENV`, `PORT` (3000) et `UPLOAD_DIR` sont déjà fixés dans le Dockerfile.

**Advanced → Volumes / Mounts** → **Add Volume** :
- Type : **Volume**
- Nom : `elegance-storage`
- Mount Path : `/app/storage`

Sans ce volume, les photos envoyées seraient perdues à chaque redéploiement.

**Deploy**. Dans **Logs**, au premier démarrage :
- base vide : `Base vide : création des tables.`, puis `Rôle : admin` et `Server running on http://localhost:3000/` ;
- base importée : `Base déjà à jour` (ou la liste des migrations appliquées), puis `Server running…`.

À chaque démarrage, le back attend MySQL, applique les migrations (additives, sans perte de données), puis
démarre. Après le premier démarrage, vous pouvez retirer `ADMIN_PASSWORD` des variables.

**Domains** : ajoutez **trois** domaines, tous avec ces réglages :
- Host : `elegance.rjdeco.com`
- Container Port : `3000`
- HTTPS : activé
- Certificate : **Let's Encrypt**
- Strip Path : **désactivé**

| Path |
|---|
| `/api` |
| `/media` |
| `/manus-storage` |

## 6. Photos (seulement si vous avez importé les vraies données)

Sur le VPS, une fois le back démarré :

```bash
cd /root/import
apt install -y unzip            # si besoin
unzip -q photos.zip -d photos   # crée photos/uploads/…
BACK=$(docker ps -qf name=elegance-back)
docker cp photos/uploads/. $BACK:/app/storage/uploads/
```

Les fichiers vont dans le volume `elegance-storage` : ils restent après un redéploiement.
Supprimez ensuite `/root/import` (il contient toute la base).

## 7. Front

Dans le projet : **Create Service** → **Application** → nom `elegance-front`.

- Source : Git `https://github.com/taha43584/front-neon.git`, branche `main`
- Build Type : **Dockerfile**

Le build clone aussi `back-neon` (le front a besoin de son code) : aucun réglage à faire.

**Deploy**, puis **Domains** → un domaine :
- Host : `elegance.rjdeco.com`
- Path : `/`
- Container Port : `80`
- HTTPS : activé
- Certificate : **Let's Encrypt**

## 8. Vérifier

- `https://elegance.rjdeco.com` affiche l'accueil, avec le cadenas HTTPS.
- `https://elegance.rjdeco.com/api/trpc/catalog.home` renvoie du JSON (et non la page du site).
- Connexion avec le compte admin, puis `/admin` (back office).
- Ajoutez une photo à un produit, redéployez le back : la photo est toujours là.
- Sur téléphone : rechargez une page profonde (`/produit/…`), elle doit s'afficher.

## Mises à jour

1. Pousser le code sur GitHub.
2. Dokploy → l'application → **Deploy**. Ou activez **Auto Deploy** si la source est le provider GitHub.

Si le back change (`server/routers.ts`, `shared/`…), redéployez **le back puis le front** : le front est construit
avec le code du back.

## Sauvegardes

- Base : onglet **Backups** de MySQL dans Dokploy (vers un stockage S3 : Cloudflare R2, Backblaze…), une par jour.
- Photos : le volume `elegance-storage` (`/var/lib/docker/volumes/elegance-storage/_data` sur le VPS) est à
  sauvegarder aussi, par exemple avec la fonction de sauvegarde des volumes de Dokploy ou un `rsync` régulier.

## Problèmes fréquents

| Symptôme | Cause probable |
|---|---|
| Certificat non créé | Le DNS ne pointe pas encore vers le VPS, ou le nuage Cloudflare est orange |
| `/api/...` affiche la page du site | Les domaines `/api`, `/media`, `/manus-storage` du back manquent, ou Strip Path est activé |
| Back : `MySQL reste injoignable` | `DATABASE_URL` incorrecte (nom interne de la base, mot de passe avec `@` ou `:`) |
| Photos disparues après redéploiement | Volume `/app/storage` absent |
