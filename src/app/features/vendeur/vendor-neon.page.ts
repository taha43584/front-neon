import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
// Couleurs, supports, tailles par défaut et schéma de l'offre : partagés avec le serveur (qui revalide tout)
import { DEFAULT_NEON_SIZES, NEON_COLORS, NEON_SUPPORTS, neonOfferSchema, type NeonOffer } from '@shared/neon';
import { QuoteStatus, VendorNeonOffer, VendorNeonQuote, VendorService } from '../../core/services/vendor.service';
import { NEON_BACKGROUNDS, NeonTextComponent } from '../../shared/components/neon/neon-text.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

type SupportCode = (typeof NEON_SUPPORTS)[number]['code'];

const str = (value: string | number | null | undefined = '') => new FormControl(value === null ? '' : String(value), { nonNullable: true });
const bool = (value: boolean) => new FormControl(value, { nonNullable: true });
/** Champ texte → nombre (virgule acceptée) ; vide → NaN, que le schéma partagé refuse avec un message clair */
const num = (value: string) => (value.trim() === '' ? Number.NaN : Number(value.replace(',', '.')));
const optionalNum = (value: string) => (value.trim() === '' ? null : num(value));

const sizeGroup = (code = '', widthCm = '', priceTnd = '') => new FormGroup({ code: str(code), widthCm: str(widthCm), priceTnd: str(priceTnd) });

export const QUOTE_STATUS: Record<QuoteStatus, string> = { new: 'Nouvelle', seen: 'Vue', answered: 'Répondue', closed: 'Clôturée' };

/**
 * Néon personnalisé : réglages de l'atelier (tailles et prix, lettres, couleurs, supports, extérieur, arabe, délai),
 * encadré de visibilité sur /neon (calculé par le serveur) et demandes de devis reçues.
 * La boutique vient toujours de la session (serveur).
 */
@Component({
  selector: 'app-vendor-neon-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, NeonTextComponent, IconComponent],
  templateUrl: './vendor-neon.page.html',
  styleUrls: ['./vendor-pages.css', './vendor-neon.page.css'],
})
export class VendorNeonPage implements OnInit {
  private readonly vendor = inject(VendorService);

  readonly colors = NEON_COLORS;
  readonly supportNames = Object.fromEntries(NEON_SUPPORTS.map((s) => [s.code, s.name])) as Record<SupportCode, string>;
  readonly quoteStatuses = Object.entries(QUOTE_STATUS);
  readonly background = NEON_BACKGROUNDS.dark;
  readonly maxSizes = 8;

  readonly form = new FormGroup({
    enabled: bool(false),
    // FormArray : le vendeur ajoute ou retire des tailles (1 à 8)
    sizes: new FormArray(DEFAULT_NEON_SIZES.map((s) => sizeGroup(s.code, String(s.widthCm)))),
    includedLetters: str('10'),
    extraLetterPriceTnd: str('0'),
    colors: new FormControl<string[]>([], { nonNullable: true }),
    // Un groupe par support connu, dans le même ordre que shared/neon
    supports: new FormArray(NEON_SUPPORTS.map((s) => new FormGroup({ code: new FormControl<SupportCode>(s.code, { nonNullable: true }), enabled: bool(false), surchargeTnd: str('0') }))),
    outdoorEnabled: bool(false),
    outdoorSurchargeType: new FormControl<'percent' | 'fixed'>('percent', { nonNullable: true }),
    outdoorSurchargeValue: str('0'),
    arabicEnabled: bool(false),
    productionDaysMin: str(),
    productionDaysMax: str(),
  });
  get sizes() { return this.form.controls.sizes; }
  get supports() { return this.form.controls.supports; }

  readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  /** Couleur de l'aperçu : la première couleur cochée (blanc chaud par défaut) */
  readonly previewColor = computed(() => NEON_COLORS.find((c) => (this.values().colors ?? []).includes(c.key))?.hex ?? '#FFE9C7');

  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly data = signal<VendorNeonOffer | null>(null);
  readonly quotes = signal<VendorNeonQuote[]>([]);
  readonly saving = signal(false);
  /** Toutes les erreurs du formulaire (pas seulement la première) */
  readonly errors = signal<string[]>([]);
  readonly saved = signal<{ visible: boolean } | null>(null);

  constructor() {
    this.form.valueChanges.subscribe(() => {
      if (this.errors().length) this.errors.set([]);
    });
  }

  async ngOnInit() {
    try {
      const [offer, quotes] = await Promise.all([this.vendor.neonOffer(), this.vendor.neonQuotes()]);
      this.data.set(offer);
      this.quotes.set(quotes);
      if (offer.offer) this.fill(offer.offer);
      this.status.set('ok');
    } catch {
      this.status.set('error');
    }
  }

  /** Offre enregistrée → formulaire (les nombres deviennent du texte modifiable) */
  private fill(offer: NeonOffer) {
    this.sizes.clear();
    for (const s of offer.sizes) this.sizes.push(sizeGroup(s.code, String(s.widthCm), String(s.priceTnd)));
    this.supports.controls.forEach((group) => {
      const found = offer.supports.find((s) => s.code === group.controls.code.value);
      group.patchValue({ enabled: !!found, surchargeTnd: found ? String(found.surchargeTnd) : '0' });
    });
    this.form.patchValue({
      enabled: offer.enabled, includedLetters: String(offer.includedLetters), extraLetterPriceTnd: String(offer.extraLetterPriceTnd),
      colors: [...offer.colors], outdoorEnabled: offer.outdoorEnabled, outdoorSurchargeType: offer.outdoorSurchargeType,
      outdoorSurchargeValue: String(offer.outdoorSurchargeValue), arabicEnabled: offer.arabicEnabled,
      productionDaysMin: offer.productionDaysMin === null ? '' : String(offer.productionDaysMin),
      productionDaysMax: offer.productionDaysMax === null ? '' : String(offer.productionDaysMax),
    });
  }

  addSize() {
    if (this.sizes.length < this.maxSizes) this.sizes.push(sizeGroup());
  }

  removeSize(index: number) {
    if (this.sizes.length > 1) this.sizes.removeAt(index);
  }

  upperCode(index: number) {
    const control = this.sizes.at(index).controls.code;
    control.setValue(control.value.toUpperCase(), { emitEvent: false });
  }

  hasColor(key: string) {
    return (this.values().colors ?? []).includes(key);
  }

  toggleColor(key: string) {
    const control = this.form.controls.colors;
    control.setValue(control.value.includes(key) ? control.value.filter((k) => k !== key) : [...control.value, key]);
  }

  async save() {
    const v = this.form.getRawValue();
    // Même schéma que le serveur : mêmes règles, mêmes messages
    const parsed = neonOfferSchema.safeParse({
      ...v,
      sizes: v.sizes.map((s) => ({ code: s.code.trim().toUpperCase(), widthCm: num(s.widthCm), priceTnd: num(s.priceTnd) })),
      includedLetters: num(v.includedLetters),
      extraLetterPriceTnd: num(v.extraLetterPriceTnd),
      supports: v.supports.filter((s) => s.enabled).map((s) => ({ code: s.code, surchargeTnd: num(s.surchargeTnd) })),
      outdoorSurchargeValue: num(v.outdoorSurchargeValue),
      productionDaysMin: optionalNum(v.productionDaysMin),
      productionDaysMax: optionalNum(v.productionDaysMax),
    });
    this.saved.set(null);
    if (!parsed.success) {
      this.errors.set(Array.from(new Set(parsed.error.issues.map((i) => i.message))));
      return;
    }
    this.saving.set(true);
    try {
      await this.vendor.saveNeonOffer(parsed.data);
      // L'état de visibilité sur /neon vient du serveur
      const fresh = await this.vendor.neonOffer();
      this.data.set(fresh);
      this.saved.set({ visible: fresh.visibility.visible });
    } catch (error) {
      this.errors.set([error instanceof Error ? error.message : 'Enregistrement impossible']);
    } finally {
      this.saving.set(false);
    }
  }

  async setQuoteStatus(quote: VendorNeonQuote, event: Event) {
    const select = event.target as HTMLSelectElement;
    try {
      await this.vendor.setQuoteStatus(quote.id, select.value as QuoteStatus);
      this.quotes.set(await this.vendor.neonQuotes());
    } catch {
      select.value = quote.status;
    }
  }

  quoteDetails(q: VendorNeonQuote) {
    return [q.clientEmail, q.phone, q.sizeCode && `Taille ${q.sizeCode}`, q.outdoor ? 'Extérieur' : null].filter(Boolean).join(' · ');
  }
}
