import { Injectable, inject } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';

/**
 * Espace vendeur (1/2) : procédures existantes du back, sans modification.
 * La boutique n'est JAMAIS envoyée par le navigateur : le serveur la déduit de la session du vendeur.
 */

export type VendorDashboard = Awaited<ReturnType<TrpcClient['vendor']['dashboard']['query']>>;
export type VendorProductRow = VendorDashboard['products'][number];
export type VendorProduct = Awaited<ReturnType<TrpcClient['vendor']['product']['query']>>;
export type ProductInput = Parameters<TrpcClient['vendor']['saveProduct']['mutate']>[0];
export type CategoryChoices = Awaited<ReturnType<TrpcClient['vendor']['shopCategories']['choices']['query']>>;
export type ShopCategoryList = Awaited<ReturnType<TrpcClient['vendor']['shopCategories']['list']['query']>>;
export type VendorShop = NonNullable<VendorDashboard['shop']>;
export type VendorOrderLine = VendorDashboard['orders'][number];
export type ShopUpdate = Parameters<TrpcClient['vendor']['updateShop']['mutate']>[0];
export type ShopApplication = Parameters<TrpcClient['vendor']['applyShop']['mutate']>[0];
export type VendorNeonOffer = Awaited<ReturnType<TrpcClient['vendor']['neon']['offer']['query']>>;
export type VendorNeonQuote = Awaited<ReturnType<TrpcClient['vendor']['neon']['quotes']['query']>>[number];
export type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type QuoteStatus = 'new' | 'seen' | 'answered' | 'closed';

/** Libellés des statuts de produit (mêmes textes que le site React) */
export const PRODUCT_STATUS: Record<string, { label: string; tone: string }> = {
  published: { label: 'Publié', tone: 'vert' },
  draft: { label: 'Brouillon', tone: 'gris' },
  pending: { label: 'En attente de validation', tone: 'orange' },
  rejected: { label: 'Refusé', tone: 'rouge' },
};

@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly trpc = inject(TrpcService).client;

  dashboard() {
    return this.trpc.vendor.dashboard.query();
  }

  product(productId: number) {
    return this.trpc.vendor.product.query({ productId });
  }

  /** Création (sans productId) ou modification (avec productId) ; le serveur revalide tout */
  saveProduct(input: ProductInput) {
    return this.trpc.vendor.saveProduct.mutate(input);
  }

  setProductStatus(productId: number, status: 'draft' | 'published') {
    return this.trpc.vendor.setProductStatus.mutate({ productId, status });
  }

  /** Supprime le produit avec ses photos et sa vidéo (les commandes passées gardent leur historique) */
  removeProduct(productId: number) {
    return this.trpc.vendor.removeProduct.mutate({ productId });
  }

  /** Fichier envoyé mais finalement pas utilisé : supprimé du serveur */
  deleteMedia(mediaId: number) {
    return this.trpc.vendor.deleteMedia.mutate({ mediaId });
  }

  /** « Publier » passe-t-il par une validation de l'administration ? (paramètre du site) */
  async requiresApproval() {
    return (await this.trpc.catalog.settings.query()).requireProductApproval;
  }

  // ----- Catégories partagées entre boutiques -----
  categoryChoices() {
    return this.trpc.vendor.shopCategories.choices.query();
  }

  shopCategories() {
    return this.trpc.vendor.shopCategories.list.query();
  }

  /** Ajoute à SA boutique une catégorie déjà utilisée par d'autres boutiques (nom officiel) */
  adoptCategory(slug: string) {
    return this.trpc.vendor.shopCategories.adopt.mutate({ slug });
  }

  createCategory(name: string) {
    return this.trpc.vendor.shopCategories.create.mutate({ name });
  }

  // ----- Mes catégories (A-09) : la boutique est déduite de la session, jamais envoyée -----
  renameCategory(categoryId: number, name: string) {
    return this.trpc.vendor.shopCategories.rename.mutate({ categoryId, name });
  }

  /** Les produits de la catégorie passent dans « Sans catégorie » : aucun n'est supprimé */
  deleteCategory(categoryId: number) {
    return this.trpc.vendor.shopCategories.delete.mutate({ categoryId });
  }

  reorderCategories(orderedIds: number[]) {
    return this.trpc.vendor.shopCategories.reorder.mutate({ orderedIds });
  }

  // ----- Ma boutique (A-05) -----
  /** Infos publiques de la boutique validée ; le statut et le rôle ne sont jamais modifiables ici */
  updateShop(input: ShopUpdate) {
    return this.trpc.vendor.updateShop.mutate(input);
  }

  /** Demande vendeur (première demande, demande en attente ou refusée corrigée) */
  applyShop(input: ShopApplication) {
    return this.trpc.vendor.applyShop.mutate(input);
  }

  removeShopImage(slot: 'logo' | 'cover') {
    return slot === 'logo' ? this.trpc.vendor.shop.removeLogo.mutate() : this.trpc.vendor.shop.removeCover.mutate();
  }

  // ----- Commandes : le statut choisi ne s'applique qu'aux articles de CETTE boutique -----
  updateOrderStatus(orderId: number, status: FulfillmentStatus) {
    return this.trpc.vendor.updateOrderStatus.mutate({ orderId, status });
  }

  // ----- Néon personnalisé -----
  neonOffer() {
    return this.trpc.vendor.neon.offer.query();
  }

  saveNeonOffer(offer: Parameters<TrpcClient['vendor']['neon']['saveOffer']['mutate']>[0]) {
    return this.trpc.vendor.neon.saveOffer.mutate(offer);
  }

  neonQuotes() {
    return this.trpc.vendor.neon.quotes.query();
  }

  setQuoteStatus(id: number, status: QuoteStatus) {
    return this.trpc.vendor.neon.setQuoteStatus.mutate({ id, status });
  }
}
