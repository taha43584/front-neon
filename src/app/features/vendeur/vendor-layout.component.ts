import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { VendorSpaceState } from './vendor-space.state';
import { IconComponent } from '../../shared/components/icon/icon.component';
import type { IconName } from '../../shared/components/icon/icons';
import { ShopLogoComponent } from '../../shared/components/shop-logo/shop-logo.component';
import { ShopImagesEditorComponent } from './shop-images/shop-images-editor.component';
import { ShopApplicationFormComponent } from './shop-application/shop-application-form.component';

type Badge = 'produits' | 'commandes' | null;

/** Menu de l'espace vendeur : mêmes entrées, même ordre et mêmes icônes que le site React */
const LINKS: { path: string; label: string; icon: IconName; exact: boolean; badge: Badge }[] = [
  { path: '/espace-vendeur', label: 'Tableau de bord', icon: 'layout-dashboard', exact: true, badge: null },
  { path: '/espace-vendeur/produits', label: 'Mes produits', icon: 'package', exact: false, badge: 'produits' },
  { path: '/espace-vendeur/ajouter', label: 'Ajouter un produit', icon: 'plus', exact: false, badge: null },
  { path: '/espace-vendeur/categories', label: 'Mes catégories', icon: 'tag', exact: false, badge: null },
  { path: '/espace-vendeur/neon', label: 'Néon personnalisé', icon: 'lightbulb', exact: false, badge: null },
  { path: '/espace-vendeur/commandes', label: 'Mes commandes', icon: 'shopping-bag', exact: false, badge: 'commandes' },
  { path: '/espace-vendeur/boutique', label: 'Ma boutique', icon: 'store', exact: false, badge: null },
  { path: '/espace-vendeur/statistiques', label: 'Statistiques', icon: 'chart-column', exact: false, badge: null },
  { path: '/espace-vendeur/messages', label: 'Messages', icon: 'message-square', exact: false, badge: null },
  { path: '/espace-vendeur/avis', label: 'Avis clients', icon: 'star', exact: false, badge: null },
  { path: '/espace-vendeur/parametres', label: 'Paramètres', icon: 'settings', exact: false, badge: null },
];

/**
 * Cadre de l'espace vendeur : application à part, sans l'en-tête ni le pied du site (comme React et la console admin).
 * Boutique approuvée : barre latérale (ordinateur) / tiroir <dialog> (téléphone), barre du haut avec la boutique connectée.
 * Boutique non approuvée : états dédiés (demande en attente, refusée avec le motif, suspendue), aucune fonction
 * de vente accessible — le guard shopStatusGuard('active') renvoie ici les adresses des pages de vente.
 */
@Component({
  selector: 'app-vendor-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, IconComponent, ShopLogoComponent, ShopImagesEditorComponent, ShopApplicationFormComponent],
  templateUrl: './vendor-layout.component.html',
  styleUrl: './vendor-layout.component.css',
})
export class VendorLayoutComponent implements OnInit {
  readonly state = inject(VendorSpaceState);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');

  /** Demande en attente : le vendeur modifie ses informations */
  readonly editingApplication = signal(false);
  readonly links = LINKS;

  private readonly url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url },
  );
  /** Formulaire produit ouvert : pas de bouton « Ajouter un produit » dans la barre du haut */
  readonly onEditor = computed(() => /^\/espace-vendeur\/(ajouter|modifier)/.test(this.url()));
  /** Modification d'un produit : l'entrée « Ajouter un produit » devient « Modifier un produit » (comme React) */
  readonly editing = computed(() => this.url().startsWith('/espace-vendeur/modifier'));

  /** Pastilles du menu : nombre de produits, commandes en attente (comme le site React) */
  readonly badges = computed(() => {
    const data = this.state.dashboard();
    return {
      produits: data?.stats.productCount ?? 0,
      commandes: new Set((data?.orders ?? []).filter((o) => o.status === 'pending').map((o) => o.orderId)).size,
    };
  });

  badge(key: Badge) {
    return key ? this.badges()[key] : 0;
  }

  ngOnInit() {
    void this.state.ensureLoaded();
  }

  openDrawer() {
    this.drawer()?.nativeElement.showModal();
  }
  closeDrawer() {
    const d = this.drawer()?.nativeElement;
    if (d?.open) d.close();
  }
  onDrawerClick(event: MouseEvent) {
    if (event.target === this.drawer()?.nativeElement) this.closeDrawer();
  }

  async logout() {
    this.closeDrawer();
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }

  async applicationSaved() {
    this.editingApplication.set(false);
    await this.state.reload();
  }
}
