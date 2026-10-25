import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SiteService } from '../services/site.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { accountLinkFor } from './site-header.component';

/**
 * Téléphone (< 768 px) : barre fixe en bas — Accueil, Catégories (panneau), Favoris, Compte — comme le site React.
 * Le panneau « Catégories » est un <dialog> natif qui monte du bas de l'écran.
 */
@Component({
  selector: 'app-mobile-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <!-- A-10d : barre flottante ; la pastille couleur accent glisse sous l'onglet actif (transform: translateX) -->
    <nav class="barre-bas toujours-sombre" aria-label="Navigation mobile" data-testid="bottom-bar">
      @if (active() >= 0) { <span class="pastille-active" aria-hidden="true" [style.transform]="'translateX(' + active() * 100 + '%)'"><span></span></span> }
      <ul>
        <li><a routerLink="/" [class.actif]="active() === 0" [attr.aria-current]="active() === 0 ? 'page' : null"><app-icon name="house" />Accueil</a></li>
        <li>
          <button #categoriesButton type="button" [class.actif]="active() === 1" [attr.aria-expanded]="sheetOpen()" (click)="openSheet()" data-testid="bottom-categories">
            <app-icon name="layout-grid" />Catégories
          </button>
        </li>
        <li><a routerLink="/favoris" [class.actif]="active() === 2" [attr.aria-current]="active() === 2 ? 'page' : null"><app-icon name="heart" />Favoris</a></li>
        <li>
          <a [routerLink]="auth.user() ? account().href : '/connexion'" [class.actif]="active() === 3" [attr.aria-current]="active() === 3 ? 'page' : null"><app-icon name="user-round" />Compte</a>
        </li>
      </ul>
    </nav>

    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- clic sur le fond du <dialog> ; au clavier : Échap (natif) -->
    <dialog #sheet class="panneau" aria-label="Catégories" (click)="onSheetClick($event)" (close)="onClosed()" data-testid="categories-sheet">
      <div class="panneau-contenu">
        <div class="panneau-haut">
          <p class="titre">Catégories</p>
          <button type="button" class="fermer" aria-label="Fermer les catégories" (click)="closeSheet()" autofocus><app-icon name="x" /></button>
        </div>
        @if (site.categories().length) {
          <ul class="liste">
            @for (c of site.categories(); track c.slug) {
              <li>
                <a [routerLink]="['/categorie', c.slug]" (click)="closeSheet()">
                  <span>{{ c.name }}</span><small>{{ c.productCount }} création{{ c.productCount > 1 ? 's' : '' }}</small>
                </a>
              </li>
            }
          </ul>
        } @else {
          <p class="vide-panneau">Aucune catégorie pour le moment.</p>
        }
        <a routerLink="/produits" class="bouton tout" (click)="closeSheet()">Tout le catalogue</a>
        <!-- Sur téléphone, l'en-tête n'a plus de menu (A-10d) : ses autres liens sont ici -->
        <p class="titre-section">Aussi sur {{ site.name() }}</p>
        <ul class="liste">
          <li><a routerLink="/boutiques" (click)="closeSheet()"><span>Boutiques</span></a></li>
          <li><a routerLink="/neon" (click)="closeSheet()"><span>Néon personnalisé</span></a></li>
          <li><a routerLink="/suivre-commande" (click)="closeSheet()"><span>Suivre ma commande</span></a></li>
          <li><a routerLink="/vendre" (click)="closeSheet()"><span>Vendre sur {{ site.name() }}</span></a></li>
          <li><a routerLink="/aide" (click)="closeSheet()"><span>Aide</span></a></li>
        </ul>
      </div>
    </dialog>
  `,
  styleUrl: './mobile-nav.component.css',
})
export class MobileNavComponent {
  readonly auth = inject(AuthService);
  readonly site = inject(SiteService);
  private readonly router = inject(Router);
  private readonly sheet = viewChild.required<ElementRef<HTMLDialogElement>>('sheet');
  private readonly categoriesButton = viewChild.required<ElementRef<HTMLButtonElement>>('categoriesButton');

  readonly sheetOpen = signal(false);
  /** Chemin actuel (sans les paramètres) : onglet actif de la barre */
  readonly path = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url.split('?')[0])),
    { initialValue: this.router.url.split('?')[0] },
  );

  /** Onglet actif (0 Accueil, 1 Catégories, 2 Favoris, 3 Compte, −1 aucun) : position de la pastille */
  readonly active = computed(() => {
    const p = this.path();
    if (this.sheetOpen() || p.startsWith('/categorie')) return 1;
    if (p === '/') return 0;
    if (p === '/favoris') return 2;
    const compte = this.auth.user() ? this.account().href : '/connexion';
    if (p.startsWith(compte) || p.startsWith('/connexion') || p.startsWith('/inscription')) return 3;
    return -1;
  });

  account() {
    return accountLinkFor(this.auth.user()?.role);
  }

  openSheet() {
    this.sheet().nativeElement.showModal();
    this.sheetOpen.set(true);
  }
  closeSheet() {
    const d = this.sheet().nativeElement;
    if (d.open) d.close();
  }
  /** Fermeture (bouton, Échap, fond, lien) : le focus revient au bouton « Catégories » */
  onClosed() {
    this.sheetOpen.set(false);
    this.categoriesButton().nativeElement.focus();
  }
  onSheetClick(event: MouseEvent) {
    if (event.target === this.sheet().nativeElement) this.closeSheet();
  }
}
