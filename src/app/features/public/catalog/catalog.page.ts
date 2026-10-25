import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, debounceTime, distinctUntilChanged, from, map, of, startWith, switchMap } from 'rxjs';
import { CatalogFilters, CatalogProduct, CatalogService } from '../../../core/services/catalog.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { LoadStateComponent } from '../../../shared/components/load-state/load-state.component';
import { FilterSheetComponent, SheetFilters, SheetOptions } from '../../../shared/components/filter-sheet/filter-sheet.component';
import { ViewportService } from '../../../core/services/viewport.service';

type Sort = NonNullable<CatalogFilters['sort']> | 'pertinence';
interface ListState { status: 'loading' | 'ok' | 'error'; products: CatalogProduct[] }

const SORTS: { value: Sort; label: string }[] = [
  { value: 'pertinence', label: 'Pertinence' },
  { value: 'recent', label: 'Nouveautés' },
  { value: 'prix_asc', label: 'Prix croissant' },
  { value: 'prix_desc', label: 'Prix décroissant' },
  { value: 'note_desc', label: 'Mieux notés' },
];

/** Paramètres de l'URL (?q=…&category=…&sort=…&promo=1&sur_mesure=1&min=…&max=…) → filtres du serveur. */
function filtersFromUrl(params: ParamMap): CatalogFilters {
  const price = (key: string) => {
    const value = Number(params.get(key));
    return params.get(key) && Number.isFinite(value) && value >= 0 ? value : undefined;
  };
  const sort = params.get('sort') as Sort | null;
  return {
    search: params.get('q')?.trim() || undefined,
    category: params.get('category') || undefined,
    sort: sort && sort !== 'pertinence' && SORTS.some((s) => s.value === sort) ? sort : undefined,
    discount: params.get('promo') === '1' || undefined,
    custom: params.get('sur_mesure') === '1' || undefined,
    minPrice: price('min'),
    maxPrice: price('max'),
  };
}

/**
 * Catalogue. Les filtres sont gardés dans l'URL (partageable, bouton « retour » du navigateur).
 * RxJS : la recherche attend 350 ms après la dernière frappe (debounceTime) ; switchMap annule
 * une réponse devenue inutile si l'utilisateur a changé de filtre entre-temps.
 */
@Component({
  selector: 'app-catalog-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ProductCardComponent, LoadStateComponent, FilterSheetComponent],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.css',
})
export class CatalogPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  readonly viewport = inject(ViewportService);

  readonly sorts = SORTS;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly minControl = new FormControl('', { nonNullable: true });
  readonly maxControl = new FormControl('', { nonNullable: true });
  readonly priceOpen = signal(false);
  private readonly retry$ = new Subject<void>();

  /** Les paramètres de l'URL, sous forme de signal */
  readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly filters = computed(() => filtersFromUrl(this.params()));
  readonly currentSort = computed(() => this.filters().sort ?? 'pertinence');

  /** Pastilles de catégories (catégories globales avec au moins une création) */
  readonly chips = toSignal(
    from(this.catalog.categories()).pipe(
      map((list) => list.filter((c) => c.productCount > 0 || c.children.some((x) => x.productCount > 0))),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  /** Résultats : à chaque changement d'URL (ou clic « Réessayer »), un nouvel appel au serveur */
  readonly state = toSignal(
    // combineLatest : se relance si l'URL change OU si l'on clique « Réessayer »
    combineLatest([this.route.queryParamMap, this.retry$.pipe(startWith(null))]).pipe(
      map(([params]) => filtersFromUrl(params)),
      switchMap((filters) =>
        from(this.catalog.list(filters)).pipe(
          map((products): ListState => ({ status: 'ok', products })),
          catchError(() => of<ListState>({ status: 'error', products: [] })),
          startWith<ListState>({ status: 'loading', products: [] }),
        ),
      ),
    ),
    { initialValue: { status: 'loading', products: [] } as ListState },
  );

  readonly title = computed(() => {
    const f = this.filters();
    if (f.discount) return 'Promotions';
    if (f.custom) return 'Créations sur mesure';
    if (f.category) return f.category;
    if (f.search) return `Résultats pour « ${f.search} »`;
    return f.sort === 'recent' ? 'Nouveautés' : 'Tous les produits';
  });
  readonly hasFilters = computed(() => Object.values(this.filters()).some((v) => v !== undefined));

  constructor() {
    // Les champs reprennent les valeurs de l'URL (ex. recherche lancée depuis l'en-tête)
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      this.searchControl.setValue(p.get('q') ?? '', { emitEvent: false });
      this.minControl.setValue(p.get('min') ?? '', { emitEvent: false });
      this.maxControl.setValue(p.get('max') ?? '', { emitEvent: false });
    });

    // RxJS — recherche « au fil de la frappe » : 350 ms de pause avant de mettre à jour l'URL
    this.searchControl.valueChanges
      .pipe(debounceTime(350), map((v) => v.trim()), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.setParams({ q: q || null }));

    // Même principe pour les prix minimum / maximum
    this.minControl.valueChanges.pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((v) => this.setParams({ min: v.trim() || null }));
    this.maxControl.valueChanges.pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((v) => this.setParams({ max: v.trim() || null }));
  }

  /** Change un ou plusieurs paramètres de l'URL (null = retiré) ; la liste se recharge toute seule. */
  setParams(changes: Record<string, string | null>) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: changes, queryParamsHandling: 'merge', replaceUrl: true });
  }

  toggle(key: 'promo' | 'sur_mesure') {
    this.setParams({ [key]: this.params().get(key) === '1' ? null : '1' });
  }

  /* ---------- Téléphone : panneau de filtres (A-10e) ---------- */
  /** catalog.list sait filtrer : prix, sur mesure, promotions (pas l'atelier, la couleur ni le gouvernorat : BACK-A-FAIRE) */
  readonly sheetOptions: SheetOptions = { custom: true, promo: true, shops: [] };
  readonly sheetValue = computed<SheetFilters>(() => {
    const p = this.params();
    return { min: p.get('min') ?? '', max: p.get('max') ?? '', custom: p.get('sur_mesure') === '1', promo: p.get('promo') === '1', shops: [] };
  });
  /** « Voir N résultats » : même requête que la page (recherche, catégorie, tri gardés), avec les filtres du panneau */
  readonly countFor = async (f: SheetFilters) => {
    const n = (v: string) => (v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);
    const list = await this.catalog.list({ ...this.filters(), minPrice: n(f.min), maxPrice: n(f.max), custom: f.custom || undefined, discount: f.promo || undefined });
    return list.length;
  };
  applySheet(f: SheetFilters) {
    this.setParams({ min: f.min.trim() || null, max: f.max.trim() || null, sur_mesure: f.custom ? '1' : null, promo: f.promo ? '1' : null });
  }

  reset() {
    void this.router.navigate(['/produits'], { replaceUrl: true });
  }

  retry() {
    this.retry$.next();
  }
}
