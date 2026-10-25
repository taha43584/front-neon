import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, filter, from, of, startWith, switchMap } from 'rxjs';
import { IconComponent } from '../icon/icon.component';

/** Filtres du panneau (valeurs du brouillon : appliquées seulement par « Voir N résultats ») */
export interface SheetFilters { min: string; max: string; custom: boolean; promo: boolean; shops: string[] }
/** Filtres proposés : SEULEMENT ceux que le serveur sait appliquer sur la page concernée */
export interface SheetOptions { custom: boolean; promo: boolean; shops: { slug: string; name: string; count: number }[]; priceHint?: string }

export const EMPTY_FILTERS: SheetFilters = { min: '', max: '', custom: false, promo: false, shops: [] };

/**
 * Bouton « Filtrer » + panneau qui monte du bas (téléphone, A-10e). <dialog> natif en modal : Échap ferme,
 * le reste de la page est inerte (le focus reste dans le panneau), clic sur le fond assombri = fermer,
 * le focus revient au bouton « Filtrer ». « Voir N résultats » : N est demandé au SERVEUR (même procédure
 * que la page), 300 ms après le dernier changement ; switchMap ignore une réponse devenue inutile.
 */
@Component({
  selector: 'app-filter-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button #declencheur type="button" class="filtrer pression" aria-haspopup="dialog" [attr.aria-expanded]="open()" (click)="show()" data-testid="filter-open">
      <app-icon name="layout-grid" [size]="16" /> Filtrer
      @if (activeCount()) { <span class="nombre" [attr.aria-label]="activeCount() + ' filtre' + (activeCount() > 1 ? 's' : '') + ' actif' + (activeCount() > 1 ? 's' : '')">{{ activeCount() }}</span> }
    </button>

    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- clic sur le fond du <dialog> ; au clavier : Échap (natif) -->
    <dialog #panneau class="panneau" aria-labelledby="titre-filtres" (click)="onBackdrop($event)" (close)="onClosed()" data-testid="filter-sheet">
      <div class="contenu">
        <span class="poignee" aria-hidden="true"></span>
        <div class="haut">
          <h2 id="titre-filtres">Filtres</h2>
          <button type="button" class="rond" aria-label="Fermer les filtres" (click)="close()"><app-icon name="x" /></button>
        </div>

        <fieldset>
          <legend>Prix (DT)</legend>
          <div class="prix">
            <label>Minimum<input class="champ" type="number" inputmode="decimal" min="0" [value]="draft().min" (input)="patch({ min: $any($event.target).value })" placeholder="0" data-testid="filter-min" /></label>
            <label>Maximum<input class="champ" type="number" inputmode="decimal" min="0" [value]="draft().max" (input)="patch({ max: $any($event.target).value })" placeholder="Sans limite" data-testid="filter-max" /></label>
          </div>
          <p class="aide">{{ options().priceHint || 'Prix payé, promotion incluse.' }}</p>
        </fieldset>

        @if (options().custom || options().promo) {
          <fieldset>
            <legend>Type</legend>
            @if (options().custom) {
              <label class="case"><input type="checkbox" [checked]="draft().custom" (change)="patch({ custom: $any($event.target).checked })" data-testid="filter-custom" /> Sur mesure</label>
            }
            @if (options().promo) {
              <label class="case"><input type="checkbox" [checked]="draft().promo" (change)="patch({ promo: $any($event.target).checked })" data-testid="filter-promo" /> Promotions</label>
            }
          </fieldset>
        }

        @if (options().shops.length > 1) {
          <fieldset>
            <legend>Ateliers</legend>
            @for (s of options().shops; track s.slug) {
              <label class="case"><input type="checkbox" [checked]="draft().shops.includes(s.slug)" (change)="toggleShop(s.slug)" /> {{ s.name }} <span class="aide">({{ s.count }})</span></label>
            }
          </fieldset>
        }

        <div class="bas">
          <button type="button" class="reinitialiser" (click)="draft.set(empty)" data-testid="filter-reset">Réinitialiser</button>
          <button type="button" class="bouton voir" (click)="applyDraft()" [disabled]="count() === null" aria-live="polite" data-testid="filter-apply">
            @switch (count()) {
              @case (null) { Calcul… }
              @case (-1) { Voir les résultats }
              @default { Voir {{ count() }} résultat{{ count()! > 1 ? 's' : '' }} }
            }
          </button>
        </div>
      </div>
    </dialog>
  `,
  styles: `
    :host { display: contents; }
    .filtrer { display: inline-flex; min-height: 44px; flex-shrink: 0; align-items: center; gap: 8px; padding: 0 16px; border: 1px solid var(--texte); border-radius: 999px; background: var(--carte); color: var(--texte); font: 600 14px var(--police-texte); cursor: pointer; }
    .nombre { display: inline-flex; min-width: 20px; height: 20px; align-items: center; justify-content: center; padding: 0 6px; border-radius: 999px; background: var(--accent); color: var(--carte); font-size: 11px; }
    .pression { transition: transform .15s ease; }
    .pression:active { transform: scale(0.96); }
    .panneau { width: 100%; max-width: 100%; max-height: 88vh; margin: auto 0 0; padding: 0; border: none; border-radius: 26px 26px 0 0; background: var(--fond); color: var(--texte); }
    .panneau[open] { animation: monte .3s var(--ease); }
    @keyframes monte { from { transform: translateY(100%); } }
    .panneau::backdrop { background: rgba(42, 36, 32, 0.45); }
    .contenu { padding: 8px 20px calc(16px + env(safe-area-inset-bottom)); }
    .poignee { display: block; width: 40px; height: 5px; margin: 0 auto 10px; border-radius: 999px; background: var(--bordure); }
    .haut { display: flex; align-items: center; justify-content: space-between; }
    h2 { font-size: 24px; }
    .rond { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; border: none; border-radius: 999px; background: var(--beige); color: var(--texte); cursor: pointer; }
    fieldset { margin: 18px 0 0; padding: 0; border: none; }
    legend { margin-bottom: 8px; padding: 0; font-size: 14px; font-weight: 600; }
    .prix { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .prix label { display: flex; min-width: 0; flex-direction: column; gap: 6px; color: var(--texte-secondaire); font-size: 13px; }
    .prix .champ { width: 100%; min-width: 0; height: 48px; }
    .case { display: flex; min-height: 44px; align-items: center; gap: 10px; font-size: 15px; cursor: pointer; }
    .case input { width: 20px; height: 20px; accent-color: var(--texte); }
    .aide { margin: 6px 0 0; color: var(--texte-secondaire); font-size: 12px; }
    .case .aide { margin: 0; }
    .bas { position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; margin-top: 22px; padding-top: 12px; background: var(--fond); }
    .reinitialiser { min-height: 44px; padding: 0 8px; border: none; background: none; color: var(--texte); font: 600 14px var(--police-texte); text-decoration: underline; cursor: pointer; }
    .voir { flex: 1; min-height: 52px; }
    @media (prefers-reduced-motion: reduce) { .panneau[open] { animation: none; } .pression:active { transform: none; } }
  `,
})
export class FilterSheetComponent {
  readonly options = input.required<SheetOptions>();
  /** Filtres actuellement appliqués (lus dans l'URL par la page) */
  readonly value = input.required<SheetFilters>();
  /** Nombre de résultats pour des filtres donnés, demandé au serveur ; -1 si inconnu */
  readonly counter = input.required<(f: SheetFilters) => Promise<number>>();
  readonly apply = output<SheetFilters>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('panneau');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('declencheur');
  readonly empty = EMPTY_FILTERS;
  readonly open = signal(false);
  readonly draft = signal<SheetFilters>(EMPTY_FILTERS);

  readonly activeCount = computed(() => {
    const v = this.value();
    return (v.min ? 1 : 0) + (v.max ? 1 : 0) + (v.custom ? 1 : 0) + (v.promo ? 1 : 0) + v.shops.length;
  });

  /** N réel : recalculé par le serveur 300 ms après le dernier changement du brouillon, panneau ouvert seulement */
  readonly count = toSignal(
    toObservable(computed(() => ({ open: this.open(), draft: this.draft() }))).pipe(
      filter((s) => s.open),
      debounceTime(300),
      switchMap(({ draft }) => from(this.counter()(draft)).pipe(catchError(() => of(-1)), startWith(null))),
    ),
    { initialValue: null as number | null },
  );

  show() {
    this.draft.set({ ...this.value(), shops: [...this.value().shops] });
    this.dialog().nativeElement.showModal();
    this.open.set(true);
  }
  close() {
    const d = this.dialog().nativeElement;
    if (d.open) d.close();
  }
  onClosed() {
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }
  onBackdrop(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) this.close();
  }
  patch(change: Partial<SheetFilters>) {
    this.draft.update((d) => ({ ...d, ...change }));
  }
  toggleShop(slug: string) {
    this.draft.update((d) => ({ ...d, shops: d.shops.includes(slug) ? d.shops.filter((s) => s !== slug) : [...d.shops, slug] }));
  }
  applyDraft() {
    this.apply.emit(this.draft());
    this.close();
  }
}
