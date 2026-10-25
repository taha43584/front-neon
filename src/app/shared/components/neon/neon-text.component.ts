import { ChangeDetectionStrategy, Component, DOCUMENT, computed, effect, inject, input } from '@angular/core';
import { neonFont, neonFontsStylesheet, type NeonScript } from '@shared/neon';

/** Halo lumineux autour d'une couleur (#RRGGBB), comme le site React */
export function neonGlow(hex: string, strength = 1) {
  const s = (px: number) => `${Math.round(px * strength)}px`;
  return `0 0 ${s(3)} #fff, 0 0 ${s(8)} ${hex}, 0 0 ${s(18)} ${hex}, 0 0 ${s(36)} ${hex}, 0 0 ${s(64)} ${hex}`;
}

export type NeonBackground = 'dark' | 'brick' | 'light';

/** Fonds de l'aperçu (dégradés CSS, aucune image) : propriété CSS « background » complète */
export const NEON_BACKGROUNDS: Record<NeonBackground, string> = {
  dark: 'radial-gradient(circle at 50% 40%, #3a302b 0%, #1a1513 75%)',
  // Brique : 5 couches de dégradés (joints horizontaux et verticaux décalés d'une rangée sur l'autre)
  brick: [
    'linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)) 0 0 / 100% 100%',
    'linear-gradient(335deg, rgba(0,0,0,.18) 23px, transparent 23px) 0 0 / 58px 58px',
    'linear-gradient(155deg, rgba(255,255,255,.04) 23px, transparent 23px) 0 0 / 58px 58px',
    'linear-gradient(#3b1d17 2px, transparent 2px) 0 0 / 58px 29px',
    'linear-gradient(90deg, #3b1d17 2px, transparent 2px) 29px 29px / 58px 58px',
    '#5b2c22',
  ].join(', '),
  light: 'radial-gradient(circle at 50% 40%, #f4efe9 0%, #ddd3c8 80%)',
};
export const NEON_BACKGROUND_LABELS: Record<NeonBackground, string> = { dark: 'Mur sombre', brick: 'Brique', light: 'Mur clair' };

/** Ajoute UNE fois la feuille Google Fonts (OFL) des polices demandées ; seules les pages néon la chargent */
export function loadNeonFonts(document: Document, keys: readonly string[]) {
  const href = neonFontsStylesheet(keys);
  if (!href || document.querySelector(`link[data-neon-fonts="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset['neonFonts'] = href;
  document.head.appendChild(link);
}

/**
 * Texte néon lumineux (text-shadow), de droite à gauche pour l'arabe.
 * La police n'est chargée que par les pages qui affichent un néon, une seule fois.
 */
@Component({
  selector: 'app-neon-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="neon" [attr.dir]="script() === 'arabic' ? 'rtl' : 'ltr'" [attr.lang]="script() === 'arabic' ? 'ar' : null"
      [style.font-family]="family()" [style.font-size]="fontSize()" [style.color]="lit() ? '#fff' : colorHex()"
      [style.text-shadow]="lit() ? glow() : 'none'" [style.opacity]="lit() ? 1 : 0.35">
      @for (line of lines(); track $index) { <div>{{ line || ' ' }}</div> }
    </div>
  `,
  styles: `.neon { line-height: 1.25; text-align: center; white-space: pre; }`,
})
export class NeonTextComponent {
  private readonly document = inject(DOCUMENT);

  readonly text = input.required<string>();
  readonly fontKey = input.required<string>();
  readonly colorHex = input.required<string>();
  readonly script = input<NeonScript>('latin');
  /** Taille du texte : nombre = pixels, ou valeur CSS (« clamp(1.8rem, 7vw, 5.5rem) ») */
  readonly size = input<number | string>(36);
  readonly lit = input(true);

  readonly family = computed(() => neonFont(this.fontKey())?.family ?? null);
  readonly fontSize = computed(() => (typeof this.size() === 'number' ? `${this.size()}px` : (this.size() as string)));
  readonly glow = computed(() => neonGlow(this.colorHex()));
  readonly lines = computed(() => this.text().split('\n'));

  constructor() {
    effect(() => loadNeonFonts(this.document, [this.fontKey()]));
  }
}
