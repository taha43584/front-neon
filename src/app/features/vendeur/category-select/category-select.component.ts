import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
// Mêmes règles que le serveur pour reconnaître une catégorie et proposer « Vouliez-vous dire … ? »
import { categorySlug, findSimilarCategories, normalizeCategoryName } from '@shared/categoryKey';
import { SHOP_CATEGORY_NAME_RULE } from '@shared/productValidation';
import { CategoryChoices, VendorService } from '../../../core/services/vendor.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Sélecteur de catégorie du formulaire produit, avec recherche :
 * 1. « Mes catégories » ; 2. « Catégories utilisées par d'autres boutiques » (noms uniquement) ; 3. « Créer … ».
 * Choisir une catégorie d'une autre boutique l'ajoute à la sienne sous son nom officiel.
 * Anti-doublons : « Vouliez-vous dire « Miroirs » ? » quand un nom proche existe déjà.
 * La liste est relue à chaque ouverture (une catégorie créée entre-temps par une autre boutique apparaît).
 */
@Component({
  selector: 'app-category-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './category-select.component.html',
  styleUrl: './category-select.component.css',
})
export class CategorySelectComponent {
  private readonly vendor = inject(VendorService);

  /** Catégorie choisie (null = Sans catégorie) */
  readonly value = input<number | null>(null);
  readonly selected = output<number | null>();

  readonly open = signal(false);
  readonly search = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly choices = signal<CategoryChoices>({ own: [], others: [] });
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly key = computed(() => normalizeCategoryName(this.search()));
  private matches(name: string) {
    return !this.key() || normalizeCategoryName(name).includes(this.key());
  }
  readonly ownShown = computed(() => this.choices().own.filter((c) => this.matches(c.name)));
  readonly othersShown = computed(() => this.choices().others.filter((c) => this.matches(c.name)).slice(0, 50));
  /** Le nom tapé correspond exactement (même slug) à une catégorie existante */
  readonly exact = computed(() => {
    const text = this.search().trim();
    return text ? [...this.choices().own, ...this.choices().others].find((c) => categorySlug(c.name) === categorySlug(text)) : undefined;
  });
  /** « Vouliez-vous dire … ? » : noms proches (pluriel, petite faute), même si le nom tapé existe déjà ailleurs */
  readonly similar = computed(() => (this.search().trim().length >= 3 ? findSimilarCategories(this.search(), [...this.choices().own, ...this.choices().others]) : []));
  readonly typed = computed(() => this.search().replace(/\s+/g, ' ').trim());
  readonly canCreate = computed(() => this.typed().length >= SHOP_CATEGORY_NAME_RULE.min && this.typed().length <= SHOP_CATEGORY_NAME_RULE.max && !this.exact());
  readonly selectedName = computed(() => this.choices().own.find((c) => c.id === this.value())?.name ?? null);

  constructor() {
    // Nom de la catégorie déjà choisie (modification d'un produit)
    void this.reload();
  }

  async reload() {
    try {
      this.choices.set(await this.vendor.categoryChoices());
    } catch {
      this.error.set('Les catégories n\'ont pas pu être chargées.');
    }
  }

  async toggle() {
    if (this.open()) return this.close();
    this.open.set(true);
    this.error.set('');
    await this.reload();
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  close() {
    this.open.set(false);
    this.search.set('');
  }

  choose(id: number | null) {
    this.selected.emit(id);
    this.close();
  }

  /** Catégorie d'une autre boutique : ajoutée à la mienne (nom officiel), puis choisie */
  async adopt(slug: string) {
    await this.run(async () => {
      const result = await this.vendor.adoptCategory(slug);
      await this.reload();
      this.choose(result.id);
    });
  }

  async create() {
    await this.run(async () => {
      const result = await this.vendor.createCategory(this.typed());
      await this.reload();
      this.choose(result.id);
    });
  }

  /** Suggestion « Vouliez-vous dire » : la mienne → choisie ; celle d'une autre boutique → ajoutée */
  async pickSuggestion(name: string) {
    const mine = this.choices().own.find((c) => c.name === name);
    if (mine) this.choose(mine.id);
    else await this.adopt(categorySlug(name));
  }

  private async run(action: () => Promise<void>) {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Action impossible');
    } finally {
      this.busy.set(false);
    }
  }
}
