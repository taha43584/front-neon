import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, from, map, of, startWith, switchMap } from 'rxjs';
import { CartItem, CartQuote, CartService } from '../../../core/services/cart.service';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

interface QuoteState { status: 'loading' | 'ok' | 'error'; quote: CartQuote | null }

/**
 * Panier. Le navigateur garde les produits et quantités ; les PRIX affichés sont ceux du serveur
 * (catalog.quoteCart), redemandés à chaque modification du panier.
 */
@Component({
  selector: 'app-cart-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PrixDtPipe, IconComponent],
  templateUrl: './cart.page.html',
  styleUrl: './cart.page.css',
})
export class CartPage {
  readonly cart = inject(CartService);
  /** Derniers prix reçus : gardés affichés pendant qu'on redemande les nouveaux */
  private previousQuote: CartQuote | null = null;

  /**
   * toObservable : le signal des lignes devient un flux RxJS.
   * debounceTime : plusieurs clics rapides sur « + » ne font qu'un seul appel ;
   * switchMap : une réponse arrivée trop tard (panier déjà modifié) est ignorée.
   */
  readonly quoteState = toSignal(
    toObservable(this.cart.items).pipe(
      debounceTime(200),
      switchMap((items) =>
        items.length === 0
          ? of<QuoteState>({ status: 'ok', quote: null })
          : from(this.cart.quote(items)).pipe(
              map((quote): QuoteState => {
                this.previousQuote = quote;
                return { status: 'ok', quote };
              }),
              catchError(() => of<QuoteState>({ status: 'error', quote: null })),
              startWith<QuoteState>({ status: 'loading', quote: this.previousQuote }),
            ),
      ),
    ),
    { initialValue: { status: 'loading', quote: null } as QuoteState },
  );

  /** Lignes regroupées par boutique (une commande est préparée par chaque boutique) */
  readonly groups = computed(() => {
    const groups = new Map<string, { item: CartItem; index: number }[]>();
    this.cart.items().forEach((item, index) => groups.set(item.shopName, [...(groups.get(item.shopName) ?? []), { item, index }]));
    return Array.from(groups, ([shopName, lines]) => ({ shopName, lines }));
  });

  readonly quote = computed(() => this.quoteState().quote);
  readonly canCheckout = computed(() => this.quoteState().status === 'ok' && !!this.quote() && !this.quote()!.hasProblems);

  /** Prix du serveur pour la ligne n° index (même ordre que le panier) */
  line(index: number) {
    const quote = this.quote();
    // Ligne retirée pendant le rechargement : les anciens prix ne correspondent plus aux lignes, on attend
    return quote && quote.lines.length === this.cart.items().length ? quote.lines[index] : null;
  }

  link(item: CartItem) {
    return item.neon ? ['/neon', item.neon.shopSlug] : ['/produit', item.slug];
  }
}
