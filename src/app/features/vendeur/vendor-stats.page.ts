import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { orderReference } from '../../core/services/account.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { VendorSpaceState } from './vendor-space.state';

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' });

/**
 * /espace-vendeur/statistiques : mêmes calculs que le site React, à partir des lignes de commande du vendeur
 * (articles annulés exclus). Histogramme des 12 derniers mois en SVG (pas de bibliothèque de graphiques).
 */
@Component({
  selector: 'app-vendor-stats-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, PrixDtPipe],
  template: `
    <div class="titre-page">
      <div><h1>Statistiques</h1><p>Calculées à partir de vos lignes de commande (articles annulés exclus).</p></div>
    </div>
    @if (state.dashboard(); as d) {
      <div class="compteurs" data-testid="vendor-stats-cards">
        <div class="compteur"><p class="avec-icone"><app-icon name="chart-column" [size]="16" class="accent" /> Chiffre d'affaires</p><strong>{{ d.stats.revenueTnd | prixDt }}</strong></div>
        <div class="compteur"><p class="avec-icone"><app-icon name="truck" [size]="16" class="accent" /> Articles vendus</p><strong>{{ d.stats.unitsSold }}</strong></div>
        <div class="compteur"><p class="avec-icone"><app-icon name="file-text" [size]="16" class="accent" /> Commissions plateforme</p><strong>{{ d.stats.commissionTnd | prixDt }}</strong></div>
        <div class="compteur"><p class="avec-icone"><app-icon name="star" [size]="16" class="accent" /> Note moyenne</p><strong>{{ d.stats.avgRating !== null ? d.stats.avgRating + ' / 5' : '—' }}</strong><small>{{ publishedReviews() }} avis publiés</small></div>
      </div>

      <section class="bloc marge">
        <div class="titre-bloc"><h2>Ventes des 12 derniers mois</h2></div>
        @if (hasSales()) {
          <figure class="graphique" data-testid="vendor-sales-chart">
            <svg viewBox="0 0 720 260" role="img" [attr.aria-label]="chartLabel()">
              @for (g of chart().grid; track g.y) {
                <line x1="60" [attr.y1]="g.y" x2="710" [attr.y2]="g.y" class="grille" />
                <text x="54" [attr.y]="g.y + 4" class="axe" text-anchor="end">{{ g.label }}</text>
              }
              @for (b of chart().bars; track b.key; let i = $index) {
                <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="4" class="barre"><title>{{ b.label }} : {{ b.revenue | prixDt }}</title></rect>
                @if (i % 2 === 1) { <text [attr.x]="b.x + b.w / 2" y="252" class="axe" text-anchor="middle">{{ b.label }}</text> }
              }
            </svg>
          </figure>
        } @else {
          <div class="vide-bloc"><app-icon name="chart-column" [size]="28" class="accent" /><p>Aucune vente sur les 12 derniers mois.</p></div>
        }
      </section>

      <div class="deux-colonnes">
        <section class="bloc">
          <div class="titre-bloc"><h2>Vos produits les plus vendus</h2></div>
          @if (top().length) {
            <ul class="liste">
              @for (p of top(); track p.name) {
                <li class="ligne-top"><span class="nom">{{ p.name }}</span><span class="chiffres petit-fort">{{ p.units }} vendu(s) · {{ p.revenue | prixDt }}</span></li>
              }
            </ul>
          } @else {
            <div class="vide-bloc"><app-icon name="package" [size]="28" class="accent" /><p>Aucune vente pour le moment.</p></div>
          }
        </section>
        <section class="bloc">
          <div class="titre-bloc"><h2>Commissions et règlements</h2></div>
          @if (d.commissions.length) {
            <div class="tableau">
              <table>
                <thead><tr><th>Commande</th><th class="droite-t">Brut</th><th class="droite-t">Commission</th><th class="droite-t">Net</th><th>Statut</th></tr></thead>
                <tbody>
                  @for (c of d.commissions; track c.id) {
                    <tr>
                      <td>{{ ref(c.orderId) }}</td>
                      <td class="droite-t chiffres">{{ c.grossTnd | prixDt }}</td>
                      <td class="droite-t chiffres orange">{{ c.commissionTnd | prixDt }}</td>
                      <td class="droite-t chiffres gras">{{ c.vendorPayoutTnd | prixDt }}</td>
                      <td class="petit">{{ c.status === 'pending' ? 'À régler' : c.status === 'settled' ? 'Réglée' : 'Annulée' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="vide-bloc"><app-icon name="file-text" [size]="28" class="accent" /><p>Aucune commission enregistrée.</p></div>
          }
        </section>
      </div>
    }
  `,
  styleUrls: ['./vendor-pages.css'],
  styles: `
    .accent { color: var(--cuivre-16, #8e5d3e); }
    .avec-icone { display: flex; align-items: center; gap: 6px; }
    .marge { margin-top: 24px; }
    .graphique { margin: 16px 0 0; }
    svg { display: block; width: 100%; height: auto; }
    .grille { stroke: var(--ligne-12, #f0e6de); stroke-dasharray: 3 3; }
    .axe { fill: var(--gris-11, #7c6d64); font-size: 14px; }
    .barre { fill: var(--cuivre-13, #9a6341); }
    .ligne-top { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; font-size: 14px; }
    .ligne-top .nom { min-width: 0; }
    .petit-fort { flex-shrink: 0; color: var(--gris-22, #6e5d53); }
    .tableau { overflow-x: auto; margin-top: 12px; }
    table { width: 100%; min-width: 420px; border-collapse: collapse; font-size: 14px; }
    th { padding: 10px 16px; background: var(--surface-10, #fbf8f4); color: var(--gris-11, #7c6d64); font-size: 12px; font-weight: 600; text-align: left; text-transform: uppercase; }
    td { padding: 10px 16px; border-top: 1px solid var(--surface-32, #f5eee8); }
    .droite-t { text-align: right; }
    .orange { color: var(--cuivre-15, #ad6214); }
    .gras { font-weight: 600; }
    .vide-bloc { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .vide-bloc p { margin: 0; }
  `,
})
export class VendorStatsPage {
  readonly state = inject(VendorSpaceState);
  readonly ref = orderReference;

  /** 12 mois glissants : chiffre d'affaires et articles par mois (articles annulés exclus) */
  readonly months = computed(() => {
    const now = new Date();
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH.format(d), revenue: 0, units: 0 };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const row of this.state.dashboard()?.orders ?? []) {
      if (row.status === 'cancelled') continue;
      const d = new Date(row.createdAt);
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (!bucket) continue;
      bucket.revenue = Math.round((bucket.revenue + Number(row.unitPriceTnd) * row.quantity) * 100) / 100;
      bucket.units += row.quantity;
    }
    return buckets;
  });
  readonly hasSales = computed(() => this.months().some((m) => m.revenue > 0));

  /** Coordonnées du SVG (zone utile : x 60 → 710, y 16 → 232) */
  readonly chart = computed(() => {
    const months = this.months();
    const max = Math.max(...months.map((m) => m.revenue), 1);
    const step = 650 / months.length;
    const bars = months.map((m, i) => {
      const h = (m.revenue / max) * 216;
      return { ...m, x: 60 + i * step + step * 0.15, w: step * 0.7, y: 232 - h, h };
    });
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: 232 - f * 216, label: Math.round(max * f).toLocaleString('fr-FR') }));
    return { bars, grid };
  });
  readonly chartLabel = computed(() => {
    const total = this.months().reduce((s, m) => s + m.revenue, 0);
    return `Ventes des 12 derniers mois : ${total.toFixed(2).replace('.', ',')} DT au total`;
  });

  readonly top = computed(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    for (const row of this.state.dashboard()?.orders ?? []) {
      if (row.status === 'cancelled') continue;
      const cur = map.get(row.productSlug) ?? { name: row.productName, units: 0, revenue: 0 };
      cur.units += row.quantity;
      cur.revenue += Number(row.unitPriceTnd) * row.quantity;
      map.set(row.productSlug, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.units - a.units).slice(0, 8);
  });
  readonly publishedReviews = computed(() => (this.state.dashboard()?.reviews ?? []).filter((r) => r.status === 'published').length);
}
