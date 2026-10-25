import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Signal, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, from, map, of, switchMap } from 'rxjs';
import { STATUS_LABELS } from '../core/services/admin.service';

/* ==========================================================================
 * Liste paginée côté serveur : filtres → requête, avec anti-rebond et annulation
 * ========================================================================== */

export type ListStatus = 'loading' | 'ok' | 'error';

/**
 * Charge une liste à partir d'un signal de filtres. À chaque changement des filtres :
 * attente de 250 ms (debounceTime : on n'appelle pas le serveur à chaque lettre tapée),
 * puis appel ; si les filtres changent pendant l'appel, l'ancienne réponse est ignorée (switchMap).
 * À appeler dans un constructeur ou un initialiseur de champ (contexte d'injection).
 */
export function serverList<F, R>(filters: Signal<F>, load: (f: F) => Promise<R>) {
  const version = signal(0);
  const data = signal<R | null>(null);
  const status = signal<ListStatus>('loading');
  const error = signal('');
  const trigger = computed(() => ({ f: filters(), v: version() }));
  toObservable(trigger)
    .pipe(
      debounceTime(250),
      switchMap(({ f }) => {
        if (!untracked(data)) status.set('loading');
        return from(load(f)).pipe(
          map((r) => ({ ok: true as const, r })),
          catchError((e: unknown) => of({ ok: false as const, message: e instanceof Error ? e.message : 'Données indisponibles' })),
        );
      }),
      takeUntilDestroyed(inject(DestroyRef)),
    )
    .subscribe((res) => {
      if (res.ok) {
        data.set(res.r);
        status.set('ok');
      } else {
        error.set(res.message);
        status.set('error');
      }
    });
  return { data: data.asReadonly(), status: status.asReadonly(), error: error.asReadonly(), reload: () => version.update((v) => v + 1) };
}

/* ==========================================================================
 * Badge de statut
 * ========================================================================== */

const BADGE_TONES: Record<string, string> = {
  active: 'vert', published: 'vert', delivered: 'vert', approved: 'vert',
  pending: 'ambre', suspended: 'rouge', cancelled: 'rouge',
  rejected: 'gris', draft: 'gris', inactive: 'gris',
  processing: 'bleu', shipped: 'indigo',
  new: 'ambre', seen: 'gris', answered: 'vert', closed: 'gris',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge ' + tone()">{{ label() || labels[status()] || status() }}</span>`,
  styles: `
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; white-space: nowrap; box-shadow: inset 0 0 0 1px rgba(100, 116, 139, 0.2); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bleu-3, #64748b) 20%, transparent); background: var(--surface-20, #f1f5f9); color: var(--bleu-8, #475569); }
    .vert { background: var(--surface-11, #ecfdf5); color: var(--vert-9, #047857); box-shadow: inset 0 0 0 1px rgba(5, 150, 105, 0.2); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--vert-4, #059669) 20%, transparent); }
    .ambre { background: var(--surface-4, #fffbeb); color: var(--cuivre-18, #b45309); box-shadow: inset 0 0 0 1px rgba(217, 119, 6, 0.2); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cuivre-11, #b95a00) 20%, transparent); }
    .rouge { background: var(--surface-18, #fff1f2); color: var(--rouge-12, #be123c); box-shadow: inset 0 0 0 1px rgba(225, 29, 72, 0.2); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rouge-10, #e11d48) 20%, transparent); }
    .bleu { background: var(--ardoise-fond-1, #f0f9ff); color: var(--bleu-5, #0369a1); box-shadow: inset 0 0 0 1px rgba(2, 132, 199, 0.2); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bleu-2, #0284c7) 20%, transparent); }
    .indigo { background: var(--ardoise-fond-2, #eef2ff); color: var(--bleu-7, #4338ca); box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.2); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bleu-4, #4f46e5) 20%, transparent); }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input<string | null>(null);
  readonly labels = STATUS_LABELS;
  readonly tone = computed(() => BADGE_TONES[this.status()] ?? 'gris');
}

/* ==========================================================================
 * Pagination
 * ========================================================================== */

@Component({
  selector: 'app-admin-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <div class="pagination">
        <span>{{ total() }} résultat{{ total() > 1 ? 's' : '' }} · page {{ page() }} / {{ pageCount() }}</span>
        <div class="boutons">
          <button type="button" aria-label="Page précédente" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)">‹</button>
          <button type="button" aria-label="Page suivante" [disabled]="page() >= pageCount()" (click)="pageChange.emit(page() + 1)">›</button>
        </div>
      </div>
    }
  `,
  styles: `
    .pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 16px; border-top: 1px solid var(--surface-20, #f1f5f9); color: var(--bleu-3, #64748b); font-size: 12px; }
    .boutons { display: flex; gap: 4px; }
    button { width: 44px; height: 44px; border: 1px solid var(--ardoise-ligne-1, #e2e8f0); border-radius: 6px; background: var(--carte); color: var(--bleu-9, #334155); font-size: 18px; cursor: pointer; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
  `,
})
export class AdminPaginationComponent {
  readonly page = input.required<number>();
  readonly pageCount = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();
}

/* ==========================================================================
 * Fenêtre de confirmation (motif facultatif ou obligatoire) — <dialog> natif
 * ========================================================================== */

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  /** Afficher un champ « Motif » */
  reason?: boolean;
  reasonRequired?: boolean;
  reasonPlaceholder?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- clic sur le fond du <dialog> ; au clavier : Échap (natif) -->
    <dialog #box class="fenetre" aria-labelledby="confirm-title" (cancel)="onCancel($event)" (click)="onBackdrop($event)" data-testid="confirm-dialog">
      @if (request(); as r) {
        <form (submit)="submit($event)" novalidate>
          <h3 id="confirm-title">{{ r.title }}</h3>
          <p class="description">{{ r.description }}</p>
          <ng-content />
          @if (r.reason) {
            <label class="motif">Motif {{ r.reasonRequired ? '(obligatoire)' : '(facultatif)' }}
              <textarea rows="3" maxlength="1000" [placeholder]="r.reasonPlaceholder ?? ''" [value]="text()" (input)="text.set($any($event.target).value); error.set('')" [attr.aria-invalid]="!!error()" data-testid="confirm-reason"></textarea>
              @if (error()) { <span class="erreur" role="alert">{{ error() }}</span> }
            </label>
          }
          @if (serverError()) { <p class="erreur" role="alert">{{ serverError() }}</p> }
          <div class="actions">
            <button type="button" class="b" [disabled]="busy()" (click)="cancelled.emit()">Annuler</button>
            <button type="submit" class="b" [class.danger]="r.danger" [class.noir]="!r.danger" [disabled]="busy()" data-testid="confirm-ok">{{ busy() ? 'Patientez…' : r.confirmLabel }}</button>
          </div>
        </form>
      }
    </dialog>
  `,
  styles: `
    .fenetre { width: min(448px, calc(100% - 32px)); padding: 0; border: none; border-radius: 12px; box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25); box-shadow: 0 25px 50px color-mix(in srgb, var(--ombre-3, #0f172a) 25%, transparent); color: var(--bleu-10, #1e293b); }
    .fenetre::backdrop { background: rgba(15, 23, 42, 0.5); }
    form { padding: 20px; }
    h3 { font-family: var(--police-texte); font-size: 16px; font-weight: 600; letter-spacing: 0; color: var(--bleu-11, #0f172a); }
    .description { margin: 8px 0 0; color: var(--bleu-8, #475569); font-size: 14px; }
    .motif { display: block; margin-top: 16px; color: var(--bleu-9, #334155); font-size: 14px; font-weight: 500; }
    textarea { width: 100%; margin-top: 6px; padding: 10px; border: 1px solid var(--ardoise-ligne-1, #e2e8f0); border-radius: 6px; font: 14px var(--police-texte); resize: vertical; }
    textarea:focus { outline: none; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35); box-shadow: 0 0 0 3px color-mix(in srgb, var(--cuivre-4, #f59e0b) 35%, transparent); }
    .erreur { display: block; margin: 4px 0 0; color: var(--rouge-10, #e11d48); font-size: 12px; font-weight: 400; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .b { min-height: 44px; padding: 0 16px; border: 1px solid var(--ardoise-ligne-1, #e2e8f0); border-radius: 6px; background: var(--carte); color: var(--bleu-9, #334155); font: 500 14px var(--police-texte); cursor: pointer; }
    .b:disabled { opacity: 0.5; }
    .b.noir { border-color: var(--bleu-11, #0f172a); background: var(--bleu-11, #0f172a); color: var(--carte); }
    .b.danger { border-color: var(--rouge-10, #e11d48); background: var(--rouge-10, #e11d48); color: var(--carte); }
  `,
})
export class ConfirmDialogComponent {
  /** null = fenêtre fermée */
  readonly request = input<ConfirmRequest | null>(null);
  readonly busy = input(false);
  readonly serverError = input('');
  /** Le parent reçoit le motif saisi (vide si aucun) */
  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  readonly text = signal('');
  readonly error = signal('');
  private readonly box = viewChild.required<ElementRef<HTMLDialogElement>>('box');

  constructor() {
    // Ouverture / fermeture suivant l'entrée « request »
    effect(() => {
      const dialog = this.box().nativeElement;
      if (this.request()) {
        untracked(() => { this.text.set(''); this.error.set(''); });
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  submit(event: Event) {
    event.preventDefault();
    const r = this.request();
    if (!r) return;
    const reason = this.text().trim();
    if (r.reasonRequired && reason.length < 3) return this.error.set('Indiquez un motif (au moins 3 caractères).');
    this.confirmed.emit(reason);
  }

  onCancel(event: Event) {
    event.preventDefault(); // Échap : c'est le parent qui ferme (sauf pendant l'enregistrement)
    if (!this.busy()) this.cancelled.emit();
  }

  /** Clic sur le fond sombre (en dehors de la fenêtre) */
  onBackdrop(event: MouseEvent) {
    if (event.target === this.box().nativeElement && !this.busy()) this.cancelled.emit();
  }
}

/** « ED-000012 » */
export const orderRef = (id: number) => `ED-${String(id).padStart(6, '0')}`;

/* ==========================================================================
 * Fenêtre de formulaire générique (renommer, fusionner, modifier…) — <dialog> natif
 *   <app-admin-dialog [open]="!!renaming()" title="Renommer" (closed)="renaming.set(null)"> …formulaire… </app-admin-dialog>
 * ========================================================================== */

@Component({
  selector: 'app-admin-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- clic sur le fond du <dialog> ; au clavier : Échap (natif) -->
    <dialog #box class="fenetre" [attr.aria-labelledby]="titleId" (cancel)="onCancel($event)" (click)="onBackdrop($event)">
      @if (open()) {
        <div class="interieur">
          <h3 [id]="titleId">{{ title() }}</h3>
          @if (description()) { <p class="description">{{ description() }}</p> }
          <ng-content />
        </div>
      }
    </dialog>
  `,
  styles: `
    .fenetre { width: min(448px, calc(100% - 32px)); padding: 0; border: none; border-radius: 12px; box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25); box-shadow: 0 25px 50px color-mix(in srgb, var(--ombre-3, #0f172a) 25%, transparent); color: var(--bleu-10, #1e293b); }
    .fenetre::backdrop { background: rgba(15, 23, 42, 0.5); }
    .interieur { padding: 20px; }
    h3 { font-family: var(--police-texte); font-size: 16px; font-weight: 600; letter-spacing: 0; color: var(--bleu-11, #0f172a); }
    .description { margin: 8px 0 0; color: var(--bleu-8, #475569); font-size: 14px; }
  `,
})
export class AdminDialogComponent {
  private static nextId = 0;
  readonly titleId = `titre-fenetre-${AdminDialogComponent.nextId++}`;
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input('');
  /** Empêche la fermeture pendant un enregistrement */
  readonly busy = input(false);
  readonly closed = output<void>();
  private readonly box = viewChild.required<ElementRef<HTMLDialogElement>>('box');

  constructor() {
    effect(() => {
      const dialog = this.box().nativeElement;
      if (this.open() && !dialog.open) dialog.showModal();
      else if (!this.open() && dialog.open) dialog.close();
    });
  }

  onCancel(event: Event) {
    event.preventDefault();
    if (!this.busy()) this.closed.emit();
  }

  onBackdrop(event: MouseEvent) {
    if (event.target === this.box().nativeElement && !this.busy()) this.closed.emit();
  }
}
