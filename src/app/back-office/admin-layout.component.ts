import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { AdminState } from './admin.state';
import { IconComponent } from '../shared/components/icon/icon.component';

type BadgeKey = 'pendingShops' | 'pendingProducts' | 'pendingCategories' | 'pendingOrders' | 'pendingReviews';

const NAV: readonly { path: string; label: string; exact: boolean; badge: BadgeKey | null }[] = [
  { path: '/admin', label: 'Vue générale', exact: true, badge: null },
  { path: '/admin/clients', label: 'Clients', exact: false, badge: null },
  { path: '/admin/vendeurs', label: 'Vendeurs', exact: false, badge: 'pendingShops' },
  { path: '/admin/produits', label: 'Produits', exact: false, badge: 'pendingProducts' },
  { path: '/admin/categories', label: 'Catégories', exact: false, badge: 'pendingCategories' },
  { path: '/admin/commandes', label: 'Commandes', exact: false, badge: 'pendingOrders' },
  { path: '/admin/avis', label: 'Avis', exact: false, badge: 'pendingReviews' },
  { path: '/admin/statistiques', label: 'Statistiques', exact: false, badge: null },
  { path: '/admin/parametres', label: 'Paramètres', exact: false, badge: null },
];

/**
 * Cadre de la console : barre latérale sombre (ordinateur), menu en tiroir (téléphone), page courante.
 * Application indépendante : l'en-tête et le pied du site public sont masqués sur /admin.
 */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, IconComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  readonly state = inject(AdminState);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly nav = NAV;
  readonly drawerOpen = signal(false);
  /** Tiroir ouvert : le focus va sur « Fermer » (fenêtre modale), ce qui permet aussi de le fermer avec Échap */
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map((e) => (e as NavigationEnd).urlAfterRedirects)), { initialValue: this.router.url });
  /** Titre de la barre du haut sur téléphone : « Administration · Produits » */
  readonly currentLabel = computed(() => {
    const path = this.url().split('?')[0];
    return [...NAV].reverse().find((n) => (n.exact ? path === n.path : path.startsWith(n.path)))?.label ?? 'Vue générale';
  });

  constructor() {
    effect(() => this.closeButton()?.nativeElement.focus());
  }

  badge(key: BadgeKey | null) {
    const stats = this.state.stats();
    return key && stats ? stats[key] : 0;
  }

  ngOnInit() {
    void this.state.reload();
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
