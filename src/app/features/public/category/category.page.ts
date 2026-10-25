import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, from, map, of, startWith, switchMap } from 'rxjs';
import { CategoryPageData, CategoryPageInput, CatalogService, isNotFound } from '../../../core/services/catalog.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { LoadStateComponent } from '../../../shared/components/load-state/load-state.component';
import { FilterSheetComponent, SheetFilters, SheetOptions } from '../../../shared/components/filter-sheet/filter-sheet.component';
import { ViewportService } from '../../../core/services/viewport.service';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { NeonService, NeonWorkshop } from '../../../core/services/neon.service';
import { NeonBannerComponent } from '../../../shared/components/neon/neon-banner.component';
import { NeonWorkshopGridComponent } from '../../../shared/components/neon/neon-workshop-card.component';

type Sort = NonNullable<CategoryPageInput['sort']>;
interface PageState { status: 'loading' | 'ok' | 'error' | 'notfound'; data: CategoryPageData | null }

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Les plus récentes' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
];

/** /categorie/:slug?sur_mesure=1&promo=1&min=…&max=…&boutiques=a,b&tri=… → paramètres de catalog.categoryPage */
function inputFromUrl(params: ParamMap, query: ParamMap): CategoryPageInput {
  const price = (key: string) => {
    const value = Number((query.get(key) ?? '').replace(',', '.'));
    return query.get(key) && Number.isFinite(value) && value >= 0 ? value : undefined;
  };
  const shops = (query.get('boutiques') ?? '').split(',').filter(Boolean);
  const sort = query.get('tri') as Sort | null;
  return {
    slug: params.get('slug') ?? '',
    custom: query.get('sur_mesure') === '1' || undefined,
    promo: query.get('promo') === '1' || undefined,
    minPrice: price('min'),
    maxPrice: price('max'),
    shops: shops.length ? shops : undefined,
    sort: sort && SORTS.some((s) => s.value === sort) ? sort : 'recent',
  };
}

/**
 * Page d'une catégorie. Paramètre de ROUTE : le slug (/categorie/miroirs).
 * Paramètres de REQUÊTE : les filtres, appliqués par le SERVEUR (pas de tri ni de filtre dans le navigateur).
 */
@Component({
  selector: 'app-category-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ProductCardComponent, LoadStateComponent, PrixDtPipe, NeonBannerComponent, NeonWorkshopGridComponent, FilterSheetComponent],
  templateUrl: './category.page.html',
  styleUrl: './category.page.css',
})
export class CategoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly neon = inject(NeonService);
  readonly viewport = inject(ViewportService);
  private readonly retry$ = new Subject<void>();

  readonly sorts = SORTS;
  readonly filtersOpen = signal(false);
  readonly priceForm = new FormGroup({
    min: new FormControl('', { nonNullable: true }),
    max: new FormControl('', { nonNullable: true }),
  });

  private readonly input$ = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
    map(([params, query]) => inputFromUrl(params, query)),
  );
  readonly input = toSignal(this.input$, { requireSync: true });

  /** On garde les dernières données affichées pendant le rechargement (pas de « saut » à chaque filtre) */
  private lastData: CategoryPageData | null = null;
  readonly state = toSignal(
    combineLatest([this.input$, this.retry$.pipe(startWith(null))]).pipe(
      switchMap(([input]) =>
        from(this.catalog.categoryPage(input)).pipe(
          map((data): PageState => {
            this.lastData = data;
            return { status: 'ok', data };
          }),
          catchError((error) => of<PageState>({ status: isNotFound(error) ? 'notfound' : 'error', data: null })),
          startWith<PageState>({ status: 'loading', data: this.lastData }),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as PageState },
  );

  readonly data = computed(() => this.state().data);
  readonly hasFilters = computed(() => {
    const i = this.input();
    return Boolean(i.custom || i.promo || i.minPrice !== undefined || i.maxPrice !== undefined || i.shops?.length);
  });

  /** Catégorie du configurateur néon (choisie par l'admin) : le SERVEUR dit s'il faut afficher la bannière */
  readonly neonBanner = computed(() => Boolean(this.data()?.neonBanner));
  readonly workshops = signal<NeonWorkshop[]>([]);

  constructor() {
    // Cartes des ateliers sous la bannière (mêmes règles de visibilité que /neon), chargées une seule fois
    let workshopsLoaded = false;
    effect(() => {
      if (!this.neonBanner() || workshopsLoaded) return;
      workshopsLoaded = true;
      untracked(() => this.neon.workshops().then((list) => this.workshops.set(list)).catch(() => undefined));
    });
    // Les champs de prix reprennent les valeurs de l'URL
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      this.priceForm.setValue({ min: q.get('min') ?? '', max: q.get('max') ?? '' }, { emitEvent: false });
    });
  }

  setParams(changes: Record<string, string | null>) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: changes, queryParamsHandling: 'merge', replaceUrl: true });
  }

  toggle(key: 'sur_mesure' | 'promo', active: boolean | undefined) {
    this.setParams({ [key]: active ? null : '1' });
  }

  toggleShop(slug: string) {
    const shops = new Set(this.input().shops ?? []);
    if (shops.has(slug)) shops.delete(slug);
    else shops.add(slug);
    this.setParams({ boutiques: Array.from(shops).join(',') || null });
  }

  applyPrice() {
    const { min, max } = this.priceForm.getRawValue();
    this.setParams({ min: min.trim() || null, max: max.trim() || null });
  }

  /* ---------- Téléphone : panneau de filtres (A-10e) ---------- */
  /** catalog.categoryPage sait filtrer : prix, sur mesure, promotions, ateliers — proposés seulement s'ils existent ici */
  readonly sheetOptions = computed<SheetOptions | null>(() => {
    const f = this.data()?.facets;
    if (!f) return null;
    const prix = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
    return { custom: f.customCount > 0, promo: f.promoCount > 0, shops: f.shops, priceHint: `De ${prix.format(f.minPrice)} à ${prix.format(f.maxPrice)} DT, promotion incluse.` };
  });
  readonly sheetValue = computed<SheetFilters>(() => {
    const i = this.input();
    return { min: i.minPrice?.toString() ?? '', max: i.maxPrice?.toString() ?? '', custom: !!i.custom, promo: !!i.promo, shops: i.shops ?? [] };
  });
  /** « Voir N résultats » : la même procédure que la page, avec les filtres du panneau */
  readonly countFor = async (f: SheetFilters) => {
    const n = (v: string) => { const x = Number(v.replace(',', '.')); return v.trim() !== '' && Number.isFinite(x) && x >= 0 ? x : undefined; };
    const page = await this.catalog.categoryPage({ ...this.input(), custom: f.custom || undefined, promo: f.promo || undefined, minPrice: n(f.min), maxPrice: n(f.max), shops: f.shops.length ? f.shops : undefined });
    return page.products.length;
  };
  applySheet(f: SheetFilters) {
    this.setParams({ min: f.min.trim() || null, max: f.max.trim() || null, sur_mesure: f.custom ? '1' : null, promo: f.promo ? '1' : null, boutiques: f.shops.join(',') || null });
  }

  reset() {
    this.setParams({ sur_mesure: null, promo: null, min: null, max: null, boutiques: null });
  }

  retry() {
    this.retry$.next();
  }

  floor(value: number) {
    return Math.floor(value);
  }

  ceil(value: number) {
    return Math.ceil(value);
  }
}
