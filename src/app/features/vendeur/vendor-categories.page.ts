import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { SHOP_CATEGORY_NAME_RULE } from '@shared/productValidation';
import { ShopCategoryList, VendorService } from '../../core/services/vendor.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CategorySelectComponent } from './category-select/category-select.component';
import { VendorSpaceState } from './vendor-space.state';

type ShopCategory = ShopCategoryList['categories'][number];

/** Même règle que le serveur (2 à 50 caractères, espaces superflus retirés), règle partagée importée */
function checkName(raw: string) {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length < SHOP_CATEGORY_NAME_RULE.min) return { name, error: `Le nom doit comporter au moins ${SHOP_CATEGORY_NAME_RULE.min} caractères` };
  if (name.length > SHOP_CATEGORY_NAME_RULE.max) return { name, error: `Le nom ne peut pas dépasser ${SHOP_CATEGORY_NAME_RULE.max} caractères` };
  return { name, error: null };
}

/**
 * /espace-vendeur/categories : catégories propres à la boutique (comme « Mes catégories » en React).
 * Renommer, monter / descendre (ordre des onglets de la vitrine), supprimer (produits → « Sans catégorie »),
 * ajouter avec le sélecteur partagé (catégorie d'une autre boutique ou nouvelle).
 */
@Component({
  selector: 'app-vendor-categories-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CategorySelectComponent],
  template: `
    <div class="titre-page">
      <div>
        <h1>Mes catégories</h1>
        <p>Créez librement les catégories de votre boutique et classez-y vos produits. Elles apparaissent en onglets sur votre vitrine publique dès qu'elles contiennent un produit publié.</p>
      </div>
    </div>

    @switch (status()) {
      @case ('loading') { <p class="info" role="status">Chargement des catégories…</p> }
      @case ('error') { <p class="erreur-bloc" role="alert">{{ error() }} <button type="button" class="bouton petit" (click)="load()">Réessayer</button></p> }
      @default {
        <div class="grille">
          <section class="bloc">
            <div class="titre-bloc">
              <h2 class="avec-icone"><app-icon name="tag" [size]="18" class="accent" /> Catégories de la boutique</h2>
              <span class="petit">{{ order().length }} catégorie(s)</span>
            </div>
            @if (!order().length) {
              <p class="vide-pointille">Aucune catégorie pour l'instant. Ajoutez-en une avec le formulaire.</p>
            } @else {
              <ol class="categories" aria-label="Catégories de la boutique" data-testid="vendor-categories">
                @for (c of order(); track c.id; let i = $index; let first = $first; let last = $last) {
                  <li class="categorie">
                    <span class="rang">{{ i + 1 }}</span>
                    @if (editingId() === c.id) {
                      <form class="renommer" (submit)="$event.preventDefault(); rename(c)">
                        <input #nameInput class="champ" [value]="editName()" (input)="editName.set($any($event.target).value)" [attr.aria-label]="'Nouveau nom pour ' + c.name" data-testid="category-rename-input" />
                        <button type="submit" class="mini sombre" aria-label="Enregistrer le nom" [disabled]="busy()"><app-icon name="check" [size]="16" /></button>
                        <button type="button" class="mini" aria-label="Annuler" (click)="editingId.set(null)"><app-icon name="x" [size]="16" /></button>
                      </form>
                    } @else {
                      <div class="texte-cat"><p class="nom-cat">{{ c.name }}</p><p class="petit">{{ c.productCount }} produit(s)</p></div>
                      <div class="actions-cat">
                        <button type="button" class="mini" [attr.aria-label]="'Monter ' + c.name" [disabled]="first || busy()" (click)="move(i, -1)"><app-icon name="arrow-up" [size]="16" /></button>
                        <button type="button" class="mini" [attr.aria-label]="'Descendre ' + c.name" [disabled]="last || busy()" (click)="move(i, 1)"><app-icon name="arrow-down" [size]="16" /></button>
                        <button type="button" class="mini" [attr.aria-label]="'Renommer ' + c.name" (click)="startRename(c)"><app-icon name="pencil" [size]="16" /></button>
                        <button type="button" class="mini rouge" [attr.aria-label]="'Supprimer ' + c.name" (click)="askDelete(c)"><app-icon name="trash-2" [size]="16" /></button>
                      </div>
                    }
                  </li>
                }
              </ol>
            }
            <p class="sans-categorie"><strong>Sans catégorie</strong> : {{ uncategorized() }} produit(s)</p>
          </section>

          <section class="bloc ajout">
            <div class="titre-bloc"><h2 class="avec-icone"><app-icon name="plus" [size]="18" class="accent" /> Ajouter une catégorie</h2></div>
            <!-- Sélecteur partagé avec le formulaire produit : catégorie d'une autre boutique ou nouvelle -->
            <div class="selecteur"><app-category-select (selected)="added()" /></div>
            <p class="petit">Choisissez une catégorie déjà utilisée par d'autres boutiques (vos produits y seront regroupés sur le site) ou créez la vôtre ({{ rule.min }} à {{ rule.max }} caractères).</p>
          </section>
        </div>
      }
    }

    <dialog #confirm class="fenetre" (cancel)="$event.preventDefault(); closeDelete()" aria-labelledby="titre-suppression">
      @if (toDelete(); as c) {
        <div class="fenetre-contenu">
          <h3 id="titre-suppression">Supprimer « {{ c.name }} » ?</h3>
          <p>
            @if (c.productCount > 0) { Les <strong>{{ c.productCount }} produit(s)</strong> de cette catégorie ne seront pas supprimés : ils passeront dans « Sans catégorie ». }
            @else { Aucun produit n'utilise cette catégorie. }
          </p>
          <div class="fenetre-actions">
            <button type="button" class="bouton bouton-clair petit" (click)="closeDelete()">Annuler</button>
            <button type="button" class="bouton petit danger" [disabled]="busy()" (click)="confirmDelete(c)" data-testid="category-delete-confirm">Confirmer la suppression</button>
          </div>
        </div>
      }
    </dialog>
  `,
  styleUrls: ['./vendor-pages.css'],
  styles: `
    .info { padding: 48px 0; color: var(--gris-11, #7c6d64); font-size: 14px; text-align: center; }
    .erreur-bloc { padding: 24px; border: 1px solid var(--rouge-2, #f5c6c6); border-radius: 24px; background: var(--surface-16, #fdf3f3); color: var(--rouge-11, #c0392b); font-size: 14px; }
    .grille { display: grid; gap: 24px; }
    .accent { color: var(--cuivre-16, #8e5d3e); }
    .avec-icone { display: flex; align-items: center; gap: 8px; }
    .vide-pointille { margin: 16px 0 0; padding: 24px; border: 1px dashed var(--ligne-30, #e2d8cf); border-radius: 16px; background: var(--surface-2, #fdfbf9); color: var(--gris-11, #7c6d64); font-size: 14px; text-align: center; }
    .categories { margin: 16px 0 0; padding: 0; list-style: none; }
    .categorie { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--surface-32, #f5eee8); }
    .rang { display: flex; width: 28px; height: 28px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 999px; background: var(--ligne-6, #f4e9e0); color: var(--cuivre-22, #8a5d43); font-size: 12px; font-weight: 600; }
    .texte-cat { min-width: 0; flex: 1; }
    .nom-cat { overflow: hidden; margin: 0; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .texte-cat .petit { margin: 0; }
    .actions-cat { display: flex; flex-shrink: 0; gap: 4px; }
    .mini { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; border: 1px solid var(--ligne-20, #eadfd6); border-radius: 999px; background: var(--carte); color: var(--texte); cursor: pointer; }
    .mini:disabled { opacity: .4; cursor: not-allowed; }
    .mini.rouge { border-color: var(--rouge-2, #f5c6c6); color: var(--rouge-11, #c0392b); }
    .mini.sombre { border-color: var(--encre-9, #302a26); background: var(--encre-9, #302a26); color: var(--carte); }
    .renommer { display: flex; min-width: 0; flex: 1; align-items: center; gap: 8px; }
    .renommer .champ { min-width: 0; flex: 1; }
    .sans-categorie { margin: 16px 0 0; padding: 12px 16px; border-radius: 16px; background: var(--surface-2, #fdfbf9); box-shadow: inset 0 0 0 1px var(--ligne-12, #f0e6de); color: var(--gris-19, #6f6259); font-size: 12px; }
    .ajout { align-self: start; }
    .selecteur { margin: 16px 0 12px; }
    .fenetre { width: min(448px, calc(100% - 32px)); padding: 0; border: 1px solid var(--ligne-20, #eadfd6); border-radius: 24px; box-shadow: 0 25px 50px rgba(0, 0, 0, .25); }
    .fenetre::backdrop { background: rgba(0, 0, 0, .4); backdrop-filter: blur(4px); }
    .fenetre-contenu { padding: 24px; }
    .fenetre h3 { font-size: 20px; }
    .fenetre p { color: var(--gris-19, #6f6259); font-size: 14px; line-height: 1.5rem; }
    .fenetre-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .danger { background: var(--rouge-11, #c0392b); }
    @media (min-width: 1024px) { .grille { grid-template-columns: 1.25fr .75fr; } }
  `,
})
export class VendorCategoriesPage {
  private readonly vendor = inject(VendorService);
  private readonly toast = inject(ToastService);
  private readonly state = inject(VendorSpaceState);
  readonly confirmBox = viewChild<ElementRef<HTMLDialogElement>>('confirm');
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  readonly rule = SHOP_CATEGORY_NAME_RULE;
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly error = signal('');
  /** Ordre affiché : mis à jour tout de suite au clic (mise à jour optimiste), puis confirmé par le serveur */
  readonly order = signal<ShopCategory[]>([]);
  readonly uncategorized = signal(0);
  readonly editingId = signal<number | null>(null);
  readonly editName = signal('');
  readonly toDelete = signal<ShopCategory | null>(null);
  readonly busy = signal(false);

  constructor() {
    void this.load();
  }

  async load() {
    try {
      const data = await this.vendor.shopCategories();
      this.order.set(data.categories);
      this.uncategorized.set(data.uncategorized);
      this.status.set('ok');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Catégories indisponibles');
      this.status.set('error');
    }
  }

  private async refresh() {
    await this.load();
    void this.state.reload(); // compteurs du menu et du tableau de bord
  }

  startRename(c: ShopCategory) {
    this.editName.set(c.name);
    this.editingId.set(c.id);
    setTimeout(() => this.nameInput()?.nativeElement.focus());
  }

  async rename(c: ShopCategory) {
    const checked = checkName(this.editName());
    if (checked.error) return this.toast.show(checked.error, 'erreur');
    this.busy.set(true);
    try {
      await this.vendor.renameCategory(c.id, checked.name);
      this.toast.show('Catégorie renommée', 'succes');
      this.editingId.set(null);
      await this.refresh();
    } catch (e) {
      this.toast.show(e instanceof Error ? e.message : 'Renommage impossible', 'erreur');
    } finally {
      this.busy.set(false);
    }
  }

  async move(index: number, delta: -1 | 1) {
    const list = [...this.order()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const previous = this.order();
    this.order.set(list);
    this.busy.set(true);
    try {
      await this.vendor.reorderCategories(list.map((c) => c.id));
    } catch (e) {
      this.order.set(previous);
      this.toast.show(e instanceof Error ? e.message : 'Ordre non enregistré', 'erreur');
    } finally {
      this.busy.set(false);
    }
  }

  askDelete(c: ShopCategory) {
    this.toDelete.set(c);
    this.confirmBox()?.nativeElement.showModal();
  }

  closeDelete() {
    this.toDelete.set(null);
    this.confirmBox()?.nativeElement.close();
  }

  async confirmDelete(c: ShopCategory) {
    this.busy.set(true);
    try {
      const r = await this.vendor.deleteCategory(c.id);
      this.toast.show(r.uncategorized ? `Catégorie supprimée : ${r.uncategorized} produit(s) passé(s) dans « Sans catégorie »` : 'Catégorie supprimée', 'succes');
      this.closeDelete();
      await this.refresh();
    } catch (e) {
      this.toast.show(e instanceof Error ? e.message : 'Suppression impossible', 'erreur');
    } finally {
      this.busy.set(false);
    }
  }

  async added() {
    await this.refresh();
  }
}
