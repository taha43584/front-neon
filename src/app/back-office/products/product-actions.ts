import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { AdminService, CategoryRow, ProductAction } from '../../core/services/admin.service';
import { ConfirmRequest } from '../admin-ui';

export type ProductActionKind = ProductAction | 'delete';
export interface PendingProductAction { productId: number; name: string; kind: ProductActionKind }

const LABELS: Record<ProductActionKind, string> = { publish: 'Publier', unpublish: 'Dépublier', reject: 'Refuser', delete: 'Supprimer' };

/** Textes identiques à la console React ; motif obligatoire pour un refus, facultatif pour une dépublication */
export function productActionRequest(a: PendingProductAction | null): ConfirmRequest | null {
  if (!a) return null;
  const description = a.kind === 'delete'
    ? 'Suppression définitive du produit et de ses photos. Les commandes passées conservent le nom et le prix enregistrés.'
    : a.kind === 'publish' ? 'Le produit sera visible dans le catalogue public si la boutique est approuvée.'
    : a.kind === 'reject' ? 'Le produit est retiré du catalogue ; le vendeur verra le motif et pourra le corriger.'
    : 'Le produit est retiré du catalogue et repasse en brouillon.';
  return {
    title: `${LABELS[a.kind]} « ${a.name} » ?`, description, confirmLabel: LABELS[a.kind],
    danger: a.kind === 'delete' || a.kind === 'reject',
    reason: a.kind === 'reject' || a.kind === 'unpublish', reasonRequired: a.kind === 'reject',
    reasonPlaceholder: 'Ex. : photos non conformes, description trompeuse…',
  };
}

export function productActionDone(kind: ProductActionKind, status?: string) {
  if (kind === 'delete') return 'Produit supprimé définitivement';
  return status === 'published' ? 'Produit publié' : status === 'rejected' ? 'Produit refusé : le vendeur voit le motif' : 'Produit dépublié';
}

/** Catégories globales utilisables : principales validées et actives, suivies de leurs sous-catégories */
export function globalCategoryOptions(list: readonly CategoryRow[]) {
  const usable = list.filter((c) => c.status === 'approved' && c.active === 1);
  return usable.filter((c) => !c.parentId).flatMap((main) => [
    { id: main.id, label: main.name },
    ...usable.filter((c) => c.parentId === main.id).map((c) => ({ id: c.id, label: `— ${c.name}` })),
  ]);
}

/**
 * Catégorie GLOBALE du site (navigation), facultative : ne modifie pas la catégorie choisie par le vendeur.
 * Composant autonome : il enregistre lui-même (admin.setProductCategory) et prévient le parent.
 */
@Component({
  selector: 'app-global-category-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select class="champ-admin" [class.attente]="saving()" [attr.aria-label]="'Catégorie du site pour ' + productName()" [value]="categoryId() ?? ''" (change)="save($any($event.target).value)">
      <option value="" [selected]="!categoryId()">Site : aucune</option>
      @for (o of options(); track o.id) { <option [value]="o.id" [selected]="o.id === categoryId()">{{ o.label }}</option> }
    </select>
    @if (error()) { <span class="erreur" role="alert">{{ error() }}</span> }
  `,
  styles: `
    :host { display: block; }
    .champ-admin { width: 100%; height: 44px; padding: 0 8px; border: 1px solid var(--ardoise-ligne-1, #e2e8f0); border-radius: 6px; background: var(--carte); color: var(--bleu-9, #334155); font: 13px var(--police-texte); }
    .attente { opacity: 0.6; }
    .erreur { display: block; color: var(--rouge-10, #e11d48); font-size: 12px; }
  `,
})
export class GlobalCategorySelectComponent {
  private readonly admin = inject(AdminService);
  readonly productId = input.required<number>();
  readonly productName = input.required<string>();
  readonly categoryId = input<number | null>(null);
  readonly options = input.required<{ id: number; label: string }[]>();
  /** Message de confirmation (« Catégorie du site : Miroirs ») */
  readonly saved = output<string>();
  readonly saving = signal(false);
  readonly error = signal('');

  async save(value: string) {
    this.saving.set(true);
    this.error.set('');
    try {
      const r = await this.admin.setProductCategory(this.productId(), value ? Number(value) : null);
      this.saved.emit(r.category ? `Catégorie du site : ${r.category}` : 'Catégorie du site retirée');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      this.saving.set(false);
    }
  }
}

/** Boutons d'action d'un produit (liste et fiche) */
@Component({
  selector: 'app-product-action-buttons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="groupe-actions">
      @if (status() !== 'published') { <button type="button" class="b vert" (click)="ask('publish')">{{ status() === 'pending' ? 'Approuver' : 'Publier' }}</button> }
      @if (status() === 'published') { <button type="button" class="b" (click)="ask('unpublish')">Dépublier</button> }
      @if (status() !== 'rejected') { <button type="button" class="b rouge" (click)="ask('reject')">Refuser</button> }
      <button type="button" class="b rouge icone" [attr.aria-label]="'Supprimer ' + name()" (click)="ask('delete')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>
    </div>
  `,
  styleUrl: '../admin.css',
})
export class ProductActionButtonsComponent {
  readonly productId = input.required<number>();
  readonly name = input.required<string>();
  readonly status = input.required<string>();
  readonly action = output<PendingProductAction>();
  ask(kind: ProductActionKind) { this.action.emit({ productId: this.productId(), name: this.name(), kind }); }
}
