import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

/** Données d'une tuile catégorie (procédure catalog.siteCategories). */
export interface CategoryTileData {
  slug: string;
  name: string;
  image: string | null;
  productCount: number;
  shopCount: number;
}

/** Tuile catégorie RÉUTILISABLE : photo, nom, nombre de créations et de boutiques. Mène à /categorie/:slug. */
@Component({
  selector: 'app-category-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink],
  template: `
    <a class="tuile tuile-anim" [class.avec-photo]="category().image" [routerLink]="['/categorie', category().slug]" data-testid="category-tile">
      @if (category().image; as image) {
        <img class="tuile-img" [ngSrc]="image" alt="" fill />
        <span class="voile"></span>
      }
      <span class="texte">
        <span class="nom">{{ category().name }}</span>
        <span class="compte">{{ category().productCount }} création{{ category().productCount > 1 ? 's' : '' }} · {{ category().shopCount }} boutique{{ category().shopCount > 1 ? 's' : '' }}</span>
      </span>
    </a>
  `,
  styles: `
    .tuile {
      position: relative;
      display: flex;
      aspect-ratio: 0.85;
      flex-direction: column;
      justify-content: flex-end;
      overflow: hidden;
      padding: 10px;
      border-radius: 18px;
      background: var(--beige-clair);
      text-decoration: none;
    }
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .tuile:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .voile { position: absolute; inset: 0; background: linear-gradient(to top, rgba(36, 30, 26, 0.75), rgba(36, 30, 26, 0.1) 60%, transparent); background: linear-gradient(to top, color-mix(in srgb, var(--ombre-2, #241e1a) 75%, transparent), color-mix(in srgb, var(--ombre-2, #241e1a) 10%, transparent) 60%, transparent); }
    .texte { position: relative; }
    .avec-photo .texte { color: var(--carte); }
    .nom { display: block; font-size: 13px; font-weight: 600; line-height: 1.2; }
    .compte { display: none; margin-top: 2px; font-size: 12px; opacity: 0.8; }
    @media (min-width: 640px) {
      .tuile { aspect-ratio: 1.15; padding: 16px; border-radius: 22px; }
      .nom { font-size: 16px; }
      .compte { display: block; }
    }
  `,
})
export class CategoryTileComponent {
  readonly category = input.required<CategoryTileData>();
}
