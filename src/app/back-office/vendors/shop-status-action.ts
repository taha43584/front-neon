import { ConfirmRequest } from '../admin-ui';
import { ShopStatus } from '../../core/services/admin.service';

/** Action de statut demandée sur une boutique (liste ou fiche vendeur) */
export interface ShopAction { shopId: number; shopName: string; status: Exclude<ShopStatus, 'pending'> }

/** Textes de la fenêtre de confirmation : identiques à la console React. Motif obligatoire pour un refus. */
export function shopActionRequest(a: ShopAction | null): ConfirmRequest | null {
  if (!a) return null;
  switch (a.status) {
    case 'active':
      return { title: `Approuver « ${a.shopName} » ?`, description: 'Le vendeur pourra publier ses produits et recevoir des commandes.', confirmLabel: 'Approuver' };
    case 'rejected':
      return { title: `Refuser « ${a.shopName} » ?`, description: 'Le motif sera affiché au vendeur, qui pourra corriger sa demande.', confirmLabel: 'Refuser la demande', danger: true, reason: true, reasonRequired: true, reasonPlaceholder: 'Ex. : photos insuffisantes, coordonnées incomplètes…' };
    case 'suspended':
      return { title: `Suspendre « ${a.shopName} » ?`, description: 'La boutique et ses produits disparaissent du site ; le vendeur ne peut plus publier. Le motif lui sera affiché.', confirmLabel: 'Suspendre', danger: true, reason: true, reasonPlaceholder: 'Ex. : retards de livraison répétés…' };
  }
}

export function shopActionDone(status: ShopAction['status']) {
  return status === 'active' ? 'Vendeur approuvé : il peut publier ses produits'
    : status === 'rejected' ? 'Demande refusée'
    : 'Vendeur suspendu : sa boutique et ses produits ne sont plus visibles';
}
