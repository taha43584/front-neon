// Données de DÉMONSTRATION pour la démo en ligne — BASE DE TEST UNIQUEMENT (nom se terminant par « _test »).
// Comptes @elegancedeco.test, produits, vidéos, néon, avis avec photos. Tout passe par les vraies procédures du serveur.
// --clean : supprime tout ce qui appartient aux comptes @elegancedeco.test (fichiers compris).
// Les fichiers d'exemple (photos, vidéo) sont COPIÉS depuis storage/uploads vers storage/uploads-test (lecture seule).
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "back");
const imp = (relatif: string) => import(pathToFileURL(path.join(RACINE, relatif)).href);
const url = process.env.DATABASE_URL ?? "";
if (!/_test$/.test(new URL(url).pathname)) {
  console.error("Refus : DATABASE_URL ne vise pas une base de test (nom en « _test »).");
  process.exit(1);
}
const UPLOAD_TEST = path.join(RACINE, "storage", "uploads-test");
process.env.UPLOAD_DIR = UPLOAD_TEST;
fs.mkdirSync(UPLOAD_TEST, { recursive: true });
// .env (secret de session…) AVANT le code du serveur ; DATABASE_URL déjà fixée n'est pas remplacée
await imp("node_modules/dotenv/config.js");

const { cleanupTestData } = await imp("server/test/cleanupTestData.ts");
console.log("Anciennes données de démo supprimées :", JSON.stringify(await cleanupTestData(url, UPLOAD_TEST)));
if (process.argv.includes("--clean")) process.exit(0);

const { appRouter } = await imp("server/routers.ts");
const { updateShopStatus, updateReviewStatus, createOrUpdateAdminUser } = await imp("server/db.ts");
const { createMediaRecord } = await imp("server/vendorCatalog.ts");
const { storeReviewPhoto } = await imp("server/customerReviews.ts");
const { sdk } = await imp("server/_core/sdk.ts");
const { COOKIE_NAME } = await imp("shared/const.ts");

const MOT_DE_PASSE = "DemoAngular2026!";
const SOURCES = path.join(RACINE, "storage", "uploads");
const IMAGES = fs.readdirSync(SOURCES).filter((f) => f.endsWith(".jpg")).sort();
const VIDEO = fs.readdirSync(SOURCES).find((f) => f.endsWith(".mp4"));
let rang = 0;
const imageSuivante = () => path.join(SOURCES, IMAGES[rang++ % IMAGES.length]);

function contexte(cookie = "") {
  const cookies: Record<string, string> = {};
  return { cookies, ctx: { user: null, req: { protocol: "http", headers: { cookie } }, res: { cookie: (n: string, v: string) => { cookies[n] = v; }, clearCookie: () => {} } } as any };
}
async function appelant(jeton: string) {
  const { ctx } = contexte(`${COOKIE_NAME}=${jeton}`);
  ctx.user = await sdk.authenticateRequest(ctx.req);
  return appRouter.createCaller(ctx);
}
type Vendeur = { token: string; userId: number; shopId: number };
async function vendeur(cle: string, boutique: string, ville: string): Promise<Vendeur> {
  const { ctx, cookies } = contexte();
  const r = await appRouter.createCaller(ctx).auth.registerVendor({
    firstName: "Démo", lastName: cle, email: `demo_vendeur_${cle.toLowerCase()}_ng@elegancedeco.test`, phone: "+216 50 111 222", city: ville,
    shopName: boutique, whatsapp: "+216 50 111 222", password: MOT_DE_PASSE, passwordConfirm: MOT_DE_PASSE, acceptTerms: true,
  });
  await updateShopStatus(r.shop.id, "active");
  return { token: cookies[COOKIE_NAME], userId: r.user.id, shopId: r.shop.id };
}
async function client(prenom: string, nom: string, ville: string) {
  const { ctx, cookies } = contexte();
  const r = await appRouter.createCaller(ctx).auth.registerCustomer({
    firstName: prenom, lastName: nom, email: `demo_${prenom.toLowerCase()}_ng@elegancedeco.test`, phone: "+216 20 123 456", city: ville,
    address: "12 rue de la Lumière", password: MOT_DE_PASSE, passwordConfirm: MOT_DE_PASSE,
  });
  return { token: cookies[COOKIE_NAME], userId: r.user.id, ville, nom: `${prenom} ${nom}` };
}
function copier(v: Vendeur, type: "image" | "video") {
  const source = type === "image" ? imageSuivante() : path.join(SOURCES, VIDEO!);
  const cle = `${randomBytes(12).toString("hex")}.${type === "image" ? "jpg" : "mp4"}`;
  fs.copyFileSync(source, path.join(UPLOAD_TEST, cle));
  return createMediaRecord({ ownerUserId: v.userId, shopId: v.shopId, kind: type, storageKey: cle, mimeType: type === "image" ? "image/jpeg" : "video/mp4", sizeBytes: fs.statSync(path.join(UPLOAD_TEST, cle)).size });
}
const categories = new Map<string, number>();
async function produit(v: Vendeur, nom: string, prix: number, categorie: string, texte: string, options: { video?: boolean; promo?: number; extra?: Record<string, unknown> } = {}) {
  const c = await appelant(v.token);
  const cle = `${v.shopId}:${categorie}`;
  if (!categories.has(cle)) categories.set(cle, (await c.vendor.shopCategories.create({ name: categorie })).id);
  const image = await copier(v, "image");
  const video = options.video && VIDEO ? await copier(v, "video") : null;
  return c.vendor.saveProduct({
    name: nom, description: `${texte} Pièce artisanale réalisée à la main (démonstration).`, priceTnd: prix, promoPriceTnd: options.promo ?? null,
    availability: "in_stock", stock: 20, sku: "", variants: { dimensions: [], colors: [], materials: [], models: [] },
    delivery: "Livraison sous 3 à 5 jours ouvrés", preparationTime: "", extraInfo: "", images: [{ mediaId: image.id, isPrimary: true }],
    videoMediaId: video?.id ?? null, videoUrl: null, action: "publish", shopCategoryId: categories.get(cle)!, ...(options.extra ?? {}),
  } as never);
}
const SUR_MESURE = { availability: "made_to_order", stock: null, pricingMode: "per_m2", unitPriceTnd: 400, minWidthCm: 30, maxWidthCm: 200, minHeightCm: 20, maxHeightCm: 200, minBillableArea: 0.25 };

// ----- Ateliers et produits (accueil : vidéos, nouveautés, ateliers ; néon chez Alpha) -----
await createOrUpdateAdminUser({ email: "demo_admin_ng@elegancedeco.test", password: MOT_DE_PASSE, name: "Admin Démo" });
const alpha = await vendeur("Alpha", "Atelier Alpha (démo)", "Tunis");
const beta = await vendeur("Beta", "Atelier Beta (démo)", "Sfax");
const gamma = await vendeur("Gamma", "Atelier Gamma (démo)", "Nabeul");
const miroir = await produit(alpha, "Miroir soleil doré (démo)", 140, "Miroirs démo", "Un miroir doré pour le salon.", { video: true });
const enseigne = await produit(alpha, "Enseigne lumineuse sur mesure (démo)", 100, "Luminaires démo", "Enseigne pour café ou restaurant.", { video: true, extra: SUR_MESURE });
await produit(alpha, "Lampe en rotin (démo)", 95, "Luminaires démo", "Lumière douce pour la chambre.", { video: true });
await produit(alpha, "Cadre bois flotté (démo)", 60, "Décoration murale démo", "Cadre pour le bureau.", { promo: 48 });
const vase = await produit(beta, "Vase en terre cuite (démo)", 38, "Céramique démo", "Vase pour table de café.", { video: true });
await produit(beta, "Coussin brodé (démo)", 45, "Textile démo", "Coussin pour le salon.", { video: true });
await produit(beta, "Tapis kilim (démo)", 320, "Textile démo", "Tapis tissé pour la chambre.");
await produit(gamma, "Miroir rond salon de coiffure (démo)", 210, "Miroirs démo", "Grand miroir pour salon de coiffure.", { video: true });
await produit(gamma, "Applique laiton (démo)", 180, "Luminaires démo", "Applique élégante pour un hall d'hôtel.");
await produit(gamma, "Plat décoratif (démo)", 70, "Céramique démo", "Plat mural pour le bureau.");
await (await appelant(alpha.token)).vendor.neon.saveOffer({
  enabled: true, sizes: [{ code: "S", widthCm: 50, priceTnd: 150 }, { code: "M", widthCm: 75, priceTnd: 220 }], includedLetters: 8, extraLetterPriceTnd: 9,
  colors: ["pink", "warm_white"], supports: [{ code: "rect", surchargeTnd: 0 }], outdoorEnabled: false, outdoorSurchargeType: "percent", outdoorSurchargeValue: 0,
  arabicEnabled: false, productionDaysMin: 5, productionDaysMax: 7,
});

// ----- Clients, commandes livrées et avis (A-10c) -----
const personnes = [
  ["Sarra", "Ben Ali", "Hammam Sousse, Sousse"], ["Karim", "Trabelsi", "La Marsa, Tunis"], ["Amel", "Gharbi", "Sfax"], ["Youssef", "Mansour", "Nabeul"],
  ["Ines", "Haddad", "Ariana"], ["Mehdi", "Jaziri", "Bizerte"], ["Rim", "Chaabane", "Monastir"], ["Nadia", "Ferchichi", "Kairouan"],
] as const;
const clients = [];
for (const [prenom, nom, ville] of personnes) clients.push(await client(prenom, nom, ville));

async function ligneLivree(c: (typeof clients)[number], v: Vendeur, article: Record<string, unknown>) {
  const commande = await (await appelant(c.token)).checkout.createOrder({
    shippingName: c.nom, shippingPhone: "20123456", shippingAddress: "12 rue de la Lumière", shippingCity: c.ville,
    items: [{ productName: "x", shopSlug: "x", shopName: "x", quantity: 1, unitPriceTnd: 1, ...article } as never],
  });
  await (await appelant(v.token)).vendor.updateOrderStatus({ orderId: commande.orderId!, status: "delivered" });
  return (await (await appelant(c.token)).reviews.reviewableLines()).find((l: { orderId: number }) => l.orderId === commande.orderId)!;
}
const photo = async (c: { userId: number }) => (await storeReviewPhoto(c.userId, fs.createReadStream(imageSuivante()))).id;

const avis = [
  [5, 5, 5, 5, "Superbe miroir, exactement comme sur la photo. Bien emballé et livré en 4 jours.", 2, false],
  [4, 4, 5, 3, "Très beau rendu dans notre salon. La livraison a pris un jour de plus que prévu.", 1, false],
  [5, 5, 4, 5, "Finitions soignées, le doré est élégant. Je recommande cet atelier.", 0, true],
  [3, 3, 3, 4, "Joli mais un peu plus petit que ce que j'imaginais. Bonne communication avec l'atelier.", 0, false],
  [5, 5, 5, 5, "Parfait pour l'entrée de notre maison, les invités le remarquent tout de suite !", 1, false],
  [4, 4, 4, 4, "Bon rapport qualité-prix, emballage très protecteur.", 0, false],
] as const;
const idsAvis: number[] = [];
for (let i = 0; i < avis.length; i++) {
  const [note, qualite, conforme, livraison, texte, nbPhotos, anonyme] = avis[i];
  const qui = clients[i];
  const ligne = await ligneLivree(qui, alpha, { productSlug: miroir.slug });
  const photos: number[] = [];
  for (let k = 0; k < nbPhotos; k++) photos.push(await photo(qui));
  const r = await (await appelant(qui.token)).reviews.submitForLine({ orderItemId: ligne.orderItemId, rating: note, qualityRating: qualite, conformityRating: conforme, deliveryRating: livraison, body: texte, photoIds: photos, anonymous: anonyme });
  await updateReviewStatus(r.id, "published");
  idsAvis.push(r.id);
}
{ // Avis sur mesure (80 × 150 cm) avec photo
  const qui = clients[6];
  const ligne = await ligneLivree(qui, alpha, { productSlug: enseigne.slug, widthCm: 80, heightCm: 150 });
  const r = await (await appelant(qui.token)).reviews.submitForLine({ orderItemId: ligne.orderItemId, rating: 5, qualityRating: 5, conformityRating: 5, deliveryRating: 4, body: "Enseigne parfaite pour notre café, aux bonnes dimensions. Lumière chaleureuse.", photoIds: [await photo(qui)], anonymous: false });
  await updateReviewStatus(r.id, "published");
}
{ // Avis en attente de modération (visible seulement dans l'admin)
  const qui = clients[7];
  const ligne = await ligneLivree(qui, alpha, { productSlug: miroir.slug });
  await (await appelant(qui.token)).reviews.submitForLine({ orderItemId: ligne.orderItemId, rating: 4, qualityRating: 4, conformityRating: 4, deliveryRating: 5, body: "Très joli miroir, livraison rapide. (Avis en attente de modération.)", photoIds: [], anonymous: false });
}
await (await appelant(alpha.token)).vendor.replyToReview({ reviewId: idsAvis[1], body: "Merci Karim ! Désolés pour ce jour de retard, nous avons changé de transporteur." });
await (await appelant(clients[1].token)).reviews.toggleHelpful({ reviewId: idsAvis[0] });
await (await appelant(clients[2].token)).reviews.toggleHelpful({ reviewId: idsAvis[0] });
await (await appelant(clients[0].token)).reviews.report({ reviewId: idsAvis[3], reason: "Avis qui parle d'un autre produit (démonstration)" });
// Sarra garde une ligne livrée à évaluer (fenêtre « Donner mon avis »)
await ligneLivree(clients[0], beta, { productSlug: vase.slug });

console.log("Données de démonstration prêtes.");
console.log(`Comptes (mot de passe ${MOT_DE_PASSE}) : client demo_sarra_ng@elegancedeco.test · vendeur demo_vendeur_alpha_ng@elegancedeco.test · admin demo_admin_ng@elegancedeco.test`);
process.exit(0);
