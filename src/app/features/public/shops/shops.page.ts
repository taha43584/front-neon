import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicShopListItem, ShopService } from '../../../core/services/shop.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ShopLogoComponent } from '../../../shared/components/shop-logo/shop-logo.component';

/** /boutiques : liste publique des boutiques validées, recherche par nom, ville ou accroche (comme React). */
@Component({
  selector: 'app-shops-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, IconComponent, ShopLogoComponent],
  template: `
    <div class="conteneur page">
      <div class="entete">
        <div>
          <p class="surtitre">Ateliers et créateurs</p>
          <h1>Les boutiques</h1>
          <p class="compteur" aria-live="polite">{{ status() === 'loading' ? 'Chargement…' : shops().length + ' boutique(s) validée(s)' }}</p>
        </div>
        <label class="recherche">
          <app-icon name="search" [size]="16" class="loupe" />
          <input [value]="search()" (input)="search.set($any($event.target).value)" placeholder="Nom ou ville" aria-label="Rechercher une boutique" data-testid="shops-search" />
        </label>
      </div>

      @switch (status()) {
        @case ('loading') {
          <div class="grille" role="status" aria-label="Chargement des boutiques">
            @for (i of [0, 1, 2, 3]; track i) {
              <div class="carte-liste" aria-hidden="true">
                <div class="squelette couverture"></div>
                <div class="pied"><div class="squelette rond"></div><div class="lignes"><div class="squelette l1"></div><div class="squelette l2"></div></div></div>
              </div>
            }
          </div>
        }
        @case ('error') {
          <div class="vide" role="alert"><p class="titre">Boutiques momentanément indisponibles</p><button type="button" class="bouton" (click)="load()">Réessayer</button></div>
        }
        @default {
          @if (filtered().length) {
            <div class="grille" data-testid="shops-list">
              @for (shop of filtered(); track shop.id; let i = $index) {
                <a class="carte-liste lien-carte" [routerLink]="['/boutique', shop.slug]" [style.--rang]="i < 6 ? i : 6" data-testid="shop-card">
                  <div class="couverture">
                    @if (shop.coverUrl || shop.image; as cover) { <img [ngSrc]="cover" [alt]="shop.coverUrl ? 'Couverture de ' + shop.name : ''" fill /> }
                  </div>
                  <div class="pied">
                    <app-shop-logo [name]="shop.name" [logoUrl]="shop.logoUrl" [size]="44" />
                    <div class="texte">
                      <p class="nom">{{ shop.name }}</p>
                      <p class="infos">{{ shop.productCount }} création{{ shop.productCount > 1 ? 's' : '' }}{{ shop.city ? ' · ' + shop.city : '' }}{{ shop.reviewCount ? ' · ★ ' + shop.rating : '' }}</p>
                    </div>
                  </div>
                </a>
              }
            </div>
          } @else {
            <div class="vide-simple">{{ search() ? 'Aucune boutique ne correspond à votre recherche.' : 'Aucune boutique validée pour le moment.' }}</div>
          }
        }
      }
    </div>
  `,
  styles: `
    .page { padding-top: 32px; padding-bottom: 32px; }
    .entete { display: flex; flex-direction: column; justify-content: space-between; gap: 16px; }
    .surtitre { color: var(--cuivre-13, #9a6341); }
    h1 { font-size: 36px; letter-spacing: -0.05em; }
    .compteur { margin: 8px 0 0; color: var(--gris-11, #7c6d64); font-size: 14px; }
    .recherche { position: relative; display: block; width: 100%; }
    .loupe { position: absolute; top: 50%; left: 16px; color: var(--gris-9, #8c7e72); transform: translateY(-50%); pointer-events: none; }
    .recherche input { width: 100%; height: 44px; padding: 0 16px 0 44px; border: 1px solid var(--ligne-28, #e3d9d0); border-radius: 999px; outline: none; background: var(--carte); color: var(--texte); font: 14px var(--police-texte); }
    .recherche input:focus { border-color: var(--cuivre-8, #c79c77); }
    .grille { display: grid; gap: 16px; margin-top: 32px; }
    .carte-liste { overflow: hidden; border: 1px solid var(--ligne-19, #eee3da); border-radius: 16px; background: var(--carte); }
    .lien-carte { display: block; color: inherit; text-decoration: none; transition: transform .35s var(--ease-sortie), box-shadow .35s var(--ease-sortie); animation: fondu .5s var(--ease) both; animation-delay: calc(var(--rang, 0) * .12s); }
    .lien-carte:hover, .lien-carte:focus-visible { box-shadow: 0 10px 30px rgba(42, 36, 32, .12); box-shadow: 0 10px 30px color-mix(in srgb, var(--ombre, #2a2420) 12%, transparent); transform: translate3d(0, -4px, 0); }
    @keyframes fondu { from { opacity: 0; } to { opacity: 1; } }
    .couverture { position: relative; aspect-ratio: 1.7; background: var(--ligne-22, #e6ddd4); }
    .couverture img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .pied { display: flex; align-items: center; gap: 12px; padding: 16px; }
    .texte { min-width: 0; }
    .nom { overflow: hidden; margin: 0; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .infos { overflow: hidden; margin: 2px 0 0; color: var(--gris-11, #7c6d64); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .rond { width: 44px; height: 44px; flex-shrink: 0; border-radius: 999px; }
    .lignes { display: grid; flex: 1; gap: 8px; }
    .l1 { width: 66%; height: 16px; border-radius: 999px; }
    .l2 { width: 50%; height: 12px; border-radius: 999px; }
    .vide { margin-top: 32px; }
    .vide-simple { margin-top: 32px; padding: 64px 16px; border: 1px dashed var(--ligne-33, #ddcfc4); border-radius: 24px; background: var(--carte); color: var(--gris-11, #7c6d64); font-size: 14px; text-align: center; }
    @media (min-width: 640px) {
      .entete { flex-direction: row; align-items: flex-end; }
      h1 { font-size: 48px; }
      .recherche { width: 320px; }
      .grille { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (min-width: 1024px) { .page { padding-top: 40px; padding-bottom: 40px; } .grille { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    @media (prefers-reduced-motion: reduce) { .lien-carte:hover, .lien-carte:focus-visible { transform: none; } }
  `,
})
export class ShopsPage {
  private readonly shopService = inject(ShopService);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly shops = signal<PublicShopListItem[]>([]);
  readonly search = signal('');
  /** Recherche dans le navigateur : la liste complète est déjà chargée (petite liste, comme React) */
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.shops().filter((s) => `${s.name} ${s.city ?? ''} ${s.tagline ?? ''}`.toLowerCase().includes(q));
  });

  constructor() {
    void this.load();
  }

  async load() {
    this.status.set('loading');
    try {
      this.shops.set(await this.shopService.list());
      this.status.set('ok');
    } catch {
      this.status.set('error');
    }
  }
}
