import { Injectable, inject } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';
import { CartItem, customLineRequest } from './cart.service';
import { normalizeTunisianPhone } from '../../shared/validators/tunisian-phone.validator';

/**
 * Espace client et commande : procédures existantes du back, sans modification
 * (account.dashboard, account.order, account.updateProfile, checkout.createOrder).
 */

export type ClientDashboard = Awaited<ReturnType<TrpcClient['account']['dashboard']['query']>>;
export type ClientOrder = ClientDashboard['orders'][number];
export type OrderDetail = NonNullable<Awaited<ReturnType<TrpcClient['account']['order']['query']>>>;
export type ProfileInput = Parameters<TrpcClient['account']['updateProfile']['mutate']>[0];

export interface ShippingForm {
  name: string;
  phone: string;
  /** Ville / délégation (ex. « Hammam Sousse ») */
  city: string;
  governorate: string;
  address: string;
  note: string;
}

/** Libellés des statuts de commande (mêmes textes que le site React) */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de confirmation',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

/** Libellé d'un statut (le code brut s'il est inconnu) */
export const orderStatusLabel = (status: string) => ORDER_STATUS_LABELS[status] ?? status;

/** Référence affichée : 42 → « ED-000042 » (même format que le serveur) */
export const orderReference = (id: number) => `ED-${String(id).padStart(6, '0')}`;

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly trpc = inject(TrpcService).client;

  dashboard() {
    return this.trpc.account.dashboard.query();
  }

  order(orderId: number) {
    return this.trpc.account.order.query({ orderId });
  }

  updateProfile(input: ProfileInput) {
    return this.trpc.account.updateProfile.mutate(input);
  }

  /** Adresses de livraison (account.addAddress / deleteAddress) ; « principale » remplace l'ancienne principale */
  addAddress(input: Parameters<TrpcClient['account']['addAddress']['mutate']>[0]) {
    return this.trpc.account.addAddress.mutate(input);
  }

  deleteAddress(addressId: number) {
    return this.trpc.account.deleteAddress.mutate({ addressId });
  }

  /**
   * Envoie la commande. Les montants envoyés sont INDICATIFS : le serveur relit les produits,
   * recalcule chaque prix (mesures, options, néon) et le total, puis les fige dans la commande.
   */
  createOrder(items: CartItem[], form: ShippingForm) {
    return this.trpc.checkout.createOrder.mutate({
      shippingName: form.name.trim(),
      // Téléphone normalisé en 8 chiffres : « +216 20 123 456 » → « 20123456 »
      shippingPhone: normalizeTunisianPhone(form.phone) ?? form.phone.trim(),
      shippingAddress: form.address.trim(),
      // « Ville, Gouvernorat » dans le champ ville existant (procédure inchangée)
      shippingCity: `${form.city.trim()}, ${form.governorate}`,
      shippingNote: form.note.trim() || undefined,
      items: items.map((item) => ({
        productSlug: item.slug,
        productName: item.name,
        shopSlug: item.shopSlug,
        shopName: item.shopName,
        quantity: item.quantity,
        unitPriceTnd: Number(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0,
        selectedColor: item.selectedColor,
        personalization: item.personalization,
        ...customLineRequest(item),
      })),
    });
  }
}
