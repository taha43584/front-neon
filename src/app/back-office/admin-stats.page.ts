import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService, AdminStatsData, StatsPeriod } from '../core/services/admin.service';
import { PrixDtPipe } from '../shared/pipes/prix-dt.pipe';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** « 2026-10 » → « oct. 26 » ; « 2026-10-18 » → « 18/10 » (comme React) */
const label = (bucket: string) => (bucket.length === 7 ? `${MONTHS[Number(bucket.slice(5, 7)) - 1]} ${bucket.slice(2, 4)}` : `${bucket.slice(8, 10)}/${bucket.slice(5, 7)}`);

// Zone utile des graphiques SVG : x 50 → 590, y 12 → 200 (viewBox 600 × 230)
const X0 = 50, X1 = 590, Y0 = 12, Y1 = 200;

function ticks(n: number, max: number) {
  return [0, 0.5, 1].map((f) => ({ y: Y1 - f * (Y1 - Y0), label: Math.round(max * f).toLocaleString('fr-FR') }));
}
/** Libellés de l'axe horizontal : 6 au plus pour rester lisibles */
function xLabels(buckets: string[], step: number) {
  const every = Math.max(1, Math.ceil(buckets.length / 6));
  return buckets.map((b, i) => ({ x: X0 + i * step + step / 2, text: label(b), show: i % every === 0 }));
}

/**
 * /admin/statistiques : mêmes chiffres que la console React (procédure admin.stats, commandes annulées exclues du CA).
 * Graphiques en SVG calculés par des computed (pas de bibliothèque de graphiques), avec un résumé pour les lecteurs d'écran.
 */
@Component({
  selector: 'app-admin-stats-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PrixDtPipe],
  templateUrl: './admin-stats.page.html',
  styleUrls: ['./admin.css', './admin-stats.page.css'],
})
export class AdminStatsPage {
  private readonly admin = inject(AdminService);

  readonly periods: { value: StatsPeriod; label: string }[] = [
    { value: '7d', label: '7 jours' }, { value: '30d', label: '30 jours' }, { value: '90d', label: '90 jours' }, { value: '12m', label: '12 mois' },
  ];
  readonly period = signal<StatsPeriod>('30d');
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly error = signal('');
  readonly data = signal<AdminStatsData | null>(null);

  readonly hasSales = computed(() => (this.data()?.sales ?? []).some((s) => s.orders > 0));
  readonly hasSignups = computed(() => (this.data()?.signups ?? []).some((s) => s.customers > 0 || s.vendors > 0));

  /** Histogramme du chiffre d'affaires */
  readonly revenueChart = computed(() => {
    const sales = this.data()?.sales ?? [];
    const max = Math.max(...sales.map((s) => s.revenue), 1);
    const step = (X1 - X0) / Math.max(sales.length, 1);
    return {
      bars: sales.map((s, i) => { const h = (s.revenue / max) * (Y1 - Y0); return { key: s.bucket, x: X0 + i * step + step * 0.15, w: step * 0.7, y: Y1 - h, h, title: `${label(s.bucket)} : ${s.revenue.toFixed(2).replace('.', ',')} DT` }; }),
      grid: ticks(3, max), xs: xLabels(sales.map((s) => s.bucket), step),
    };
  });
  /** Courbes des commandes et des annulations */
  readonly ordersChart = computed(() => {
    const sales = this.data()?.sales ?? [];
    const max = Math.max(...sales.map((s) => Math.max(s.orders, s.cancelled)), 1);
    const step = (X1 - X0) / Math.max(sales.length, 1);
    const point = (v: number, i: number) => `${X0 + i * step + step / 2},${Y1 - (v / max) * (Y1 - Y0)}`;
    return {
      orders: sales.map((s, i) => point(s.orders, i)).join(' '),
      cancelled: sales.map((s, i) => point(s.cancelled, i)).join(' '),
      grid: ticks(3, max), xs: xLabels(sales.map((s) => s.bucket), step),
    };
  });
  /** Barres empilées : clients + vendeurs */
  readonly signupsChart = computed(() => {
    const rows = this.data()?.signups ?? [];
    const max = Math.max(...rows.map((s) => s.customers + s.vendors), 1);
    const step = (X1 - X0) / Math.max(rows.length, 1);
    return {
      bars: rows.map((s, i) => {
        const hc = (s.customers / max) * (Y1 - Y0);
        const hv = (s.vendors / max) * (Y1 - Y0);
        return { key: s.bucket, x: X0 + i * step + step * 0.15, w: step * 0.7, yc: Y1 - hc, hc, yv: Y1 - hc - hv, hv, title: `${label(s.bucket)} : ${s.customers} client(s), ${s.vendors} vendeur(s)` };
      }),
      grid: ticks(3, max), xs: xLabels(rows.map((s) => s.bucket), step),
    };
  });
  readonly salesSummary = computed(() => {
    const t = this.data()?.totals;
    return t ? `Sur la période : ${t.orders} commande(s), ${t.revenueTnd.toFixed(2).replace('.', ',')} DT de chiffre d'affaires, ${t.cancelledOrders} annulée(s)` : '';
  });
  readonly signupsSummary = computed(() => {
    const t = this.data()?.totals;
    return t ? `Sur la période : ${t.newCustomers} nouveau(x) client(s) et ${t.newVendors} nouveau(x) vendeur(s)` : '';
  });

  constructor() {
    effect(() => {
      const p = this.period();
      untracked(() => void this.load(p));
    });
  }

  async load(period = this.period()) {
    // On garde les anciennes valeurs affichées pendant le rechargement (pas de « saut »)
    if (!this.data()) this.status.set('loading');
    try {
      this.data.set(await this.admin.stats(period));
      this.status.set('ok');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Statistiques indisponibles');
      this.status.set('error');
    }
  }
}
