import { ChangeDetectionStrategy, Component, DOCUMENT, computed, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  NEON_COLORS, NEON_FONTS, NEON_MAX_CHARS_PER_LINE, NEON_MAX_LINES, NEON_PRODUCT_NAME, NEON_PRODUCT_SLUG, NEON_SUPPORTS,
  analyzeNeonText, computeNeonPrice, describeNeonLine, describeProductionDays, estimateNeonHeight, fontsForScript, neonColor, neonFont,
  type NeonLineRequest, type NeonScript,
} from '@shared/neon';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { NeonService, NeonWorkshop } from '../../core/services/neon.service';
import { animatedNumber } from '../../shared/animated-number';
import { NEON_BACKGROUNDS, NEON_BACKGROUND_LABELS, NeonBackground, NeonTextComponent, loadNeonFonts } from '../../shared/components/neon/neon-text.component';
import { ShopLogoComponent } from '../../shared/components/shop-logo/shop-logo.component';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { NeonQuoteDialogComponent } from './neon-quote-dialog.component';

const HARAKAT = /[ً-ٰٟۖ-ۭ]/;

/**
 * /neon/:slug : configurateur d'UN atelier (ses tailles, prix, couleurs, supports, arabe accepté ou non).
 * Aperçu lumineux en direct (CSS), texte latin OU arabe (de droite à gauche).
 * Le prix affiché est une ESTIMATION faite avec la fonction partagée computeNeonPrice (importée de shared/) ;
 * à l'ajout au panier, le serveur le recalcule (catalog.quoteCart) et c'est son prix qui est enregistré.
 */
@Component({
  selector: 'app-neon-configurator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PrixDtPipe, NeonTextComponent, ShopLogoComponent, NeonQuoteDialogComponent],
  templateUrl: './neon-configurator.page.html',
  styleUrl: './neon-configurator.page.css',
})
export class NeonConfiguratorPage {
  private readonly neon = inject(NeonService);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Paramètre de route /neon/:slug (withComponentInputBinding) */
  readonly slug = input.required<string>();

  readonly status = signal<'loading' | 'ok' | 'unavailable' | 'error'>('loading');
  readonly workshop = signal<NeonWorkshop | null>(null);
  readonly offer = computed(() => this.workshop()?.offer ?? null);

  // Listes fixes, importées de shared/neon
  readonly colors = computed(() => NEON_COLORS.filter((c) => this.offer()?.colors.includes(c.key)));
  readonly maxChars = NEON_MAX_CHARS_PER_LINE;
  readonly backgrounds = Object.keys(NEON_BACKGROUNDS) as NeonBackground[];
  readonly backgroundStyles = NEON_BACKGROUNDS;
  readonly backgroundLabels = NEON_BACKGROUND_LABELS;

  // ===================== Choix du client =====================
  readonly text = signal('Bienvenue');
  readonly analysis = computed(() => analyzeNeonText(this.text()));
  /** Écriture détectée : arabe dès qu'une lettre arabe est tapée, même si le texte n'est pas encore valide */
  readonly script = computed<NeonScript>(() => {
    const a = this.analysis();
    return a.ok ? a.script : /[؀-ۿ]/.test(this.text()) ? 'arabic' : 'latin';
  });
  readonly fonts = computed(() => fontsForScript(this.script()));

  /**
   * linkedSignal : une valeur que le client peut changer (.set) MAIS qui est recalculée quand sa source change.
   * Police : si l'écriture change (latin → arabe), on passe à la première police de cette écriture.
   */
  readonly fontKey = linkedSignal<NeonScript, string>({
    source: this.script,
    computation: (script, previous) => {
      const current = previous?.value ?? 'pacifico';
      return neonFont(current)?.script === script ? current : fontsForScript(script)[0].key;
    },
  });
  /** Couleur, taille, support : si l'atelier ne propose pas le choix actuel, on prend le sien */
  readonly colorKey = linkedSignal<NeonWorkshop['offer'] | null, string>({
    source: this.offer,
    computation: (offer, previous) => {
      const current = previous?.value ?? 'pink';
      return !offer || offer.colors.includes(current as never) ? current : offer.colors[0];
    },
  });
  readonly sizeCode = linkedSignal<NeonWorkshop['offer'] | null, string>({
    source: this.offer,
    computation: (offer, previous) => {
      if (!offer) return '';
      return offer.sizes.some((s) => s.code === previous?.value) ? previous!.value : offer.sizes[Math.min(1, offer.sizes.length - 1)].code;
    },
  });
  readonly supportCode = linkedSignal<NeonWorkshop['offer'] | null, string>({
    source: this.offer,
    computation: (offer, previous) => {
      if (!offer) return '';
      return offer.supports.some((s) => s.code === previous?.value) ? previous!.value : offer.supports[0].code;
    },
  });
  readonly outdoor = linkedSignal<NeonWorkshop['offer'] | null, boolean>({
    source: this.offer,
    computation: (offer, previous) => Boolean(previous?.value && offer?.outdoorEnabled),
  });
  readonly background = signal<NeonBackground>('dark');

  // ===================== Valeurs dérivées =====================
  readonly request = computed<NeonLineRequest>(() => ({
    text: this.text(), font: this.fontKey(), color: this.colorKey(), size: this.sizeCode(), support: this.supportCode(), outdoor: this.outdoor(),
  }));
  /** Estimation : même fonction que le serveur (shared/neon.ts), recalculée à chaque frappe */
  readonly priced = computed(() => {
    const offer = this.offer();
    return offer ? computeNeonPrice(offer, this.request()) : null;
  });
  readonly pricedOk = computed(() => {
    const p = this.priced();
    return p?.ok ? p : null;
  });
  readonly pricedError = computed(() => {
    const p = this.priced();
    return p && !p.ok ? p.error : null;
  });
  readonly animatedTotal = animatedNumber(computed(() => this.pricedOk()?.priceTnd ?? null));
  readonly delay = computed(() => {
    const p = this.pricedOk();
    return p ? describeProductionDays(p.productionDays) : null;
  });

  readonly color = computed(() => neonColor(this.colorKey()) ?? NEON_COLORS[2]);
  readonly size = computed(() => this.offer()?.sizes.find((s) => s.code === this.sizeCode()) ?? null);
  readonly heightCm = computed(() => {
    const a = this.analysis();
    const size = this.size();
    return size && a.ok ? estimateNeonHeight(size.widthCm, a.lines.length, a.longestLine) : null;
  });
  /** Texte affiché dans l'aperçu (nettoyé quand il est valide) */
  readonly previewText = computed(() => {
    const a = this.analysis();
    return a.ok ? a.text : this.text().trim() || ' ';
  });
  /** « L1 : 9/25 · L2 : 4/25 » (harakat non comptés, comme le serveur) */
  readonly lineLengths = computed(() =>
    this.text().split('\n').slice(0, NEON_MAX_LINES)
      .map((line, i) => `L${i + 1} : ${Array.from(line.trim()).filter((ch) => !HARAKAT.test(ch)).length}/${NEON_MAX_CHARS_PER_LINE}`)
      .join(' · '),
  );
  readonly lettersInfo = computed(() => {
    const a = this.analysis();
    const offer = this.offer();
    const letters = a.ok ? `${a.letters} lettre${a.letters > 1 ? 's' : ''}${offer ? ` · ${offer.includedLetters} incluses` : ''}` : '';
    return letters + (this.script() === 'arabic' ? ' · arabe, de droite à gauche' : '');
  });
  readonly textError = computed(() => {
    const a = this.analysis();
    return !a.ok && this.text().trim() !== '' ? a.error : null;
  });
  readonly arabicRefused = computed(() => this.analysis().ok && this.script() === 'arabic' && !!this.offer() && !this.offer()!.arabicEnabled);
  /** Rejoue l'allumage quand la police ou la couleur change : l'élément est recréé (voir le gabarit) */
  readonly replayKey = computed(() => `${this.fontKey()}-${this.colorKey()}`);

  // ===================== Panier et devis =====================
  readonly adding = signal(false);
  readonly cartMessage = signal<{ ok: boolean; text: string } | null>(null);
  readonly quoteOpen = signal(false);
  readonly isClient = this.auth.isCustomer;
  readonly sizeCodes = computed(() => this.offer()?.sizes.map((s) => s.code) ?? []);

  constructor() {
    // Toutes les polices néon (OFL) pour les boutons « Police » ; chargées par cette page seulement
    loadNeonFonts(inject(DOCUMENT), NEON_FONTS.map((f) => f.key));
    // Nouvel atelier (/neon/a → /neon/b) : on recharge
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.load(slug));
    });
    // Un nouveau choix efface l'ancien message du panier
    effect(() => {
      this.request();
      untracked(() => this.cartMessage.set(null));
    });
  }

  async load(slug = this.slug()) {
    this.status.set('loading');
    try {
      const workshop = await this.neon.workshop(slug);
      this.workshop.set(workshop);
      this.status.set(workshop ? 'ok' : 'unavailable');
    } catch {
      this.status.set('error');
    }
  }

  /** Saisie : 3 lignes au maximum (les lignes en trop sont coupées tout de suite, comme sur le site React) */
  onText(area: HTMLTextAreaElement) {
    const value = area.value.split('\n').slice(0, NEON_MAX_LINES).join('\n');
    if (value !== area.value) area.value = value;
    this.text.set(value);
  }

  supportName(code: string) {
    return NEON_SUPPORTS.find((s) => s.code === code)?.name ?? code;
  }

  /** Le prix enregistré est celui du SERVEUR (catalog.quoteCart), jamais l'estimation du navigateur */
  async addToCart() {
    const workshop = this.workshop();
    const priced = this.pricedOk();
    if (!workshop || !priced) return;
    const request = { ...this.request(), text: priced.text };
    this.adding.set(true);
    try {
      const line = await this.neon.confirmPrice(workshop.shopSlug, request);
      if (!line?.available || !line.neon) {
        this.cartMessage.set({ ok: false, text: line?.problem ?? "Ce néon ne peut pas être ajouté au panier." });
        return;
      }
      const server = line.neon;
      this.cart.add(
        { slug: NEON_PRODUCT_SLUG, name: NEON_PRODUCT_NAME, shopSlug: workshop.shopSlug, shopName: workshop.shopName, price: `${line.unitPriceTnd.toFixed(2)} TND`, image: '' },
        1,
        {
          neon: { shopSlug: workshop.shopSlug, ...request },
          customSummary: describeNeonLine({ text: server.text, fontName: server.font.name, colorName: server.color.name, size: server.size.code, widthCm: server.size.widthCm, supportName: server.support.name, outdoor: server.outdoor }),
        },
      );
      this.cartMessage.set({ ok: true, text: `Néon ajouté au panier · ${workshop.shopName} · ${line.unitPriceTnd.toFixed(2).replace('.', ',')} DT` });
    } catch {
      this.cartMessage.set({ ok: false, text: "Le prix n'a pas pu être vérifié. Réessayez." });
    } finally {
      this.adding.set(false);
    }
  }

  /** Devis : réservé aux comptes connectés (un visiteur passe par la connexion, puis revient ici) */
  openQuote() {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/connexion'], { queryParams: { retour: `/neon/${this.slug()}` } });
      return;
    }
    this.quoteOpen.set(true);
  }
}
