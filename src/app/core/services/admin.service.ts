import { Injectable, inject } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';

/**
 * Console d'administration : procédures existantes `admin.*`, sans modification du back.
 * Chaque procédure vérifie le rôle admin CÔTÉ SERVEUR ; Angular ne fait qu'afficher.
 */

type Admin = TrpcClient['admin'];
type Out<T extends { query: (...args: never[]) => unknown }> = Awaited<ReturnType<T['query']>>;
type In<T extends { query: (...args: never[]) => unknown } | { mutate: (...args: never[]) => unknown }> =
  T extends { query: (input: infer I) => unknown } ? I : T extends { mutate: (input: infer I) => unknown } ? I : never;

export type AdminOverview = Out<Admin['overview']>;
export type ClientList = Out<Admin['clients']>;
export type ClientDetail = Out<Admin['client']>;
export type VendorList = Out<Admin['vendors']>;
export type VendorDetail = Out<Admin['vendor']>;
export type ProductList = Out<Admin['products']>;
export type ProductDetail = Out<Admin['product']>;
export type OrderList = Out<Admin['orders']>;
export type OrderDetail = Out<Admin['order']>;
export type CategoryRow = Out<Admin['categoryList']>[number];
export type SiteCategoryRow = Out<Admin['siteCategories']>[number];
export type NeonQuoteRow = Out<Admin['neonQuotes']>[number];
export type ShopOption = Out<Admin['shopOptions']>[number];
export type MarketplaceSettings = Out<Admin['settings']>;
export type ReviewList = Out<Admin['reviews']>;
export type AdminStatsData = Out<Admin['stats']>;
export type StatsPeriod = In<Admin['stats']>['period'];
export type AccountRow = Out<Admin['listUsers']>[number];
export type CreateUserInput = In<Admin['createUser']>;

export type ClientFilters = In<Admin['clients']>;
export type VendorFilters = In<Admin['vendors']>;
export type ProductFilters = In<Admin['products']>;
export type OrderFilters = In<Admin['orders']>;
export type ShopStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type ProductAction = 'publish' | 'unpublish' | 'reject';

/** Mêmes libellés que la console React */
export const STATUS_LABELS: Record<string, string> = {
  active: 'Approuvé', pending: 'En attente', suspended: 'Suspendu', rejected: 'Refusé',
  published: 'Publié', draft: 'Brouillon',
  processing: 'En préparation', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée',
  approved: 'Validée', inactive: 'Désactivée',
};

export const ORDER_STATUS_OPTIONS: readonly { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En préparation' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'cancelled', label: 'Annulée' },
];

export const QUOTE_STATUS: Record<string, string> = { new: 'Nouvelle', seen: 'Vue', answered: 'Répondue', closed: 'Clôturée' };

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly admin = inject(TrpcService).client.admin;

  overview() { return this.admin.overview.query(); }

  // ----- Clients -----
  clients(filters: ClientFilters) { return this.admin.clients.query(filters); }
  client(userId: number) { return this.admin.client.query({ userId }); }
  suspendUser(id: number) { return this.admin.suspendUser.mutate({ id }); }
  unsuspendUser(id: number) { return this.admin.unsuspendUser.mutate({ id }); }

  // ----- Vendeurs : le motif est obligatoire pour un refus (vérifié aussi par le serveur) -----
  vendors(filters: VendorFilters) { return this.admin.vendors.query(filters); }
  vendor(shopId: number) { return this.admin.vendor.query({ shopId }); }
  updateShopStatus(shopId: number, status: ShopStatus, rejectionReason?: string) {
    return this.admin.updateShopStatus.mutate({ shopId, status, rejectionReason });
  }
  shopOptions() { return this.admin.shopOptions.query(); }

  // ----- Produits -----
  products(filters: ProductFilters) { return this.admin.products.query(filters); }
  product(productId: number) { return this.admin.product.query({ productId }); }
  setProductStatus(productId: number, action: ProductAction, reason?: string) {
    return this.admin.setProductStatus.mutate({ productId, action, reason });
  }
  deleteProduct(productId: number) { return this.admin.deleteProduct.mutate({ productId }); }
  setProductCategory(productId: number, categoryId: number | null) {
    return this.admin.setProductCategory.mutate({ productId, categoryId });
  }

  // ----- Catégories -----
  siteCategories() { return this.admin.siteCategories.query(); }
  setSiteCategoryHidden(slug: string, hidden: boolean, reason: string | null) {
    return this.admin.setSiteCategoryHidden.mutate({ slug, hidden, reason });
  }
  renameSiteCategory(slug: string, name: string) { return this.admin.renameSiteCategory.mutate({ slug, name }); }
  mergeSiteCategories(sourceSlug: string, targetSlug: string) {
    return this.admin.mergeSiteCategories.mutate({ sourceSlug, targetSlug });
  }
  categoryList() { return this.admin.categoryList.query(); }
  saveCategory(input: In<Admin['saveCategory']>) { return this.admin.saveCategory.mutate(input); }
  setCategoryActive(categoryId: number, active: boolean) { return this.admin.setCategoryActive.mutate({ categoryId, active }); }
  moderateCategory(categoryId: number, status: 'approved' | 'rejected') { return this.admin.moderateCategory.mutate({ categoryId, status }); }
  deleteCategory(categoryId: number, reassignToCategoryId?: number) {
    return this.admin.deleteCategory.mutate({ categoryId, reassignToCategoryId });
  }

  // ----- Commandes et devis -----
  orders(filters: OrderFilters) { return this.admin.orders.query(filters); }
  order(orderId: number) { return this.admin.order.query({ orderId }); }
  updateOrderStatus(orderId: number, status: OrderStatus, note?: string) {
    return this.admin.updateOrderStatus.mutate({ orderId, status, note });
  }
  neonQuotes() { return this.admin.neonQuotes.query(); }

  // ----- Paramètres -----
  // Avis (modération), statistiques, comptes (A-09)
  reviews(filters: In<Admin['reviews']>) { return this.admin.reviews.query(filters); }
  setReviewStatus(reviewId: number, status: 'pending' | 'published' | 'rejected') { return this.admin.updateReviewStatus.mutate({ reviewId, status }); }
  deleteReview(reviewId: number) { return this.admin.deleteReview.mutate({ reviewId }); }
  stats(period: StatsPeriod) { return this.admin.stats.query({ period }); }
  listUsers(role?: 'user' | 'vendor' | 'admin') { return this.admin.listUsers.query(role ? { role } : {}); }
  createUser(input: CreateUserInput) { return this.admin.createUser.mutate(input); }

  settings() { return this.admin.settings.query(); }
  updateSettings(input: In<Admin['updateSettings']>) { return this.admin.updateSettings.mutate(input); }
}
