import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminState } from './admin.state';
import { PrixDtPipe } from '../shared/pipes/prix-dt.pipe';
import { StatusBadgeComponent } from './admin-ui';

const CHART = { width: 720, height: 220, left: 48, right: 12, top: 12, bottom: 28 };

/**
 * Vue générale : indicateurs calculés par le serveur (admin.overview), éléments à traiter,
 * graphique des 30 derniers jours (SVG dessiné par Angular, aucune bibliothèque), dernières activités.
 */
@Component({
  selector: 'app-admin-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe, StatusBadgeComponent],
  templateUrl: './admin-overview.page.html',
  styleUrls: ['./admin.css', './admin-overview.page.css'],
})
export class AdminOverviewPage {
  readonly state = inject(AdminState);
  readonly chart = CHART;

  readonly toHandle = computed(() => {
    const s = this.state.stats();
    return !!s && (s.pendingShops > 0 || s.pendingProducts > 0 || s.pendingCategories > 0);
  });

  /** Courbes du graphique : ventes (aire ambre) et nombre de commandes (ligne sombre, échelle propre) */
  readonly graph = computed(() => {
    const series = this.state.overview()?.series ?? [];
    if (!series.some((d) => d.orders > 0)) return null;
    const w = CHART.width - CHART.left - CHART.right;
    const h = CHART.height - CHART.top - CHART.bottom;
    const maxRevenue = Math.max(...series.map((d) => d.revenue), 1);
    const maxOrders = Math.max(...series.map((d) => d.orders), 1);
    const x = (i: number) => CHART.left + (series.length > 1 ? (i * w) / (series.length - 1) : w / 2);
    const y = (value: number, max: number) => CHART.top + h - (value / max) * h;
    const revenueLine = series.map((d, i) => `${x(i).toFixed(1)},${y(d.revenue, maxRevenue).toFixed(1)}`);
    const ordersLine = series.map((d, i) => `${x(i).toFixed(1)},${y(d.orders, maxOrders).toFixed(1)}`);
    const base = (CHART.top + h).toFixed(1);
    return {
      area: `M${x(0).toFixed(1)},${base} L${revenueLine.join(' L')} L${x(series.length - 1).toFixed(1)},${base} Z`,
      revenue: `M${revenueLine.join(' L')}`,
      orders: `M${ordersLine.join(' L')}`,
      ticks: [0, 0.5, 1].map((t) => ({ y: y(maxRevenue * t, maxRevenue), label: Math.round(maxRevenue * t) })),
      // Une date sur 7 sous l'axe
      dates: series.map((d, i) => ({ x: x(i), label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}` })).filter((_, i) => i % 7 === 0),
      totalOrders: series.reduce((s, d) => s + d.orders, 0),
      totalRevenue: series.reduce((s, d) => s + d.revenue, 0),
    };
  });

  roleLabel(role: string) {
    return role === 'vendor' ? 'Vendeur' : role === 'admin' ? 'Admin' : 'Client';
  }
}
