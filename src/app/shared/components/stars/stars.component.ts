import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Étoiles d'affichage : 5 étoiles grises, recouvertes par 5 étoiles dorées coupées à la note (4,5 → 90 %).
 * Le lecteur d'écran lit « 4,5 sur 5 » ; les étoiles elles-mêmes sont décoratives.
 */
@Component({
  selector: 'app-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="etoiles" [style.font-size.px]="size()" role="img" [attr.aria-label]="label()">
      <span class="fond" aria-hidden="true">★★★★★</span>
      <span class="plein" aria-hidden="true" [style.width.%]="percent()">★★★★★</span>
    </span>
  `,
  styles: `
    :host { display: inline-flex; vertical-align: middle; }
    .etoiles { position: relative; display: inline-block; line-height: 1; letter-spacing: 1px; white-space: nowrap; }
    .fond { color: var(--ligne-31, #e2d6cb); }
    .plein { position: absolute; top: 0; left: 0; overflow: hidden; color: var(--cuivre-10, #c0873f); }
  `,
})
export class StarsComponent {
  readonly value = input.required<number>();
  readonly size = input(14);
  readonly percent = computed(() => Math.max(0, Math.min(5, this.value())) * 20);
  readonly label = computed(() => `${this.value().toLocaleString('fr-FR', { maximumFractionDigits: 1 })} sur 5`);
}
