import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { SiteService } from '../services/site.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ViewportService } from '../services/viewport.service';
import { SearchScreenService } from '../services/search-screen.service';
import { SearchScreenComponent } from './search-screen.component';

/** Lien « mon espace » selon le rôle (mêmes libellés que le site React) */
export function accountLinkFor(role?: string | null) {
  if (role === 'admin') return { href: '/admin', label: 'Administration' };
  if (role === 'vendor') return { href: '/espace-vendeur', label: 'Espace vendeur' };
  return { href: '/espace-client', label: 'Mon compte' };
}

/**
 * En-tête du site public (A-10b, organisation « marketplace ») :
 * - téléphone : menu (tiroir), logo, favoris, panier ; recherche pleine largeur sous l'en-tête ;
 * - tablette / ordinateur : grande recherche, « Se connecter » ou menu du compte, favoris, panier ;
 * - ordinateur (≥ 1024 px) : bouton « Catégories » (panneau) à côté du logo ; 2ᵉ ligne avec les catégories
 *   principales, les raccourcis et « Vendre sur … ».
 */
@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, IconComponent, SearchScreenComponent],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css',
  // Clic en dehors du menu du compte : il se ferme
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class SiteHeaderComponent {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly site = inject(SiteService);
  private readonly router = inject(Router);
  readonly viewport = inject(ViewportService);
  readonly searchScreen = inject(SearchScreenService);
  private readonly drawer = viewChild.required<ElementRef<HTMLDialogElement>>('drawer');
  private readonly accountButton = viewChild<ElementRef<HTMLButtonElement>>('accountButton');

  /** Texte de la recherche : signal (OnPush) relié aux deux champs par [(ngModel)] */
  readonly search = signal('');
  readonly categoriesOpen = signal(false);
  readonly accountOpen = signal(false);
  /** Ouvert au survol : le clic qui suit (souris) ne doit pas le refermer aussitôt */
  private openedByHover = false;

  constructor() {
    // Sur le catalogue, le champ de recherche reprend le mot cherché (?q=…), comme le site React
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
      const tree = this.router.parseUrl(this.router.url);
      this.search.set(this.router.url.startsWith('/produits') ? tree.queryParamMap.get('q') ?? '' : '');
      this.categoriesOpen.set(false);
      this.accountOpen.set(false);
    });
  }

  account() {
    return accountLinkFor(this.auth.user()?.role);
  }

  brandParts() {
    const [first, ...rest] = this.site.name().split(' ');
    return { first, rest: rest.length ? ` ${rest.join(' ')}` : '.' };
  }

  submitSearch() {
    const q = this.search().trim();
    this.closeDrawer();
    void this.router.navigate(['/produits'], { queryParams: q ? { q } : {} });
  }

  // ----- « Toutes les catégories » (ordinateur) -----
  hoverCategories() {
    if (!this.categoriesOpen()) this.openedByHover = true;
    this.categoriesOpen.set(true);
  }
  clickCategories() {
    if (this.openedByHover) {
      this.openedByHover = false;
      this.categoriesOpen.set(true);
    } else this.categoriesOpen.update((v) => !v);
  }
  leaveCategories() {
    this.categoriesOpen.set(false);
    this.openedByHover = false;
  }

  // ----- Menu du compte -----
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  onDocumentClick(event: MouseEvent) {
    const menu = this.host.nativeElement.querySelector('.menu-compte');
    if (this.accountOpen() && menu && !menu.contains(event.target as Node)) this.accountOpen.set(false);
  }
  closeAccount(refocus = false) {
    this.accountOpen.set(false);
    if (refocus) this.accountButton()?.nativeElement.focus();
  }

  // ----- Tiroir (téléphone et tablette) -----
  openDrawer() {
    this.drawer().nativeElement.showModal();
  }
  closeDrawer() {
    const d = this.drawer().nativeElement;
    if (d.open) d.close();
  }
  onDrawerClick(event: MouseEvent) {
    if (event.target === this.drawer().nativeElement) this.closeDrawer();
  }

  async logout() {
    this.closeAccount();
    this.closeDrawer();
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
