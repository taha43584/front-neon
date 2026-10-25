import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { categorySlug } from '@shared/categoryKey';
import { CatalogProduct } from '../../../core/services/catalog.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Ce que la carte affiche : une création du catalogue (catalog.list) ou d'une catégorie (catalog.categoryPage, sans note) */
export type CarteProduit = Pick<CatalogProduct, 'id' | 'slug' | 'name' | 'image' | 'priceTnd' | 'regularPriceTnd' | 'promoPriceTnd' | 'pricingMode' | 'rating' | 'reviewCount' | 'category' | 'shopName'>;

/**
 * Carte « Pour vous » de l'accueil sur téléphone (A-10d, refaite en A-10g) : carte blanche à bordure fine, photo carrée
 * (toutes de la même taille), atelier en pastille sur la photo, cœur favori avec « pop », puis catégorie, nom (2 lignes),
 * note SEULEMENT s'il existe de vrais avis, prix en gros. Badges SEULEMENT s'ils sont vrais (sur mesure, promotion).
 * « En stock » n'est pas affiché : la liste du catalogue ne donne pas le stock (BACK-A-FAIRE n° 27).
 */
@Component({
  selector: 'app-carte-pour-vous',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, PrixDtPipe, IconComponent],
  template: `
    @let p = product();
    <article class="carte-pv" data-testid="carte-pour-vous">
      <div class="photo">
        @if (p.image) { <img [ngSrc]="p.image" [alt]="p.name" fill sizes="50vw" [priority]="priority()" /> } @else { <span class="sans-photo">Sans photo</span> }
        <span class="atelier">{{ p.shopName }}</span>
      </div>
      <div class="corps">
        @if (p.category) { <p class="categorie">{{ p.category }}</p> }
        <a class="nom" [routerLink]="['/produit', p.slug]">{{ p.name }}</a>
        @if (p.reviewCount > 0 && p.rating !== null) {
          <p class="note"><span aria-hidden="true">★</span> {{ p.rating.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) }} <span class="petit">({{ p.reviewCount }} avis)</span></p>
        }
        <div class="prix">
          @if (unit()) { <span class="des">Sur mesure, dès</span> }
          <p><strong [class.promo]="promo()">{{ p.priceTnd | prixDt }}</strong>@if (unit()) {<span class="petit"> / {{ unit() }}</span>}
            @if (promo()) { <span class="barre">{{ p.regularPriceTnd | prixDt }}</span> }</p>
        </div>
        @if (badges().length) {
          <ul class="badges" aria-label="Particularités">
            @for (b of badges(); track b.texte) { <li [class]="'badge ' + b.genre">{{ b.texte }}</li> }
          </ul>
        }
      </div>
      <button type="button" class="favori" [class.actif]="favorite()" [attr.aria-pressed]="favorite()"
        [attr.aria-label]="(favorite() ? 'Retirer ' : 'Ajouter ') + p.name + (favorite() ? ' des favoris' : ' aux favoris')" (click)="toggleFavorite()">
        @for (k of [pop()]; track k) { <span class="coeur" [class.pop]="k > 0"><app-icon name="heart" [size]="18" [filled]="favorite()" /></span> }
      </button>
    </article>
  `,
  styles: `
    :host { display: block; }
    .carte-pv { position: relative; display: flex; height: 100%; flex-direction: column; overflow: hidden; border: 1px solid var(--bordure); border-radius: 20px; background: var(--carte); transition: transform .15s ease; }
    .carte-pv:active { transform: scale(0.96); }
    .photo { position: relative; aspect-ratio: 1; overflow: hidden; background: var(--beige); }
    .photo img { object-fit: cover; }
    .sans-photo { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--texte-secondaire); font-size: 13px; }
    /* Nom de l'atelier : pastille blanche posée sur la photo (blanche dans les deux thèmes : elle est sur une image) */
    .atelier { position: absolute; bottom: 8px; left: 8px; max-width: calc(100% - 16px); overflow: hidden; padding: 4px 10px; border-radius: 999px; background: rgba(255, 255, 255, .94); color: #2a2420; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .corps { display: flex; flex: 1; flex-direction: column; gap: 4px; padding: 10px 12px 12px; }
    .categorie { margin: 0; color: var(--surtitre); font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    .nom { display: -webkit-box; overflow: hidden; color: var(--texte); font-size: 15px; font-weight: 600; line-height: 1.3; text-decoration: none; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    /* Toute la carte est cliquable : le lien s'étend sur la carte (le cœur reste au-dessus) */
    .nom::after { content: ""; position: absolute; inset: 0; border-radius: 20px; }
    .nom:focus-visible { outline: none; }
    .nom:focus-visible::after { outline: 2px solid var(--accent); outline-offset: -2px; }
    .note { margin: 0; color: var(--texte); font-size: 13px; }
    .note > span:first-child { color: var(--surtitre); }
    .prix { margin-top: auto; padding-top: 2px; }
    .des { display: block; color: var(--texte-secondaire); font-size: 13px; }
    .prix p { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 6px; margin: 0; }
    .prix strong { font-size: 18px; font-weight: 700; }
    .prix .promo { color: var(--promo); }
    .barre { color: var(--texte-secondaire); font-size: 13px; text-decoration: line-through; }
    .petit { color: var(--texte-secondaire); font-size: 13px; }
    .badges { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 0; padding: 0; list-style: none; }
    .badge { padding: 3px 8px; border-radius: 999px; background: var(--beige); color: var(--texte); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .badge.promo { background: var(--promo); color: var(--carte); }
    .favori { position: absolute; z-index: 1; top: 6px; right: 6px; display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; padding: 0; border: none; border-radius: 999px; background: rgba(255, 255, 255, .94); color: #2a2420; cursor: pointer; transition: transform .15s ease; }
    .favori:active { transform: scale(0.9); }
    .favori.actif { color: #aa584f; }
    .favori:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .coeur { display: flex; }
    .coeur.pop { animation: pop .35s cubic-bezier(.2, 1.6, .4, 1); }
    @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) {
      .carte-pv, .favori { transition: none; }
      .carte-pv:active, .favori:active { transform: none; }
      .coeur.pop { animation: none; }
    }
  `,
})
export class CartePourVousComponent {
  private readonly favorites = inject(FavoritesService);

  readonly product = input.required<CarteProduit>();
  readonly priority = input(false);

  readonly unit = computed(() => {
    const mode = this.product().pricingMode;
    return mode === 'per_m2' ? 'm²' : mode === 'per_linear_m' ? 'm' : null;
  });
  readonly promo = computed(() => this.product().promoPriceTnd !== null && this.product().priceTnd < this.product().regularPriceTnd);
  /** Badges VRAIS uniquement : prix sur mesure, catégorie néon, remise réelle */
  readonly badges = computed(() => {
    const p = this.product();
    const liste: { texte: string; genre: string }[] = [];
    if (this.unit()) liste.push({ texte: 'Sur mesure', genre: 'mesure' });
    if (categorySlug(p.category ?? '').includes('neon')) liste.push({ texte: 'Néon', genre: 'neon' });
    if (this.promo()) liste.push({ texte: `−${Math.round((1 - p.priceTnd / p.regularPriceTnd) * 100)} %`, genre: 'promo' });
    return liste;
  });
  readonly favorite = computed(() => this.favorites.isFavorite(this.product().slug));
  readonly pop = signal(0);

  toggleFavorite() {
    const p = this.product();
    if (this.favorites.toggle({ id: p.id, slug: p.slug, name: p.name, image: p.image, priceTnd: p.priceTnd })) this.pop.update((n) => n + 1);
  }
}
