import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { NeonScript } from '@shared/neon';
import { NEON_BACKGROUNDS, NeonTextComponent } from './neon-text.component';

/** Néon tel qu'il a été commandé (valeurs FIGÉES dans la ligne de commande) */
export interface OrderedNeon {
  text: string; script: NeonScript; fontKey: string; fontName: string; colorName: string; colorHex: string;
  size: string; widthCm: number | null; heightCm: number | null; supportName: string; outdoor: boolean;
}

/** Aperçu compact d'un néon commandé (commandes du vendeur ; plus tard admin et client) */
@Component({
  selector: 'app-neon-order-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NeonTextComponent],
  template: `
    @let n = neon();
    <div class="apercu" data-testid="neon-order-preview">
      <div class="mur" [style.background]="background">
        <app-neon-text [text]="n.text" [fontKey]="n.fontKey" [colorHex]="n.colorHex" [script]="n.script" [size]="26" />
      </div>
      <dl>
        <div><dt>Texte :</dt> <dd dir="auto" class="multi">{{ n.text }}</dd></div>
        <div><dt>Police :</dt> <dd>{{ n.fontName }}</dd></div>
        <div><dt>Couleur :</dt> <dd><span class="puce-couleur" [style.background]="n.colorHex" aria-hidden="true"></span>{{ n.colorName }} <span class="hex">({{ n.colorHex }})</span></dd></div>
        <div><dt>Taille :</dt> <dd>{{ n.size }}@if (n.widthCm) { · {{ n.widthCm }}@if (n.heightCm) { × ≈{{ n.heightCm }}} cm }</dd></div>
        <div><dt>Support :</dt> <dd>{{ n.supportName }}</dd></div>
        <div><dt>Usage :</dt> <dd>{{ n.outdoor ? 'Extérieur' : 'Intérieur' }}</dd></div>
      </dl>
    </div>
  `,
  styles: `
    .apercu { overflow: hidden; margin-top: 8px; border: 1px solid #e6ddd2; border-radius: 16px; }
    .mur { display: flex; min-height: 110px; align-items: center; justify-content: center; padding: 20px 16px; }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin: 0; padding: 12px; background: var(--carte); color: var(--texte-secondaire); font-size: 12px; }
    dt { display: inline; }
    dd { display: inline; margin: 0 0 0 4px; color: #2a2420; font-weight: 600; }
    .multi { white-space: pre-line; }
    .puce-couleur { display: inline-block; width: 12px; height: 12px; margin-right: 4px; border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 999px; vertical-align: -1px; }
    .hex { color: #6b625b; font-weight: 400; }
    @media (min-width: 640px) { dl { grid-template-columns: repeat(3, 1fr); } }
  `,
})
export class NeonOrderPreviewComponent {
  readonly neon = input.required<OrderedNeon>();
  readonly background = NEON_BACKGROUNDS.dark;
}
