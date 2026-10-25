import { Injectable, inject } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';

/**
 * Service catalogue : TOUS les appels de lecture du catalogue passent par ici.
 * Ce sont exactement les procédures utilisées par le site React (aucune n'a été modifiée).
 * Les types des réponses sont déduits automatiquement du serveur (AppRouter).
 */

export type HomeData = Awaited<ReturnType<TrpcClient['catalog']['home']['query']>>;
export type SiteCategory = Awaited<ReturnType<TrpcClient['catalog']['siteCategories']['query']>>[number];
// Paramètre facultatif : son type contient « void », que l'on retire
export type CatalogFilters = Exclude<Parameters<TrpcClient['catalog']['list']['query']>[0], void | undefined>;
export type CatalogProduct = Awaited<ReturnType<TrpcClient['catalog']['list']['query']>>[number];
export type CategoryPageInput = Parameters<TrpcClient['catalog']['categoryPage']['query']>[0];
export type CategoryPageData = Awaited<ReturnType<TrpcClient['catalog']['categoryPage']['query']>>;
export type ProductPageData = NonNullable<Awaited<ReturnType<TrpcClient['vendor']['publicProduct']['query']>>>;
/** Vidéo d'un produit publié, avec la carte du produit (accueil, « Dans nos ateliers, en vidéo ») */
export interface WorkshopVideo { product: CatalogProduct; url: string; mimeType: string }

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly trpc = inject(TrpcService).client;

  /** Accueil : dernières créations, exemple sur mesure, boutiques, totaux */
  home() {
    return this.trpc.catalog.home.query();
  }

  /** Catégories du site (tuiles de l'accueil, menu) */
  siteCategories() {
    return this.trpc.catalog.siteCategories.query();
  }

  /** Catégories globales (pastilles du catalogue) */
  categories() {
    return this.trpc.catalog.categories.query();
  }

  /** Catalogue avec recherche, catégorie, prix, tri, promotions, sur mesure */
  list(filters: CatalogFilters) {
    return this.trpc.catalog.list.query(filters);
  }

  /** Page d'une catégorie : produits filtrés et triés PAR LE SERVEUR */
  categoryPage(input: CategoryPageInput) {
    return this.trpc.catalog.categoryPage.query(input);
  }

  /** Fiche produit (null si le produit n'est pas publié ou si la boutique n'est pas active) */
  async product(slug: string) {
    return (await this.trpc.vendor.publicProduct.query({ productSlug: slug })) ?? null;
  }

  /**
   * Vidéos des ateliers (accueil) : le serveur ne renvoie la vidéo d'un produit QUE dans sa fiche.
   * On lit donc les fiches des produits publiés les plus récents (en parallèle) et on garde ceux qui ont
   * une vidéo envoyée par le vendeur (MP4 / WebM). Aucun choix éditorial possible : voir BACK-A-FAIRE.md n° 9.
   */
  async workshopVideos(candidates: readonly CatalogProduct[], max: number): Promise<WorkshopVideo[]> {
    const pages = await Promise.all(candidates.map((p) => this.product(p.slug).catch(() => null)));
    return candidates
      .map((product, i) => ({ product, video: pages[i]?.product.video ?? null }))
      .filter((v): v is { product: CatalogProduct; video: NonNullable<typeof v.video> } => v.video !== null)
      .slice(0, max)
      .map(({ product, video }) => ({ product, url: video.url, mimeType: video.mimeType }));
  }

  /**
   * Ateliers néon visibles (bannière de l'accueil). Même procédure que NeonService.workshops(), appelée ici
   * pour que l'accueil, chargé tout de suite, n'embarque pas NeonService et ses dépendances (zod, règles du néon).
   */
  neonOffers() {
    return this.trpc.catalog.neonOffers.query();
  }

  /**
   * Prix d'un produit sur mesure CALCULÉ PAR LE SERVEUR (seule source du prix final).
   * Le navigateur affiche une estimation ; c'est cette réponse qui fait foi (même appel que le panier).
   */
  async confirmCustomPrice(productSlug: string, widthCm: number, heightCm: number | null, optionIds: number[]) {
    const quote = await this.trpc.catalog.quoteCart.query({
      lines: [{ productSlug, quantity: 1, widthCm, heightCm: heightCm ?? undefined, optionIds }],
    });
    return quote.lines[0];
  }
}

/** true si le serveur a répondu « introuvable » (code tRPC NOT_FOUND), par exemple une catégorie inconnue. */
export function isNotFound(error: unknown) {
  return (error as { data?: { code?: string } } | null)?.data?.code === 'NOT_FOUND';
}
