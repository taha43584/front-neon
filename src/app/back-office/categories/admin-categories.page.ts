import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, CategoryRow, SiteCategoryRow } from '../../core/services/admin.service';
import { AdminState } from '../admin.state';
import { AdminDialogComponent, ConfirmDialogComponent, ConfirmRequest, StatusBadgeComponent } from '../admin-ui';
import { IconComponent } from '../../shared/components/icon/icon.component';

type Tab = 'site' | 'global';

/**
 * Catégories, deux onglets comme la console React :
 * - catégories du SITE (noms des vendeurs + globales, regroupés) : masquer / réafficher (rien n'est supprimé), renommer, fusionner ;
 * - catégories GLOBALES (arborescence) : propositions des vendeurs, création, modification, visibilité, suppression avec réaffectation.
 */
@Component({
  selector: 'app-admin-categories-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, StatusBadgeComponent, ConfirmDialogComponent, AdminDialogComponent, IconComponent],
  templateUrl: './admin-categories.page.html',
  styleUrls: ['../admin.css', './admin-categories.page.css'],
})
export class AdminCategoriesPage {
  private readonly admin = inject(AdminService);
  private readonly state = inject(AdminState);

  readonly tab = signal<Tab>('site');
  readonly message = signal('');
  readonly busy = signal(false);
  readonly actionError = signal('');

  // ===================== Catégories du site =====================
  readonly site = signal<SiteCategoryRow[] | null>(null);
  readonly siteError = signal('');
  readonly visibleCount = computed(() => (this.site() ?? []).filter((r) => !r.hidden).length);
  readonly hiddenCount = computed(() => (this.site() ?? []).filter((r) => r.hidden).length);

  /** Masquer / réafficher */
  readonly hideTarget = signal<SiteCategoryRow | null>(null);
  readonly hideRequest = computed<ConfirmRequest | null>(() => {
    const t = this.hideTarget();
    if (!t) return null;
    return t.hidden
      ? { title: `Réafficher « ${t.name} » ?`, description: "La catégorie réapparaîtra sur l'accueil, dans le menu et à son adresse /categorie/…", confirmLabel: 'Réafficher' }
      : { title: `Masquer « ${t.name} » ?`, description: "La catégorie disparaîtra de l'accueil, du menu et de son adresse, pour toutes les boutiques — même si un vendeur la recrée avec le même nom. Aucun produit ni aucune catégorie n'est supprimé.", confirmLabel: 'Masquer', danger: true, reason: true, reasonPlaceholder: 'Motif (ex. : nom inapproprié)' };
  });

  /** Renommer : le nom change chez toutes les boutiques qui utilisent la catégorie */
  readonly renaming = signal<SiteCategoryRow | null>(null);
  readonly renameControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] });

  /** Fusionner : les produits rejoignent la catégorie cible, aucun produit supprimé */
  readonly merging = signal<SiteCategoryRow | null>(null);
  readonly mergeControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly mergeTargets = computed(() => (this.site() ?? []).filter((x) => !x.hidden && x.slug !== this.merging()?.slug));

  // ===================== Catégories globales =====================
  readonly globals = signal<CategoryRow[] | null>(null);
  readonly globalError = signal('');
  readonly pending = computed(() => (this.globals() ?? []).filter((c) => c.status === 'pending'));
  readonly approved = computed(() => (this.globals() ?? []).filter((c) => c.status === 'approved'));
  readonly roots = computed(() => this.approved().filter((c) => !c.parentId));
  /** Arborescence à plat : chaque catégorie principale suivie de ses sous-catégories */
  readonly tree = computed(() => this.roots().flatMap((root) => [{ c: root, level: 0 }, ...this.approved().filter((c) => c.parentId === root.id).map((c) => ({ c, level: 1 }))]));
  readonly nameOf = computed(() => new Map((this.globals() ?? []).map((c) => [c.id, c.name])));

  /** Créer / modifier une catégorie globale (formulaire réactif) */
  readonly editing = signal<{ id?: number } | null>(null);
  readonly editForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(128)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    parentId: new FormControl('', { nonNullable: true }),
    active: new FormControl(true, { nonNullable: true }),
  });
  readonly editError = signal('');

  /** Supprimer (avec catégorie de remplacement si des produits l'utilisent) */
  readonly toDelete = signal<CategoryRow | null>(null);
  readonly reassignTo = signal('');
  readonly deleteRequest = computed<ConfirmRequest | null>(() => {
    const c = this.toDelete();
    if (!c) return null;
    return {
      title: `Supprimer « ${c.name} » ?`, confirmLabel: 'Supprimer', danger: true,
      description: c.productCount > 0 ? `Cette catégorie est utilisée par ${c.productCount} produit(s). Choisissez la catégorie qui les recevra.` : 'La catégorie sera définitivement supprimée.',
    };
  });
  readonly reassignOptions = computed(() => this.approved().filter((c) => c.id !== this.toDelete()?.id));

  constructor() {
    void this.loadSite();
    void this.loadGlobals();
  }

  async loadSite() {
    try { this.site.set(await this.admin.siteCategories()); } catch (e) { this.siteError.set(e instanceof Error ? e.message : 'Données indisponibles'); }
  }

  async loadGlobals() {
    try { this.globals.set(await this.admin.categoryList()); } catch (e) { this.globalError.set(e instanceof Error ? e.message : 'Données indisponibles'); }
  }

  /** Lance une action serveur : message, rechargement, gestion des erreurs */
  private async run(action: () => Promise<string>, after: () => Promise<void>) {
    this.busy.set(true);
    this.actionError.set('');
    try {
      const text = await action();
      await after(); // le message s'affiche quand le tableau est déjà à jour
      this.message.set(text);
      void this.state.reload();
      return true;
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Action impossible');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  // ----- Site -----
  askHide(row: SiteCategoryRow) { this.actionError.set(''); this.hideTarget.set(row); }

  async applyHide(reason: string) {
    const t = this.hideTarget();
    if (!t) return;
    const ok = await this.run(async () => {
      const r = await this.admin.setSiteCategoryHidden(t.slug, !t.hidden, reason || null);
      return r.hidden ? "Catégorie masquée : elle n'apparaît plus sur le site" : 'Catégorie réaffichée sur le site';
    }, () => this.loadSite());
    if (ok) this.hideTarget.set(null);
  }

  openRename(row: SiteCategoryRow) {
    this.actionError.set('');
    this.renameControl.reset(row.name);
    this.renaming.set(row);
  }

  async applyRename() {
    const row = this.renaming();
    const name = this.renameControl.value.trim();
    if (!row || !name) return;
    const ok = await this.run(async () => {
      const r = await this.admin.renameSiteCategory(row.slug, name);
      return `Catégorie renommée en « ${r.name} » (${r.shops} boutique${r.shops > 1 ? 's' : ''})`;
    }, () => this.loadSite());
    if (ok) this.renaming.set(null);
  }

  openMerge(row: SiteCategoryRow) {
    this.actionError.set('');
    this.mergeControl.reset('');
    this.merging.set(row);
  }

  async applyMerge() {
    const row = this.merging();
    const target = this.mergeControl.value;
    if (!row || !target) return;
    const ok = await this.run(async () => {
      const r = await this.admin.mergeSiteCategories(row.slug, target);
      return `Fusion effectuée dans « ${r.targetName} » : ${r.movedProducts} produit(s) déplacé(s), aucun supprimé`;
    }, () => this.loadSite());
    if (ok) this.merging.set(null);
  }

  // ----- Globales -----
  openEdit(c?: CategoryRow, parentId?: number) {
    this.editError.set('');
    this.editForm.reset(c
      ? { name: c.name, description: c.description ?? '', parentId: c.parentId ? String(c.parentId) : '', active: c.active === 1 }
      : { name: '', description: '', parentId: parentId ? String(parentId) : '', active: true });
    this.editing.set(c ? { id: c.id } : {});
  }

  async saveEdit() {
    const target = this.editing();
    if (!target) return;
    if (this.editForm.invalid) return this.editError.set('Le nom doit comporter au moins 2 caractères');
    const v = this.editForm.getRawValue();
    this.busy.set(true);
    try {
      await this.admin.saveCategory({ id: target.id, name: v.name.trim(), description: v.description.trim() || null, parentId: v.parentId ? Number(v.parentId) : null, active: v.active });
      this.message.set('Catégorie enregistrée');
      this.editing.set(null);
      await this.loadGlobals();
      void this.state.reload();
    } catch (e) {
      this.editError.set(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      this.busy.set(false);
    }
  }

  async setActive(c: CategoryRow, active: boolean) {
    await this.run(async () => {
      await this.admin.setCategoryActive(c.id, active);
      return active ? 'Catégorie activée' : "Catégorie désactivée : elle n'apparaît plus sur le site";
    }, () => this.loadGlobals());
  }

  async moderate(c: CategoryRow, status: 'approved' | 'rejected') {
    await this.run(async () => {
      await this.admin.moderateCategory(c.id, status);
      return status === 'approved' ? 'Catégorie validée' : 'Proposition refusée';
    }, () => this.loadGlobals());
  }

  askDelete(c: CategoryRow) {
    this.actionError.set('');
    this.reassignTo.set('');
    this.toDelete.set(c);
  }

  async applyDelete() {
    const c = this.toDelete();
    if (!c) return;
    if (c.productCount > 0 && !this.reassignTo()) return this.actionError.set('Choisissez une catégorie de remplacement');
    const ok = await this.run(async () => {
      const r = await this.admin.deleteCategory(c.id, this.reassignTo() ? Number(this.reassignTo()) : undefined);
      return r.reassigned ? `Catégorie supprimée, ${r.reassigned} produit(s) réaffecté(s)` : 'Catégorie supprimée';
    }, () => this.loadGlobals());
    if (ok) this.toDelete.set(null);
  }
}
