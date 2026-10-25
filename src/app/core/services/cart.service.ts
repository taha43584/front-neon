import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';

/**
 * Panier du navigateur : seulement les produits choisis, les quantités et les mesures.
 * AUCUN prix ne fait foi ici : le serveur recalcule tout (catalog.quoteCart, puis checkout.createOrder).
 * Même format et même clé de stockage que le site React (« elegance-deco-cart »).
 */

/** Néon personnalisé : choix du client (atelier, texte, style) ; le prix est recalculé par le serveur */
export interface NeonChoice { shopSlug: string; text: string; font: string; color: string; size: string; support: string; outdoor: boolean }

export interface CartOptions {
  selectedColor?: string;
  personalization?: string;
  /** Produit sur mesure : mesures et options choisies */
  widthCm?: number;
  heightCm?: number;
  optionIds?: number[];
  /** Affichage : « 120 × 80 cm · 0,96 m² · Cadre doré » */
  customSummary?: string;
  neon?: NeonChoice;
}

export interface CartProduct {
  slug: string;
  name: string;
  shopSlug: string;
  shopName: string;
  /** Prix affiché au moment de l'ajout (« 260.00 TND ») : indicatif, remplacé par le prix du serveur */
  price: string;
  image: string;
}

export type CartItem = CartProduct & CartOptions & { lineId: string; quantity: number };
export type CartQuote = Awaited<ReturnType<TrpcClient['catalog']['quoteCart']['query']>>;

const STORAGE_KEY = 'elegance-deco-cart';

/** Même produit avec d'autres mesures, couleur ou personnalisation = ligne séparée */
export function cartLineId(slug: string, options: CartOptions = {}) {
  const parts = [slug, options.selectedColor ?? '', options.personalization ?? ''];
  if (options.widthCm != null) parts.push(`${options.widthCm}x${options.heightCm ?? ''}`, [...(options.optionIds ?? [])].sort((a, b) => a - b).join(','));
  if (options.neon) parts.push(JSON.stringify(options.neon));
  return parts.join('::');
}

/** Ce que le serveur doit recalculer pour une ligne : mesures, options ou néon (jamais un montant) */
export function customLineRequest(item: CartItem) {
  if (item.neon) return { neon: item.neon };
  return item.widthCm != null ? { widthCm: item.widthCm, heightCm: item.heightCm, optionIds: item.optionIds ?? [] } : {};
}

/** Lecture prudente du stockage : un contenu abîmé ou ancien ne doit jamais casser le site */
function readStoredCart(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Partial<CartItem>[];
    return saved
      // une ligne néon n'a pas de photo (son aperçu est dessiné à partir du texte)
      .filter((item): item is CartItem => Boolean(item.slug && item.name && item.price && (item.image || item.neon)))
      .map((item) => ({ ...item, lineId: item.lineId ?? cartLineId(item.slug, item), quantity: Math.max(1, item.quantity ?? 1) }));
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly trpc = inject(TrpcService).client;

  /** La liste des lignes : un signal. Tout ce qui l'affiche se met à jour automatiquement */
  readonly items = signal<CartItem[]>(readStoredCart());
  /** Nombre d'articles (pastille du panier) : valeur dérivée, recalculée à chaque changement */
  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    // Sauvegarde automatique à chaque modification : le panier survit au rechargement de la page
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items()));
      } catch {
        /* stockage indisponible (navigation privée) : le panier reste en mémoire */
      }
    });
  }

  add(product: CartProduct, quantity = 1, options: CartOptions = {}) {
    const lineId = cartLineId(product.slug, options);
    this.items.update((items) =>
      items.some((item) => item.lineId === lineId)
        ? items.map((item) => (item.lineId === lineId ? { ...item, quantity: item.quantity + quantity } : item))
        : [...items, { ...product, ...options, lineId, quantity }],
    );
  }

  /** Quantité 0 = ligne retirée */
  updateQuantity(lineId: string, quantity: number) {
    this.items.update((items) =>
      quantity > 0 ? items.map((item) => (item.lineId === lineId ? { ...item, quantity } : item)) : items.filter((item) => item.lineId !== lineId),
    );
  }

  remove(lineId: string) {
    this.items.update((items) => items.filter((item) => item.lineId !== lineId));
  }

  clear() {
    this.items.set([]);
  }

  /** Prix, promotions et stock CALCULÉS PAR LE SERVEUR pour tout le panier (même ordre que les lignes) */
  quote(items: CartItem[] = this.items()) {
    return this.trpc.catalog.quoteCart.query({
      lines: items.map((item) => ({ productSlug: item.slug, quantity: item.quantity, ...customLineRequest(item) })),
    });
  }
}
