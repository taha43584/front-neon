import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NEON_COLORS, describeProductionDays, neonColor } from '@shared/neon';
import type { NeonWorkshop } from '../../../core/services/neon.service';
import { PrixDtPipe } from '../../pipes/prix-dt.pipe';
import { ShopLogoComponent } from '../shop-logo/shop-logo.component';
import { NeonTextComponent } from './neon-text.component';

/**
 * « Pub » d'un atelier néon : couverture + logo, nom, prix de départ, délai, note (si avis publiés)
 * et un mot lumineux dans la première couleur proposée par l'atelier. Le bouton mène à /neon/<slug>.
 */
@Component({
  selector: 'app-neon-workshop-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, PrixDtPipe, ShopLogoComponent, NeonTextComponent],
  template: `
    @let w = workshop();
    <article class="carte-atelier" data-testid="neon-workshop-card" [attr.data-shop]="w.shopSlug">
      <div class="couverture">
        @if (w.shopCoverUrl; as cover) { <img [ngSrc]="cover" alt="" fill /> }
        <div class="voile" aria-hidden="true"></div>
        <div class="mot" aria-hidden="true">
          <app-neon-text text="Néon" fontKey="pacifico" [colorHex]="colorHex()" script="latin" size="clamp(44px, 6vw, 48px)" />
        </div>
      </div>
      <div class="corps">
        <app-shop-logo class="logo" [name]="w.shopName" [logoUrl]="w.shopLogoUrl" [size]="64" />
        <h3>{{ w.shopName }}</h3>
        <ul>
          @if (w.fromPriceTnd !== null) { <li><span>À partir de <strong>{{ w.fromPriceTnd | prixDt }}</strong></span></li> }
          @if (delay()) { <li><svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> Fabrication en {{ delay() }}</li> }
          @if (w.rating !== null) {
            <li [attr.aria-label]="'Note ' + rating() + ' sur 5, ' + w.reviewCount + ' avis'"><svg class="icone etoile" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> {{ rating() }} · {{ w.reviewCount }} avis</li>
          }
        </ul>
        <a class="bouton bouton-atelier" [routerLink]="['/neon', w.shopSlug]">Créer avec {{ w.shopName }} <span aria-hidden="true">→</span></a>
      </div>
    </article>
  `,
  styles: `
    .carte-atelier { display: flex; height: 100%; flex-direction: column; overflow: hidden; border: 1px solid var(--bordure); border-radius: 24px; background: var(--carte); transition: box-shadow .3s, transform .3s; }
    .carte-atelier:hover { box-shadow: 0 18px 40px -24px rgba(42, 36, 32, .45); box-shadow: 0 18px 40px -24px color-mix(in srgb, var(--ombre) 45%, transparent); transform: translateY(-2px); }
    .couverture { position: relative; aspect-ratio: 16 / 7; overflow: hidden; background: radial-gradient(circle at center, #3a2e2a 0%, #1d1815 75%); }
    .couverture img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .45; transition: transform .6s; }
    .carte-atelier:hover .couverture img { transform: scale(1.04); }
    .voile { position: absolute; inset: 0; background: rgba(29, 24, 21, .45); }
    .mot { position: relative; display: flex; height: 100%; align-items: center; justify-content: center; padding: 0 16px; }
    .corps { position: relative; display: flex; flex: 1; flex-direction: column; align-items: flex-start; padding: 0 20px 20px; }
    .logo { margin-top: -32px; border: 4px solid var(--carte); border-radius: 999px; background: var(--carte); box-shadow: 0 1px 2px rgba(0, 0, 0, .08); }
    h3 { margin-top: 8px; font-size: 20px; }
    ul { margin: 8px 0 0; padding: 0; list-style: none; color: var(--texte-secondaire); font-size: 14px; }
    li { display: flex; align-items: center; gap: 6px; }
    li + li { margin-top: 4px; }
    .icone { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    strong { color: var(--texte); }
    .etoile { color: var(--accent); fill: currentColor; }
    .bouton-atelier { min-height: 44px; margin-top: auto; padding: 0 20px; }
    ul + .bouton-atelier { margin-top: 16px; }
  `,
})
export class NeonWorkshopCardComponent {
  readonly workshop = input.required<NeonWorkshop>();

  /** Première couleur choisie par l'atelier (ordre de son offre) */
  readonly colorHex = computed(() => (neonColor(this.workshop().offer.colors[0]) ?? NEON_COLORS[0]).hex);
  readonly delay = computed(() => {
    const o = this.workshop().offer;
    return describeProductionDays({ min: o.productionDaysMin, max: o.productionDaysMax });
  });
  readonly rating = computed(() => this.workshop().rating?.toLocaleString('fr-FR') ?? '');
}

/** Grille des ateliers : 1 colonne (téléphone), 2 (tablette), 3 (ordinateur) */
@Component({
  selector: 'app-neon-workshop-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NeonWorkshopCardComponent],
  template: `
    @if (workshops().length) {
      <div class="grille-ateliers" data-testid="neon-workshop-cards">
        @for (w of workshops(); track w.shopSlug) { <app-neon-workshop-card [workshop]="w" /> }
      </div>
    }
  `,
  styles: `
    .grille-ateliers { display: grid; gap: 16px; }
    @media (min-width: 640px) { .grille-ateliers { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (min-width: 1024px) { .grille-ateliers { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  `,
})
export class NeonWorkshopGridComponent {
  readonly workshops = input.required<NeonWorkshop[]>();
}
