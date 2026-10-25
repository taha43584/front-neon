import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TRPCClientError } from '@trpc/client';
// Fonctions et règles PARTAGÉES avec le serveur et le site React (importées, jamais recopiées)
import { computeCustomPrice, formatArea, PRICING_MODE_LABELS, unitLabel, type CustomPricingMode, type PricingMode, type SurchargeType } from '@shared/customPricing';
import { fieldErrors } from '@shared/validation';
import {
  AVAILABILITY_LABELS, MAX_PRODUCT_IMAGES, MAX_PRODUCT_OPTIONS, MEDIA_LIMITS, VARIANT_GROUPS, productInputSchema, toVideoEmbedUrl, type Availability,
} from '@shared/productValidation';
import { ProductInput, VendorService } from '../../../core/services/vendor.service';
import { MediaKind, MediaUploadService } from '../../../core/services/media-upload.service';
import { VendorSpaceState } from '../vendor-space.state';
import { CategorySelectComponent } from '../category-select/category-select.component';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type VariantKey = (typeof VARIANT_GROUPS)[number]['key'];

/** Une photo de la galerie : en cours d'envoi (progress), envoyée (mediaId) ou en erreur */
interface ImageItem { key: string; mediaId?: number; url: string; isPrimary: boolean; attached: boolean; progress?: number; error?: string }
interface VideoItem { mediaId?: number; url: string; attached: boolean; progress?: number }

/** Une option du sur-mesure (ex. « Cadre doré », + 30 DT / m²) : un petit formulaire dans le FormArray */
function optionGroup(name = '', surchargeType: SurchargeType = 'per_m2', amountTnd = '') {
  return new FormGroup({
    name: new FormControl(name, { nonNullable: true }),
    surchargeType: new FormControl<SurchargeType>(surchargeType, { nonNullable: true }),
    amountTnd: new FormControl(amountTnd, { nonNullable: true }),
  });
}

/** Texte saisi → nombre (virgule acceptée) ; vide → null ; texte invalide → NaN (refusé par la validation) */
const parseDecimal = (value: string) => {
  const v = value.replace(',', '.').trim();
  return v === '' ? null : Number(v);
};
const text = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));

/**
 * Ajout et modification d'un produit (/espace-vendeur/ajouter et /espace-vendeur/modifier/:id).
 * Formulaire réactif complexe : groupes imbriqués (variantes), FormArray (options du sur-mesure),
 * photos et vidéo envoyées avec une barre de progression, aperçu du prix calculé par la fonction partagée.
 * La validation finale utilise productInputSchema (le même schéma que le serveur, qui revalide tout).
 */
@Component({
  selector: 'app-product-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, CategorySelectComponent, PrixDtPipe, IconComponent],
  templateUrl: './product-editor.page.html',
  styleUrl: './product-editor.page.css',
})
export class ProductEditorPage implements OnInit {
  private readonly vendor = inject(VendorService);
  private readonly uploads = inject(MediaUploadService);
  private readonly state = inject(VendorSpaceState);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètre de route :id (absent pour « Ajouter un produit ») */
  readonly id = input<string>();
  readonly productId = computed(() => (this.id() ? Number(this.id()) : undefined));

  readonly availabilityLabels = AVAILABILITY_LABELS;
  readonly availabilityKeys = Object.keys(AVAILABILITY_LABELS) as Availability[];
  readonly pricingModes = Object.keys(PRICING_MODE_LABELS) as PricingMode[];
  readonly pricingModeLabels = PRICING_MODE_LABELS;
  readonly variantGroups = VARIANT_GROUPS;
  readonly maxImages = MAX_PRODUCT_IMAGES;
  readonly maxOptions = MAX_PRODUCT_OPTIONS;
  readonly imageAccept = MEDIA_LIMITS.image.mimeTypes.join(',');
  readonly videoAccept = MEDIA_LIMITS.video.mimeTypes.join(',');
  readonly imageLimits = MEDIA_LIMITS.image.label;
  readonly videoLimits = MEDIA_LIMITS.video.label;

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    shopCategoryId: new FormControl<number | null>(null),
    pricingMode: new FormControl<PricingMode>('fixed', { nonNullable: true }),
    priceTnd: new FormControl('', { nonNullable: true }),
    promoPriceTnd: new FormControl('', { nonNullable: true }),
    unitPriceTnd: new FormControl('', { nonNullable: true }),
    minPriceTnd: new FormControl('', { nonNullable: true }),
    promoPercent: new FormControl('', { nonNullable: true }),
    minWidthCm: new FormControl('', { nonNullable: true }),
    maxWidthCm: new FormControl('', { nonNullable: true }),
    minHeightCm: new FormControl('', { nonNullable: true }),
    maxHeightCm: new FormControl('', { nonNullable: true }),
    minBillableArea: new FormControl('', { nonNullable: true }),
    /** FormArray : une liste de taille variable de petits formulaires (les options du sur-mesure) */
    options: new FormArray<ReturnType<typeof optionGroup>>([]),
    availability: new FormControl<Availability>('in_stock', { nonNullable: true }),
    stock: new FormControl('1', { nonNullable: true }),
    sku: new FormControl('', { nonNullable: true }),
    /** Groupe imbriqué : une liste de valeurs par type de variante */
    variants: new FormGroup({
      dimensions: new FormControl<string[]>([], { nonNullable: true }),
      colors: new FormControl<string[]>([], { nonNullable: true }),
      materials: new FormControl<string[]>([], { nonNullable: true }),
      models: new FormControl<string[]>([], { nonNullable: true }),
    }),
    delivery: new FormControl('', { nonNullable: true }),
    preparationTime: new FormControl('', { nonNullable: true }),
    extraInfo: new FormControl('', { nonNullable: true }),
    videoUrl: new FormControl('', { nonNullable: true }),
  });
  readonly options = this.form.controls.options;

  /** Toutes les valeurs du formulaire en signal (aperçu du prix, compteur de caractères…) */
  readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly custom = computed(() => this.values().pricingMode !== 'fixed');
  readonly mode = computed(() => (this.custom() ? (this.values().pricingMode as CustomPricingMode) : null));
  readonly unit = computed(() => (this.mode() ? unitLabel(this.mode()!) : ''));

  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly loadError = signal('');
  readonly productName = signal('');
  readonly productStatus = signal<string | null>(null);
  readonly requiresApproval = signal(false);
  readonly images = signal<ImageItem[]>([]);
  readonly video = signal<VideoItem | null>(null);
  readonly variantDrafts = signal<Record<VariantKey, string>>({ dimensions: '', colors: '', materials: '', models: '' });
  readonly errors = signal<Record<string, string>>({});
  readonly formError = signal('');
  readonly saving = signal(false);
  readonly notice = signal('');

  readonly uploading = computed(() => this.images().some((i) => i.progress !== undefined) || this.video()?.progress !== undefined);
  readonly errorList = computed(() => Object.values(this.errors()));

  /** Aperçu en direct : un exemple 100 × 100 cm calculé par la MÊME fonction que le serveur */
  readonly example = computed(() => {
    const mode = this.mode();
    if (!mode) return null;
    // values() est un signal : le computed est recalculé à chaque frappe dans le formulaire
    // (lire this.form directement ne créerait PAS de dépendance et l'aperçu resterait figé)
    this.values();
    const p = this.pricingPayload();
    return {
      label: mode === 'per_m2' ? '100 × 100 cm' : '100 cm',
      result: computeCustomPrice({ ...p, mode, unitPriceTnd: p.unitPriceTnd }, { widthCm: 100, heightCm: 100 }, []),
    };
  });

  /** Lien YouTube / Vimeo transformé en adresse d'intégration sûre (fonction partagée) */
  readonly embedUrl = computed(() => {
    const url = this.values().videoUrl?.trim();
    const embed = url ? toVideoEmbedUrl(url) : null;
    // L'adresse vient de toVideoEmbedUrl, qui n'accepte que youtube-nocookie.com et player.vimeo.com en https
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });

  ngOnInit() {
    this.vendor.requiresApproval().then((v) => this.requiresApproval.set(v)).catch(() => undefined);
    const id = this.productId();
    if (id) void this.load(id);
    else this.status.set('ok');
    // Le message d'erreur d'un champ disparaît dès qu'il est modifié
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (Object.keys(this.errors()).length) this.errors.set({});
    });
  }

  private async load(productId: number) {
    try {
      const p = await this.vendor.product(productId);
      this.productName.set(p.name);
      this.productStatus.set(p.status);
      this.options.clear();
      for (const o of p.options) this.options.push(optionGroup(o.name, o.surchargeType, text(o.amountTnd)));
      this.form.patchValue({
        name: p.name, description: p.description ?? '', shopCategoryId: p.shopCategoryId ?? null, pricingMode: p.pricingMode,
        priceTnd: String(p.priceTnd), promoPriceTnd: p.promoPriceTnd != null ? String(p.promoPriceTnd) : '',
        unitPriceTnd: text(p.unitPriceTnd), minPriceTnd: text(p.minPriceTnd), promoPercent: text(p.promoPercent),
        minWidthCm: text(p.minWidthCm), maxWidthCm: text(p.maxWidthCm), minHeightCm: text(p.minHeightCm), maxHeightCm: text(p.maxHeightCm),
        minBillableArea: text(p.minBillableArea), availability: p.availability, stock: p.stock != null ? String(p.stock) : '', sku: p.sku ?? '',
        variants: p.variants, delivery: p.delivery ?? '', preparationTime: p.preparationTime ?? '', extraInfo: p.extraInfo ?? '', videoUrl: p.videoUrl ?? '',
      });
      this.images.set(p.images.map((img) => ({ key: `m${img.id}`, mediaId: img.id, url: img.url, isPrimary: img.isPrimary, attached: true })));
      this.video.set(p.video ? { mediaId: p.video.id, url: p.video.url, attached: true } : null);
      this.status.set('ok');
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Produit introuvable');
      this.status.set('error');
    }
  }

  // ----- Type de prix et options (FormArray) -----
  setPricingMode(mode: PricingMode) {
    this.form.controls.pricingMode.setValue(mode);
  }

  addOption() {
    if (this.options.length < MAX_PRODUCT_OPTIONS) this.options.push(optionGroup());
  }

  removeOption(index: number) {
    this.options.removeAt(index);
  }

  // ----- Variantes -----
  setVariantDraft(key: VariantKey, value: string) {
    this.variantDrafts.update((d) => ({ ...d, [key]: value }));
  }

  addVariant(key: VariantKey) {
    const value = this.variantDrafts()[key].trim().slice(0, 64);
    const control = this.form.controls.variants.controls[key];
    if (value && !control.value.includes(value) && control.value.length < 20) control.setValue([...control.value, value]);
    this.setVariantDraft(key, '');
  }

  removeVariant(key: VariantKey, value: string) {
    const control = this.form.controls.variants.controls[key];
    control.setValue(control.value.filter((v) => v !== value));
  }

  // ----- Photos (envoi avec progression) -----
  onImageFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.addImageFiles(files);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.addImageFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private addImageFiles(files: File[]) {
    this.notice.set('');
    const room = MAX_PRODUCT_IMAGES - this.images().length;
    if (room <= 0) return this.notice.set(`${MAX_PRODUCT_IMAGES} photos maximum par produit.`);
    if (files.length > room) this.notice.set(`Seules ${room} photo(s) supplémentaire(s) ont été prises en compte (${MAX_PRODUCT_IMAGES} maximum).`);
    for (const file of files.slice(0, room)) {
      const problem = this.uploads.check(file, 'image');
      if (problem) {
        this.notice.set(problem);
        continue;
      }
      const key = `u${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
      const preview = URL.createObjectURL(file);
      this.images.update((list) => [...list, { key, url: preview, isPrimary: list.length === 0, attached: false, progress: 0 }]);
      this.send(file, 'image', {
        progress: (percent) => this.updateImage(key, { progress: percent }),
        done: (media) => this.updateImage(key, { mediaId: media.id, url: media.url, progress: undefined }),
        failed: (message) => this.updateImage(key, { error: message, progress: undefined }),
        always: () => URL.revokeObjectURL(preview),
      });
    }
  }

  private updateImage(key: string, patch: Partial<ImageItem>) {
    this.images.update((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  /** Envoie un fichier et suit sa progression (Observable de MediaUploadService) */
  private send(file: File, kind: MediaKind, on: { progress: (p: number) => void; done: (m: { id: number; url: string }) => void; failed: (message: string) => void; always: () => void }) {
    this.uploads.upload(file, kind).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (event) => (event.type === 'progress' ? on.progress(event.percent) : on.done(event.media)),
      error: (error: Error) => { on.failed(error.message); on.always(); },
      complete: () => on.always(),
    });
  }

  removeImage(key: string) {
    const target = this.images().find((i) => i.key === key);
    // Fichier envoyé mais pas encore rattaché au produit : supprimé tout de suite du serveur
    if (target?.mediaId && !target.attached) void this.vendor.deleteMedia(target.mediaId).catch(() => undefined);
    const next = this.images().filter((i) => i.key !== key);
    if (target?.isPrimary && next[0]) next[0] = { ...next[0], isPrimary: true };
    this.images.set(next);
  }

  setPrimary(key: string) {
    this.images.update((list) => list.map((i) => ({ ...i, isPrimary: i.key === key })));
  }

  move(from: number, to: number) {
    this.images.update((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  // ----- Vidéo -----
  onVideoFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const problem = this.uploads.check(file, 'video');
    if (problem) return this.notice.set(problem);
    const previous = this.video();
    const preview = URL.createObjectURL(file);
    this.video.set({ url: preview, attached: false, progress: 0 });
    this.send(file, 'video', {
      progress: (percent) => this.video.update((v) => (v ? { ...v, progress: percent } : v)),
      done: (media) => {
        this.video.set({ mediaId: media.id, url: media.url, attached: false });
        if (previous?.mediaId && !previous.attached) void this.vendor.deleteMedia(previous.mediaId).catch(() => undefined);
      },
      failed: (message) => { this.video.set(previous); this.notice.set(message); },
      always: () => URL.revokeObjectURL(preview),
    });
  }

  removeVideo() {
    const v = this.video();
    if (v?.mediaId && !v.attached) void this.vendor.deleteMedia(v.mediaId).catch(() => undefined);
    this.video.set(null);
  }

  // ----- Enregistrement -----
  /** Valeurs du sur-mesure envoyées au serveur (qui revalide tout) */
  private pricingPayload() {
    const v = this.form.getRawValue();
    const num = (s: string) => parseDecimal(s);
    return {
      pricingMode: v.pricingMode,
      unitPriceTnd: num(v.unitPriceTnd),
      minWidthCm: num(v.minWidthCm),
      maxWidthCm: num(v.maxWidthCm),
      minHeightCm: v.pricingMode === 'per_m2' ? num(v.minHeightCm) : null,
      maxHeightCm: v.pricingMode === 'per_m2' ? num(v.maxHeightCm) : null,
      minBillableArea: num(v.minBillableArea),
      minPriceTnd: num(v.minPriceTnd),
      promoPercent: num(v.promoPercent),
      options: v.pricingMode === 'fixed' ? [] : v.options.map((o) => ({ name: o.name, surchargeType: o.surchargeType, amountTnd: num(o.amountTnd) ?? Number.NaN })),
    };
  }

  async submit(action: 'draft' | 'publish') {
    this.formError.set('');
    if (this.uploading()) return this.formError.set("Patientez jusqu'à la fin de l'envoi des fichiers.");
    if (this.images().some((i) => i.error)) return this.formError.set("Retirez les photos dont l'envoi a échoué avant d'enregistrer.");
    const v = this.form.getRawValue();
    const custom = v.pricingMode !== 'fixed';
    const pricing = this.pricingPayload();
    const payload = {
      productId: this.productId(),
      name: v.name,
      description: v.description,
      shopCategoryId: v.shopCategoryId,
      // Sur mesure : le serveur reprend le prix unitaire comme prix catalogue (« à partir de … »)
      priceTnd: custom ? pricing.unitPriceTnd ?? Number.NaN : parseDecimal(v.priceTnd) ?? Number.NaN,
      promoPriceTnd: !custom && v.promoPriceTnd.trim() ? parseDecimal(v.promoPriceTnd) : null,
      ...pricing,
      availability: v.availability,
      stock: v.stock.trim() === '' ? null : Number(v.stock),
      sku: v.sku,
      variants: v.variants,
      delivery: v.delivery,
      preparationTime: v.preparationTime,
      extraInfo: v.extraInfo,
      images: this.images().filter((i) => i.mediaId).map((i) => ({ mediaId: i.mediaId!, isPrimary: i.isPrimary })),
      videoMediaId: this.video()?.mediaId ?? null,
      videoUrl: v.videoUrl.trim() || null,
      action,
    };
    // Même schéma que le serveur : mêmes règles, mêmes messages
    const parsed = productInputSchema.safeParse(payload);
    if (!parsed.success) {
      this.errors.set(fieldErrors(parsed.error));
      this.formError.set('Certains champs sont à corriger.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.saving.set(true);
    try {
      const result = await this.vendor.saveProduct(parsed.data as ProductInput);
      const message = result.status === 'published' ? 'Produit publié : il est visible dans le catalogue.'
        : result.status === 'pending' ? "Produit envoyé en validation : il sera visible après approbation de l'administration."
        : 'Brouillon enregistré (non visible publiquement).';
      await this.state.reload();
      await this.router.navigate(['/espace-vendeur/produits'], { state: { message } });
    } catch (error) {
      const data = error instanceof TRPCClientError ? (error.data as { fieldErrors?: Record<string, string> | null } | undefined) : undefined;
      if (data?.fieldErrors) this.errors.set(data.fieldErrors);
      this.formError.set(error instanceof Error ? error.message : 'Enregistrement impossible');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      this.saving.set(false);
    }
  }

  area(value: number) {
    return formatArea(value, this.mode()!);
  }
}
