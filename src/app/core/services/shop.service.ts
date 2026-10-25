import { Injectable, inject } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';

export type PublicShopListItem = Awaited<ReturnType<TrpcClient['catalog']['shops']['query']>>[number];
export type PublicShopData = NonNullable<Awaited<ReturnType<TrpcClient['vendor']['publicShop']['query']>>>;

/**
 * Boutiques publiques : procédures existantes (aucune modifiée).
 * - catalog.shops : boutiques validées ;
 * - vendor.publicShop : une boutique active avec ses produits publiés (null sinon) ;
 * - account.toggleFollowShop : suivre / ne plus suivre (compte connecté).
 */
@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly trpc = inject(TrpcService).client;

  list() {
    return this.trpc.catalog.shops.query();
  }

  async get(shopSlug: string) {
    return (await this.trpc.vendor.publicShop.query({ shopSlug })) ?? null;
  }

  toggleFollow(shop: { id?: number; slug: string; name: string }) {
    return this.trpc.account.toggleFollowShop.mutate({ shopId: shop.id, shopSlug: shop.slug, shopName: shop.name });
  }
}
