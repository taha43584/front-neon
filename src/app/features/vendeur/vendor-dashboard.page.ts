import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VendorSpaceState } from './vendor-space.state';
import { PRODUCT_STATUS } from '../../core/services/vendor.service';
import { orderReference, orderStatusLabel } from '../../core/services/account.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';

/**
 * Tableau de bord du vendeur : chiffres calculés PAR LE SERVEUR (vendor.dashboard) à partir des produits
 * et des commandes réellement enregistrées, produits récents, dernières commandes.
 */
@Component({
  selector: 'app-vendor-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe],
  templateUrl: './vendor-dashboard.page.html',
  styleUrl: './vendor-pages.css',
})
export class VendorDashboardPage {
  readonly state = inject(VendorSpaceState);
  readonly productStatus = PRODUCT_STATUS;
  readonly reference = orderReference;
  readonly statusLabel = orderStatusLabel;

  readonly stats = computed(() => this.state.dashboard()?.stats ?? null);
  readonly recentProducts = computed(() => (this.state.dashboard()?.products ?? []).slice(0, 5));

  /** Les lignes de commande du vendeur, regroupées par commande (une commande peut contenir plusieurs articles) */
  readonly recentOrders = computed(() => {
    const groups = new Map<number, { orderId: number; status: string; shippingName: string; shippingCity: string; createdAt: Date; articles: number; total: number }>();
    for (const line of this.state.dashboard()?.orders ?? []) {
      const group = groups.get(line.orderId) ?? { orderId: line.orderId, status: line.status, shippingName: line.shippingName, shippingCity: line.shippingCity, createdAt: line.createdAt, articles: 0, total: 0 };
      group.articles += line.quantity;
      group.total += Number(line.unitPriceTnd) * line.quantity;
      groups.set(line.orderId, group);
    }
    return Array.from(groups.values()).slice(0, 5);
  });
}
